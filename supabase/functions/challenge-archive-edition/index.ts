// Snapshot the current/closed challenge edition into challenge_editions_archive.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: u } = await client.auth.getUser(token);
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await client
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await client
      .from("challenge_settings")
      .select("title, duration_days, global_start_date")
      .eq("id", true).maybeSingle();
    if (!settings?.global_start_date) {
      return new Response(JSON.stringify({ error: "no_start_date" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(settings.global_start_date + "T00:00:00Z");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (settings.duration_days ?? 90));

    const [{ data: participants }, { data: completions }, { data: pairs }] = await Promise.all([
      client.from("challenge_participants").select("id, user_id, total_points, current_streak, longest_streak, status, completion_date"),
      client.from("challenge_task_completions").select("participant_id, points_awarded, verification_status"),
      client.from("challenge_peer_pairs").select("*"),
    ]);

    const userIds = (participants ?? []).map((p: any) => p.user_id);
    const { data: profiles } = await client
      .from("profiles").select("user_id, first_name, last_name, avatar_url")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const pointsByPart = new Map<string, number>();
    for (const c of (completions ?? [])) {
      if ((c as any).verification_status !== "verified") continue;
      const id = (c as any).participant_id;
      pointsByPart.set(id, (pointsByPart.get(id) ?? 0) + ((c as any).points_awarded ?? 0));
    }

    const ranked = (participants ?? [])
      .map((p: any) => {
        const prof = profileMap.get(p.user_id);
        return {
          participant_id: p.id,
          user_id: p.user_id,
          full_name: [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") || "—",
          avatar_url: prof?.avatar_url ?? null,
          total_points: pointsByPart.get(p.id) ?? p.total_points ?? 0,
          longest_streak: p.longest_streak ?? 0,
          status: p.status,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    const topParticipants = ranked.slice(0, 10);

    // Top pairs by combined points
    const pairScores = (pairs ?? []).map((pair: any) => {
      const a = ranked.find(r => r.participant_id === pair.participant_a_id);
      const b = ranked.find(r => r.participant_id === pair.participant_b_id);
      return {
        pair_id: pair.id,
        a, b,
        combined: (a?.total_points ?? 0) + (b?.total_points ?? 0),
      };
    }).sort((x, y) => y.combined - x.combined).slice(0, 5);

    const completedCount = (participants ?? []).filter((p: any) => p.status === "completed").length;
    const totalPoints = ranked.reduce((s, r) => s + r.total_points, 0);

    const { data: inserted, error } = await (client.from("challenge_editions_archive") as any).insert({
      title: settings.title ?? "Wyzwanie 90-dniowe",
      start_date: settings.global_start_date,
      end_date: end.toISOString().slice(0, 10),
      duration_days: settings.duration_days ?? 90,
      participants_count: (participants ?? []).length,
      completed_count: completedCount,
      total_points_awarded: totalPoints,
      top_participants: topParticipants,
      top_pairs: pairScores,
      snapshot: { ranked, pairs: pairs ?? [] },
      archived_by: u.user.id,
    }).select().maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, edition: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[challenge-archive-edition]", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
