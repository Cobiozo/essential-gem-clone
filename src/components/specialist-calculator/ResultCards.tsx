import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, TrendingUp, RefreshCw, Award } from "lucide-react";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface ResultCardsProps {
  clients: number;
  baseCommissionEur: number;
  passivePerMonthEur: number;
  passiveMonths: number;
  retentionBonusEur: number;
  retentionMonthsCount: number;
  thresholds: SpecialistVolumeThreshold[];
  eurToPlnRate: number;
}

export function ResultCards({
  clients,
  baseCommissionEur,
  passivePerMonthEur,
  passiveMonths,
  retentionBonusEur,
  retentionMonthsCount,
  thresholds,
  eurToPlnRate
}: ResultCardsProps) {
  // Calculate values
  const commission = clients * baseCommissionEur;
  const passiveIncome = clients * passivePerMonthEur * passiveMonths;
  const retentionBonus = clients * retentionBonusEur * retentionMonthsCount;
  
  // Calculate cumulative volume bonuses (all thresholds up to current clients)
  const volumeBonus = thresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const formatEur = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPln = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value * eurToPlnRate);
  };

  const cards = [
    {
      title: "Prowizja (1. miesiąc)",
      icon: Euro,
      valueEur: commission,
      description: `${clients} × ${baseCommissionEur} €`,
      color: "text-emerald-600"
    },
    {
      title: "Dochód pasywny",
      icon: TrendingUp,
      valueEur: passiveIncome,
      description: `${clients} × ${passivePerMonthEur} € × ${passiveMonths} mies.`,
      color: "text-blue-600"
    },
    {
      title: "Premia za przedłużenie",
      icon: RefreshCw,
      valueEur: retentionBonus,
      description: `${clients} × ${retentionBonusEur} € × ${retentionMonthsCount} mies.`,
      color: "text-purple-600"
    },
    {
      title: "Premie motywacyjne",
      icon: Award,
      valueEur: volumeBonus,
      description: volumeBonus > 0 
        ? `Osiągnięte progi: ${thresholds.filter(t => clients >= t.threshold_clients).length}/${thresholds.length}`
        : "Brak osiągniętych progów",
      color: "text-amber-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${card.color.replace('text-', 'bg-')}`} />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${card.color}`}>
                {formatEur(card.valueEur)} €
              </p>
              <p className="text-sm text-muted-foreground">
                ~{formatPln(card.valueEur)} PLN
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {card.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
