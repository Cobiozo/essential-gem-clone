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
const SCROLL_SETTLE_DELAY = 600;

export const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onDropdownToggle,
}) => {
  const [viewportRect, setViewportRect] = useState<HighlightRect | null>(null);
  const [pageRect, setPageRect] = useState<HighlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const capturePosition = useCallback((element: Element) => {
    const rect = element.getBoundingClientRect();
    const padding = 8;

    const vRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };

    const pRect = {
      ...vRect,
      top: vRect.top + window.scrollY,
    };

    setViewportRect(vRect);
    setPageRect(pRect);
    setIsVisible(true);
    retryCountRef.current = 0;
  }, []);

  const updateHighlight = useCallback(() => {
    const element = document.querySelector(step.targetSelector);

    if (element) {
      if (step.scrollTo) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrollTimeoutRef.current = setTimeout(() => {
          capturePosition(element);
        }, SCROLL_SETTLE_DELAY);
      } else {
        capturePosition(element);
      }
    } else {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log(`[Tour] Element not found: ${step.targetSelector}, retry ${retryCountRef.current}/${MAX_RETRIES}`);
        retryTimeoutRef.current = setTimeout(() => {
          updateHighlight();
        }, RETRY_DELAY);
      } else {
        console.warn(`[Tour] Element not found after ${MAX_RETRIES} retries: ${step.targetSelector}, skipping...`);
        setIsVisible(false);
        retryCountRef.current = 0;
        onNext();
      }
    }
  }, [step, onNext, capturePosition]);

  // Refresh on scroll (debounced)
  useEffect(() => {
    let scrollDebounce: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (scrollDebounce) clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(() => {
        const element = document.querySelector(step.targetSelector);
        if (element) capturePosition(element);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollDebounce) clearTimeout(scrollDebounce);
    };
  }, [step.targetSelector, capturePosition]);

  useEffect(() => {
    retryCountRef.current = 0;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    if (step.requiresDropdownOpen) {
      onDropdownToggle?.(true);
      setTimeout(updateHighlight, 300);
    } else {
      onDropdownToggle?.(false);
      updateHighlight();
    }

    window.addEventListener('resize', updateHighlight);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [step, updateHighlight, onDropdownToggle]);

  if (!isVisible || !viewportRect || !pageRect) {
    return null;
  }

  const overlayContent = (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with hole - uses page coordinates */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ minHeight: document.documentElement.scrollHeight }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={pageRect.left}
              y={pageRect.top}
              width={pageRect.width}
              height={pageRect.height}
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

      {/* Highlight border - uses viewport coordinates */}
      <div
        className="fixed pointer-events-none rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-transparent animate-pulse"
        style={{
          top: viewportRect.top,
          left: viewportRect.left,
          width: viewportRect.width,
          height: viewportRect.height,
        }}
      />

      {/* Tooltip - uses viewport coordinates */}
      <TourTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={totalSteps}
        highlightRect={viewportRect}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
      />
    </div>
  );

  return createPortal(overlayContent, document.body);
};
