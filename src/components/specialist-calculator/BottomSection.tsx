import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface BottomSectionProps {
  clients: number;
  baseCommissionEur: number;
  passivePerMonthEur: number;
  passiveMonths: number;
  retentionBonusEur: number;
  retentionMonthsCount: number;
  thresholds: SpecialistVolumeThreshold[];
}

export function BottomSection({
  clients,
  baseCommissionEur,
  passivePerMonthEur,
  passiveMonths,
  retentionBonusEur,
  retentionMonthsCount,
  thresholds
}: BottomSectionProps) {
  const commission = clients * baseCommissionEur;
  const passiveIncome = clients * passivePerMonthEur * passiveMonths;
  const retentionBonus = clients * retentionBonusEur * retentionMonthsCount;
  const volumeBonus = thresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const totalEur = commission + passiveIncome + retentionBonus + volumeBonus;
  const monthlyAvgEur = totalEur / 6;

  // Calculate percentages
  const startPercent = totalEur > 0 ? Math.round((commission / totalEur) * 100) : 0;
  const passivePercent = totalEur > 0 ? Math.round((passiveIncome / totalEur) * 100) : 0;
  const bonusesPercent = totalEur > 0 ? Math.round(((retentionBonus + volumeBonus) / totalEur) * 100) : 0;

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Find max threshold bonus for tip
  const maxThreshold = thresholds.length > 0 
    ? thresholds.reduce((max, t) => t.threshold_clients > max.threshold_clients ? t : max, thresholds[0])
    : null;
  
  const totalPossibleBonus = thresholds.reduce((sum, t) => sum + t.bonus_amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left - Dark Card */}
      <Card className="bg-slate-800 text-white border-0">
        <CardContent className="py-6 px-6">
          <p className="text-xs font-bold tracking-wide uppercase text-slate-300 mb-2">
            Łączny przychód (6 miesięcy)
          </p>
          <p className="text-5xl font-bold mb-4">
            {formatNumber(totalEur)} €
          </p>
          <p className="text-sm text-slate-300 mb-4">
            To estymacja przy założeniu, że klienci pozostaną na pełnej kuracji. Kwota zawiera wszystkie prowizje i bonusy.
          </p>
          <div className="border-t border-slate-600 pt-4">
            <p className="text-sm text-slate-300">
              Średnio miesięcznie: <span className="text-emerald-400 font-semibold">{formatNumber(monthlyAvgEur)} €</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Right - White Card */}
      <Card>
        <CardContent className="py-6 px-6">
          <p className="font-semibold text-lg mb-4">Struktura przychodu</p>
          
          <div className="space-y-4">
            {/* Start bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start (Miesiąc 1)</span>
                <span className="font-medium">{startPercent}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${startPercent}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatNumber(commission)} €
              </div>
            </div>

            {/* Passive bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pasywny (Mies. 2-6)</span>
                <span className="font-medium">{passivePercent}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${passivePercent}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatNumber(passiveIncome)} €
              </div>
            </div>

            {/* Bonuses bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bonusy (Wolumen + Retention)</span>
                <span className="font-medium">{bonusesPercent}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${bonusesPercent}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatNumber(retentionBonus + volumeBonus)} €
              </div>
            </div>
          </div>

          {/* Tip */}
          {maxThreshold && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Wskazówka:</span> Przy {formatNumber(maxThreshold.threshold_clients)} klientów 
                  przekraczasz wszystkie progi bonusowe, co daje dodatkowe{" "}
                  <span className="font-bold">{formatNumber(totalPossibleBonus)} €</span> w samych premiach motywacyjnych.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
