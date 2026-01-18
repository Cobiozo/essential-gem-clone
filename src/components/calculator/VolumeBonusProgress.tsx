import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Check } from 'lucide-react';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface VolumeBonusProgressProps {
  clients: number;
  thresholds: VolumeThreshold[];
}

// Generate colors for thresholds based on position
const getThresholdColor = (index: number, total: number): string => {
  const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];
  return colors[index % colors.length];
};

export function VolumeBonusProgress({ clients, thresholds }: VolumeBonusProgressProps) {
  if (thresholds.length === 0) return null;

  // Sort by position
  const sortedThresholds = [...thresholds].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Find current and next threshold
  let currentThreshold: VolumeThreshold | null = null;
  let nextThreshold: VolumeThreshold | null = null;

  for (let i = 0; i < sortedThresholds.length; i++) {
    const threshold = sortedThresholds[i];
    if (clients >= threshold.threshold_clients) {
      currentThreshold = threshold;
      nextThreshold = sortedThresholds[i + 1] || null;
    }
  }

  if (!currentThreshold && sortedThresholds.length > 0) {
    nextThreshold = sortedThresholds[0];
  }

  // Calculate progress to next tier
  let progressPercent = 0;
  let progressLabel = '';

  if (nextThreshold) {
    const startValue = currentThreshold?.threshold_clients || 0;
    const endValue = nextThreshold.threshold_clients;
    const current = clients - startValue;
    const total = endValue - startValue;
    progressPercent = Math.min((current / total) * 100, 100);
    progressLabel = `${clients} / ${nextThreshold.threshold_clients}`;
  } else if (currentThreshold) {
    progressPercent = 100;
    progressLabel = 'Osiągnięto maksymalny poziom!';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progi bonusowe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tier indicator */}
        {currentThreshold && (
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Aktualny poziom</span>
              <span 
                className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                style={{ backgroundColor: getThresholdColor(sortedThresholds.indexOf(currentThreshold), sortedThresholds.length) }}
              >
                {currentThreshold.threshold_clients}+ klientów (+{currentThreshold.bonus_amount} zł)
              </span>
            </div>
          </div>
        )}

        {/* Progress to next tier */}
        {nextThreshold && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Postęp do następnego poziomu
              </span>
              <span className="font-medium">{progressLabel}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Następny poziom: {nextThreshold.threshold_clients}+ klientów (+{nextThreshold.bonus_amount} zł)
            </p>
          </div>
        )}

        {/* All tiers visualization */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Wszystkie poziomy
          </p>
          <div className="grid gap-2">
            {sortedThresholds.map((threshold, index) => {
              const isAchieved = clients >= threshold.threshold_clients;
              const isCurrent = currentThreshold?.id === threshold.id;
              const color = getThresholdColor(index, sortedThresholds.length);
              
              return (
                <div
                  key={threshold.id}
                  className={`flex items-center justify-between rounded-lg border p-2 transition-all ${
                    isCurrent 
                      ? 'border-primary bg-primary/5' 
                      : isAchieved 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAchieved && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    <span 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className={`text-sm ${isAchieved ? 'font-medium' : 'text-muted-foreground'}`}>
                      Poziom {index + 1}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <span className={isAchieved ? 'font-semibold text-green-600' : 'text-muted-foreground'}>
                      +{threshold.bonus_amount} zł
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({threshold.threshold_clients}+ klientów)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
