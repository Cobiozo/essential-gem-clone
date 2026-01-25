import React, { useState, useCallback } from 'react';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { TourWelcomeDialog } from './TourWelcomeDialog';
import { TourCompletionDialog } from './TourCompletionDialog';
import { TourOverlay } from './TourOverlay';

interface OnboardingTourProps {
  onDropdownToggle?: (open: boolean) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  onDropdownToggle,
}) => {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    showWelcomeDialog,
    showCompletionDialog,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    endTour,
    restartTour,
  } = useOnboardingTour();

  const handleSkip = useCallback(async () => {
    onDropdownToggle?.(false);
    await skipTour();
  }, [skipTour, onDropdownToggle]);

  const handleEnd = useCallback(async () => {
    onDropdownToggle?.(false);
    await endTour();
  }, [endTour, onDropdownToggle]);

  return (
    <>
      {/* Welcome Dialog */}
      <TourWelcomeDialog
        open={showWelcomeDialog}
        onStart={startTour}
        onSkip={handleSkip}
      />

      {/* Completion Dialog */}
      <TourCompletionDialog
        open={showCompletionDialog}
        onClose={handleEnd}
        onRestart={restartTour}
      />

      {/* Tour Overlay */}
      {isActive && currentStepData && (
        <TourOverlay
          step={currentStepData}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={handleSkip}
          onDropdownToggle={onDropdownToggle}
        />
      )}
    </>
  );
};

export default OnboardingTour;
