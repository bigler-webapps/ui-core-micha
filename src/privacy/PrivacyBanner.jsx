import React, { useEffect, useRef } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';

function localized(value, language) {
  if (!value || typeof value !== 'object') return '';
  const normalized = String(language || '').replace('_', '-').toLowerCase();
  const exact = Object.keys(value).find((key) => key.toLowerCase() === normalized);
  if (exact) return value[exact];
  const base = normalized.split('-')[0];
  const baseMatch = Object.keys(value).find((key) => key.toLowerCase() === base);
  return value[baseMatch || Object.keys(value)[0]] || '';
}

export const PRIVACY_BANNER_PAPER_SX = {
  position: 'fixed',
  zIndex: (theme) => theme.zIndex.snackbar,
  insetInline: 0,
  bottom: 0,
  p: { xs: 2, sm: 3 },
  // Long manifests or translations must never push the choices off a small screen.
  maxHeight: '90dvh',
  overflowY: 'auto',
};

// The baseline MuiButton already sets minHeight; only the width and padding of the icon-only target are local.
export const PRIVACY_BANNER_CLOSE_SX = { minWidth: 44, p: 0, flexShrink: 0 };

export function PrivacyBanner() {
  const privacy = usePrivacy();
  const { t, i18n } = useTranslation();
  const headingRef = useRef(null);
  useEffect(() => {
    if (!privacy?.bannerVisible) return;
    // The banner is nonmodal and loads asynchronously: move focus only when nothing else holds it,
    // so it never interrupts someone who is already using the page.
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (!active || active === document.body) headingRef.current?.focus();
  }, [privacy?.bannerVisible]);
  if (!privacy?.bannerVisible) return null;

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      privacy.dismissBanner();
    }
  };

  const purposes = privacy.manifest?.purposes?.filter((purpose) => !purpose.required) || [];
  const hasOtherGrant = purposes.some((purpose) => privacy.choices?.choices?.[purpose.id]?.state === 'granted');
  return (
    <Paper
      role="region"
      aria-labelledby="privacy-banner-title"
      // Stays mounted while the settings dialog is open (it sits above modals and would cover the dialog's
      // actions) so the dialog can return focus to the Settings button that opened it.
      hidden={privacy.settingsOpen}
      onKeyDown={onKeyDown}
      elevation={8}
      sx={PRIVACY_BANNER_PAPER_SX}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography id="privacy-banner-title" component="h2" variant="h6" tabIndex={-1} ref={headingRef}>
              {t('Privacy.CHOICE_TITLE')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {t('Privacy.NECESSARY_ALWAYS_ACTIVE')} {t('Privacy.CHANGE_ANYTIME')}
            </Typography>
          </Box>
          <Button
            type="button"
            aria-label={t('Privacy.CLOSE')}
            onClick={privacy.dismissBanner}
            sx={PRIVACY_BANNER_CLOSE_SX}
          >
            <CloseIcon aria-hidden="true" />
          </Button>
        </Stack>
        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
          {purposes.map((purpose) => (
            <Box key={purpose.id}>
              {localized(purpose.label, i18n.language) && <Typography variant="subtitle2">{localized(purpose.label, i18n.language)}</Typography>}
              {localized(purpose.summary, i18n.language) && (
                <Typography variant="body2" color="text.secondary">{localized(purpose.summary, i18n.language)}</Typography>
              )}
            </Box>
          ))}
        </Stack>
        {privacy.saveState === 'error' && (
          <Typography role="alert" color="error" variant="body2" sx={{ mt: 1.5 }}>
            {t(hasOtherGrant ? 'Privacy.SAVE_ERROR_WITH_GRANTS' : 'Privacy.SAVE_ERROR')}
          </Typography>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2 }}>
          <Button
            type="button"
            variant="contained"
            size="medium"
            disabled={privacy.saveState === 'saving'}
            onClick={() => privacy.necessaryOnly('banner')}
          >
            {t('Privacy.NECESSARY_ONLY')}
          </Button>
          <Button
            type="button"
            variant="contained"
            size="medium"
            disabled={privacy.saveState === 'saving'}
            onClick={() => privacy.acceptAll('banner')}
          >
            {t('Privacy.ALLOW_ALL')}
          </Button>
          <Button type="button" variant="text" onClick={privacy.openSettings}>
            {t('Privacy.SETTINGS')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

export default PrivacyBanner;
