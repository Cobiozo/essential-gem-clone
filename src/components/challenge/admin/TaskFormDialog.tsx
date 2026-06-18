import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChallengeTask, ChallengeTaskType } from "@/types/challenge";

const TASK_TYPES: { value: ChallengeTaskType; label: string }[] = [
  { value: "video_watch", label: "Oglądnięcie wideo (sekundy)" },
  { value: "resource_view", label: "Odwiedzenie zasobu" },
  { value: "training_lesson", label: "Ukończenie lekcji w Akademii" },
  { value: "button_click", label: "Kliknięcie w przycisk / element" },
  { value: "link_visit", label: "Wizyta na podstronie" },
  { value: "external_action", label: "Akcja w aplikacji (kontakty, DM…)" },
  { value: "manual_confirm", label: "Ręczne potwierdzenie / profil 100%" },
  { value: "file_download", label: "Pobranie pliku" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ChallengeTask> | null;
  defaultDay?: number;
  onSaved: () => void;
}

export const TaskFormDialog = ({ open, onOpenChange, initial, defaultDay, onSaved }: Props) => {
  const [form, setForm] = useState<Partial<ChallengeTask>>({});
  const [rawJson, setRawJson] = useState<string>("{}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base: Partial<ChallengeTask> = initial ?? {
      day_number: defaultDay ?? 1,
      title: "",
      description: "",
      task_type: "manual_confirm",
      target_ref: {},
      points: 10,
      required_to_advance: false,
      verification_mode: "auto",
      is_active: true,
      sort_order: 0,
    };
    setForm(base);
    setRawJson(JSON.stringify(base.target_ref ?? {}, null, 2));
  }, [open, initial, defaultDay]);

  const update = (k: keyof ChallengeTask, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    let target_ref: Record<string, unknown> = {};
    try {
      target_ref = JSON.parse(rawJson || "{}");
    } catch {
      toast.error("Nieprawidłowy JSON w polu parametrów");
      return;
    }
    setSaving(true);
    const payload = {
      day_number: Number(form.day_number ?? 1),
      title: form.title ?? "",
      description: form.description ?? "",
      task_type: form.task_type ?? "manual_confirm",
      target_ref,
      points: Number(form.points ?? 10),
      required_to_advance: !!form.required_to_advance,
      verification_mode: form.verification_mode ?? "auto",
      is_active: form.is_active !== false,
      sort_order: Number(form.sort_order ?? 0),
    };
    const { error } = initial?.id
      ? await (supabase.from("challenge_tasks") as any).update(payload).eq("id", initial.id)
      : await (supabase.from("challenge_tasks") as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial?.id ? "Zapisano zmiany" : "Dodano zadanie");
    onSaved();
    onOpenChange(false);
  };

  const hint = (() => {
    switch (form.task_type) {
      case "video_watch":
        return `{ "resource_id": "<uuid>", "required_seconds": 180, "source": "healthy_knowledge" }`;
      case "resource_view":
        return `{ "resource_id": "<uuid>", "check": "resource_view" }`;
      case "training_lesson":
        return `{ "lesson_id": "<uuid>", "module_id": "<uuid>" }`;
      case "button_click":
        return `{ "check": "button_click", "key": "open_lesson", "lesson_id": "<uuid>" }`;
      case "link_visit":
        return `{ "check": "link_visit", "page": "/dashboard" }`;
      case "external_action":
        return `{ "check": "team_contacts_added", "count": 5 }  // lub share_resource / dm_threads_created`;
      case "manual_confirm":
        return `{ "check": "profile_completion_100" }`;
      default:
        return "{}";
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edytuj zadanie" : "Nowe zadanie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dzień</Label>
              <Input type="number" min={1} value={form.day_number ?? 1} onChange={(e) => update("day_number", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Kolejność</Label>
              <Input type="number" value={form.sort_order ?? 0} onChange={(e) => update("sort_order", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tytuł</Label>
            <Input value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Opis</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ zadania</Label>
              <Select value={form.task_type} onValueChange={(v) => update("task_type", v as ChallengeTaskType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Punkty</Label>
              <Input type="number" value={form.points ?? 10} onChange={(e) => update("points", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Parametry weryfikacji (JSON)</Label>
            <Textarea rows={6} className="font-mono text-xs" value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">Przykład: {hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              <Switch checked={form.is_active !== false} onCheckedChange={(v) => update("is_active", v)} />
              <span className="text-sm">Aktywne</span>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={!!form.required_to_advance} onCheckedChange={(v) => update("required_to_advance", v)} />
              <span className="text-sm">Wymagane do streak</span>
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Tryb:</Label>
              <Select value={form.verification_mode ?? "auto"} onValueChange={(v) => update("verification_mode", v as any)}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (CRON)</SelectItem>
                  <SelectItem value="manual_admin">Ręcznie (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Zapisuję..." : "Zapisz"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
