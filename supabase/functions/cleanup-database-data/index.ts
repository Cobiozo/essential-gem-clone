import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Allowed tables and their date columns (whitelist for security)
const ALLOWED_TABLES: Record<string, { dateColumn: string; allowExtraCondition: boolean }> = {
  email_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  google_calendar_sync_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  cron_job_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  events: { dateColumn: 'created_at', allowExtraCondition: true }, // extra: end_time < NOW()
  user_notifications: { dateColumn: 'created_at', allowExtraCondition: true }, // extra: is_read = true
  banner_interactions: { dateColumn: 'created_at', allowExtraCondition: false },
  push_notification_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  medical_chat_history: { dateColumn: 'created_at', allowExtraCondition: false },
  ai_compass_contact_history: { dateColumn: 'created_at', allowExtraCondition: false },
  reflink_events: { dateColumn: 'created_at', allowExtraCondition: false },
};

// Safe extra conditions whitelist (no user input goes into SQL)
const ALLOWED_EXTRA_CONDITIONS: Record<string, string> = {
  'end_time < NOW()': 'end_time < NOW()',
  'is_read = true': 'is_read = true',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Constant-time string comparison (no early exit on first mismatch). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export function isMachineAuthorized(headerValue: string | null, secret: string | undefined): boolean {
  if (!headerValue || !secret) return false;
  return timingSafeEqual(headerValue, secret);
}

export type Rule = {
  category_key: string;
  table_name: string;
  extra_condition: string | null;
  retention_days: number | null;
};

export function resolveRule(rule: Rule):
  | { ok: true; tableConfig: { dateColumn: string; allowExtraCondition: boolean }; safeExtraCondition: string | null; retentionDays: number }
  | { ok: false; error: string } {
  const tableConfig = ALLOWED_TABLES[rule.table_name];
  if (!tableConfig) return { ok: false, error: `Table '${rule.table_name}' is not allowed for cleanup` };

  let safeExtraCondition: string | null = null;
  if (rule.extra_condition) {
    safeExtraCondition = ALLOWED_EXTRA_CONDITIONS[rule.extra_condition] ?? null;
    if (!safeExtraCondition) {
      return { ok: false, error: `Extra condition '${rule.extra_condition}' is not allowed` };
    }
  }

  const retentionDays = Math.max(1, Math.min(3650, Number.parseInt(String(rule.retention_days ?? ''), 10) || 90));
  return { ok: true, tableConfig, safeExtraCondition, retentionDays };
}

export function cutoffISOFor(retentionDays: number, now = new Date()): string {
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff.toISOString();
}

async function countForRule(
  supabaseAdmin: any,
  tableName: string,
  tableConfig: { dateColumn: string },
  safeExtraCondition: string | null,
  cutoffISO: string,
): Promise<number> {
  if (tableName === 'events' && safeExtraCondition === 'end_time < NOW()') {
    const { count, error } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .lt('end_time', cutoffISO);
    if (error) throw error;
    return count ?? 0;
  }

  let query = supabaseAdmin
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .lt(tableConfig.dateColumn, cutoffISO);

  if (safeExtraCondition === 'is_read = true') query = query.eq('is_read', true);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function deleteForRule(
  supabaseAdmin: any,
  tableName: string,
  tableConfig: { dateColumn: string },
  safeExtraCondition: string | null,
  cutoffISO: string,
): Promise<number> {
  // Special handling for events: delete registrations first (cascade safety), then events
  if (tableName === 'events' && safeExtraCondition === 'end_time < NOW()') {
    const { data: pastEvents, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id')
      .lt('end_time', cutoffISO);
    if (fetchError) throw fetchError;

    if (!pastEvents || pastEvents.length === 0) return 0;

    const eventIds = pastEvents.map((e: any) => e.id);

    await supabaseAdmin.from('event_registrations').delete().in('event_id', eventIds);

    const { error: deleteError, count } = await supabaseAdmin.from('events').delete().in('id', eventIds);
    if (deleteError) throw deleteError;
    return count ?? eventIds.length;
  }

  let query = supabaseAdmin.from(tableName).delete().lt(tableConfig.dateColumn, cutoffISO);
  if (safeExtraCondition === 'is_read = true') query = query.eq('is_read', true);

  const { error, count } = await query;
  if (error) throw error;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('CLEANUP_CRON_SECRET');
    const machineAuthorized = isMachineAuthorized(req.headers.get('x-cron-secret'), cronSecret);

    // Service role client for DB operations (used by both auth paths)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    if (!machineAuthorized) {
      // Existing user path: JWT + admin role (unchanged)
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const token = authHeader.replace('Bearer ', '');
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
      if (authError || !userData?.user) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        return json({ error: 'Admin access required' }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const { action, table_name, extra_condition, retention_days, category_key } = body ?? {};

    // ---------- run_all: machine-only batch execution of enabled retention rules ----------
    if (action === 'run_all') {
      if (!machineAuthorized) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const { data: rules, error: rulesError } = await supabaseAdmin
        .from('data_cleanup_settings')
        .select('category_key, table_name, extra_condition, retention_days')
        .eq('is_auto_enabled', true);

      if (rulesError) throw rulesError;

      const results: Array<Record<string, unknown>> = [];
      let succeeded = 0;
      let failed = 0;

      for (const rule of (rules ?? []) as Rule[]) {
        try {
          const resolved = resolveRule(rule);
          if (!resolved.ok) throw new Error(resolved.error);

          const cutoffISO = cutoffISOFor(resolved.retentionDays);
          const deleted = await deleteForRule(
            supabaseAdmin,
            rule.table_name,
            resolved.tableConfig,
            resolved.safeExtraCondition,
            cutoffISO,
          );

          succeeded++;
          results.push({
            category_key: rule.category_key,
            table_name: rule.table_name,
            retention_days: resolved.retentionDays,
            deleted_count: deleted,
            status: 'ok',
          });
          console.log(`[cleanup-database-data] run_all ${rule.category_key}: deleted ${deleted}`);
        } catch (err: any) {
          failed++;
          const message = String(err?.message ?? 'unknown error');
          results.push({
            category_key: rule.category_key,
            table_name: rule.table_name,
            status: 'error',
            error: message,
          });
          console.error(`[cleanup-database-data] run_all ${rule.category_key} failed: ${message}`);
        }
      }

      return json({
        success: failed === 0,
        rules_total: (rules ?? []).length,
        succeeded,
        failed,
        results,
      }, 200);
    }

    // ---------- existing single-rule actions (unchanged semantics) ----------
    const resolved = resolveRule({
      category_key,
      table_name,
      extra_condition: extra_condition ?? null,
      retention_days: retention_days ?? null,
    });
    if (!resolved.ok) {
      return json({ error: resolved.error }, 400);
    }

    const cutoffISO = cutoffISOFor(resolved.retentionDays);
    console.log(
      `[cleanup-database-data] action=${action}, table=${table_name}, days=${resolved.retentionDays}, cutoff=${cutoffISO}`
    );

    if (action === 'count') {
      const count = await countForRule(
        supabaseAdmin, table_name, resolved.tableConfig, resolved.safeExtraCondition, cutoffISO,
      );
      return json({ count }, 200);
    }

    if (action === 'delete') {
      const deletedCount = await deleteForRule(
        supabaseAdmin, table_name, resolved.tableConfig, resolved.safeExtraCondition, cutoffISO,
      );
      console.log(`[cleanup-database-data] Deleted ${deletedCount} records from ${table_name}`);
      return json({ success: true, deleted_count: deletedCount }, 200);
    }

    return json({ error: 'Invalid action. Use count or delete.' }, 400);

  } catch (error: any) {
    console.error('[cleanup-database-data] Error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
});
