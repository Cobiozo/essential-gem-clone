import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const MAX_RETRIES = 5;
const RETRY_DELAY = 500;

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
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      retryCountRef.current = 0;
    } else {
      // Element not found - retry with limit
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log(`[Tour] Element not found: ${step.targetSelector}, retry ${retryCountRef.current}/${MAX_RETRIES}`);
        
        retryTimeoutRef.current = setTimeout(() => {
          updateHighlight();
        }, RETRY_DELAY);
      } else {
        // Max retries reached - skip to next step
        console.warn(`[Tour] Element not found after ${MAX_RETRIES} retries: ${step.targetSelector}, skipping...`);
        setIsVisible(false);
        retryCountRef.current = 0;
        onNext();
      }
    }
  }, [step, onNext]);

  useEffect(() => {
    // Reset retry count on step change
    retryCountRef.current = 0;
    
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

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
    return () => {
      window.removeEventListener('resize', updateHighlight);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
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
