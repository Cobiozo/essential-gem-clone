import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Power } from "lucide-react";
import { TaskFormDialog } from "./TaskFormDialog";
import type { ChallengeTask } from "@/types/challenge";

const TYPE_LABEL: Record<string, string> = {
  video_watch: "Wideo",
  resource_view: "Zasób",
  training_lesson: "Akademia",
  button_click: "Klik",
  link_visit: "Wizyta",
  external_action: "Akcja",
  manual_confirm: "Ręczne",
  file_download: "Pobranie",
};

export const TasksEditor = ({ durationDays }: { durationDays: number }) => {
  const [tasks, setTasks] = useState<ChallengeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengeTask | null>(null);
  const [defaultDay, setDefaultDay] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("challenge_tasks")
      .select("*")
      .order("day_number")
      .order("sort_order");
    setTasks((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Usunąć to zadanie?")) return;
    const { error } = await supabase.from("challenge_tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Usunięto");
    load();
  };

  const toggleActive = async (t: ChallengeTask) => {
    const { error } = await (supabase.from("challenge_tasks") as any).update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const duplicate = async (t: ChallengeTask) => {
    const targetDay = Number(prompt(`Zduplikuj do którego dnia? (1-${durationDays})`, String(t.day_number + 1)));
    if (!targetDay || targetDay < 1) return;
    const { error } = await (supabase.from("challenge_tasks") as any).insert({
      day_number: targetDay,
      title: t.title + " (kopia)",
      description: t.description,
      task_type: t.task_type,
      target_ref: t.target_ref,
      points: t.points,
      required_to_advance: t.required_to_advance,
      verification_mode: t.verification_mode,
      is_active: t.is_active,
      sort_order: t.sort_order,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Zduplikowano");
    load();
  };

  const openNew = (day: number) => { setEditing(null); setDefaultDay(day); setDialogOpen(true); };
  const openEdit = (t: ChallengeTask) => { setEditing(t); setDialogOpen(true); };

  const daysWithTasks = Array.from(new Set(tasks.map(t => t.day_number))).sort((a, b) => a - b);
  const allDays = Array.from({ length: durationDays }, (_, i) => i + 1);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Zadania wyzwania</h3>
          <p className="text-xs text-muted-foreground">{tasks.length} zadań, {daysWithTasks.length} dni z zadaniami</p>
        </div>
        <Button size="sm" onClick={() => openNew(daysWithTasks[daysWithTasks.length - 1] ? daysWithTasks[daysWithTasks.length - 1] + 1 : 1)}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj zadanie
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground p-4">Ładuję…</p>
      ) : (
        <Accordion type="multiple" defaultValue={daysWithTasks.slice(0, 3).map(d => `d${d}`)}>
          {allDays.map((day) => {
            const dayTasks = tasks.filter(t => t.day_number === day);
            if (dayTasks.length === 0) return null;
            return (
              <AccordionItem key={day} value={`d${day}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Dzień {day}</span>
                    <Badge variant="secondary">{dayTasks.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {dayTasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{t.title}</span>
                            <Badge variant="outline" className="text-xs">{TYPE_LABEL[t.task_type] ?? t.task_type}</Badge>
                            <Badge variant="outline" className="text-xs">{t.points} pkt</Badge>
                            {!t.is_active && <Badge variant="destructive" className="text-xs">Wyłączone</Badge>}
                            {t.required_to_advance && <Badge className="text-xs">streak</Badge>}
                          </div>
                          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                          <code className="block text-[10px] text-muted-foreground mt-1 truncate font-mono">{JSON.stringify(t.target_ref)}</code>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => toggleActive(t)} title="Włącz/wyłącz"><Power className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => duplicate(t)} title="Duplikuj"><Copy className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(t)} title="Edytuj"><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(t.id)} title="Usuń"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => openNew(day)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj do Dnia {day}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultDay={defaultDay}
        onSaved={load}
      />
    </Card>
  );
};
