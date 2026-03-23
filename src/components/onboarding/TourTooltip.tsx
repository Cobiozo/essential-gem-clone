import React, { useMemo, useRef, useEffect, useCallback } from 'react';
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
  onTooltipRect?: (rect: { top: number; left: number; width: number; height: number }) => void;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  currentStep,
  totalSteps,
  highlightRect,
  onNext,
  onPrev,
  onSkip,
  onTooltipRect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const tooltipPosition = useMemo(() => {
    const tooltipWidth = 340;
    const tooltipHeight = 220;
    const gap = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = highlightRect.top + highlightRect.height + gap - window.scrollY;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = highlightRect.top - tooltipHeight - gap - window.scrollY;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2 - window.scrollY;
        left = highlightRect.left - tooltipWidth - gap;
        break;
      case 'right':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2 - window.scrollY;
        left = highlightRect.left + highlightRect.width + gap;
        break;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

    return { top, left };
  }, [step.position, highlightRect]);

  // Report tooltip rect for arrow positioning
  const reportRect = useCallback(() => {
    if (cardRef.current && onTooltipRect) {
      const rect = cardRef.current.getBoundingClientRect();
      onTooltipRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [onTooltipRect]);

  useEffect(() => {
    // Small delay to allow rendering
    const timer = setTimeout(reportRect, 50);
    return () => clearTimeout(timer);
  }, [reportRect, tooltipPosition]);

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Card
      ref={cardRef}
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
