import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { useOnboarding } from './OnboardingProvider';
import { WizardDialogShell } from './WizardDialogShell';

export function OnboardingWizard() {
  const onboarding = useOnboarding();
  const authContext = useContext(AuthContext);
  const [sessionDismissed, setSessionDismissed] = useState(() => new Set());
  const totalRef = useRef(null);
  const [completed, setCompleted] = useState(0);
  const activeSteps = onboarding?.activeSteps || [];
  const visibleSteps = activeSteps.filter((step) => !sessionDismissed.has(step.id));
  const currentStep = visibleSteps[0];

  useEffect(() => {
    if (visibleSteps.length > 0 && totalRef.current === null) {
      totalRef.current = visibleSteps.length;
      setCompleted(0);
    }
    if (visibleSteps.length === 0) {
      totalRef.current = null;
      setCompleted(0);
    }
  }, [visibleSteps.length]);

  useEffect(() => {
    if (onboarding && currentStep) onboarding.markStepSeen(currentStep.id);
  }, [onboarding, currentStep?.id]);

  if (!onboarding || visibleSteps.length === 0) return null;

  const { dismissStep, ctx } = onboarding;
  const total = totalRef.current || visibleSteps.length;

  const completeCurrentStep = () => {
    setSessionDismissed((previous) => new Set([...previous, currentStep.id]));
    setCompleted((count) => count + 1);
    authContext?.refreshUser?.()?.catch(() => {
      // Best-effort refresh; the step itself already persisted successfully.
    });
  };

  const dismissCurrentStep = () => {
    if (currentStep.persistDismissed) dismissStep(currentStep.id);
    completeCurrentStep();
  };

  return (
    <WizardDialogShell
      step={currentStep}
      stepIndex={completed}
      total={total}
      onComplete={completeCurrentStep}
      onDismiss={dismissCurrentStep}
      ctx={ctx}
    />
  );
}

export default OnboardingWizard;
