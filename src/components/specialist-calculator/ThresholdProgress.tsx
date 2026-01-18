import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Check, Target } from "lucide-react";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface ThresholdProgressProps {
  clients: number;
  thresholds: SpecialistVolumeThreshold[];
}

export function ThresholdProgress({ clients, thresholds }: ThresholdProgressProps) {
  const sortedThresholds = [...thresholds].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Find current and next threshold
  const currentThreshold = sortedThresholds.filter(t => clients >= t.threshold_clients).pop();
  const nextThreshold = sortedThresholds.find(t => clients < t.threshold_clients);
  
  // Calculate progress to next threshold
  let progressPercent = 100;
  let progressLabel = "Maksymalny poziom!";
  
  if (nextThreshold) {
    const prevThreshold = currentThreshold?.threshold_clients || 0;
    const range = nextThreshold.threshold_clients - prevThreshold;
    const progress = clients - prevThreshold;
    progressPercent = Math.min((progress / range) * 100, 100);
    progressLabel = `${clients}/${nextThreshold.threshold_clients} klientów`;
  }

  const formatBonus = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate total earned bonuses
  const totalEarnedBonus = sortedThresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-primary" />
          Premie motywacyjne
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current level info */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {currentThreshold ? `Poziom ${currentThreshold.position}` : "Poziom startowy"}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatBonus(totalEarnedBonus)} € zdobyte
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{progressLabel}</p>
        </div>

        {/* Thresholds list */}
        <div className="space-y-3">
          {sortedThresholds.map((threshold) => {
            const isAchieved = clients >= threshold.threshold_clients;
            const isCurrent = currentThreshold?.id === threshold.id;
            const isNext = nextThreshold?.id === threshold.id;
            
            return (
              <div
                key={threshold.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isAchieved 
                    ? 'bg-primary/10 border-primary/30' 
                    : isNext
                    ? 'bg-muted/50 border-dashed border-muted-foreground/30'
                    : 'bg-muted/20 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isAchieved ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {isAchieved ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isAchieved ? 'text-primary' : 'text-muted-foreground'}`}>
                      {threshold.threshold_clients} klientów
                    </p>
                    {isCurrent && (
                      <span className="text-xs text-primary">Aktualny poziom</span>
                    )}
                    {isNext && (
                      <span className="text-xs text-muted-foreground">
                        Brakuje: {threshold.threshold_clients - clients}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`font-bold ${isAchieved ? 'text-primary' : 'text-muted-foreground'}`}>
                  +{formatBonus(threshold.bonus_amount)} €
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
