// Challenge 90-day supervisor — auto-verifies tasks and rolls participant day/streak.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Settings {
  duration_days: number;
  excluded_weekdays: number[] | null;
  excluded_dates: string[] | null;
  global_start_date: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  start_date: string;
  current_day: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  excluded_dates: string[] | null;
}

interface Task {
  id: string;
  day_number: number;
  task_type: string;
  target_ref: Record<string, unknown>;
  points: number;
  required_to_advance: boolean;
  is_active: boolean;
}

function calcCurrentDay(p: Participant, s: Settings): number {
  if (!s.global_start_date) return 0;
  const start = new Date(s.global_start_date + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (today < start) return 0;
  const excluded = new Set<string>([
    ...(s.excluded_dates ?? []),
    ...(p.excluded_dates ?? []),
  ]);
  const excludedWeekdays = new Set<number>(s.excluded_weekdays ?? []);
  let day = 0;
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getUTCDay();
    if (excluded.has(iso) || excludedWeekdays.has(wd)) continue;
    day += 1;
  }
  return day;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let mode = "hourly";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "daily") mode = "daily";
  } catch (_) { /* noop */ }

  const summary = { processed: 0, verified: 0, completed: 0, errors: 0 };

  try {
    const { data: settings } = await client
      .from("challenge_settings")
      .select("duration_days, excluded_weekdays, excluded_dates, is_enabled, global_start_date")
      .eq("id", true)
      .maybeSingle();
    if (!settings?.is_enabled) {
      await client.from("cron_job_logs").insert({
        job_name: "challenge-daily-supervisor",
        status: "skipped",
        message: "Module disabled",
        duration_ms: Date.now() - startedAt,
      });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participants } = await client
      .from("challenge_participants")
      .select("*")
      .eq("status", "active");

    const { data: tasks } = await client
      .from("challenge_tasks")
      .select("*")
      .eq("is_active", true);

    if (!participants || !tasks) {
      throw new Error("Failed to fetch participants/tasks");
    }

    for (const p of participants as Participant[]) {
      try {
        summary.processed += 1;
        const newDay = calcCurrentDay(p, settings as Settings);

        const { data: completions } = await client
          .from("challenge_task_completions")
          .select("task_id, verification_status, points_awarded")
          .eq("participant_id", p.id);
        const completionMap = new Map(
          (completions ?? []).map((c: any) => [c.task_id, c]),
        );

        const relevant = (tasks as Task[]).filter(
          (t) => t.day_number <= newDay,
        );

        for (const t of relevant) {
          const existing = completionMap.get(t.id);
          if (existing?.verification_status === "verified") continue;

          const ok = await verifyTask(client, p, t);
          if (ok) {
            await client.from("challenge_task_completions").upsert({
              participant_id: p.id,
              task_id: t.id,
              completed_at: new Date().toISOString(),
              verified_at: new Date().toISOString(),
              verification_status: "verified",
              points_awarded: t.points,
            }, { onConflict: "participant_id,task_id" });
            summary.verified += 1;
          }
        }

        if (mode === "daily" || newDay !== p.current_day) {
          // Recompute totals + streak only on daily run or when day changes
          const { data: fresh } = await client
            .from("challenge_task_completions")
            .select("task_id, points_awarded, verification_status")
            .eq("participant_id", p.id);
          const totalPoints = (fresh ?? [])
            .filter((c: any) => c.verification_status === "verified")
            .reduce((s: number, c: any) => s + (c.points_awarded ?? 0), 0);

          // Streak: consecutive days (1..newDay) where ALL required tasks verified
          const verifiedSet = new Set(
            (fresh ?? [])
              .filter((c: any) => c.verification_status === "verified")
              .map((c: any) => c.task_id),
          );
          let streak = 0;
          for (let d = newDay; d >= 1; d--) {
            const required = (tasks as Task[]).filter(
              (t) => t.day_number === d && t.required_to_advance,
            );
            if (required.length === 0) continue;
            const allOk = required.every((t) => verifiedSet.has(t.id));
            if (allOk) streak += 1;
            else break;
          }

          const longest = Math.max(p.longest_streak ?? 0, streak);
          const isCompleted = newDay > (settings as Settings).duration_days;

          await client.from("challenge_participants").update({
            current_day: Math.min(newDay, (settings as Settings).duration_days),
            current_streak: streak,
            longest_streak: longest,
            total_points: totalPoints,
            ...(isCompleted
              ? { status: "completed", completion_date: new Date().toISOString() }
              : {}),
          }).eq("id", p.id);

          if (isCompleted) summary.completed += 1;
        }
      } catch (e) {
        summary.errors += 1;
        console.error("Participant error", p.id, e);
      }
    }

    await client.from("cron_job_logs").insert({
      job_name: "challenge-daily-supervisor",
      status: "success",
      message: `mode=${mode} ${JSON.stringify(summary)}`,
      duration_ms: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ ok: true, mode, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await client.from("cron_job_logs").insert({
      job_name: "challenge-daily-supervisor",
      status: "error",
      message: String((e as Error).message ?? e),
      duration_ms: Date.now() - startedAt,
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function verifyTask(
  client: ReturnType<typeof createClient>,
  p: Participant,
  t: Task,
): Promise<boolean> {
  const ref = t.target_ref || {};
  const check = (ref as any).check as string | undefined;

  switch (t.task_type) {
    case "video_watch": {
      const required = Number((ref as any).required_seconds ?? 60);
      const resourceId = (ref as any).resource_id as string | undefined;
      if (!resourceId) return false;
      const { data } = await client
        .from("challenge_activity_log")
        .select("payload")
        .eq("participant_id", p.id)
        .eq("action_type", "video_watch")
        .order("created_at", { ascending: false })
        .limit(50);
      const max = (data ?? [])
        .filter((r: any) => r.payload?.resource_id === resourceId)
        .reduce(
          (m: number, r: any) => Math.max(m, Number(r.payload?.watched_seconds ?? 0)),
          0,
        );
      return max >= required;
    }
    case "training_lesson": {
      const lessonId = (ref as any).lesson_id as string | undefined;
      if (!lessonId) return false;
      const { count } = await client
        .from("training_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.user_id)
        .eq("lesson_id", lessonId)
        .eq("is_completed", true);
      return (count ?? 0) > 0;
    }
    case "resource_view":
    case "page_view":
    case "button_click":
    case "link_visit":
    case "manual_confirm":
    case "external_action": {
      const key = check || (t.task_type === "resource_view" ? "resource_view" : "");
      if (!key) return false;
      const { data } = await client.rpc("challenge_count_action", {
        _participant_id: p.id,
        _action_key: key,
        _params: ref,
      });
      const count = Number(data ?? 0);
      const required = Number(
        (ref as any).count ?? (ref as any).min_recipients ?? 1,
      );
      return count >= required;
    }
    default:
      return false;
  }
}
