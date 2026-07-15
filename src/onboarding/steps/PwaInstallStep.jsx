import React from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

export function PwaInstallStep({ onComplete, onDismiss, ctx }) {
  const { t } = useTranslation();
  const isIos = Boolean(ctx?.pwaInstall?.isIos);
  const deferredPrompt = ctx?.pwaInstall?.deferredPrompt;

  const handleInstall = async () => {
    if (!deferredPrompt) {
      onComplete();
      return;
    }
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      onComplete();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InstallMobileIcon color="primary" />
        <Typography variant="h6">{t('Onboarding.PWA_INSTALL_TITLE')}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t(isIos ? 'Onboarding.PWA_INSTALL_IOS_BODY' : 'Onboarding.PWA_INSTALL_BODY')}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={onDismiss}>{t('Onboarding.SKIP')}</Button>
        {isIos ? (
          <Button variant="contained" onClick={onComplete}>{t('Onboarding.CONTINUE')}</Button>
        ) : (
          <Button variant="contained" onClick={handleInstall}>{t('Onboarding.PWA_INSTALL_ACTION')}</Button>
        )}
      </Box>
    </Box>
  );
}

export default PwaInstallStep;
