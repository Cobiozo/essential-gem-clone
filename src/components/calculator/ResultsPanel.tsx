import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Wallet, TrendingUp, Gift, Users, Euro } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface ResultsPanelProps {
  clients: number;
  baseCommission: number;
  passiveRatePercentage: number;
  passiveMonths: number;
  extensionBonusPerClient: number;
  extensionMonthsCount: number;
  eurToPlnRate: number;
  thresholds: VolumeThreshold[];
}

export function ResultsPanel({
  clients,
  baseCommission,
  passiveRatePercentage,
  passiveMonths,
  extensionBonusPerClient,
  extensionMonthsCount,
  eurToPlnRate,
  thresholds
}: ResultsPanelProps) {
  const { t } = useLanguage();

  // Calculate volume bonus based on client count
  const getVolumeBonus = (clientCount: number): number => {
    for (const threshold of [...thresholds].reverse()) {
      if (clientCount >= threshold.threshold_clients) {
        return threshold.bonus_amount;
      }
    }
    return 0;
  };

  const volumeBonusAmount = getVolumeBonus(clients);
  
  // Calculations
  const directCommission = clients * baseCommission;
  const volumeBonus = volumeBonusAmount; // Flat bonus amount from threshold
  const passiveIncome = directCommission * (passiveRatePercentage / 100) * passiveMonths;
  const extensionBonuses = clients * extensionBonusPerClient * extensionMonthsCount;
  
  const totalPLN = directCommission + volumeBonus + passiveIncome + extensionBonuses;
  const totalEUR = totalPLN / eurToPlnRate;

  const formatPLN = (value: number) => 
    value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł';
  
  const formatEUR = (value: number) => 
    value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" />
          {t('calculator.results') || 'Szacowane zarobki'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{t('calculator.directCommission') || 'Prowizja bezpośrednia'}</span>
            </div>
            <span className="font-medium">{formatPLN(directCommission)}</span>
          </div>

          {volumeBonusAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>{t('calculator.volumeBonus') || 'Bonus wolumenowy'}</span>
              </div>
              <span className="font-medium text-green-600">+{formatPLN(volumeBonus)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>{t('calculator.passiveIncome') || 'Dochód pasywny'} ({passiveMonths} mies.)</span>
            </div>
            <span className="font-medium">{formatPLN(passiveIncome)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span>{t('calculator.extensionBonuses') || 'Bonusy przedłużeń'}</span>
            </div>
            <span className="font-medium">{formatPLN(extensionBonuses)}</span>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {t('calculator.totalMonthly') || 'Suma'}
            </span>
            <span className="text-2xl font-bold text-primary">
              {formatPLN(totalPLN)}
            </span>
          </div>
          
          <div className="flex items-center justify-end gap-2 text-muted-foreground">
            <Euro className="h-4 w-4" />
            <span className="text-sm">≈ {formatEUR(totalEUR)}</span>
          </div>
        </div>

        {/* Yearly projection */}
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <p className="text-sm text-muted-foreground">
            {t('calculator.yearlyProjection') || 'Projekcja roczna'}
          </p>
          <p className="text-xl font-bold text-primary">
            {formatPLN(totalPLN * 12)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
