import React, { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Home } from 'lucide-react';
import { AssessmentStep } from '@/components/skills-assessment/AssessmentStep';
import { SkillsRadarChart } from '@/components/skills-assessment/SkillsRadarChart';
import { AssessmentSummary } from '@/components/skills-assessment/AssessmentSummary';
import { ASSESSMENT_STEPS } from '@/components/skills-assessment/assessmentData';
import { usePureBoxVisibility } from '@/hooks/usePureBoxVisibility';
import { useAssessmentSteps } from '@/hooks/usePureBoxContent';

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 mb-2">
      <Home className="h-4 w-4" />
      Pulpit
    </Button>
  );
};

const SkillsAssessment: React.FC = () => {
  const { isVisible, loading: visLoading } = usePureBoxVisibility();
  const { steps: STEPS, isLoading: stepsLoading } = useAssessmentSteps();
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Initialize scores when steps load
  React.useEffect(() => {
    if (STEPS.length > 0 && Object.keys(scores).length === 0) {
      setScores(Object.fromEntries(STEPS.map((s) => [s.key, 5])));
    }
  }, [STEPS]);

  const totalSteps = STEPS.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleScoreChange = useCallback(
    (value: number) => {
      setScores((prev) => ({
        ...prev,
        [STEPS[currentStep].key]: value,
      }));
    },
    [currentStep, STEPS]
  );

  if (visLoading || stepsLoading || Object.keys(scores).length === 0) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isVisible('skills-assessment')) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleReset = () => {
    setScores(Object.fromEntries(STEPS.map((s) => [s.key, 5])));
    setCurrentStep(0);
    setCompleted(false);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
          <BackButton />
          <AssessmentSummary scores={scores} onReset={handleReset} />
        </div>
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <BackButton />
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Ocena Umiejętności w Network Marketingu
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground">
              Krok {currentStep + 1} z {totalSteps}
            </span>
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm font-medium text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left — step */}
          <Card className="p-5 sm:p-6">
            <AssessmentStep
              step={step}
              stepIndex={currentStep}
              value={scores[step.key]}
              onChange={handleScoreChange}
            />
          </Card>

          {/* Right — chart */}
          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Podgląd na żywo
            </h3>
            <div className="w-full aspect-square max-w-[420px] mx-auto">
              <SkillsRadarChart scores={scores} />
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Wstecz
          </Button>
          <Button
            variant={currentStep === totalSteps - 1 ? 'gold' : 'default'}
            onClick={handleNext}
            className="gap-2"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Zakończ i podsumuj
              </>
            ) : (
              <>
                Dalej
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SkillsAssessment;
