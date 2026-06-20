import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, Trophy, Users, Loader2, Calendar, Medal } from "lucide-react";
import { useChallengeArchive, type ArchivedEdition } from "@/hooks/useChallengeArchive";
import { toast } from "sonner";

export const ChallengeArchivePanel = () => {
  const { editions, loading, archiving, archiveCurrent } = useChallengeArchive();
  const [open, setOpen] = useState<ArchivedEdition | null>(null);

  const handleArchive = async () => {
    if (!confirm("Zarchiwizować obecną edycję wyzwania jako snapshot? (nie kasuje danych)")) return;
    try {
      await archiveCurrent();
      toast.success("Edycja zarchiwizowana");
    } catch (e: any) {
      toast.error(e.message || "Błąd archiwizacji");
    }
  };

  return (
    <>
      <Card className="p-4 space-y-3 sticky top-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Archiwum edycji</h3>
          </div>
          <Button size="sm" variant="outline" onClick={handleArchive} disabled={archiving}>
            {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Zarchiwizuj"}
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Ładuję...</p>
        ) : editions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Brak zarchiwizowanych edycji.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {editions.map(ed => (
              <button
                key={ed.id}
                onClick={() => setOpen(ed)}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ed.title}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ed.start_date} → {ed.end_date}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{ed.participants_count}</Badge>
                </div>
                <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{ed.completed_count}</span>
                  <span className="flex items-center gap-1"><Medal className="w-3 h-3" />{ed.total_points_awarded} pkt</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={v => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Okres" value={`${open.start_date} → ${open.end_date}`} />
                  <Stat label="Uczestników" value={String(open.participants_count)} />
                  <Stat label="Ukończonych" value={String(open.completed_count)} />
                  <Stat label="Suma pkt" value={String(open.total_points_awarded)} />
                </div>

                <section>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Medal className="w-4 h-4" /> Podium</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(open.top_participants ?? []).slice(0, 3).map((p: any, i: number) => (
                      <div key={p.participant_id} className={`rounded-lg p-3 text-center ${i === 0 ? "bg-amber-500/20" : i === 1 ? "bg-zinc-400/20" : "bg-orange-700/20"}`}>
                        <div className="text-xl">{["🥇","🥈","🥉"][i]}</div>
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.total_points} pkt</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Trophy className="w-4 h-4" /> Top 10 uczestników</h4>
                  <ol className="space-y-1">
                    {(open.top_participants ?? []).map((p: any, i: number) => (
                      <li key={p.participant_id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-1.5">
                        <span><strong className="w-6 inline-block text-muted-foreground">#{i+1}</strong> {p.full_name}</span>
                        <span className="text-xs text-muted-foreground">{p.total_points} pkt · streak {p.longest_streak}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Top 5 par</h4>
                  <ol className="space-y-1">
                    {(open.top_pairs ?? []).map((p: any, i: number) => (
                      <li key={p.pair_id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-1.5">
                        <span><strong className="w-6 inline-block text-muted-foreground">#{i+1}</strong> {p.a?.full_name ?? "?"} & {p.b?.full_name ?? "?"}</span>
                        <span className="text-xs text-muted-foreground">{p.combined} pkt</span>
                      </li>
                    ))}
                    {(!open.top_pairs || open.top_pairs.length === 0) && (
                      <li className="text-xs text-muted-foreground">Brak par w tej edycji.</li>
                    )}
                  </ol>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-2.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold mt-0.5">{value}</p>
  </div>
);
