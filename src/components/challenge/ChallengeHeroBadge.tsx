import { Trophy } from "lucide-react";

export const ChallengeHeroBadge = ({ accent = "var(--challenge-accent)" }: { accent?: string }) => (
  <div
    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
    style={{
      background: `linear-gradient(135deg, ${accent}22, ${accent}11)`,
      border: `1px solid ${accent}44`,
      color: accent,
    }}
  >
    <Trophy className="w-3.5 h-3.5" />
    Wyzwanie 90-dniowe
  </div>
);
