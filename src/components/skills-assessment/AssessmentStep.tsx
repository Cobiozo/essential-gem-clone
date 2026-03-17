import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssessmentStepData } from './assessmentData';

interface AssessmentStepProps {
  step: AssessmentStepData;
  stepIndex: number;
  value: number;
  onChange: (value: number) => void;
}

function getActiveRangeIndex(value: number): number {
  if (value <= 3) return 0;
  if (value <= 6) return 1;
  if (value <= 9) return 2;
  return 3;
}

export const AssessmentStep: React.FC<AssessmentStepProps> = ({
  step,
  stepIndex,
  value,
  onChange,
}) => {
  const activeRange = getActiveRangeIndex(value);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge
          className="text-xs font-semibold px-3 py-1"
          style={{ backgroundColor: step.chartColor, color: '#fff' }}
        >
          Sekcja {stepIndex + 1}/12
        </Badge>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {step.title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Twoja ocena</span>
          <span
            className="text-2xl font-bold"
            style={{ color: step.chartColor }}
          >
            {value}
          </span>
        </div>
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'w-5 text-center transition-colors',
                value === i + 1 && 'font-bold text-foreground'
              )}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Score ranges */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Co oznaczają oceny?
        </h3>
        <div className="grid gap-2">
          {step.ranges.map((range, idx) => {
            const isActive = idx === activeRange;
            return (
              <Card
                key={range.range}
                className={cn(
                  'p-3 transition-all border',
                  isActive
                    ? 'ring-2 shadow-md'
                    : 'opacity-50'
                )}
                style={
                  isActive
                    ? {
                        borderColor: range.color,
                        ringColor: range.color,
                        boxShadow: `0 0 0 2px ${range.color}30`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: range.color }}
                  />
                  <span className="text-xs font-bold" style={isActive ? { color: range.color } : undefined}>
                    {range.range} — {range.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {range.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
