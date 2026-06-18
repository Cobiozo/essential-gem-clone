import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useChallengeAction } from "@/hooks/useChallengeAction";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  BookOpen,
  Users as UsersIcon,
  Share2,
  ExternalLink,
  GraduationCap,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import type { ChallengeTask } from "@/types/challenge";

interface Props {
  task: ChallengeTask;
  isCompleted: boolean;
  participantId: string;
  onChanged?: () => void;
}

const ICONS: Record<string, typeof PlayCircle> = {
  video_watch: PlayCircle,
  resource_view: BookOpen,
  training_lesson: GraduationCap,
  button_click: ExternalLink,
  link_visit: ExternalLink,
  file_download: BookOpen,
  manual_confirm: ClipboardCheck,
  external_action: ClipboardCheck,
};

export const TaskCard = ({ task, isCompleted, participantId, onChanged }: Props) => {
  const Icon = ICONS[task.task_type] ?? Circle;
  const ref = (task.target_ref ?? {}) as Record<string, any>;
  const check = ref.check as string | undefined;
  const { log } = useChallengeAction();
  const [busy, setBusy] = useState(false);

  const cta = useMemo(() => renderCta(task, ref, check), [task, ref, check]);

  const handleAction = async () => {
    setBusy(true);
    try {
      if (task.task_type === "video_watch") {
        await log("video_watch", {
          resource_id: ref.resource_id,
          watched_seconds: Number(ref.required_seconds ?? 60),
        });
        toast.success("Zarejestrowano oglądanie — weryfikacja w kolejnym cyklu CRON.");
      } else if (task.task_type === "resource_view") {
        window.open(`/knowledge?resource=${ref.resource_id}`, "_blank");
      } else if (task.task_type === "training_lesson" || check === "training_lesson_opened") {
        window.open(`/training?lesson=${ref.lesson_id}`, "_blank");
      } else if (check === "team_contacts_added") {
        window.open("/kontakty-prywatne", "_blank");
      } else if (check === "shared_resource_recipients") {
        window.open(`/zdrowa-wiedza?share=${ref.resource_id}`, "_blank");
      } else if (check === "new_dm_threads") {
        window.open("/wiadomosci", "_blank");
      } else if (check === "page_view") {
        window.open(String(ref.page_path ?? "/dashboard"), "_blank");
      } else if (task.task_type === "manual_confirm") {
        await (supabase.from("challenge_task_completions") as any).upsert({
          participant_id: participantId,
          task_id: task.id,
          completed_at: new Date().toISOString(),
          verification_status: "pending",
          evidence: { manual: true },
        }, { onConflict: "participant_id,task_id" });
        toast.success("Zgłoszono do weryfikacji.");
        onChanged?.();
      }
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
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          {!isCompleted && (
            <Button size="sm" onClick={handleAction} disabled={busy} className="mt-1">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {cta}
            </Button>
          )}
          {isCompleted && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Zaliczone
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

function renderCta(task: ChallengeTask, ref: Record<string, any>, check?: string): string {
  switch (task.task_type) {
    case "video_watch": return "Oglądaj wideo";
    case "resource_view": return "Otwórz zasób";
    case "training_lesson": return "Otwórz lekcję";
    case "manual_confirm": return "Zgłoś wykonanie";
  }
  switch (check) {
    case "team_contacts_added": return `Dodaj kontakty (${ref.count ?? 5})`;
    case "shared_resource_recipients": return `Udostępnij (${ref.min_recipients ?? 10})`;
    case "training_lesson_opened": return "Otwórz Akademię";
    case "new_dm_threads": return `Napisz DM (${ref.count ?? 3})`;
    case "page_view": return "Odwiedź stronę";
  }
  return "Wykonaj";
}
