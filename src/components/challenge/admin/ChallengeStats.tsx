import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, CheckCircle2, Activity } from "lucide-react";

export const ChallengeStats = () => {
  const [stats, setStats] = useState<{ active: number; completed: number; abandoned: number; avgDay: number; top: any[] } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: parts } = await supabase
        .from("challenge_participants")
        .select("user_id, status, current_day, total_points, current_streak");
      const all = (parts ?? []) as any[];
      const active = all.filter(p => p.status === "active").length;
      const completed = all.filter(p => p.status === "completed").length;
      const abandoned = all.filter(p => p.status === "abandoned").length;
      const avgDay = all.length ? Math.round(all.reduce((s, p) => s + (p.current_day ?? 0), 0) / all.length) : 0;
      const topRaw = [...all].sort((a, b) => b.total_points - a.total_points).slice(0, 10);
      const ids = topRaw.map(t => t.user_id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        profiles = data ?? [];
      }
      const map = new Map(profiles.map(p => [p.id, p]));
      const top = topRaw.map(t => ({ ...t, profile: map.get(t.user_id) }));
      setStats({ active, completed, abandoned, avgDay, top });
    })();
  }, []);

  if (!stats) return <Card className="p-6 text-sm text-muted-foreground">Ładuję statystyki…</Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Aktywni" value={stats.active} color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Ukończyli" value={stats.completed} color="text-green-500" />
        <StatCard icon={Activity} label="Porzucili" value={stats.abandoned} color="text-red-500" />
        <StatCard icon={Trophy} label="Średni dzień" value={stats.avgDay} color="text-amber-500" />
      </div>
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Top 10 rankingu</h3>
        {stats.top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak uczestników.</p>
        ) : (
          <ol className="space-y-1.5">
            {stats.top.map((t, i) => (
              <li key={t.user_id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium">{t.profile?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Dzień {t.current_day} · streak {t.current_streak}</div>
                  </div>
                </div>
                <Badge>{t.total_points} pkt</Badge>
              </li>
            ))}
          </ol>
        )}
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
