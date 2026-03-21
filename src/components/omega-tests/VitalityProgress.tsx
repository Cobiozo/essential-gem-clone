import React from 'react';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { differenceInDays, parseISO } from 'date-fns';
import { Activity } from 'lucide-react';

interface VitalityProgressProps {
  tests: OmegaTest[];
}

const stages = [
  { label: 'Tydzień 0', days: 0, description: 'Punkt startowy' },
  { label: 'Tydzień 12', days: 84, description: 'Pierwsze efekty w komórkach' },
  { label: 'Miesiąc 6', days: 180, description: 'Głęboka zmiana profilu' },
  { label: 'Cel: 1 rok', days: 365, description: 'Pełna optymalizacja' },
];

export const VitalityProgress: React.FC<VitalityProgressProps> = ({ tests }) => {
  const firstTest = tests.length > 0 ? tests[0] : null;
  const daysSinceStart = firstTest ? differenceInDays(new Date(), parseISO(firstTest.test_date)) : 0;
  const progress = Math.min(100, (daysSinceStart / 365) * 100);

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-green-400" />
        <h3 className="text-sm font-semibold text-foreground">Postęp Witalności</h3>
      </div>

      <div className="relative">
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(0, 84%, 60%), hsl(48, 96%, 53%), hsl(142, 71%, 45%), hsl(210, 100%, 52%))',
            }}
          />
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const reached = daysSinceStart >= stage.days;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full shrink-0 border-2 ${
                  reached 
                    ? 'bg-green-400 border-green-400' 
                    : 'bg-transparent border-muted-foreground/40'
                }`} />
                <div>
                  <p className={`text-xs font-medium ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">{stage.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {tests.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-[11px] text-muted-foreground">
              Dzień <strong className="text-foreground">{daysSinceStart}</strong> Twojej transformacji • {tests.length} test{tests.length === 1 ? '' : tests.length < 5 ? 'y' : 'ów'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
