import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getStepsForRole, TourStep } from '@/components/onboarding/tourSteps';

interface UseOnboardingTourReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  steps: TourStep[];
  showWelcomeDialog: boolean;
  showCompletionDialog: boolean;
  startTour: () => void;
  skipTour: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => Promise<void>;
  closeTour: () => void;
  restartTour: () => Promise<void>;
}

export const useOnboardingTour = (): UseOnboardingTourReturn => {
  const { user, profile, userRole, isFreshLogin } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const steps = getStepsForRole(userRole?.role);
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep] || null;

  // Check if tutorial should show on mount
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user || !profile) return;

      // Check if profile has tutorial_completed field
      const tutorialCompleted = (profile as any)?.tutorial_completed;
      const tutorialSkipped = (profile as any)?.tutorial_skipped;

      // Show welcome dialog for fresh login users who haven't completed/skipped tutorial
      if (isFreshLogin && !tutorialCompleted && !tutorialSkipped) {
        // Small delay to let the dashboard render first
        setTimeout(() => {
          setShowWelcomeDialog(true);
        }, 1000);
      }
    };

    checkTutorialStatus();
  }, [user, profile, isFreshLogin]);

  // Listen for manual tour start event
  useEffect(() => {
    const handleStartTour = () => {
      setShowWelcomeDialog(true);
    };

    window.addEventListener('startOnboardingTour', handleStartTour);
    return () => {
      window.removeEventListener('startOnboardingTour', handleStartTour);
    };
  }, []);

  const startTour = useCallback(() => {
    setShowWelcomeDialog(false);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const skipTour = useCallback(async () => {
    setShowWelcomeDialog(false);
    setIsActive(false);

    if (user) {
      await supabase
        .from('profiles')
        .update({
          tutorial_skipped: true,
          tutorial_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Last step - show completion dialog
      setIsActive(false);
      setShowCompletionDialog(true);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const endTour = useCallback(async () => {
    setShowCompletionDialog(false);
    setIsActive(false);
    setCurrentStep(0);

    if (user) {
      await supabase
        .from('profiles')
        .update({
          tutorial_completed: true,
          tutorial_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  }, [user]);

  const closeTour = useCallback(() => {
    setIsActive(false);
    setShowWelcomeDialog(false);
    setShowCompletionDialog(false);
    setCurrentStep(0);
  }, []);

  const restartTour = useCallback(async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({
          tutorial_completed: false,
          tutorial_skipped: false,
          tutorial_completed_at: null,
        })
        .eq('id', user.id);
    }

    setShowCompletionDialog(false);
    setCurrentStep(0);
    setIsActive(true);
  }, [user]);

  return {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    steps,
    showWelcomeDialog,
    showCompletionDialog,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    endTour,
    closeTour,
    restartTour,
  };
};
