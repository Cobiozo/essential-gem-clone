// Shared advisory-lock guard for scheduled (cron) Edge Functions.
//
// Goal: if a previous execution of the same job is still running, the next
// execution must exit immediately WITHOUT doing any work, without errors and
// without leaving a stale lock behind.
//
// How it works:
//  - public.try_acquire_cron_lock() uses pg_try_advisory_xact_lock() to serialize
//    concurrent acquisition attempts (transaction-scoped -> can never leak) and then
//    inserts a row into public.cron_job_locks with a TTL.
//  - public.release_cron_lock() is always called from a `finally` block.
//  - If a runtime crashes hard (no finally), the TTL expires the lock automatically.
//  - Every acquisition / skip / completion is recorded in public.cron_job_run_stats
//    so execution times, overlaps and skipped runs can be measured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENTINEL_NO_LOCK = "00000000-0000-0000-0000-000000000000";

function lockClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Returns a run id when the lock was acquired, or null when another execution
 * of the same job is still in progress (caller must exit without doing work).
 * If the locking infrastructure itself fails, we intentionally fail OPEN
 * (sentinel id) so scheduled functionality is never broken by the guard.
 */
export async function acquireCronLock(
  jobName: string,
  ttlSeconds = 300,
): Promise<string | null> {
  try {
    const { data, error } = await lockClient().rpc("try_acquire_cron_lock", {
      _job_name: jobName,
      _ttl_seconds: ttlSeconds,
    });
    if (error) {
      console.warn(`[cron-lock] acquire failed for ${jobName}, running unguarded:`, error.message);
      return SENTINEL_NO_LOCK;
    }
    if (!data) {
      console.log(`[cron-lock] ${jobName} skipped - previous run still in progress`);
      return null;
    }
    return data as string;
  } catch (e) {
    console.warn(`[cron-lock] acquire threw for ${jobName}, running unguarded:`, e);
    return SENTINEL_NO_LOCK;
  }
}

export async function releaseCronLock(
  jobName: string,
  runId: string,
  status: "completed" | "error" = "completed",
  errorMessage?: string,
): Promise<void> {
  if (!runId || runId === SENTINEL_NO_LOCK) return;
  try {
    const { error } = await lockClient().rpc("release_cron_lock", {
      _job_name: jobName,
      _run_id: runId,
      _status: status,
      _error_message: errorMessage ?? null,
    });
    if (error) console.warn(`[cron-lock] release failed for ${jobName}:`, error.message);
  } catch (e) {
    console.warn(`[cron-lock] release threw for ${jobName}:`, e);
  }
}

type Handler = (req: Request) => Promise<Response> | Response;

/**
 * Wraps a scheduled function handler with the overlap guard.
 * OPTIONS/preflight requests bypass locking entirely.
 */
export function withCronLock(
  jobName: string,
  handler: Handler,
  corsHeaders: Record<string, string> = {},
  ttlSeconds = 300,
): Handler {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return await handler(req);

    const runId = await acquireCronLock(jobName, ttlSeconds);
    if (runId === null) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "previous_run_in_progress", job: jobName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let status: "completed" | "error" = "completed";
    let errMsg: string | undefined;
    try {
      const res = await handler(req);
      if (res.status >= 500) {
        status = "error";
        errMsg = `handler returned HTTP ${res.status}`;
      }
      return res;
    } catch (e) {
      status = "error";
      errMsg = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await releaseCronLock(jobName, runId, status, errMsg);
    }
  };
}
