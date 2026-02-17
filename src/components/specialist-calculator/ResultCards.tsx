import { Card, CardContent } from "@/components/ui/card";
import { Euro, TrendingUp, RefreshCw, Award } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface ResultCardsProps {
  clients: number;
  baseCommissionEur: number;
  passivePerMonthEur: number;
  passiveMonths: number;
  retentionBonusEur: number;
  retentionMonthsCount: number;
  thresholds: SpecialistVolumeThreshold[];
}

export function ResultCards({
  clients,
  baseCommissionEur,
  passivePerMonthEur,
  passiveMonths,
  retentionBonusEur,
  retentionMonthsCount,
  thresholds
}: ResultCardsProps) {
  const { formatAmount } = useCurrency();
  const { tf } = useLanguage();
  
  const commission = clients * baseCommissionEur;
  const passiveIncome = clients * passivePerMonthEur * passiveMonths;
  const retentionBonus = clients * retentionBonusEur * retentionMonthsCount;
  const volumeBonus = thresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const cards = [
    {
      title: tf('calc.spec.commission', 'Prowizja (1. miesiąc)'),
      icon: Euro,
      valueEur: commission,
      description: `${baseCommissionEur}€ ${tf('calc.spec.perClient', 'za każdego klienta (start)')}`,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      valueColor: "text-foreground"
    },
    {
      title: tf('calc.spec.passiveIncome', 'Dochód Pasywny'),
      icon: TrendingUp,
      valueEur: passiveIncome,
      description: `${tf('calc.spec.sumMonths', 'Suma za miesiące 2-6')} (${passivePerMonthEur}€/${tf('calc.spec.perMonth', 'mc')})`,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-foreground"
    },
    {
      title: tf('calc.spec.retentionBonus', 'Premia za Przedłużenie'),
      icon: RefreshCw,
      valueEur: retentionBonus,
      description: `${tf('calc.spec.additional', 'Dodatkowe')} ${retentionBonusEur}€ ${tf('calc.spec.inMonth4and6', 'w 4. i 6. miesiącu')}`,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      valueColor: "text-foreground"
    },
    {
      title: tf('calc.spec.motivationalBonuses', 'Premie Motywacyjne'),
      icon: Award,
      valueEur: volumeBonus,
      description: tf('calc.spec.summedBonuses', 'Sumowane bonusy za progi klientów'),
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
      valueColor: "text-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {card.title}
                </p>
                <p className={`text-xl font-bold ${card.valueColor}`}>
                  {formatAmount(card.valueEur)}
                </p>
                <p className={`text-xs mt-1 ${index === 3 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                  {card.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
