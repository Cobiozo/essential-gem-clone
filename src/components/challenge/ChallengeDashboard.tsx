import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChallengeHeroBadge } from "./ChallengeHeroBadge";
import { DayTasksList } from "./DayTasksList";
import { PeerReviewInbox } from "./PeerReviewInbox";
import type { ChallengeParticipant, ChallengeSettings } from "@/types/challenge";
import { Flame, Star, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  settings: ChallengeSettings;
  participant: ChallengeParticipant;
}

export const ChallengeDashboard = ({ settings, participant }: Props) => {
  const navigate = useNavigate();
  const accent = settings.accent_color || "#7c3aed";
  const day = Math.max(1, Math.min(participant.current_day, settings.duration_days));
  const pct = Math.round((day / settings.duration_days) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Pulpit
      </Button>
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

      <PeerReviewInbox />

      <DayTasksList participant={participant} currentDay={day} />
    </div>
  );
};

