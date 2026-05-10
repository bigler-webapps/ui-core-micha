import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import { AuthContext } from '../auth/AuthContext';
import { submitRegistrationRequest } from '../auth/authApi';

const MODE_LABELS = {
  self_signup_access_code: 'Auth.SIGNUP_ACCESS_CODE_TAB',
  self_signup_open: 'Auth.SIGNUP_OPEN_TAB',
  self_signup_email_domain: 'Auth.SIGNUP_EMAIL_DOMAIN_TAB',
  self_signup_qr: 'Auth.SIGNUP_QR_TAB',
};

const MODE_SUBTITLES = {
  self_signup_access_code: 'Auth.PAGE_SIGNUP_SUBTITLE_ACCESS_CODE',
  self_signup_open: 'Auth.PAGE_SIGNUP_SUBTITLE_OPEN',
  self_signup_email_domain: 'Auth.PAGE_SIGNUP_SUBTITLE_EMAIL_DOMAIN',
  self_signup_qr: 'Auth.PAGE_SIGNUP_SUBTITLE_QR',
};

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { authMethods } = useContext(AuthContext);

  const signupModes = useMemo(() => {
    const configured = Array.isArray(authMethods?.signup_modes)
      ? authMethods.signup_modes.filter(Boolean)
      : [];
    if (configured.length > 0) {
      return configured;
    }
    return authMethods?.signup ? ['self_signup_access_code'] : [];
  }, [authMethods]);

  const query = new URLSearchParams(location.search);
  const tokenFromUrl = query.get('rt') || '';

  const initialMode = useMemo(() => {
    if (tokenFromUrl && signupModes.includes('self_signup_qr')) {
      return 'self_signup_qr';
    }
    return signupModes[0] || 'self_signup_access_code';
  }, [signupModes, tokenFromUrl]);

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successKey, setSuccessKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const pageSubtitle = useMemo(() => {
    if (mode === 'self_signup_qr' && tokenFromUrl) {
      return t(
        'Auth.PAGE_SIGNUP_SUBTITLE_QR_READY',
        'Enter your email address to complete sign-up with the QR link you opened.',
      );
    }
    return t(
      MODE_SUBTITLES[mode] || 'Auth.PAGE_SIGNUP_SUBTITLE',
      'Choose a sign-up method and enter the required details.',
    );
  }, [mode, t, tokenFromUrl]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessKey(null);
    setErrorKey(null);

    if (!email) {
      setErrorKey('Auth.EMAIL_REQUIRED');
      return;
    }

    if (mode === 'self_signup_access_code' && !accessCode) {
      setErrorKey('Auth.SIGNUP_ACCESS_CODE_REQUIRED');
      return;
    }

    if (mode === 'self_signup_qr' && !tokenFromUrl) {
      setErrorKey('Auth.SIGNUP_QR_INVALID');
      return;
    }

    setSubmitting(true);
    try {
      await submitRegistrationRequest({
        email,
        mode,
        accessCode,
        registrationContextToken: mode === 'self_signup_qr' ? tokenFromUrl : null,
      });
      setSuccessKey('Auth.INVITE_REQUEST_SUCCESS');
    } catch (err) {
      setErrorKey(err.code || 'Auth.INVITE_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <NarrowPage
      title={t('Auth.LOGIN_SIGNUP_BUTTON')}
      subtitle={pageSubtitle}
    >
      <Helmet>
        <title>
          {t('App.NAME')} – {t('Auth.LOGIN_SIGNUP_BUTTON')}
        </title>
      </Helmet>

      {successKey && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t(successKey, { email })}
        </Alert>
      )}

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey, t('Auth.INVITE_FAILED', 'Could not complete signup.'))}
        </Alert>
      )}

      {signupModes.length > 1 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Stack spacing={1}>
            {signupModes.map((entry) => (
              <Button
                key={entry}
                variant={mode === entry ? 'contained' : 'outlined'}
                onClick={() => setMode(entry)}
                disabled={submitting}
                fullWidth
              >
                {t(MODE_LABELS[entry] || entry, entry)}
              </Button>
            ))}
          </Stack>
        </Stack>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          label={t('Auth.EMAIL_LABEL')}
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        {mode === 'self_signup_access_code' && (
          <TextField
            label={t('Auth.ACCESS_CODE_LABEL')}
            type="text"
            required
            fullWidth
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            disabled={submitting}
          />
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={submitting || signupModes.length === 0}
        >
          {submitting
            ? t('Auth.SIGNUP_SUBMITTING')
            : t('Auth.SIGNUP_SUBMIT')}
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2">
          {t('Auth.SIGNUP_ALREADY_HAVE_ACCOUNT')}{' '}
          <Button
            onClick={handleGoToLogin}
            variant="text"
            size="small"
          >
            {t('Auth.SIGNUP_GO_TO_LOGIN')}
          </Button>
        </Typography>
      </Box>
    </NarrowPage>
  );
}
