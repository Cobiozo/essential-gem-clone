import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, CheckCircle, Circle } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface VolumeBonusProgressProps {
  clients: number;
  thresholds: VolumeThreshold[];
}

export function VolumeBonusProgress({ clients, thresholds }: VolumeBonusProgressProps) {
  const { formatAmount } = useCurrency();
  
  if (thresholds.length === 0) return null;

  const sortedThresholds = [...thresholds].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Find highest achieved threshold
  let highestAchieved: VolumeThreshold | null = null;
  for (const threshold of sortedThresholds) {
    if (clients >= threshold.threshold_clients) {
      highestAchieved = threshold;
    }
  }

  const allAchieved = highestAchieved && sortedThresholds.indexOf(highestAchieved) === sortedThresholds.length - 1;

  // Calculate total earned bonus
  const totalBonus = sortedThresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const formatClients = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} tys.`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-emerald-600" />
          Bonusy Wolumenowe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total earned */}
        {totalBonus > 0 && (
          <div className="text-center py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 mb-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Suma bonusów</p>
            <p className="text-xl font-bold text-emerald-600">+{formatAmount(totalBonus)}</p>
          </div>
        )}

        {/* Thresholds list */}
        <div className="space-y-1">
          {sortedThresholds.map((threshold) => {
            const isAchieved = clients >= threshold.threshold_clients;
            
            return (
              <div
                key={threshold.id}
                className={`flex items-center justify-between py-2 px-2 rounded-md transition-all ${
                  isAchieved ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAchieved ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${isAchieved ? 'font-medium' : 'text-muted-foreground'}`}>
                    {formatClients(threshold.threshold_clients)} klientów
                  </span>
                </div>
                <span className={`text-sm font-semibold ${isAchieved ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  +{formatAmount(threshold.bonus_amount)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Max threshold indicator */}
        {allAchieved && (
          <div className="text-center pt-2">
            <p className="text-xs text-emerald-600 font-medium">
              ✨ Maksymalny próg osiągnięty!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
