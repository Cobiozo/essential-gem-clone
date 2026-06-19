import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "./TaskCard";
import type { ChallengeParticipant, ChallengeTask } from "@/types/challenge";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DayCountdown } from "./DayCountdown";

interface Props {
  participant: ChallengeParticipant;
  currentDay: number;
}

export const DayTasksList = ({ participant, currentDay }: Props) => {
  const [tasks, setTasks] = useState<ChallengeTask[]>([]);
  const [completions, setCompletions] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      supabase.from("challenge_tasks").select("*").eq("is_active", true).lte("day_number", currentDay).order("day_number").order("sort_order"),
      supabase.from("challenge_task_completions").select("task_id, verification_status").eq("participant_id", participant.id),
    ]);
    setTasks((tRes.data ?? []) as any);
    setCompletions(new Map((cRes.data ?? []).map((c: any) => [c.task_id, c.verification_status])));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [participant.id, currentDay]);

  const triggerCron = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("challenge-daily-supervisor", {
        body: { mode: "hourly" },
      });
      if (error) throw error;
      toast.success("Weryfikacja uruchomiona");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Błąd weryfikacji");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  const today = tasks.filter(t => t.day_number === currentDay);
  const earlier = tasks.filter(t => t.day_number < currentDay);
  const isVerified = (id: string) => completions.get(id) === "verified";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold">Zadania</h2>
          <DayCountdown forDay={currentDay} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" onClick={triggerCron} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Sprawdź postęp
          </Button>
          <span className="text-[10px] text-muted-foreground">Automatyczna weryfikacja co 15 min</span>
        </div>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Dziś (dzień {currentDay})</TabsTrigger>
          <TabsTrigger value="earlier">Wcześniejsze ({earlier.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="space-y-3 mt-4">
          {today.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Brak zadań na dziś.</Card>
          )}
          {today.map(t => (
            <TaskCard key={t.id} task={t} isCompleted={isVerified(t.id)} participantId={participant.id} onChanged={load} />
          ))}
        </TabsContent>
        <TabsContent value="earlier" className="space-y-6 mt-4">
          {earlier.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Brak wcześniejszych zadań.</Card>
          )}
          {Array.from(new Set(earlier.map(t => t.day_number))).sort((a, b) => b - a).map(day => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-muted-foreground">Dzień {day}</h3>
                <DayCountdown forDay={day} dayOffset={day - currentDay} compact />
              </div>
              {earlier.filter(t => t.day_number === day).map(t => (
                <TaskCard key={t.id} task={t} isCompleted={isVerified(t.id)} participantId={participant.id} onChanged={load} />
              ))}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
