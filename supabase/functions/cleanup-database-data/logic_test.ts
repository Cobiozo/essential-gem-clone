import { assert, assertEquals, assertFalse } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cutoffISOFor, isMachineAuthorized, resolveRule, runAll, timingSafeEqual } from './logic.ts';

// ---------- machine auth ----------

Deno.test('no x-cron-secret header => not machine authorized (falls back to JWT path)', () => {
  assertFalse(isMachineAuthorized(null, 'super-secret'));
});

Deno.test('wrong x-cron-secret => not machine authorized', () => {
  assertFalse(isMachineAuthorized('wrong', 'super-secret'));
  assertFalse(isMachineAuthorized('super-secre', 'super-secret'));
  assertFalse(isMachineAuthorized('super-secretX', 'super-secret'));
});

Deno.test('secret missing in env => never authorized even with a header', () => {
  assertFalse(isMachineAuthorized('anything', undefined));
  assertFalse(isMachineAuthorized('', ''));
});

Deno.test('correct x-cron-secret => machine authorized', () => {
  assert(isMachineAuthorized('super-secret', 'super-secret'));
});

Deno.test('timingSafeEqual basics', () => {
  assert(timingSafeEqual('abc', 'abc'));
  assertFalse(timingSafeEqual('abc', 'abd'));
  assertFalse(timingSafeEqual('abc', 'abcd'));
});

// ---------- rule resolution (whitelists reused, no duplicated config) ----------

Deno.test('rule with non-whitelisted table is rejected', () => {
  const r = resolveRule({ table_name: 'profiles', retention_days: 30 });
  assertEquals(r.ok, false);
});

Deno.test('rule with non-whitelisted extra_condition is rejected', () => {
  const r = resolveRule({ table_name: 'events', extra_condition: '1=1; DROP TABLE events', retention_days: 14 });
  assertEquals(r.ok, false);
});

Deno.test('valid rule resolves whitelisted condition and clamps retention', () => {
  const r = resolveRule({ table_name: 'cron_job_logs', extra_condition: null, retention_days: 30 });
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.tableConfig.dateColumn, 'created_at');
    assertEquals(r.safeExtraCondition, null);
    assertEquals(r.retentionDays, 30);
  }

  const clamped = resolveRule({ table_name: 'cron_job_logs', retention_days: 99999 });
  assert(clamped.ok && clamped.retentionDays === 3650);
});

Deno.test('cutoff is retention_days in the past', () => {
  const now = new Date('2026-01-31T12:00:00.000Z');
  assertEquals(cutoffISOFor(30, now), '2026-01-01T12:00:00.000Z');
});

// ---------- fake supabase client ----------

type Call = { table: string; op: string; args: unknown[] };

function fakeClient(rules: any[], calls: Call[], failTables: string[] = []) {
  const makeQuery = (table: string, op: string) => {
    const q: any = {
      then: undefined,
      lt(..._a: unknown[]) { return q; },
      eq(col: string, val: unknown) {
        if (table === 'data_cleanup_settings') { q._filter = { col, val }; }
        return q;
      },
      in(..._a: unknown[]) { return q; },
      select(..._a: unknown[]) { return q; },
      maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    };
    // Make the query awaitable
    q.then = (resolve: any, reject: any) => {
      let result: any;
      if (table === 'data_cleanup_settings') {
        const filtered = q._filter
          ? rules.filter((r) => r[q._filter.col] === q._filter.val)
          : rules;
        result = { data: filtered.map(({ is_auto_enabled: _i, ...rest }) => rest), error: null };
      } else if (failTables.includes(table)) {
        result = { data: null, error: { message: `boom on ${table}` }, count: null };
      } else {
        calls.push({ table, op, args: [] });
        result = { data: [], error: null, count: 3 };
      }
      return Promise.resolve(result).then(resolve, reject);
    };
    return q;
  };

  return {
    from(table: string) {
      return {
        select: (..._a: unknown[]) => makeQuery(table, 'select'),
        delete: (..._a: unknown[]) => makeQuery(table, 'delete'),
      };
    },
  };
}

const silent = { log: () => {}, error: () => {} } as unknown as Console;

const RULES = [
  { category_key: 'cron_logs', table_name: 'cron_job_logs', extra_condition: null, retention_days: 30, is_auto_enabled: true },
  { category_key: 'email_logs', table_name: 'email_logs', extra_condition: null, retention_days: 90, is_auto_enabled: true },
  { category_key: 'past_events', table_name: 'events', extra_condition: 'end_time < NOW()', retention_days: 14, is_auto_enabled: false },
];

Deno.test('run_all only executes rules with is_auto_enabled = true', async () => {
  const calls: Call[] = [];
  const summary = await runAll(fakeClient(RULES, calls), silent);

  assertEquals(summary.rules_total, 2);
  assertEquals(summary.succeeded, 2);
  assertEquals(summary.failed, 0);
  assertEquals(summary.success, true);
  assertEquals(summary.results.map((r) => r.category_key).sort(), ['cron_logs', 'email_logs']);
});

Deno.test('run_all never touches events / event_registrations while past_events is disabled', async () => {
  const calls: Call[] = [];
  await runAll(fakeClient(RULES, calls), silent);

  assertFalse(calls.some((c) => c.table === 'events'));
  assertFalse(calls.some((c) => c.table === 'event_registrations'));
});

Deno.test('run_all continues after a failing rule and reports it', async () => {
  const calls: Call[] = [];
  const summary = await runAll(fakeClient(RULES, calls, ['cron_job_logs']), silent);

  assertEquals(summary.rules_total, 2);
  assertEquals(summary.succeeded, 1);
  assertEquals(summary.failed, 1);
  assertEquals(summary.success, false);

  const failedRule = summary.results.find((r) => r.status === 'error')!;
  assertEquals(failedRule.category_key, 'cron_logs');
  assert(String(failedRule.error).includes('boom on cron_job_logs'));

  const okRule = summary.results.find((r) => r.status === 'ok')!;
  assertEquals(okRule.category_key, 'email_logs');
  assertEquals(okRule.deleted_count, 3);
});

Deno.test('run_all rejects a rule pointing at a non-whitelisted table, without stopping', async () => {
  const calls: Call[] = [];
  const summary = await runAll(
    fakeClient([{ category_key: 'bad', table_name: 'profiles', extra_condition: null, retention_days: 1, is_auto_enabled: true }, RULES[1]], calls),
    silent,
  );

  assertEquals(summary.failed, 1);
  assertEquals(summary.succeeded, 1);
  assertFalse(calls.some((c) => c.table === 'profiles'));
});
