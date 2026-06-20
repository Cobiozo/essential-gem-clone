import { useEffect, useState, useCallback, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Search, Info, ChevronDown, ChevronRight } from "lucide-react";
import { ParticipantTasksPanel } from "./ParticipantTasksPanel";

interface Row {
  id: string;
  user_id: string;
  current_day: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  status: string;
  start_date: string;
  completion_date: string | null;
  profile: { first_name: string | null; last_name: string | null; email: string | null; eq_id: string | null } | null;
}

export const ParticipantsTable = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: parts }, { data: settings }] = await Promise.all([
      supabase
        .from("challenge_participants")
        .select("id, user_id, current_day, total_points, current_streak, longest_streak, status, start_date, completion_date")
        .order("total_points", { ascending: false }),
      supabase.from("challenge_settings").select("duration_days").eq("id", true).maybeSingle(),
    ]);
    if (settings?.duration_days) setDurationDays(settings.duration_days);
    const ids = (parts ?? []).map((p: any) => p.user_id);
    let profiles: any[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, eq_id")
        .in("user_id", ids);
      profiles = data ?? [];
    }
    const map = new Map(profiles.map((p: any) => [p.user_id, p]));
    setRows(((parts ?? []) as any[]).map((p) => ({ ...p, profile: map.get(p.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Usunąć tego uczestnika z wyzwania?")) return;
    const { error } = await supabase.from("challenge_participants").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Usunięto");
    load();
  };

  const reset = async (id: string) => {
    if (!confirm("Zresetować postęp tego uczestnika?")) return;
    const { error } = await (supabase.from("challenge_participants") as any)
      .update({ current_day: 0, total_points: 0, current_streak: 0, longest_streak: 0, status: "active", completion_date: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("challenge_task_completions").delete().eq("participant_id", id);
    toast.success("Zresetowano");
    load();
  };

  const fullName = (p: Row["profile"]) => {
    const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
    return name || "—";
  };

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      fullName(r.profile).toLowerCase().includes(s) ||
      (r.profile?.email ?? "").toLowerCase().includes(s) ||
      (r.profile?.eq_id ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <TooltipProvider>
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Szukaj po imieniu, EQ ID lub email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Badge variant="secondary">{filtered.length}/{rows.length}</Badge>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Ładuję…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-2">Uczestnik</th>
                <th className="text-left p-2">EQ ID</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Dzień</th>
                <th className="text-right p-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Streak (akt./najd.)
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 opacity-60" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Aktualna seria dni pod rząd z kompletem wymaganych zadań / najdłuższa zarejestrowana seria. Dni bez zadań wymaganych są pomijane, pierwszy dzień bez kompletu przerywa serię.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </th>
                <th className="text-right p-2">Punkty</th>
                <th className="text-left p-2">Start</th>
                <th className="text-right p-2">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">
                    <div className="font-medium">{fullName(r.profile)}</div>
                    <div className="text-xs text-muted-foreground">{r.profile?.email ?? r.user_id}</div>
                  </td>
                  <td className="p-2 text-xs">{r.profile?.eq_id ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="p-2 text-right">{r.current_day}</td>
                  <td className="p-2 text-right">{r.current_streak} / {r.longest_streak}</td>
                  <td className="p-2 text-right font-semibold">{r.total_points}</td>
                  <td className="p-2 text-xs">{r.start_date}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => reset(r.id)}>Reset</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground p-6">Brak uczestników</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
    </TooltipProvider>
  );
};
