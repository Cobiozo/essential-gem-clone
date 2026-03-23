import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TourStep } from './tourSteps';

interface TourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  highlightRect: { top: number; left: number; width: number; height: number };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

type Position = 'top' | 'bottom' | 'left' | 'right';

const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 220;
const GAP = 20;
const POSITIONS_FALLBACK: Position[] = ['bottom', 'right', 'left', 'top'];

function calcPosition(
  pos: Position,
  hlRect: { top: number; left: number; width: number; height: number },
  vw: number,
  vh: number
) {
  const hlTop = hlRect.top - window.scrollY;
  let top = 0;
  let left = 0;

  switch (pos) {
    case 'bottom':
      top = hlTop + hlRect.height + GAP;
      left = hlRect.left + hlRect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'top':
      top = hlTop - TOOLTIP_HEIGHT - GAP;
      left = hlRect.left + hlRect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'left':
      top = hlTop + hlRect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = hlRect.left - TOOLTIP_WIDTH - GAP;
      break;
    case 'right':
      top = hlTop + hlRect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = hlRect.left + hlRect.width + GAP;
      break;
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(left, vw - TOOLTIP_WIDTH - 16));
  top = Math.max(16, Math.min(top, vh - TOOLTIP_HEIGHT - 16));

  return { top, left };
}

function isOverlapping(
  tooltip: { top: number; left: number },
  hlRect: { top: number; left: number; width: number; height: number }
) {
  const hlTop = hlRect.top - window.scrollY;
  const tRight = tooltip.left + TOOLTIP_WIDTH;
  const tBottom = tooltip.top + TOOLTIP_HEIGHT;
  const hRight = hlRect.left + hlRect.width;
  const hBottom = hlTop + hlRect.height;

  return !(tRight < hlRect.left || tooltip.left > hRight || tBottom < hlTop || tooltip.top > hBottom);
}

function distanceBetween(
  tooltip: { top: number; left: number },
  hlRect: { top: number; left: number; width: number; height: number }
) {
  const tCx = tooltip.left + TOOLTIP_WIDTH / 2;
  const tCy = tooltip.top + TOOLTIP_HEIGHT / 2;
  const hCx = hlRect.left + hlRect.width / 2;
  const hCy = (hlRect.top - window.scrollY) + hlRect.height / 2;
  return Math.sqrt((tCx - hCx) ** 2 + (tCy - hCy) ** 2);
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  currentStep,
  totalSteps,
  highlightRect,
  onNext,
  onPrev,
  onSkip,
}) => {
  const tooltipPosition = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try preferred position first
    const preferred = calcPosition(step.position, highlightRect, vw, vh);
    if (!isOverlapping(preferred, highlightRect)) {
      return preferred;
    }

    // Try fallback positions
    let bestPos = preferred;
    let bestDist = distanceBetween(preferred, highlightRect);

    for (const pos of POSITIONS_FALLBACK) {
      if (pos === step.position) continue;
      const candidate = calcPosition(pos, highlightRect, vw, vh);
      if (!isOverlapping(candidate, highlightRect)) {
        return candidate;
      }
      const dist = distanceBetween(candidate, highlightRect);
      if (dist > bestDist) {
        bestDist = dist;
        bestPos = candidate;
      }
    }

    return bestPos;
  }, [step.position, highlightRect]);

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Card
      className="fixed w-[340px] shadow-2xl pointer-events-auto z-[10000] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 border-primary/20"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {step.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 -mt-2"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Krok {currentStep + 1} z {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Wstecz
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          className="flex-1"
        >
          {isLastStep ? 'Zakończ' : 'Dalej'}
          {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </CardFooter>
    </Card>
  );
};
