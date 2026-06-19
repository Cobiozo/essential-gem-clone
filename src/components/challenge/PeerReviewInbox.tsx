import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, X, FileText, Image as ImageIcon, Inbox } from "lucide-react";
import type { EvidenceFile } from "@/types/challenge";

interface Row {
  id: string;
  participant_id: string;
  task_id: string;
  evidence: any;
  verification_status: string;
  created_at: string;
  reviewer_comment: string | null;
  task?: { title: string; points: number; min_evidence_files: number };
  partner_name?: string;
}

export const PeerReviewInbox = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [peerParticipantId, setPeerParticipantId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: peerId } = await supabase.rpc("challenge_get_peer", { _user_id: user.id });
    setPeerParticipantId(peerId as any);
    if (!peerId) { setRows([]); setLoading(false); return; }

    const { data: pendingRaw } = await (supabase.from("challenge_task_completions") as any)
      .select("id, participant_id, task_id, evidence, verification_status, created_at, reviewer_comment")
      .eq("participant_id", peerId)
      .in("verification_status", ["pending", "pending_review"])
      .order("created_at", { ascending: false });

    const pending = (pendingRaw ?? []) as any[];
    if (pending.length === 0) { setRows([]); setLoading(false); return; }

    const taskIds = pending.map(r => r.task_id);
    const { data: tasks } = await supabase.from("challenge_tasks").select("id, title, points, min_evidence_files").in("id", taskIds);
    const taskMap = new Map((tasks ?? []).map((t: any) => [t.id, t]));

    const { data: part } = await supabase.from("challenge_participants").select("user_id").eq("id", peerId).maybeSingle();
    const { data: prof } = part?.user_id
      ? await supabase.from("profiles").select("full_name, email").eq("user_id", part.user_id).maybeSingle()
      : { data: null };
    const partnerName = (prof as any)?.full_name || (prof as any)?.email || "Partner";

    setRows(pending.map(r => ({ ...r, task: taskMap.get(r.task_id) as any, partner_name: partnerName })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const verify = async (row: Row, status: "verified" | "rejected") => {
    if (!user?.id) return;
    const min = row.task?.min_evidence_files ?? 0;
    const filesCount = ((row.evidence?.files as EvidenceFile[]) ?? []).length;
    if (status === "verified" && min > filesCount) {
      toast.error(`Partner musi dodać minimum ${min} plik(ów) dowodu`);
      return;
    }
    const patch: any = {
      verification_status: status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_source: "peer",
      reviewer_comment: comments[row.id] ?? null,
    };
    const { error } = await (supabase.from("challenge_task_completions") as any).update(patch).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "verified" ? "Zaliczono partnerowi" : "Odrzucono");
    load();
  };

  if (loading) return <Card className="p-6 flex justify-center"><LoadingSpinner /></Card>;
  if (!peerParticipantId) return null;
  if (rows.length === 0) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="w-4 h-4" /> Twój partner nie ma teraz nic do sprawdzenia.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2"><Inbox className="w-5 h-5 text-primary" /><h3 className="font-semibold">Do zatwierdzenia od partnera ({rows.length})</h3></div>
      <ul className="space-y-3">
        {rows.map(r => {
          const files = (r.evidence?.files ?? []) as EvidenceFile[];
          return (
            <li key={r.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{r.task?.title ?? "Zadanie"}</p>
                  <p className="text-xs text-muted-foreground">od: {r.partner_name} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <Badge variant="secondary">{r.task?.points ?? 0} pkt</Badge>
              </div>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      {f.mime?.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      <a href={f.url} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1">{f.name}</a>
                      <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
              <Textarea
                rows={2}
                placeholder="Komentarz (opcjonalnie)"
                value={comments[r.id] ?? ""}
                onChange={(e) => setComments(c => ({ ...c, [r.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => verify(r, "verified")}><Check className="w-3.5 h-3.5 mr-1.5" /> Zaliczam</Button>
                <Button size="sm" variant="outline" onClick={() => verify(r, "rejected")}><X className="w-3.5 h-3.5 mr-1.5" /> Odrzucam</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
