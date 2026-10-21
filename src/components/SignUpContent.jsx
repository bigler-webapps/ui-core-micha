import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { AuthContext } from '../auth/AuthContext';
import { submitRegistrationRequest } from '../auth/authApi';
import { TurnstileWidget } from './TurnstileWidget';
import { SocialLoginButtons } from './SocialLoginButtons';
import { startSocialLogin } from '../utils/authService';
import { sanitizeContinuation } from '../utils/continuation';
import { resolveErrorText } from '../utils/resolveErrorText';

export const SIGN_UP_PAGE_ALERT_SX = { mb: 2 };

const TURNSTILE_SIGNUP_MODES = new Set([
  'self_signup_open',
  'self_signup_email_domain',
]);

const MODE_LABELS = {
  self_signup_access_code: 'Auth.SIGNUP_ACCESS_CODE_TAB',
  self_signup_open: 'Auth.SIGNUP_OPEN_TAB',
  self_signup_email_domain: 'Auth.SIGNUP_EMAIL_DOMAIN_TAB',
  self_signup_qr: 'Auth.SIGNUP_QR_TAB',
};

const PROVIDER_NAMES = { google: 'Google', microsoft: 'Microsoft' };

export function resolveSignupModes(authMethods) {
  const configured = Array.isArray(authMethods?.signup_modes)
    ? authMethods.signup_modes.filter(Boolean)
    : [];
  if (configured.length > 0) {
    return configured;
  }
  return authMethods?.signup ? ['self_signup_access_code'] : [];
}

/**
 * The sign-up form shared by SignUpPage and embedded flows: every configured
 * sign-up mode, Turnstile, the QR registration context and the existing
 * registration request.
 *
 * Props:
 * - `registrationContextToken`: the QR token (SignUpPage passes `?rt`).
 * - `onModeChange(mode)`: reports the selected sign-up mode.
 * - `onSubmitted(email)`: embedded use. Called after the request succeeded with
 *   the email only; the component then shows the confirmation instruction instead
 *   of the form (remount it, e.g. with a new `key`, to let the person change the
 *   email). Without it the form stays with the success message, as on the page.
 * - `showProviders` (default false) and `continuation`: Google/Microsoft entry
 *   above the email form when the app enables it; the validated continuation is
 *   the provider callback URL.
 * The access code, QR token and Turnstile token never leave this component.
 */
export function SignUpContent({
  registrationContextToken = '',
  onModeChange,
  onSubmitted,
  showProviders = false,
  continuation,
}) {
  const { t, i18n } = useTranslation();
  const { authMethods } = useContext(AuthContext) || {};

  const signupModes = useMemo(() => resolveSignupModes(authMethods), [authMethods]);

  const initialMode = useMemo(() => {
    if (registrationContextToken && signupModes.includes('self_signup_qr')) {
      return 'self_signup_qr';
    }
    return signupModes[0] || 'self_signup_access_code';
  }, [signupModes, registrationContextToken]);

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successKey, setSuccessKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [providerTransition, setProviderTransition] = useState('');
  const turnstileWidgetRef = useRef(null);

  const turnstileRequired = Boolean(authMethods?.turnstile_site_key)
    && TURNSTILE_SIGNUP_MODES.has(mode);
  const socialProviders = Array.isArray(authMethods?.social_providers)
    ? authMethods.social_providers
    : [];
  const providersVisible = showProviders
    && Boolean(authMethods?.social_login)
    && socialProviders.length > 0;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode]);

  useEffect(() => {
    setTurnstileToken('');
  }, [mode, authMethods?.turnstile_site_key]);

  const handleProviderLogin = async (provider) => {
    setErrorKey(null);
    setProviderTransition(provider);
    const callbackUrl = sanitizeContinuation(continuation);
    try {
      await startSocialLogin(provider, callbackUrl ? { callbackUrl } : {});
    } catch (err) {
      setProviderTransition('');
      setErrorKey(resolveErrorText(i18n, err, 'Auth.SOCIAL_LOGIN_FAILED'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessKey(null);
    setErrorKey(null);

    if (!email) {
      setErrorKey(t('Auth.EMAIL_REQUIRED'));
      return;
    }

    if (mode === 'self_signup_access_code' && !accessCode) {
      setErrorKey(t('Auth.SIGNUP_ACCESS_CODE_REQUIRED'));
      return;
    }

    if (mode === 'self_signup_qr' && !registrationContextToken) {
      setErrorKey(t('Auth.SIGNUP_QR_INVALID'));
      return;
    }

    if (turnstileRequired && !turnstileToken) return;

    setSubmitting(true);
    try {
      const res = await submitRegistrationRequest({
        email,
        mode,
        accessCode,
        registrationContextToken: mode === 'self_signup_qr' ? registrationContextToken : null,
        turnstileToken: turnstileRequired ? turnstileToken : undefined,
      });
      // The backend's own response code is already mode-agnostic and accurate
      // (Auth.INVITE_SENT). Falling back to the access-code-specific "if valid,
      // an invite was sent" wording here was wrong for open/email-domain/QR
      // signup, which have no code whose validity needs hiding.
      setSuccessKey(res?.code || 'Auth.INVITE_SENT');
      onSubmitted?.(email);
    } catch (err) {
      setErrorKey(resolveErrorText(i18n, err, 'Auth.INVITE_FAILED'));
      if (turnstileRequired) {
        setTurnstileToken('');
        turnstileWidgetRef.current?.reset();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (signupModes.length === 0) {
    return (
      <Alert severity="info" sx={SIGN_UP_PAGE_ALERT_SX}>
        {t('Auth.SELF_SIGNUP_DISABLED', 'Self sign-up is currently disabled.')}
      </Alert>
    );
  }

  if (onSubmitted && successKey) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">{t(successKey, { email })}</Alert>
        <Alert severity="info">{t('Auth.CONFIRMATION_EMAIL_INSTRUCTION')}</Alert>
      </Stack>
    );
  }

  return (
    <>
      {successKey && (
        <Alert severity="success" sx={SIGN_UP_PAGE_ALERT_SX}>
          {t(successKey, { email })}
        </Alert>
      )}

      {errorKey && (
        <Alert severity="error" sx={SIGN_UP_PAGE_ALERT_SX}>
          {errorKey}
        </Alert>
      )}

      {providersVisible && (
        <Box sx={{ mb: 2 }}>
          <SocialLoginButtons
            onProviderClick={handleProviderLogin}
            providers={socialProviders}
          />
          {providerTransition && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('Auth.PROVIDER_TRANSITION', { provider: PROVIDER_NAMES[providerTransition] || providerTransition })}
            </Alert>
          )}
          <Divider sx={{ mt: 2 }}>{t('Auth.LOGIN_OR')}</Divider>
        </Box>
      )}

      {signupModes.length > 1 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
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

        {turnstileRequired && (
          <TurnstileWidget
            ref={turnstileWidgetRef}
            siteKey={authMethods.turnstile_site_key}
            onToken={setTurnstileToken}
          />
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={submitting || Boolean(providerTransition) || (turnstileRequired && !turnstileToken)}
        >
          {submitting
            ? t('Auth.SIGNUP_SUBMITTING')
            : t('Auth.SIGNUP_SUBMIT')}
        </Button>
      </Box>
    </>
  );
}
