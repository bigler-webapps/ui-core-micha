import React from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

/**
 * Presentational dialog shell shared by OnboardingWizard and the popup
 * notification surface (NOTIF-12). Owns only the dialog frame, the
 * counter/progress header, and the onComplete/onDismiss/ctx child contract —
 * step selection, dismissal persistence, and any progress store stay with
 * the caller.
 */
export function WizardDialogShell({ step, stepIndex, total, onComplete, onDismiss, ctx, title }) {
  const { t } = useTranslation();
  const progress = total > 1 ? Math.round((stepIndex / total) * 100) : 0;
  const StepComponent = step.Component;
  // `title` lets a non-onboarding caller (e.g. the popup surface) supply its
  // own header instead of the onboarding-specific step counter/"Setup" copy.
  // Omitted by OnboardingWizard, so its header text is unchanged.
  const headerLabel = title ?? (total > 1
    ? t('Onboarding.STEP_COUNTER', { current: stepIndex + 1, total })
    : t('Onboarding.SETUP'));

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={step.blocking}
      onClose={step.blocking ? undefined : onDismiss}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {headerLabel}
          </Typography>
        </Box>
        {total > 1 && <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, borderRadius: 1 }} />}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <StepComponent onComplete={onComplete} onDismiss={onDismiss} ctx={ctx} />
      </DialogContent>
    </Dialog>
  );
}

export default WizardDialogShell;
