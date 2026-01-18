import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Wallet } from "lucide-react";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface TotalSummaryProps {
  clients: number;
  baseCommissionEur: number;
  passivePerMonthEur: number;
  passiveMonths: number;
  retentionBonusEur: number;
  retentionMonthsCount: number;
  thresholds: SpecialistVolumeThreshold[];
  eurToPlnRate: number;
}

export function TotalSummary({
  clients,
  baseCommissionEur,
  passivePerMonthEur,
  passiveMonths,
  retentionBonusEur,
  retentionMonthsCount,
  thresholds,
  eurToPlnRate
}: TotalSummaryProps) {
  // Calculate all components
  const commission = clients * baseCommissionEur;
  const passiveIncome = clients * passivePerMonthEur * passiveMonths;
  const retentionBonus = clients * retentionBonusEur * retentionMonthsCount;
  const volumeBonus = thresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const totalEur = commission + passiveIncome + retentionBonus + volumeBonus;
  const totalPln = totalEur * eurToPlnRate;
  const monthlyAvgEur = totalEur / 6;
  const monthlyAvgPln = totalPln / 6;

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Podsumowanie (6 miesięcy)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Łączny przychód</p>
            <p className="text-4xl font-bold text-primary">
              {formatNumber(totalEur)} €
            </p>
            <p className="text-lg text-muted-foreground">
              ~{formatNumber(totalPln)} PLN
            </p>
          </div>
          
          {/* Monthly Average */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Średnio miesięcznie
            </p>
            <p className="text-3xl font-bold text-foreground">
              {formatNumber(monthlyAvgEur)} €
            </p>
            <p className="text-lg text-muted-foreground">
              ~{formatNumber(monthlyAvgPln)} PLN
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">Struktura przychodu:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prowizja:</span>
              <span className="font-medium">{formatNumber(commission)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pasywny:</span>
              <span className="font-medium">{formatNumber(passiveIncome)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Przedłużenie:</span>
              <span className="font-medium">{formatNumber(retentionBonus)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Premie:</span>
              <span className="font-medium">{formatNumber(volumeBonus)} €</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
