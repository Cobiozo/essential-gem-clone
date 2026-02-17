import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Users, Wallet, Gift, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface IncomeBreakdownProps {
  clients: number;
  baseCommission: number;
  passivePerClientEur: number;
  passiveMonths: number;
  extensionBonusPerClient: number;
  extensionMonthsCount: number;
  thresholds: VolumeThreshold[];
}

export function IncomeBreakdown({
  clients,
  baseCommission,
  passivePerClientEur,
  passiveMonths,
  extensionBonusPerClient,
  extensionMonthsCount,
  thresholds
}: IncomeBreakdownProps) {
  const { formatAmount } = useCurrency();
  const { tf } = useLanguage();
  
  const getVolumeBonus = (clientCount: number): number => {
    return thresholds
      .filter(t => clientCount >= t.threshold_clients)
      .reduce((sum, t) => sum + t.bonus_amount, 0);
  };

  const directCommission = clients * baseCommission;
  const volumeBonus = getVolumeBonus(clients);
  const passiveIncome = clients * passivePerClientEur * passiveMonths;
  const extensionBonuses = clients * extensionBonusPerClient * extensionMonthsCount;

  const items = [
    {
      icon: Users,
      label: tf('calc.inf.startCommission', 'Prowizja Startowa'),
      description: `1. ${tf('calc.inf.month', 'miesiąc')} (${baseCommission}€/${tf('calc.inf.client', 'klient')})`,
      value: directCommission,
      highlight: false
    },
    {
      icon: Wallet,
      label: tf('calc.inf.passiveIncome', 'Dochód Pasywny'),
      description: `${tf('calc.inf.months', 'Miesiące')} 2-${passiveMonths + 1} (${passivePerClientEur}€/${tf('calc.inf.perMonth', 'msc')})`,
      value: passiveIncome,
      highlight: false
    },
    {
      icon: Gift,
      label: tf('calc.inf.extensionBonuses', 'Premie za przedłużenia'),
      description: `${tf('calc.inf.month', 'Miesiąc')} 4. ${tf('calc.inf.and', 'i')} 6. (+${extensionBonusPerClient}€)`,
      value: extensionBonuses,
      highlight: false
    },
    {
      icon: TrendingUp,
      label: tf('calc.inf.motivationalBonuses', 'Premie Motywacyjne'),
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
          {tf('calc.inf.incomeStructure', 'Struktura przychodu')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {items.map((item, index) => (
          <div key={item.label}>
            <div 
              className={`flex items-center justify-between py-3 transition-all duration-300 ${
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
              <span className={`font-semibold transition-all duration-300 ${item.highlight ? 'text-emerald-600' : 'text-foreground'}`}>
                {formatAmount(item.value)}
              </span>
            </div>
            {index < items.length - 1 && !item.highlight && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
