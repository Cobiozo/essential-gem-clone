import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayCircle, GraduationCap, BookOpen, ExternalLink, Users, MessageSquare, Share2, UserCheck, ClipboardCheck } from "lucide-react";
import type { ChallengeTask } from "@/types/challenge";

/** Template = a high-level admin choice. It maps to (task_type, target_ref, verification_mode). */
type TemplateKey =
  | "video_hk"
  | "lesson"
  | "resource"
  | "page"
  | "crm_contacts"
  | "dm_threads"
  | "share_video"
  | "profile_100"
  | "self_confirm";

const TEMPLATES: { key: TemplateKey; label: string; desc: string; Icon: any }[] = [
  { key: "video_hk",     label: "Obejrzyj wideo z Bazy Wiedzy", desc: "Wskaż konkretne wideo. Użytkownik otworzy je jednym kliknięciem.", Icon: PlayCircle },
  { key: "lesson",       label: "Otwórz / ukończ lekcję Akademii", desc: "Wskaż moduł i lekcję. Auto-przekierowanie do lekcji.", Icon: GraduationCap },
  { key: "resource",     label: "Otwórz zasób PURE / PDF", desc: "Wskaż zasób z Bazy Wiedzy.", Icon: BookOpen },
  { key: "page",         label: "Wejdź na podstronę aplikacji", desc: "Wybierz konkretną podstronę.", Icon: ExternalLink },
  { key: "crm_contacts", label: "Dodaj N kontaktów do CRM", desc: "CRON liczy nowe kontakty prywatne.", Icon: Users },
  { key: "dm_threads",   label: "Wyślij N nowych wiadomości DM", desc: "CRON liczy nowe wątki.", Icon: MessageSquare },
  { key: "share_video",  label: "Udostępnij wideo X osobom", desc: "Wskaż wideo + liczba odbiorców.", Icon: Share2 },
  { key: "profile_100",  label: "Uzupełnij profil do 100%", desc: "CRON sprawdza komplet danych profilu.", Icon: UserCheck },
  { key: "self_confirm", label: "Zadanie offline (samo-potwierdzenie)", desc: "Użytkownik sam potwierdzi przyciskiem na podstawie opisu.", Icon: ClipboardCheck },
];

const APP_PAGES: { value: string; label: string }[] = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/knowledge", label: "Baza Wiedzy" },
  { value: "/zdrowa-wiedza", label: "Zdrowa Wiedza" },
  { value: "/training", label: "Akademia" },
  { value: "/kontakty-prywatne", label: "Kontakty (CRM)" },
  { value: "/messages", label: "Wiadomości" },
  { value: "/moja-strona", label: "Moja strona partnera" },
  { value: "/events/webinars", label: "Webinary" },
  { value: "/events/individual-meetings", label: "Spotkania 1:1" },
  { value: "/events/team-meetings", label: "Spotkania zespołu" },
  { value: "/aktualnosci", label: "Aktualności" },
  { value: "/my-account", label: "Moje konto" },
  { value: "/moje-testy", label: "Moje testy" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ChallengeTask> | null;
  defaultDay?: number;
  onSaved: () => void;
}

const detectTemplate = (t: Partial<ChallengeTask> | null | undefined): TemplateKey => {
  if (!t) return "self_confirm";
  const r = (t.target_ref ?? {}) as Record<string, any>;
  const check = r.check as string | undefined;
  if (t.task_type === "video_watch") return "video_hk";
  if (t.task_type === "training_lesson") return "lesson";
  if (t.task_type === "resource_view") return "resource";
  if (check === "page_view") return "page";
  if (check === "team_contacts_added") return "crm_contacts";
  if (check === "new_dm_threads") return "dm_threads";
  if (check === "shared_resource_recipients") return "share_video";
  if (check === "profile_completion_100") return "profile_100";
  if (t.verification_mode === "self_confirm" || check === "self_confirm") return "self_confirm";
  return "self_confirm";
};

export const TaskFormDialog = ({ open, onOpenChange, initial, defaultDay, onSaved }: Props) => {
  const [template, setTemplate] = useState<TemplateKey>("self_confirm");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [points, setPoints] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [requiredToAdvance, setRequiredToAdvance] = useState(false);
  const [saving, setSaving] = useState(false);

  // per-template fields
  const [hkResourceId, setHkResourceId] = useState("");
  const [hkCompletionMode, setHkCompletionMode] = useState<"click" | "seconds">("click");
  const [hkSeconds, setHkSeconds] = useState<number>(60);
  const [hkResources, setHkResources] = useState<Array<{ id: string; title: string; duration_seconds: number | null }>>([]);

  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [lessonCompletionMode, setLessonCompletionMode] = useState<"open" | "complete">("open");
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([]);
  const [lessons, setLessons] = useState<Array<{ id: string; title: string }>>([]);

  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<Array<{ id: string; title: string }>>([]);

  const [pagePath, setPagePath] = useState("/dashboard");
  const [count, setCount] = useState<number>(5);
  const [shareResourceId, setShareResourceId] = useState("");
  const [shareCount, setShareCount] = useState<number>(10);

  // ---- init from props ----
  useEffect(() => {
    if (!open) return;
    const t = initial ?? {};
    const r = (t.target_ref ?? {}) as Record<string, any>;
    const tpl = detectTemplate(t);
    setTemplate(tpl);
    setTitle(t.title ?? "");
    setDescription(t.description ?? "");
    setDayNumber(Number(t.day_number ?? defaultDay ?? 1));
    setSortOrder(Number(t.sort_order ?? 0));
    setPoints(Number(t.points ?? 10));
    setIsActive(t.is_active !== false);
    setRequiredToAdvance(!!t.required_to_advance);

    setHkResourceId(r.resource_id ?? "");
    setHkCompletionMode(r.required_seconds ? "seconds" : "click");
    setHkSeconds(Number(r.required_seconds ?? 60));

    setModuleId(r.module_id ?? "");
    setLessonId(r.lesson_id ?? "");
    setLessonCompletionMode(r.check === "training_lesson_completed" ? "complete" : "open");

    setResourceId(r.resource_id ?? "");
    setPagePath(r.page_path ?? "/dashboard");
    setCount(Number(r.count ?? 5));
    setShareResourceId(r.resource_id ?? "");
    setShareCount(Number(r.min_recipients ?? 10));
  }, [open, initial, defaultDay]);

  // ---- load data lists per template ----
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (template === "video_hk") {
        const { data } = await supabase
          .from("healthy_knowledge")
          .select("id, title, duration_seconds")
          .order("title");
        setHkResources((data ?? []) as any);
      } else if (template === "lesson") {
        const { data } = await supabase
          .from("training_modules")
          .select("id, title")
          .eq("is_active", true)
          .order("position");
        setModules((data ?? []) as any);
      } else if (template === "resource" || template === "share_video") {
        const { data } = await supabase
          .from("knowledge_resources")
          .select("id, title")
          .order("position");
        setResources((data ?? []) as any);
      }
    })();
  }, [open, template]);

  useEffect(() => {
    if (template !== "lesson" || !moduleId) { setLessons([]); return; }
    (async () => {
      const { data } = await supabase
        .from("training_lessons")
        .select("id, title")
        .eq("module_id", moduleId)
        .order("position");
      setLessons((data ?? []) as any);
    })();
  }, [template, moduleId]);

  // ---- build payload ----
  const buildPayload = () => {
    let task_type: ChallengeTask["task_type"] = "manual_confirm";
    let target_ref: Record<string, any> = {};
    let verification_mode: ChallengeTask["verification_mode"] = "auto";

    switch (template) {
      case "video_hk":
        if (!hkResourceId) throw new Error("Wybierz wideo z Bazy Wiedzy");
        task_type = "video_watch";
        target_ref = {
          source: "healthy_knowledge",
          resource_id: hkResourceId,
          ...(hkCompletionMode === "seconds" ? { required_seconds: Number(hkSeconds || 60) } : {}),
        };
        break;
      case "lesson":
        if (!lessonId) throw new Error("Wybierz lekcję");
        task_type = "training_lesson";
        target_ref = {
          module_id: moduleId,
          lesson_id: lessonId,
          check: lessonCompletionMode === "complete" ? "training_lesson_completed" : "training_lesson_opened",
        };
        break;
      case "resource":
        if (!resourceId) throw new Error("Wybierz zasób");
        task_type = "resource_view";
        target_ref = { check: "resource_view", resource_id: resourceId };
        break;
      case "page":
        task_type = "button_click";
        target_ref = { check: "page_view", page_path: pagePath };
        break;
      case "crm_contacts":
        task_type = "external_action";
        target_ref = { check: "team_contacts_added", count: Number(count || 1) };
        break;
      case "dm_threads":
        task_type = "external_action";
        target_ref = { check: "new_dm_threads", count: Number(count || 1) };
        break;
      case "share_video":
        if (!shareResourceId) throw new Error("Wybierz wideo do udostępnienia");
        task_type = "external_action";
        target_ref = { check: "shared_resource_recipients", resource_id: shareResourceId, min_recipients: Number(shareCount || 1) };
        break;
      case "profile_100":
        task_type = "manual_confirm";
        target_ref = { check: "profile_completion_100" };
        break;
      case "self_confirm":
        task_type = "manual_confirm";
        target_ref = { check: "self_confirm" };
        verification_mode = "self_confirm";
        break;
    }
    return { task_type, target_ref, verification_mode };
  };

  const save = async () => {
    let built: ReturnType<typeof buildPayload>;
    try { built = buildPayload(); } catch (e: any) { toast.error(e.message); return; }
    if (!title.trim()) { toast.error("Wpisz tytuł zadania"); return; }
    setSaving(true);
    const payload = {
      day_number: Number(dayNumber || 1),
      title: title.trim(),
      description: description.trim(),
      task_type: built.task_type,
      target_ref: built.target_ref,
      points: Number(points || 0),
      required_to_advance: requiredToAdvance,
      verification_mode: built.verification_mode,
      is_active: isActive,
      sort_order: Number(sortOrder || 0),
    };
    const { error } = initial?.id
      ? await (supabase.from("challenge_tasks") as any).update(payload).eq("id", initial.id)
      : await (supabase.from("challenge_tasks") as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial?.id ? "Zapisano zmiany" : "Dodano zadanie");
    onSaved();
    onOpenChange(false);
  };

  const selectedHk = useMemo(() => hkResources.find(r => r.id === hkResourceId), [hkResources, hkResourceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edytuj zadanie" : "Nowe zadanie"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Template grid */}
          <div>
            <Label className="mb-2 block">Typ zadania</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {TEMPLATES.map(({ key, label, desc, Icon }) => {
                const active = template === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setTemplate(key)}
                    className={`text-left rounded-lg border p-3 transition ${active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm leading-tight">{label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dzień</Label>
              <Input type="number" min={1} value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Kolejność</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tytuł zadania</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Obejrzyj wprowadzenie do produktu" />
          </div>
          <div className="space-y-2">
            <Label>Opis (widoczny dla użytkownika)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótka instrukcja co użytkownik ma zrobić." />
          </div>

          {/* Per-template fields */}
          {template === "video_hk" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Wideo z Bazy Wiedzy</Label>
                <Select value={hkResourceId} onValueChange={setHkResourceId}>
                  <SelectTrigger><SelectValue placeholder="Wybierz wideo…" /></SelectTrigger>
                  <SelectContent>
                    {hkResources.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}{r.duration_seconds ? ` (${Math.round(r.duration_seconds / 60)} min)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sposób zaliczenia</Label>
                <RadioGroup value={hkCompletionMode} onValueChange={(v) => {
                  setHkCompletionMode(v as any);
                  if (v === "seconds" && selectedHk?.duration_seconds) setHkSeconds(selectedHk.duration_seconds);
                }}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="click" id="m1" /><Label htmlFor="m1" className="font-normal">Klik w przycisk wystarczy</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="seconds" id="m2" /><Label htmlFor="m2" className="font-normal">Wymagaj obejrzenia X sekund</Label></div>
                </RadioGroup>
                {hkCompletionMode === "seconds" && (
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} value={hkSeconds} onChange={(e) => setHkSeconds(Number(e.target.value))} className="w-32" />
                    <span className="text-xs text-muted-foreground">
                      sekund {selectedHk?.duration_seconds ? `(czas wideo: ${selectedHk.duration_seconds}s)` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {template === "lesson" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Moduł Akademii</Label>
                <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setLessonId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Wybierz moduł…" /></SelectTrigger>
                  <SelectContent>
                    {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lekcja</Label>
                <Select value={lessonId} onValueChange={setLessonId} disabled={!moduleId}>
                  <SelectTrigger><SelectValue placeholder={moduleId ? "Wybierz lekcję…" : "Najpierw wybierz moduł"} /></SelectTrigger>
                  <SelectContent>
                    {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sposób zaliczenia</Label>
                <RadioGroup value={lessonCompletionMode} onValueChange={(v) => setLessonCompletionMode(v as any)}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="open" id="lc1" /><Label htmlFor="lc1" className="font-normal">Otwarcie lekcji wystarczy</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="complete" id="lc2" /><Label htmlFor="lc2" className="font-normal">Wymagaj pełnego ukończenia lekcji</Label></div>
                </RadioGroup>
              </div>
            </div>
          )}

          {template === "resource" && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <Label>Zasób z Bazy Wiedzy</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger><SelectValue placeholder="Wybierz zasób…" /></SelectTrigger>
                <SelectContent>
                  {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {template === "page" && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <Label>Podstrona</Label>
              <Select value={pagePath} onValueChange={setPagePath}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_PAGES.map(p => <SelectItem key={p.value} value={p.value}>{p.label} ({p.value})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(template === "crm_contacts" || template === "dm_threads") && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <Label>Wymagana liczba</Label>
              <Input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-32" />
            </div>
          )}

          {template === "share_video" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Wideo / zasób do udostępnienia</Label>
                <Select value={shareResourceId} onValueChange={setShareResourceId}>
                  <SelectTrigger><SelectValue placeholder="Wybierz zasób…" /></SelectTrigger>
                  <SelectContent>
                    {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Liczba odbiorców</Label>
                <Input type="number" min={1} value={shareCount} onChange={(e) => setShareCount(Number(e.target.value))} className="w-32" />
              </div>
            </div>
          )}

          {template === "profile_100" && (
            <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
              Brak dodatkowych ustawień — CRON sprawdza komplet danych w profilu (imię, nazwisko, email, telefon, miasto, kraj, avatar).
            </p>
          )}

          {template === "self_confirm" && (
            <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
              Użytkownik zobaczy przycisk „Potwierdzam wykonanie" i sam zaliczy zadanie na podstawie opisu. Brak weryfikacji CRON.
            </p>
          )}

          {/* footer settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
            <div className="space-y-2">
              <Label>Punkty</Label>
              <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm">Aktywne</span>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <Switch checked={requiredToAdvance} onCheckedChange={setRequiredToAdvance} />
              <span className="text-sm">Wymagane do streak</span>
            </label>
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
