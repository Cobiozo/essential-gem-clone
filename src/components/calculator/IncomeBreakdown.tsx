import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Users, Wallet, Gift, TrendingUp } from 'lucide-react';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface IncomeBreakdownProps {
  clients: number;
  baseCommission: number;
  passiveRatePercentage: number;
  passiveMonths: number;
  extensionBonusPerClient: number;
  extensionMonthsCount: number;
  thresholds: VolumeThreshold[];
}

export function IncomeBreakdown({
  clients,
  baseCommission,
  passiveRatePercentage,
  passiveMonths,
  extensionBonusPerClient,
  extensionMonthsCount,
  thresholds
}: IncomeBreakdownProps) {
  
  const getVolumeBonus = (clientCount: number): number => {
    for (const threshold of [...thresholds].reverse()) {
      if (clientCount >= threshold.threshold_clients) {
        return threshold.bonus_amount;
      }
    }
    return 0;
  };

  const directCommission = clients * baseCommission;
  const volumeBonus = getVolumeBonus(clients);
  const passiveIncome = directCommission * (passiveRatePercentage / 100) * passiveMonths;
  const extensionBonuses = clients * extensionBonusPerClient * extensionMonthsCount;

  const formatEUR = (value: number) => 
    value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

  const items = [
    {
      icon: Users,
      label: 'Prowizja Startowa',
      description: `1. miesiąc (${baseCommission}€/klient)`,
      value: directCommission,
      highlight: false
    },
    {
      icon: Wallet,
      label: 'Dochód Pasywny',
      description: `Miesiące 2-${passiveMonths + 1} (${(baseCommission * passiveRatePercentage / 100).toFixed(0)}€/msc)`,
      value: passiveIncome,
      highlight: false
    },
    {
      icon: Gift,
      label: 'Premie za przedłużenia',
      description: `Miesiąc 4. i 6. (+${extensionBonusPerClient}€)`,
      value: extensionBonuses,
      highlight: false
    },
    {
      icon: TrendingUp,
      label: 'Premie Motywacyjne',
      description: 'Volume Bonus',
      value: volumeBonus,
      highlight: true
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-emerald-600" />
          Struktura przychodu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {items.map((item, index) => (
          <div key={item.label}>
            <div 
              className={`flex items-center justify-between py-3 ${
                item.highlight ? 'rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 -mx-3' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${item.highlight ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${item.highlight ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span className={`font-semibold ${item.highlight ? 'text-emerald-600' : 'text-foreground'}`}>
                {formatEUR(item.value)}
              </span>
            </div>
            {index < items.length - 1 && !item.highlight && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
