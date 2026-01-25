import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TourStep } from './tourSteps';
import { TourTooltip } from './TourTooltip';

interface TourOverlayProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onDropdownToggle?: (open: boolean) => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onDropdownToggle,
}) => {
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updateHighlight = useCallback(() => {
    const element = document.querySelector(step.targetSelector);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 8;
      
      setHighlightRect({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Scroll to element if needed
      if (step.scrollTo) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setIsVisible(true);
    } else {
      // Element not found - skip to next step after a short delay
      setIsVisible(false);
      setTimeout(() => {
        onNext();
      }, 100);
    }
  }, [step, onNext]);

  useEffect(() => {
    // Handle dropdown steps
    if (step.requiresDropdownOpen) {
      onDropdownToggle?.(true);
      // Wait for dropdown to open
      setTimeout(updateHighlight, 300);
    } else {
      onDropdownToggle?.(false);
      updateHighlight();
    }

    // Update on resize
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [step, updateHighlight, onDropdownToggle]);

  if (!isVisible || !highlightRect) {
    return null;
  }

  const overlayContent = (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with hole */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ minHeight: document.documentElement.scrollHeight }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={highlightRect.left}
              y={highlightRect.top}
              width={highlightRect.width}
              height={highlightRect.height}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
      <div
        className="absolute pointer-events-none rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-transparent animate-pulse"
        style={{
          top: highlightRect.top,
          left: highlightRect.left,
          width: highlightRect.width,
          height: highlightRect.height,
        }}
      />

      {/* Tooltip */}
      <TourTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={totalSteps}
        highlightRect={highlightRect}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
      />
    </div>
  );

  return createPortal(overlayContent, document.body);
};
