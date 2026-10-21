// S13: Completes a pending registration with the signed pending-token from the
// email link and the account's first password. Shared by SignupConfirmPage and
// embedded flows (UCM-AUTH-14). Success never signs the person in: the host (the
// page: /login) shows the separate login, which preserves any MFA / login-event
// flow the app may enforce.
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { confirmRegistration } from '../auth/authApi';
import { resolveErrorText } from '../utils/resolveErrorText';

export const SIGNUP_CONFIRM_PAGE_ALERT_SX = { mb: 2 };

/**
 * Props:
 * - `token`: the pending-registration token (the page reads `?token`).
 * - `onSuccess()`: called without arguments after the registration was confirmed.
 * - `onGoToSignup`, `onGoToLogin`: optional navigation; each button is hidden
 *   without its handler.
 * The token and the passwords stay inside this component.
 */
export function SignupConfirmContent({ token = '', onSuccess, onGoToSignup, onGoToLogin }) {
  const { t, i18n } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey(null);

    if (!token) {
      setErrorKey(t('Auth.PENDING_TOKEN_INVALID'));
      return;
    }
    if (!password || password.length < 8) {
      setErrorKey(t('Auth.PASSWORD_TOO_SHORT'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorKey(t('Auth.PASSWORD_MISMATCH'));
      return;
    }

    setSubmitting(true);
    try {
      await confirmRegistration({ token, password });
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err) {
      setErrorKey(resolveErrorText(i18n, err, 'Auth.PENDING_TOKEN_INVALID'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <>
        <Alert severity="error" sx={SIGNUP_CONFIRM_PAGE_ALERT_SX}>
          {t('Auth.PENDING_TOKEN_INVALID', 'This confirmation link is invalid or expired.')}
        </Alert>
        {(onGoToSignup || onGoToLogin) && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {onGoToSignup && (
              <Button onClick={onGoToSignup} variant="contained">
                {t('Auth.SIGNUP_REQUEST_NEW', 'Request a new invitation')}
              </Button>
            )}
            {onGoToLogin && (
              <Button onClick={onGoToLogin} variant="text">
                {t('Auth.SIGNUP_GO_TO_LOGIN', 'Go to login')}
              </Button>
            )}
          </Stack>
        )}
      </>
    );
  }

  return (
    <>
      {errorKey && (
        <Alert severity="error" sx={SIGNUP_CONFIRM_PAGE_ALERT_SX}>
          {errorKey}
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

      {onGoToLogin && (
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          <Typography variant="body2">
            {t('Auth.SIGNUP_ALREADY_HAVE_ACCOUNT', 'Already have an account?')}
          </Typography>
          <Button onClick={onGoToLogin} variant="text" size="small">
            {t('Auth.SIGNUP_GO_TO_LOGIN', 'Go to login')}
          </Button>
        </Stack>
      )}
    </>
  );
}
