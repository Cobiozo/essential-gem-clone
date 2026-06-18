import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChallengeHeroBadge } from "./ChallengeHeroBadge";
import type { ChallengeParticipant, ChallengeSettings } from "@/types/challenge";
import { Flame, Star, Calendar } from "lucide-react";

interface Props {
  settings: ChallengeSettings;
  participant: ChallengeParticipant;
}

export const ChallengeDashboard = ({ settings, participant }: Props) => {
  const accent = settings.accent_color || "#7c3aed";
  const day = Math.min(participant.current_day, settings.duration_days);
  const pct = Math.round((day / settings.duration_days) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="relative overflow-hidden rounded-3xl p-8" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa 60%, hsl(var(--background)))` }}>
        <div className="relative text-white space-y-3">
          <ChallengeHeroBadge accent="#fff" />
          <h1 className="text-3xl md:text-5xl font-black">Dzień {day} <span className="opacity-70 text-2xl md:text-4xl font-bold">/ {settings.duration_days}</span></h1>
          <Progress value={pct} className="h-2 bg-white/20" />
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-sm">
              <Star className="w-4 h-4" /> {participant.total_points} pkt
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-sm">
              <Flame className="w-4 h-4" /> seria {participant.current_streak}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-sm">
              <Calendar className="w-4 h-4" /> start {participant.start_date}
            </span>
          </div>
        </div>
      </div>

      <Card className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold">Twoje zadania na dziś</h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Zadania będą dodawane przez administratora i pojawią się tutaj automatycznie każdego dnia o 06:00.
        </p>
      </Card>
    </div>
  );
};
