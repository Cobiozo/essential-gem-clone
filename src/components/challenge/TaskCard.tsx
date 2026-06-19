import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useChallengeAction } from "@/hooks/useChallengeAction";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, PlayCircle, BookOpen, Share2, ExternalLink,
  GraduationCap, ClipboardCheck, Loader2, Users as UsersIcon, MessageSquare, UserCheck,
} from "lucide-react";
import type { ChallengeTask } from "@/types/challenge";

interface Props {
  task: ChallengeTask;
  isCompleted: boolean;
  participantId: string;
  onChanged?: () => void;
}

const ICON_FOR = (task: ChallengeTask) => {
  const r = (task.target_ref ?? {}) as Record<string, any>;
  const check = r.check as string | undefined;
  if (task.task_type === "video_watch") return PlayCircle;
  if (task.task_type === "training_lesson") return GraduationCap;
  if (task.task_type === "resource_view") return BookOpen;
  if (check === "page_view") return ExternalLink;
  if (check === "team_contacts_added") return UsersIcon;
  if (check === "new_dm_threads") return MessageSquare;
  if (check === "shared_resource_recipients") return Share2;
  if (check === "profile_completion_100") return UserCheck;
  return ClipboardCheck;
};

export const TaskCard = ({ task, isCompleted, participantId, onChanged }: Props) => {
  const Icon = ICON_FOR(task);
  const ref = (task.target_ref ?? {}) as Record<string, any>;
  const check = ref.check as string | undefined;
  const isSelfConfirm = task.verification_mode === "self_confirm" || check === "self_confirm";
  const { log } = useChallengeAction();
  const { trackActivity } = useActivityTracking();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const cta = useMemo(() => {
    if (isSelfConfirm) return "Potwierdzam wykonanie";
    if (task.task_type === "video_watch") return "Oglądaj wideo";
    if (task.task_type === "training_lesson") return "Otwórz lekcję";
    if (task.task_type === "resource_view") return "Otwórz zasób";
    if (check === "page_view") return "Przejdź do strony";
    if (check === "team_contacts_added") return `Dodaj kontakty (${ref.count ?? 5})`;
    if (check === "new_dm_threads") return `Napisz wiadomości (${ref.count ?? 3})`;
    if (check === "shared_resource_recipients") return `Udostępnij (${ref.min_recipients ?? 10})`;
    if (check === "profile_completion_100") return "Uzupełnij profil";
    return "Wykonaj";
  }, [task, check, ref, isSelfConfirm]);

  const handleAction = async () => {
    setBusy(true);
    try {
      // Self-confirm: insert verified completion immediately
      if (isSelfConfirm) {
        if (!confirm("Czy na pewno wykonałeś/aś to zadanie zgodnie z opisem?")) { setBusy(false); return; }
        const { error } = await (supabase.from("challenge_task_completions") as any).upsert({
          participant_id: participantId,
          task_id: task.id,
          completed_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          verification_status: "verified",
          verification_source: "self",
          evidence: { self_confirm: true },
        }, { onConflict: "participant_id,task_id" });
        if (error) throw error;
        toast.success("Zaliczone ✓");
        onChanged?.();
        return;
      }

      // Video from Healthy Knowledge → redirect to player
      if (task.task_type === "video_watch") {
        const seconds = Number(ref.required_seconds ?? 0);
        if (seconds > 0) {
          // Pre-log a click; CRON will verify against video_progress
          await log("video_watch", { resource_id: ref.resource_id, watched_seconds: 0 });
          toast.info(`Obejrzyj co najmniej ${seconds}s — zaliczenie po cyklu CRON.`);
        } else {
          await log("video_watch", { resource_id: ref.resource_id, watched_seconds: 1 });
          toast.success("Zarejestrowano — weryfikacja w kolejnym cyklu CRON.");
        }
        if (ref.resource_id) navigate(`/zdrowa-wiedza/player/${ref.resource_id}`);
        return;
      }

      // Training lesson → open module page (deep link to lesson via hash)
      if (task.task_type === "training_lesson") {
        await trackActivity(
          ref.check === "training_lesson_completed" ? "training_lesson_completed" : "training_lesson_opened",
          { lesson_id: ref.lesson_id, module_id: ref.module_id },
          "/training",
        );
        if (ref.module_id) navigate(`/training/${ref.module_id}#lesson-${ref.lesson_id ?? ""}`);
        else navigate("/training");
        return;
      }

      // Knowledge resource view
      if (task.task_type === "resource_view") {
        await trackActivity("resource_view", { resource_id: ref.resource_id }, "/knowledge");
        navigate(`/knowledge?resource=${ref.resource_id ?? ""}`);
        return;
      }

      // page_view
      if (check === "page_view") {
        const path = String(ref.page_path ?? "/dashboard");
        await trackActivity("page_view", { path }, path);
        navigate(path);
        return;
      }

      // CRM contacts
      if (check === "team_contacts_added") { navigate("/kontakty-prywatne"); return; }
      // DM threads
      if (check === "new_dm_threads") { navigate("/messages"); return; }
      // Share
      if (check === "shared_resource_recipients") {
        toast.info("Akcja zostanie zaliczona po udostępnieniu zasobu odbiorcom.");
        navigate(`/zdrowa-wiedza?share=${ref.resource_id ?? ""}`);
        return;
      }
      // Profile 100%
      if (check === "profile_completion_100") { navigate("/my-account"); return; }

      // Fallback
      toast.info("Wykonaj zadanie zgodnie z opisem — weryfikacja w kolejnym cyklu.");
    } catch (e: any) {
      toast.error(e.message ?? "Błąd");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`p-5 transition border-l-4 ${isCompleted ? "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-l-primary/40"}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${isCompleted ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"}`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-semibold leading-tight">{task.title}</h3>
            <Badge variant={isCompleted ? "default" : "secondary"}>{task.points} pkt</Badge>
          </div>
          {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
          {!isCompleted && (
            <Button size="sm" onClick={handleAction} disabled={busy} className="mt-1">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {cta}
            </Button>
          )}
          {isCompleted && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Zaliczone</p>
          )}
        </div>
      </div>
    </Card>
  );
};
