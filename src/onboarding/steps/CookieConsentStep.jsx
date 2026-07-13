import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import { fetchCookieStatement, fetchPrivacyStatement, updateUserProfile } from '../../auth/authApi';

export function CookieConsentStep({ onComplete }) {
  const { t } = useTranslation();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);
  const [privacyText, setPrivacyText] = useState('');
  const [cookieText, setCookieText] = useState('');
  const [showPrivacyText, setShowPrivacyText] = useState(false);
  const [showCookieText, setShowCookieText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePrivacyText = async () => {
    if (!showPrivacyText && !privacyText) {
      try {
        setPrivacyText(await fetchPrivacyStatement());
      } catch {
        // Non-fatal: the link simply won't reveal inline text this time.
      }
    }
    setShowPrivacyText((previous) => !previous);
  };

  const toggleCookieText = async () => {
    if (!showCookieText && !cookieText) {
      try {
        setCookieText(await fetchCookieStatement());
      } catch {
        // Non-fatal: the link simply won't reveal inline text this time.
      }
    }
    setShowCookieText((previous) => !previous);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!privacyAccepted) return;
    setLoading(true);
    setError('');
    try {
      await updateUserProfile({
        accepted_privacy_statement: true,
        accepted_convenience_cookies: cookiesAccepted,
      });
      onComplete();
    } catch {
      setError(t('Onboarding.PRIVACY_COOKIES_ERROR'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PrivacyTipIcon color="primary" />
        <Typography variant="h6">{t('Onboarding.PRIVACY_COOKIES_TITLE')}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">{t('Onboarding.PRIVACY_COOKIES_BODY')}</Typography>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box>
        <FormControlLabel
          control={(
            <Checkbox
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
              required
            />
          )}
          label={t('Onboarding.PRIVACY_AGREEMENT_LABEL')}
        />
        <Box>
          <Link component="button" type="button" variant="body2" onClick={togglePrivacyText}>
            {t('Onboarding.VIEW_STATEMENT')}
          </Link>
          {showPrivacyText && privacyText && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {privacyText}
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        <FormControlLabel
          control={(
            <Checkbox
              checked={cookiesAccepted}
              onChange={(event) => setCookiesAccepted(event.target.checked)}
            />
          )}
          label={t('Onboarding.COOKIES_OPT_IN_LABEL')}
        />
        <Box>
          <Link component="button" type="button" variant="body2" onClick={toggleCookieText}>
            {t('Onboarding.VIEW_STATEMENT')}
          </Link>
          {showCookieText && cookieText && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {cookieText}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          type="submit"
          disabled={loading || !privacyAccepted}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {t('Onboarding.CONTINUE')}
        </Button>
      </Box>
    </Box>
  );
}

export default CookieConsentStep;
