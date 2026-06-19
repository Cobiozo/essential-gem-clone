import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, CheckCircle2, Activity, Flame, Link as LinkIcon, Target, Coins, Medal } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, BarChart, Bar,
} from "recharts";

type Profile = { user_id: string; first_name: string | null; last_name: string | null; email: string | null; eq_id: string | null };
type Participant = {
  id: string;
  user_id: string;
  status: string;
  current_day: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
};
type EnrichedParticipant = Participant & { profile?: Profile | null };

type Pair = { id: string; participant_a_id: string; participant_b_id: string };

type State = {
  loading: boolean;
  participants: EnrichedParticipant[];
  pairsCount: number;
  topPairs: { a: EnrichedParticipant; b: EnrichedParticipant; total: number; day: number; streak: number }[];
  activity: { date: string; count: number }[];
  dayDistribution: { day: number; count: number }[];
  qualification: { range: string; count: number }[];
  durationDays: number;
};

const initial: State = {
  loading: true,
  participants: [],
  pairsCount: 0,
  topPairs: [],
  activity: [],
  dayDistribution: [],
  qualification: [],
  durationDays: 90,
};

const fullName = (p?: Profile | null) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || p?.email || "—";

export const ChallengeStats = () => {
  const [s, setS] = useState<State>(initial);

  useEffect(() => {
    (async () => {
      const [{ data: parts }, { data: pairs }, { data: completions }, { data: settings }, { data: tasks }] = await Promise.all([
        supabase.from("challenge_participants").select("id, user_id, status, current_day, total_points, current_streak, longest_streak"),
        supabase.from("challenge_peer_pairs").select("id, participant_a_id, participant_b_id"),
        supabase.from("challenge_task_completions").select("verified_at, verification_status").eq("verification_status", "verified"),
        supabase.from("challenge_settings").select("duration_days").limit(1).maybeSingle(),
        supabase.from("challenge_tasks").select("id, day_number, required_to_advance"),
      ]);

      const participantsRaw = (parts ?? []) as Participant[];
      const ids = participantsRaw.map(p => p.user_id);
      let profiles: Profile[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email, eq_id")
          .in("user_id", ids);
        profiles = (data ?? []) as Profile[];
      }
      const profMap = new Map(profiles.map(p => [p.user_id, p]));
      const participants: EnrichedParticipant[] = participantsRaw.map(p => ({ ...p, profile: profMap.get(p.user_id) ?? null }));

      // Top pairs
      const byPartId = new Map(participants.map(p => [p.id, p]));
      const topPairs = ((pairs ?? []) as Pair[])
        .map(pr => {
          const a = byPartId.get(pr.participant_a_id);
          const b = byPartId.get(pr.participant_b_id);
          if (!a || !b) return null;
          return {
            a, b,
            total: (a.total_points ?? 0) + (b.total_points ?? 0),
            day: Math.round(((a.current_day ?? 0) + (b.current_day ?? 0)) / 2),
            streak: Math.round(((a.current_streak ?? 0) + (b.current_streak ?? 0)) / 2),
          };
        })
        .filter(Boolean)
        .sort((x: any, y: any) => y.total - x.total)
        .slice(0, 5) as State["topPairs"];

      // Activity (last 30 days)
      const today = new Date();
      const days: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({ date: d.toISOString().slice(0, 10), count: 0 });
      }
      const idxByDate = new Map(days.map((d, i) => [d.date, i]));
      (completions ?? []).forEach((c: any) => {
        if (!c.verified_at) return;
        const k = String(c.verified_at).slice(0, 10);
        const i = idxByDate.get(k);
        if (i !== undefined) days[i].count += 1;
      });

      // Day distribution
      const duration = (settings as any)?.duration_days ?? 90;
      const dayCounts = new Map<number, number>();
      participants.forEach(p => {
        const d = Math.max(1, Math.min(duration, p.current_day || 1));
        dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
      });
      const dayDistribution: { day: number; count: number }[] = [];
      for (let d = 1; d <= duration; d++) dayDistribution.push({ day: d, count: dayCounts.get(d) ?? 0 });

      // Qualification: % completed required tasks (verified vs required up to current_day)
      const tasksList = (tasks ?? []) as { id: string; day_number: number; required_to_advance: boolean }[];
      // we need per-participant verified count — second query
      const buckets = { "≥90%": 0, "≥70%": 0, "≥50%": 0, "<50%": 0 };
      if (participants.length) {
        const { data: allCompl } = await supabase
          .from("challenge_task_completions")
          .select("participant_id, task_id, verification_status")
          .in("participant_id", participants.map(p => p.id));
        const verifiedByPart = new Map<string, Set<string>>();
        (allCompl ?? []).forEach((c: any) => {
          if (c.verification_status !== "verified") return;
          if (!verifiedByPart.has(c.participant_id)) verifiedByPart.set(c.participant_id, new Set());
          verifiedByPart.get(c.participant_id)!.add(c.task_id);
        });
        participants.forEach(p => {
          const required = tasksList.filter(t => t.required_to_advance && t.day_number <= (p.current_day || 0));
          if (required.length === 0) { buckets["<50%"] += 1; return; }
          const done = required.filter(t => verifiedByPart.get(p.id)?.has(t.id)).length;
          const pct = (done / required.length) * 100;
          if (pct >= 90) buckets["≥90%"] += 1;
          else if (pct >= 70) buckets["≥70%"] += 1;
          else if (pct >= 50) buckets["≥50%"] += 1;
          else buckets["<50%"] += 1;
        });
      }
      const qualification = Object.entries(buckets).map(([range, count]) => ({ range, count }));

      setS({
        loading: false,
        participants,
        pairsCount: (pairs ?? []).length,
        topPairs,
        activity: days,
        dayDistribution,
        qualification,
        durationDays: duration,
      });
    })();
  }, []);

  if (s.loading) return <Card className="p-6 text-sm text-muted-foreground">Ładuję statystyki…</Card>;

  const total = s.participants.length;
  const active = s.participants.filter(p => p.status === "active").length;
  const completed = s.participants.filter(p => p.status === "completed").length;
  const abandoned = s.participants.filter(p => p.status === "abandoned").length;
  const avgDay = total ? Math.round(s.participants.reduce((a, p) => a + (p.current_day ?? 0), 0) / total) : 0;
  const avgStreak = total ? Math.round(s.participants.reduce((a, p) => a + (p.current_streak ?? 0), 0) / total) : 0;
  const totalPoints = s.participants.reduce((a, p) => a + (p.total_points ?? 0), 0);
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  const sortedByPoints = [...s.participants].sort((a, b) => b.total_points - a.total_points);
  const podium = sortedByPoints.slice(0, 3);
  const top10 = sortedByPoints.slice(0, 10);

  const medalColor = (i: number) =>
    i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : "text-amber-600";

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Aktywni" value={active} color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Ukończyli" value={completed} color="text-green-500" />
        <StatCard icon={Activity} label="Porzucili" value={abandoned} color="text-red-500" />
        <StatCard icon={Trophy} label="Średni dzień" value={avgDay} color="text-amber-500" />
        <StatCard icon={Flame} label="Średni streak" value={avgStreak} color="text-orange-500" />
        <StatCard icon={LinkIcon} label="Liczba par" value={s.pairsCount} color="text-purple-500" />
        <StatCard icon={Target} label="% ukończenia" value={`${completionPct}%`} color="text-emerald-500" />
        <StatCard icon={Coins} label="Łączne punkty" value={totalPoints} color="text-yellow-500" />
      </div>

      {/* Podium */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Medal className="w-4 h-4 text-yellow-400" /> Podium — TOP 3</h3>
        {podium.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak uczestników.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {podium.map((p, i) => (
              <div key={p.id} className={`rounded-lg border p-4 bg-muted/30 ${i === 0 ? "md:scale-105" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Medal className={`w-6 h-6 ${medalColor(i)}`} />
                    <span className="text-2xl font-bold">{i + 1}</span>
                  </div>
                  <Badge>{p.total_points} pkt</Badge>
                </div>
                <div className="mt-3">
                  <div className="font-medium">{fullName(p.profile)}</div>
                  <div className="text-xs text-muted-foreground">EQ ID: {p.profile?.eq_id ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">Dzień {p.current_day} · streak {p.current_streak}/{p.longest_streak}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* TOP 10 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">TOP 10 rankingu indywidualnego</h3>
        {top10.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak uczestników.</p>
        ) : (
          <ol className="space-y-1.5">
            {top10.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium">{fullName(t.profile)}</div>
                    <div className="text-xs text-muted-foreground">EQ ID: {t.profile?.eq_id ?? "—"} · Dzień {t.current_day} · streak {t.current_streak}</div>
                  </div>
                </div>
                <Badge>{t.total_points} pkt</Badge>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* TOP 5 par */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-purple-500" /> TOP 5 par</h3>
        {s.topPairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak sparowanych uczestników.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Para</th>
                  <th className="text-right p-2">Łączne punkty</th>
                  <th className="text-right p-2">Średni dzień</th>
                  <th className="text-right p-2">Średni streak</th>
                </tr>
              </thead>
              <tbody>
                {s.topPairs.map((pp, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-bold">{i + 1}</td>
                    <td className="p-2">
                      <div className="font-medium">{fullName(pp.a.profile)} <span className="text-muted-foreground">⇄</span> {fullName(pp.b.profile)}</div>
                      <div className="text-xs text-muted-foreground">{pp.a.profile?.eq_id ?? "—"} ⇄ {pp.b.profile?.eq_id ?? "—"}</div>
                    </td>
                    <td className="p-2 text-right font-semibold">{pp.total}</td>
                    <td className="p-2 text-right">{pp.day}</td>
                    <td className="p-2 text-right">{pp.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Activity chart */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Aktywność (zaliczone zadania — ostatnie 30 dni)</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={s.activity}>
              <defs>
                <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#act)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Day distribution */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Rozkład uczestników po dniu wyzwania</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={s.dayDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Qualification */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Kwalifikacja — % zaliczonych zadań wymaganych</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={s.qualification} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <YAxis type="category" dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} />
              <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card className="p-4">
    <Icon className={`w-5 h-5 ${color}`} />
    <div className="text-2xl font-bold mt-2">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </Card>
);
