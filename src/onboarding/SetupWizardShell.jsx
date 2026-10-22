import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';

// The step card: one column with the prototype's spacing. Its radius and border
// come from the theme's outlined Paper.
export const SETUP_WIZARD_CARD_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 2.5, sm: 3 },
  px: { xs: 2, sm: 4 },
  py: { xs: 2.5, sm: 4 },
};

/**
 * Page/inline frame for a host-controlled setup flow (UCM-AUTH-14): one column of
 * stable width with a labelled step list, the step title, an error region, the
 * step content and one action row. Unlike the authenticated onboarding dialog
 * (OnboardingWizard / WizardDialogShell) it decides nothing: the host owns the
 * steps, which are completed or reachable, the current step, navigation, busy
 * state, errors and every draft. The shell stores nothing and starts no work.
 *
 * Props:
 * - `steps`: `[{ id, label }]` in order; `currentStepId`.
 * - `completedStepIds`, `reachableStepIds`: a step can be selected when it is
 *   reachable or completed; `onSelectStep(id)`.
 * - `title` (default: the current step's label), `description`.
 * - `error`: text or node shown in an alert that receives focus.
 * - `onBack`, `backLabel`; `primaryLabel` with either `onPrimary` (may return a
 *   promise; the primary action is ignored until it settles) or `primaryForm`
 *   (the id of a form in the content; the primary button submits it natively, and
 *   the content guards its own pending state).
 * - `busy`: disables navigation and actions.
 * Focus moves to the title when the step changes and to the error when it appears.
 */
export function SetupWizardShell({
  steps = [],
  currentStepId,
  completedStepIds = [],
  reachableStepIds = [],
  onSelectStep,
  title,
  description,
  error,
  onBack,
  backLabel,
  onPrimary,
  primaryForm,
  primaryLabel,
  busy = false,
  children,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const titleRef = useRef(null);
  const errorRef = useRef(null);
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));
  const currentStep = steps[currentIndex];
  const total = steps.length;
  const locked = busy || pending;

  // Move focus to the new step's title, but not on the first render: a page that
  // opens on the shell keeps the browser's normal initial focus.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    titleRef.current?.focus();
  }, [currentStepId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handlePrimary = async () => {
    if (locked || pendingRef.current || !onPrimary) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onPrimary();
    } catch {
      // The host reports failures through `error`.
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const hasPrimary = Boolean(primaryLabel) && Boolean(onPrimary || primaryForm);

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{ width: '100%', maxWidth: 600, mx: 'auto', pt: { xs: 3, sm: 4 }, pb: 5 }}
    >
      <Box component="header" sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
          <Typography component="p" variant="subtitle2">
            {t('Onboarding.SETUP')}
          </Typography>
          <Typography component="p" variant="body2" color="text.secondary" aria-live="polite">
            {t('Onboarding.STEP_COUNTER', { current: currentIndex + 1, total })}
          </Typography>
        </Box>
        <Box component="nav" aria-label={t('Onboarding.SETUP')}>
          <Box
            component="ol"
            sx={{ display: 'flex', listStyle: 'none', gap: { xs: 0, sm: 0.5 }, m: 0, mt: 2.25, p: 0 }}
          >
            {steps.map((step, index) => {
              const isCurrent = index === currentIndex;
              const isComplete = completedStepIds.includes(step.id) && !isCurrent;
              const selectable = !isCurrent
                && (reachableStepIds.includes(step.id) || completedStepIds.includes(step.id));
              return (
                <Box component="li" key={step.id} sx={{ flex: 1, minWidth: 0 }}>
                  <ButtonBase
                    type="button"
                    onClick={() => onSelectStep?.(step.id)}
                    disabled={!selectable || locked || !onSelectStep}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={isComplete ? `${step.label}, ${t('Onboarding.COMPLETED')}` : undefined}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%',
                      py: 1,
                      borderRadius: 1,
                      color: isCurrent ? 'primary.main' : 'text.secondary',
                      '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 1,
                        borderColor: isCurrent || isComplete ? 'primary.main' : 'divider',
                        bgcolor: isCurrent ? 'primary.main' : 'transparent',
                        color: isCurrent ? 'primary.contrastText' : 'inherit',
                        typography: 'caption',
                      }}
                    >
                      {isComplete ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : index + 1}
                    </Box>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ fontWeight: isCurrent ? 600 : undefined, maxWidth: '100%', overflowWrap: 'anywhere' }}
                    >
                      {step.label}
                    </Typography>
                  </ButtonBase>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Paper variant="outlined" sx={SETUP_WIZARD_CARD_SX}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            ref={titleRef}
            id={titleId}
            component="h1"
            variant="h5"
            tabIndex={-1}
            sx={{ outline: 'none' }}
          >
            {title ?? currentStep?.label}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {description}
            </Typography>
          )}
        </Box>

        {error && (
          <Alert ref={errorRef} severity="error" tabIndex={-1}>
            {error}
          </Alert>
        )}

        {children}

        {(onBack || hasPrimary) && (
          <Box sx={{ display: 'flex', flexDirection: 'column-reverse', gap: 1, mt: 1 }}>
            {onBack && (
              <Button type="button" variant="text" onClick={onBack} disabled={locked} fullWidth>
                {backLabel || t('Onboarding.BACK')}
              </Button>
            )}
            {hasPrimary && (
              <Button
                type={primaryForm ? 'submit' : 'button'}
                form={primaryForm || undefined}
                variant="contained"
                onClick={primaryForm ? undefined : handlePrimary}
                disabled={locked}
                fullWidth
              >
                {primaryLabel}
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default SetupWizardShell;
