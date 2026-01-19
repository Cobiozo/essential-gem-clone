import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface TotalResultCardProps {
  clients: number;
  baseCommission: number;
  passivePerClientEur: number;
  passiveMonths: number;
  extensionBonusPerClient: number;
  extensionMonthsCount: number;
  eurToPlnRate: number;
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
  eurToPlnRate,
  thresholds,
  maxClients
}: TotalResultCardProps) {
  
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
  // Fixed formula: passivePerClientEur per client per month
  const passiveIncome = clients * passivePerClientEur * passiveMonths;
  const extensionBonuses = clients * extensionBonusPerClient * extensionMonthsCount;
  
  const totalEUR = directCommission + volumeBonus + passiveIncome + extensionBonuses;
  const totalPLN = totalEUR * eurToPlnRate;

  const progressPercent = Math.min((clients / maxClients) * 100, 100);

  const formatEUR = (value: number) => 
    value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  
  const formatPLN = (value: number) => 
    value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Szacowany przychód całkowity (6 miesięcy)
          </p>
          <p className="text-4xl md:text-5xl font-bold text-emerald-600 transition-all duration-300">
            {formatEUR(totalEUR)} €
          </p>
          <p className="text-lg text-emerald-600/80 mt-1 transition-all duration-300">
            (~ {formatPLN(totalPLN)} zł)
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
