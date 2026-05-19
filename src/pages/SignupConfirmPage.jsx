// src/pages/SignupConfirmPage.jsx
//
// S13: Completes a pending registration. Reads the signed pending-token from
// the URL (`?token=...`), asks the user for a password, and POSTs to
// `register_confirm`. On success, the user is sent to /login to sign in
// explicitly — matches the existing invite/password-reset pattern and
// preserves any MFA / login-event flow the app may enforce.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { confirmRegistration } from '../auth/authApi';

export function SignupConfirmPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const tokenFromUrl = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('token') || '';
  }, [location.search]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey(null);

    if (!tokenFromUrl) {
      setErrorKey('Auth.PENDING_TOKEN_INVALID');
      return;
    }
    if (!password || password.length < 8) {
      setErrorKey('Auth.PASSWORD_TOO_SHORT');
      return;
    }
    if (password !== confirmPassword) {
      setErrorKey('Auth.PASSWORD_MISMATCH');
      return;
    }

    setSubmitting(true);
    try {
      await confirmRegistration({ token: tokenFromUrl, password });
      // Send the user to /login. Aligned with PasswordInvitePage; no implicit
      // session that would bypass MFA challenges or skip the explicit login
      // event in audit logs.
      navigate('/login', { replace: true });
      return;
    } catch (err) {
      setErrorKey(err?.code || 'Auth.PENDING_TOKEN_INVALID');
    } finally {
      setSubmitting(false);
    }
  };

  const tokenMissing = !tokenFromUrl;

  return (
    <NarrowPage
      title={t('Auth.SIGNUP_CONFIRM_TITLE', 'Confirm your registration')}
      subtitle={t(
        'Auth.SIGNUP_CONFIRM_SUBTITLE',
        'Choose a password to finish creating your account.',
      )}
    >
      <Helmet>
        <title>
          {t('App.NAME')} – {t('Auth.SIGNUP_CONFIRM_TITLE', 'Confirm your registration')}
        </title>
      </Helmet>

      {tokenMissing ? (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('Auth.PENDING_TOKEN_INVALID', 'This confirmation link is invalid or expired.')}
          </Alert>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button onClick={() => navigate('/signup')} variant="contained">
              {t('Auth.SIGNUP_REQUEST_NEW', 'Request a new invitation')}
            </Button>
            <Button onClick={() => navigate('/login')} variant="text">
              {t('Auth.SIGNUP_GO_TO_LOGIN', 'Go to login')}
            </Button>
          </Stack>
        </>
      ) : (
        <>
          {errorKey && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t(errorKey, t('Auth.PENDING_TOKEN_INVALID', 'Could not confirm registration.'))}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label={t('Auth.NEW_PASSWORD_LABEL', 'New password')}
              type="password"
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
            <TextField
              label={t('Auth.PASSWORD_CONFIRM_LABEL', 'Confirm new password')}
              type="password"
              required
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting
                ? t('Auth.SIGNUP_CONFIRM_SUBMITTING', 'Confirming…')
                : t('Auth.SIGNUP_CONFIRM_SUBMIT', 'Confirm registration')}
            </Button>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Typography variant="body2">
              {t('Auth.SIGNUP_ALREADY_HAVE_ACCOUNT', 'Already have an account?')}
            </Typography>
            <Button onClick={() => navigate('/login')} variant="text" size="small">
              {t('Auth.SIGNUP_GO_TO_LOGIN', 'Go to login')}
            </Button>
          </Stack>
        </>
      )}
    </NarrowPage>
  );
}
