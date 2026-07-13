import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import CookieIcon from '@mui/icons-material/Cookie';
import { updateUserProfile } from '../../auth/authApi';

export function CookieConsentStep({ onComplete }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setLoading(true);
    setError('');
    try {
      await updateUserProfile({ accepted_convenience_cookies: true });
      onComplete();
    } catch {
      setError(t('Onboarding.COOKIE_CONSENT_ERROR'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CookieIcon color="primary" /><Typography variant="h6">{t('Onboarding.COOKIE_CONSENT_TITLE')}</Typography></Box>
      <Typography variant="body2" color="text.secondary">{t('Onboarding.COOKIE_CONSENT_BODY')}</Typography>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="contained" onClick={accept} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined}>{t('Onboarding.COOKIE_CONSENT_ACCEPT')}</Button></Box>
    </Box>
  );
}

export default CookieConsentStep;
