import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, RotateCcw, ShieldCheck, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Task {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  points: number;
  task_type: string;
  is_active: boolean;
  required_to_advance: boolean;
}

interface Completion {
  task_id: string;
  verification_status: "pending" | "verified" | "rejected";
  points_awarded: number;
  verified_at: string | null;
  completed_at: string | null;
  evidence: any;
}

interface Props {
  participantId: string;
  durationDays: number;
  onChanged?: () => void;
}

export const ParticipantTasksPanel = ({ participantId, durationDays, onChanged }: Props) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comps, setComps] = useState<Map<string, Completion>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(1);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("challenge_tasks").select("*").eq("is_active", true).order("day_number").order("sort_order"),
      supabase.from("challenge_task_completions").select("task_id, verification_status, points_awarded, verified_at, completed_at, evidence").eq("participant_id", participantId),
    ]);
    setTasks((t ?? []) as any);
    setComps(new Map(((c ?? []) as any[]).map(x => [x.task_id, x])));
    setLoading(false);
  }, [participantId]);

  useEffect(() => { load(); }, [load]);

  const verifyAll = async () => {
    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke("challenge-daily-supervisor", {
        body: { participant_id: participantId },
      });
      if (error) throw error;
      toast.success("Weryfikacja wykonana");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Błąd weryfikacji");
    } finally {
      setVerifying(false);
    }
  };

  const manualComplete = async (task: Task) => {
    if (!confirm(`Zaliczyć ręcznie zadanie „${task.title}"?`)) return;
    setBusyId(task.id);
    const { error } = await (supabase.from("challenge_task_completions") as any).upsert({
      participant_id: participantId,
      task_id: task.id,
      completed_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      verified_by: user?.id ?? null,
      verification_status: "verified",
      points_awarded: task.points,
      evidence: { manual_by: user?.id, manual_at: new Date().toISOString() },
    }, { onConflict: "participant_id,task_id" });
    if (error) {
      toast.error(error.message);
      setBusyId(null);
      return;
    }
    await supabase.functions.invoke("challenge-daily-supervisor", { body: { participant_id: participantId } });
    toast.success("Zaliczone ręcznie");
    await load();
    onChanged?.();
    setBusyId(null);
  };

  const resetTask = async (task: Task) => {
    if (!confirm(`Zresetować zaliczenie zadania „${task.title}" dla tego dnia?\n\nInne dni i zadania nie zostaną zmienione — przeliczone zostaną tylko punkty i streak tego uczestnika.`)) return;
    setBusyId(task.id);
    const { error } = await supabase
      .from("challenge_task_completions")
      .delete()
      .eq("participant_id", participantId)
      .eq("task_id", task.id);
    if (error) {
      toast.error(error.message);
      setBusyId(null);
      return;
    }
    await supabase.functions.invoke("challenge-daily-supervisor", { body: { participant_id: participantId } });
    toast.success("Zresetowane");
    await load();
    onChanged?.();
    setBusyId(null);
  };


  // group tasks by day
  const byDay = new Map<number, Task[]>();
  for (const t of tasks) {
    if (t.day_number > durationDays) continue;
    if (!byDay.has(t.day_number)) byDay.set(t.day_number, []);
    byDay.get(t.day_number)!.push(t);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);

  return (
    <div className="bg-muted/20 border-t p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Dni i zadania uczestnika</h4>
        <Button size="sm" variant="outline" onClick={verifyAll} disabled={verifying}>
          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
          Sprawdź teraz wszystko
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Ładuję…</p>
      ) : days.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak aktywnych zadań.</p>
      ) : (
        <div className="space-y-2">
          {days.map(day => {
            const dayTasks = byDay.get(day)!;
            const verifiedCount = dayTasks.filter(t => comps.get(t.id)?.verification_status === "verified").length;
            const isOpen = openDay === day;
            return (
              <div key={day} className="rounded-lg border bg-background">
                <button
                  onClick={() => setOpenDay(isOpen ? null : day)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">Dzień {day}</span>
                  <Badge variant={verifiedCount === dayTasks.length ? "default" : "secondary"}>
                    {verifiedCount}/{dayTasks.length}
                  </Badge>
                </button>
                {isOpen && (
                  <div className="divide-y">
                    {dayTasks.map(task => {
                      const comp = comps.get(task.id);
                      const status = comp?.verification_status;
                      const Icon = status === "verified" ? CheckCircle2 : status === "pending" ? Clock : Circle;
                      const color = status === "verified" ? "text-emerald-500" : status === "pending" ? "text-amber-500" : "text-muted-foreground";
                      const busy = busyId === task.id;
                      return (
                        <div key={task.id} className="p-3 flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{task.title}</span>
                              <Badge variant="outline" className="text-[10px]">{task.task_type}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{task.points} pkt</Badge>
                              {status === "verified" && comp?.evidence?.manual_by && (
                                <Badge className="text-[10px] bg-violet-600">manual</Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
                            )}
                            {comp?.verified_at && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Zaliczone: {new Date(comp.verified_at).toLocaleString("pl-PL")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                            {status !== "verified" && (
                              <Button size="sm" variant="outline" onClick={() => manualComplete(task)} disabled={busy}>
                                <ShieldCheck className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Zalicz</span>
                              </Button>
                            )}
                            {status === "verified" && (
                              <Button size="sm" variant="ghost" onClick={() => resetTask(task)} disabled={busy}>
                                <RotateCcw className="w-3.5 h-3.5 sm:mr-1 text-destructive" />
                                <span className="hidden sm:inline">Reset</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
