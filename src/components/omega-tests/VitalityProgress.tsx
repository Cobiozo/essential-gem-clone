import React from 'react';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { differenceInDays, parseISO } from 'date-fns';
import { Activity, FlaskConical, CheckCircle2 } from 'lucide-react';
import { useOmegaMilestones } from '@/hooks/usePureBoxContent';

interface VitalityProgressProps {
  tests: OmegaTest[];
}

const iconMap: Record<string, React.FC<any>> = {
  FlaskConical,
  CheckCircle2,
};

export const VitalityProgress: React.FC<VitalityProgressProps> = ({ tests }) => {
  const { milestones } = useOmegaMilestones();
  const firstTest = tests.length > 0 ? tests[0] : null;
  const maxDays = milestones.length > 0 ? Math.max(...milestones.map(m => m.days), 180) : 180;
  const daysSinceStart = firstTest ? differenceInDays(new Date(), parseISO(firstTest.test_date)) : 0;
  const progress = Math.min(100, (daysSinceStart / maxDays) * 100);

  return (
    <div className="p-5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-5 w-5 text-green-400" />
        <h3 className="text-sm font-semibold text-foreground">Oś Czasu Przebudowy Komórkowej</h3>
      </div>

      {/* Horizontal progress bar */}
      <div className="relative mb-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(0, 84%, 60%), hsl(48, 96%, 53%), hsl(142, 71%, 45%))',
            }}
          />
        </div>

        {/* Milestone dots on the bar */}
        <div className="absolute top-0 left-0 right-0 h-2 flex items-center">
          {milestones.map((m, i) => {
            const pos = (m.days / maxDays) * 100;
            const reached = daysSinceStart >= m.days;
            return (
              <div
                key={i}
                className="absolute -top-[3px]"
                style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
              >
                <div className={`h-3.5 w-3.5 rounded-full border-2 border-background ${
                  reached ? 'bg-green-400' : 'bg-muted-foreground/40'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone labels */}
      <div className={`grid gap-1 mt-5`} style={{ gridTemplateColumns: `repeat(${milestones.length}, 1fr)` }}>
        {milestones.map((m, i) => {
          const reached = daysSinceStart >= m.days;
          const isKey = i === 0 || i === milestones.length - 2;
          const Icon = m.icon ? iconMap[m.icon] : null;
          return (
            <div key={i} className={`text-center ${isKey ? 'px-1' : ''}`}>
              {Icon && (
                <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${reached ? 'text-green-400' : 'text-muted-foreground/50'}`} />
              )}
              <p className={`text-[10px] font-semibold leading-tight ${
                reached ? 'text-foreground' : 'text-muted-foreground/60'
              } ${isKey ? 'text-[11px]' : ''}`}>
                {m.label}
              </p>
              <p className={`text-[9px] leading-tight mt-0.5 ${
                reached ? 'text-muted-foreground' : 'text-muted-foreground/40'
              }`}>
                {m.description}
              </p>
            </div>
          );
        })}
      </div>

      {tests.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/20">
          <p className="text-[11px] text-muted-foreground">
            Dzień <strong className="text-foreground">{daysSinceStart}</strong> protokołu • {tests.length} test{tests.length === 1 ? '' : tests.length < 5 ? 'y' : 'ów'}
          </p>
        </div>
      )}
    </div>
  );
};
