import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VolumeThreshold } from '@/hooks/useCalculatorSettings';

interface VolumeBonusProgressProps {
  clients: number;
  thresholds: VolumeThreshold[];
}

export function VolumeBonusProgress({ clients, thresholds }: VolumeBonusProgressProps) {
  const { t } = useLanguage();

  if (thresholds.length === 0) return null;

  // Find current and next threshold
  const sortedThresholds = [...thresholds].sort((a, b) => a.position - b.position);
  
  let currentThreshold: VolumeThreshold | null = null;
  let nextThreshold: VolumeThreshold | null = null;

  for (let i = 0; i < sortedThresholds.length; i++) {
    const threshold = sortedThresholds[i];
    if (clients >= threshold.min_volume) {
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
    const startValue = currentThreshold?.min_volume || 0;
    const endValue = nextThreshold.min_volume;
    const current = clients - startValue;
    const total = endValue - startValue;
    progressPercent = Math.min((current / total) * 100, 100);
    progressLabel = `${clients} / ${nextThreshold.min_volume}`;
  } else if (currentThreshold) {
    progressPercent = 100;
    progressLabel = t('calculator.maxTierReached') || 'Osiągnięto maksymalny poziom!';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('calculator.volumeBonusTiers') || 'Progi bonusowe'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tier indicator */}
        {currentThreshold && (
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('calculator.currentTier') || 'Aktualny poziom'}</span>
              <span 
                className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                style={{ backgroundColor: currentThreshold.color }}
              >
                {currentThreshold.label} (+{currentThreshold.bonus_percentage}%)
              </span>
            </div>
          </div>
        )}

        {/* Progress to next tier */}
        {nextThreshold && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('calculator.progressToNext') || 'Postęp do następnego poziomu'}
              </span>
              <span className="font-medium">{progressLabel}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {t('calculator.nextTier') || 'Następny poziom'}: {nextThreshold.label} (+{nextThreshold.bonus_percentage}%)
            </p>
          </div>
        )}

        {/* All tiers visualization */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t('calculator.allTiers') || 'Wszystkie poziomy'}
          </p>
          <div className="grid gap-2">
            {sortedThresholds.map((threshold) => {
              const isAchieved = clients >= threshold.min_volume;
              const isCurrent = currentThreshold?.id === threshold.id;
              
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
                      style={{ backgroundColor: threshold.color }}
                    />
                    <span className={`text-sm ${isAchieved ? 'font-medium' : 'text-muted-foreground'}`}>
                      {threshold.label}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <span className={isAchieved ? 'font-semibold text-green-600' : 'text-muted-foreground'}>
                      +{threshold.bonus_percentage}%
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({threshold.min_volume}+ klientów)
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
