import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Medal, Flame } from "lucide-react";
import { useChallengeLiveStats } from "@/hooks/useChallengeLiveStats";

interface Props {
  currentParticipantId?: string;
  showRanking?: boolean;
}

export const ChallengeStatsSidebar = ({ currentParticipantId, showRanking = true }: Props) => {
  const { participantsCount, topIndividuals, topPairs, loading } = useChallengeLiveStats(5);

  return (
    <aside className="space-y-4 lg:sticky lg:top-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Uczestnicy</span>
          </div>
          <Badge variant="secondary" className="text-base px-3">{participantsCount}</Badge>
        </div>
      </Card>

      {showRanking && (
        <>
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top 5 indywidualnie
            </h3>
            {loading ? (
              <p className="text-xs text-muted-foreground">Ładuję…</p>
            ) : topIndividuals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak uczestników.</p>
            ) : (
              <ol className="space-y-1.5">
                {topIndividuals.map((p, i) => {
                  const me = p.participant_id === currentParticipantId;
                  return (
                    <li
                      key={p.participant_id}
                      className={`flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 ${me ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs w-5 text-muted-foreground">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <span className="truncate">{p.full_name}{me ? " (Ty)" : ""}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0 text-xs">
                        <span className="font-semibold">{p.total_points}</span>
                        <span className="text-muted-foreground inline-flex items-center gap-0.5">
                          <Flame className="w-3 h-3" />{p.current_streak}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Medal className="w-4 h-4 text-violet-500" /> Top 5 par
            </h3>
            {loading ? (
              <p className="text-xs text-muted-foreground">Ładuję…</p>
            ) : topPairs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak par.</p>
            ) : (
              <ol className="space-y-1.5">
                {topPairs.map((p, i) => {
                  const mine = p.a?.participant_id === currentParticipantId || p.b?.participant_id === currentParticipantId;
                  return (
                    <li
                      key={p.pair_id}
                      className={`flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 ${mine ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs w-5 text-muted-foreground">#{i + 1}</span>
                        <span className="truncate">{p.a?.full_name ?? "?"} & {p.b?.full_name ?? "?"}</span>
                      </span>
                      <span className="font-semibold text-xs shrink-0">{p.combined}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </>
      )}
    </aside>
  );
};
