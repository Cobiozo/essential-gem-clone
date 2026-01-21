import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface TotalResultCardProps {
  clients: number;
  baseCommission: number;
  passivePerClientEur: number;
  passiveMonths: number;
  extensionBonusPerClient: number;
  extensionMonthsCount: number;
  thresholds: VolumeThreshold[];
  maxClients: number;
}

export function TotalResultCard({
  clients,
  baseCommission,
  passivePerClientEur,
  passiveMonths,
  extensionBonusPerClient,
  extensionMonthsCount,
  thresholds,
  maxClients
}: TotalResultCardProps) {
  const { currency, formatAmount, eurToPlnRate } = useCurrency();
  
  // Sum ALL achieved thresholds (not just highest one)
  const getVolumeBonus = (clientCount: number): number => {
    return thresholds
      .filter(t => clientCount >= t.threshold_clients)
      .reduce((sum, t) => sum + t.bonus_amount, 0);
  };

  const directCommission = clients * baseCommission;
  const volumeBonus = getVolumeBonus(clients);
  // Fixed formula: passivePerClientEur per client per month
  const passiveIncome = clients * passivePerClientEur * passiveMonths;
  const extensionBonuses = clients * extensionBonusPerClient * extensionMonthsCount;
  
  const totalEUR = directCommission + volumeBonus + passiveIncome + extensionBonuses;

  const progressPercent = Math.min((clients / maxClients) * 100, 100);

  // Secondary display (opposite currency)
  const secondaryAmount = currency === 'EUR' 
    ? `~ ${(totalEUR * eurToPlnRate).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`
    : `~ ${totalEUR.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} €`;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Szacowany przychód całkowity (6 miesięcy)
          </p>
          <p className="text-4xl md:text-5xl font-bold text-emerald-600 transition-all duration-300">
            {formatAmount(totalEUR)}
          </p>
          <p className="text-lg text-emerald-600/80 mt-1 transition-all duration-300">
            ({secondaryAmount})
          </p>
        </div>

        <div className="space-y-2">
          <Progress 
            value={progressPercent} 
            className="h-2 bg-emerald-100 dark:bg-emerald-900/50 transition-all duration-300"
          />
          <p className="text-xs text-center text-muted-foreground">
            {clients.toLocaleString('pl-PL')} klientów z {maxClients.toLocaleString('pl-PL')} możliwych
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center italic">
          *Założenie minimalnej stawki {baseCommission}€/klient. Rzeczywiste wyniki zależą od zaangażowania.
        </p>
      </CardContent>
    </Card>
  );
}
