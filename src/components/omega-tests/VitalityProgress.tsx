import React from 'react';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { differenceInDays, parseISO } from 'date-fns';
import { Activity, FlaskConical, CheckCircle2 } from 'lucide-react';

interface VitalityProgressProps {
  tests: OmegaTest[];
}

const milestones = [
  { month: 0, days: 0, label: 'Miesiąc 0', title: 'Test 1 — Punkt Wyjścia', description: 'Stan Zapalny', icon: FlaskConical },
  { month: 1, days: 30, label: 'Miesiąc 1', title: 'Adaptacja', description: 'Początek zmian w osoczu' },
  { month: 3, days: 90, label: 'Miesiąc 3', title: 'Połowa cyklu', description: 'Wymiana ~50% krwinek' },
  { month: 5, days: 150, label: 'Miesiąc 5', title: 'Test 2 — Weryfikacja', description: 'Wymiana Krwinek (120+ dni)', icon: CheckCircle2 },
  { month: 6, days: 180, label: 'Miesiąc 6', title: 'Pełna optymalizacja', description: 'Protokół zakończony' },
];

export const VitalityProgress: React.FC<VitalityProgressProps> = ({ tests }) => {
  const firstTest = tests.length > 0 ? tests[0] : null;
  const daysSinceStart = firstTest ? differenceInDays(new Date(), parseISO(firstTest.test_date)) : 0;
  const progress = Math.min(100, (daysSinceStart / 180) * 100);

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
            const pos = (m.days / 180) * 100;
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
      <div className="grid grid-cols-5 gap-1 mt-5">
        {milestones.map((m, i) => {
          const reached = daysSinceStart >= m.days;
          const isKey = i === 0 || i === 3; // Test 1 and Test 2
          const Icon = m.icon;
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
