import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { AuthContext } from '../auth/AuthContext';
import { useOnboarding } from './OnboardingProvider';

export function OnboardingWizard() {
  const { t } = useTranslation();
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
  const progress = total > 1 ? Math.round((completed / total) * 100) : 0;
  const StepComponent = currentStep.Component;

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
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown={currentStep.blocking} onClose={currentStep.blocking ? undefined : dismissCurrentStep}>
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {total > 1 ? t('Onboarding.STEP_COUNTER', { current: completed + 1, total }) : t('Onboarding.SETUP')}
          </Typography>
        </Box>
        {total > 1 && <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, borderRadius: 1 }} />}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <StepComponent onComplete={completeCurrentStep} onDismiss={dismissCurrentStep} ctx={ctx} />
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingWizard;
