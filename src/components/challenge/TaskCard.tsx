import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChallengeAction } from "@/hooks/useChallengeAction";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, PlayCircle, BookOpen, Share2, ExternalLink,
  GraduationCap, ClipboardCheck, Loader2, Users as UsersIcon, MessageSquare, UserCheck, Hourglass,
  Upload, Handshake, Link as LinkIcon, Send,
} from "lucide-react";
import type { ChallengeTask, EvidenceFile } from "@/types/challenge";
import { EvidenceUploader } from "./EvidenceUploader";
import { ShareToContactsDialog } from "./ShareToContactsDialog";

interface Props {
  task: ChallengeTask;
  isCompleted: boolean;
  participantId: string;
  onChanged?: () => void;
  completionStatus?: string;
  initialEvidence?: EvidenceFile[];
}

const ICON_FOR = (task: ChallengeTask) => {
  const r = (task.target_ref ?? {}) as Record<string, any>;
  const check = r.check as string | undefined;
  if (task.task_type === "video_watch") return PlayCircle;
  if (task.task_type === "training_lesson") return GraduationCap;
  if (task.task_type === "resource_view") return BookOpen;
  if (task.task_type === "external_url") return LinkIcon;
  if (task.task_type === "file_upload") return Upload;
  if (check === "peer_review" || task.verification_mode === "peer") return Handshake;
  if (check === "page_view") return ExternalLink;
  if (check === "team_contacts_added") return UsersIcon;
  if (check === "new_dm_threads") return MessageSquare;
  if (check === "shared_resource_recipients") return Share2;
  if (check === "profile_completion_100") return UserCheck;
  return ClipboardCheck;
};

export const TaskCard = ({ task, isCompleted, participantId, onChanged, completionStatus, initialEvidence }: Props) => {
  const Icon = ICON_FOR(task);
  const ref = (task.target_ref ?? {}) as Record<string, any>;
  const check = ref.check as string | undefined;
  const { user } = useAuth();
  const isSelfConfirm = task.verification_mode === "self_confirm" || check === "self_confirm";
  const requiresEvidence = !!task.requires_evidence;
  const isPeer = task.verification_mode === "peer";
  const isAdminReview = task.verification_mode === "admin_review";
  const minFiles = task.min_evidence_files ?? 0;

  const pendingKey = `challenge_pending_${task.id}`;
  const [pendingSince, setPendingSince] = useState<number | null>(() => {
    try { const v = localStorage.getItem(pendingKey); return v ? Number(v) : null; } catch { return null; }
  });
  const [evidence, setEvidence] = useState<EvidenceFile[]>(initialEvidence ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      try { localStorage.removeItem(pendingKey); } catch {/* noop */}
      setPendingSince(null);
    }
  }, [isCompleted, pendingKey]);

  const markPending = () => {
    const ts = Date.now();
    try { localStorage.setItem(pendingKey, String(ts)); } catch {/* noop */}
    setPendingSince(ts);
  };

  const { log } = useChallengeAction();
  const { trackActivity } = useActivityTracking();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const cta = useMemo(() => {
    if (isSelfConfirm) return "Potwierdzam wykonanie";
    if (task.task_type === "video_watch") return "Oglądaj wideo";
    if (task.task_type === "training_lesson") return "Otwórz lekcję";
    if (task.task_type === "resource_view") return "Otwórz zasób";
    if (task.task_type === "external_url") return "Otwórz link";
    if (task.task_type === "file_upload") return "Wgraj plik";
    if (check === "peer_review") return "Oznacz jako wykonane";
    if (check === "page_view") return "Przejdź do strony";
    if (check === "team_contacts_added") return `Dodaj kontakty (${ref.count ?? 5})`;
    if (check === "new_dm_threads") return `Napisz wiadomości (${ref.count ?? 3})`;
    if (check === "shared_resource_recipients") return `Udostępnij (${ref.min_recipients ?? 10})`;
    if (check === "profile_completion_100") return "Uzupełnij profil";
    return "Wykonaj";
  }, [task, check, ref, isSelfConfirm]);

  // Ensure a pending completion row exists when user starts a task that needs evidence/peer
  const ensureCompletionRow = async (status: "pending" | "pending_review") => {
    await (supabase.from("challenge_task_completions") as any).upsert({
      participant_id: participantId,
      task_id: task.id,
      task_started_at: new Date().toISOString(),
      verification_status: status,
      evidence: { files: evidence },
    }, { onConflict: "participant_id,task_id" });
  };

  const submitForReview = async () => {
    if (minFiles > evidence.length) {
      toast.error(`Wgraj minimum ${minFiles} plik(ów) dowodu`);
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase.from("challenge_task_completions") as any).upsert({
      participant_id: participantId,
      task_id: task.id,
      completed_at: new Date().toISOString(),
      verification_status: "pending_review",
      evidence: { files: evidence },
    }, { onConflict: "participant_id,task_id" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isPeer ? "Wysłano do partnera do akceptacji" : "Wysłano do akceptacji admina");
    markPending();
    onChanged?.();
  };

  const handleAction = async () => {
    setBusy(true);
    try {
      // Self-confirm: insert verified completion immediately
      if (isSelfConfirm && !requiresEvidence) {
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

      // External URL → open + ensure pending row, evidence required
      if (task.task_type === "external_url") {
        await ensureCompletionRow("pending");
        if (ref.external_url) window.open(String(ref.external_url), "_blank", "noopener,noreferrer");
        toast.info("Po wykonaniu wróć i wgraj dowód.");
        return;
      }

      // File upload as primary action: just ensure row
      if (task.task_type === "file_upload") {
        await ensureCompletionRow("pending");
        toast.info("Wgraj plik dowodu poniżej.");
        return;
      }

      // Peer task (manual_confirm + peer): mark pending, evidence optional
      if (check === "peer_review" || (isPeer && task.task_type === "manual_confirm")) {
        await ensureCompletionRow("pending");
        toast.info('Po wykonaniu kliknij „Wyślij partnerowi do akceptacji".');
        return;
      }

      // Video from Healthy Knowledge → redirect to player
      if (task.task_type === "video_watch") {
        const seconds = Number(ref.required_seconds ?? 0);
        if (seconds > 0) {
          await log("video_watch", { resource_id: ref.resource_id, watched_seconds: 0 });
          toast.info(`Obejrzyj co najmniej ${seconds}s — zaliczenie po cyklu CRON.`);
        } else {
          await log("video_watch", { resource_id: ref.resource_id, watched_seconds: 1 });
          toast.success("Zarejestrowano — weryfikacja w kolejnym cyklu CRON.");
        }
        if (ref.resource_id) navigate(`/zdrowa-wiedza/player/${ref.resource_id}`);
        return;
      }

      // Training lesson
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

      if (check === "team_contacts_added") { navigate("/my-account?tab=n"); return; }
      if (check === "new_dm_threads") { navigate("/messages"); return; }
      if (check === "shared_resource_recipients") {
        toast.info("Akcja zostanie zaliczona po udostępnieniu zasobu odbiorcom.");
        navigate(`/zdrowa-wiedza?share=${ref.resource_id ?? ""}`);
        return;
      }
      if (check === "profile_completion_100") { navigate("/my-account"); return; }

      toast.info("Wykonaj zadanie zgodnie z opisem — weryfikacja w kolejnym cyklu.");
    } catch (e: any) {
      toast.error(e.message ?? "Błąd");
    } finally {
      if (!isSelfConfirm) markPending();
      setBusy(false);
    }
  };

  const evidenceEnabled = requiresEvidence || task.task_type === "external_url" || task.task_type === "file_upload";
  const statusBadge = completionStatus === "pending_review"
    ? <Badge variant="outline" className="border-amber-500 text-amber-700">Czeka na akceptację</Badge>
    : completionStatus === "rejected"
    ? <Badge variant="destructive">Odrzucone</Badge>
    : null;

  return (
    <Card className={`p-5 transition border-l-4 ${isCompleted ? "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-l-primary/40"}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${isCompleted ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"}`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-semibold leading-tight">{task.title}</h3>
            <div className="flex items-center gap-2">
              {statusBadge}
              <Badge variant={isCompleted ? "default" : "secondary"}>{task.points} pkt</Badge>
            </div>
          </div>
          {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

          {!isCompleted && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleAction} disabled={busy} className="mt-1">
                  {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {cta}
                </Button>
                {(isPeer || isAdminReview || evidenceEnabled) && completionStatus !== "pending_review" && (
                  <Button size="sm" variant="default" onClick={submitForReview} disabled={submitting} className="mt-1">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                    {isPeer ? "Wyślij partnerowi" : "Wyślij do akceptacji"}
                  </Button>
                )}
              </div>

              {evidenceEnabled && user?.id && (
                <div className="rounded-md border bg-muted/20 p-2 space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Wymagany dowód: minimum {Math.max(1, minFiles)} plik(ów) — PDF, DOC, XLS, PNG, JPG (max 10 MB).
                  </p>
                  <EvidenceUploader
                    userId={user.id}
                    taskId={task.id}
                    files={evidence}
                    onChange={setEvidence}
                    maxFiles={5}
                  />
                </div>
              )}

              {pendingSince && !isSelfConfirm && completionStatus !== "pending_review" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <Hourglass className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-pulse" />
                  <span>
                    <strong>Weryfikacja w toku.</strong> Sprawdzamy zaliczenie automatycznie co 15 minut — możesz spokojnie kontynuować, zadanie zaliczy się samo, gdy spełnisz warunki.
                  </span>
                </div>
              )}

              {completionStatus === "pending_review" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <Hourglass className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-pulse" />
                  <span><strong>Czeka na akceptację.</strong> {isPeer ? "Partner z pary" : "Admin"} sprawdzi Twój dowód i zaliczy zadanie.</span>
                </div>
              )}
            </div>
          )}
          {isCompleted && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Zaliczone</p>
          )}
        </div>
      </div>
    </Card>
  );
};
