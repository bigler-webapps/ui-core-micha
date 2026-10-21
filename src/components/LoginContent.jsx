import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { NarrowPage } from '../layout/PageLayout';
import { AuthContext } from '../auth/AuthContext';
import {
  fetchRecoverySessionToken,
  loginWithPassword,
  loginWithRecoveryPassword,
} from '../auth/authApi';
import { loginWithPasskey, startSocialLogin } from '../utils/authService';
import { LoginForm } from './LoginForm';
import { MfaLoginComponent } from './MfaLoginComponent';
import { resolveErrorText } from '../utils/resolveErrorText';
import {
  RECOVERY_SECURITY_TARGET,
  resolveContinuationTarget,
  sanitizeContinuation,
} from '../utils/continuation';
import { profileIdentity } from '../utils/profileDraft';

export const LOGIN_PAGE_ALERT_SX = { mb: 2 };

const PROVIDER_NAMES = { google: 'Google', microsoft: 'Microsoft' };

/**
 * The login controller shared by LoginPage (`pageMode`) and LoginContent: password,
 * passkey, MFA, recovery and provider sign-in, with one redirect precedence
 * (`resolveContinuationTarget`). Page mode keeps the page's `?next=` source, its
 * framing, the S164 recovery hand-off and its navigations. Embedded mode takes the
 * continuation from a prop and never touches the URL recovery sentinel.
 */
export function LoginFlow({
  pageMode = false,
  continuation,
  onSuccess,
  onForgotPassword,
  onSignUp,
  showProviders = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, authMethods } = useContext(AuthContext) || {};
  const { t, i18n } = useTranslation();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [mfaState, setMfaState] = useState(null); // { availableTypes: [...], identifier }
  // S164: token never travels through the URL/fragment anymore. It is held
  // in component state only, fetched from the server-side session handoff
  // endpoint when the redirect lands the SPA here with `#recovery=ok`.
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [recoveryFetching, setRecoveryFetching] = useState(false);
  const [providerTransition, setProviderTransition] = useState('');
  // Embedded mode reports a signed-in person to the host once per identity, so a
  // later refresh of the same user does not re-run the host's continuation.
  const handledIdentity = useRef(undefined);

  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(
    String(location.hash || '').startsWith('#') ? String(location.hash).slice(1) : String(location.hash || ''),
  );
  // After S164 the hash carries only a status sentinel: `ok`, `invalid`, or
  // `expired`. We also accept the same key from query params as a defensive
  // fallback for proxies that strip fragments. Page mode only: the recovery
  // link always targets the login page.
  const recoveryStatus = pageMode
    ? String(hashParams.get('recovery') || params.get('recovery') || '').toLowerCase()
    : '';
  // Backward-compatible fallback for legacy links using query parameters.
  const recoveryEmail = pageMode ? hashParams.get('email') || params.get('email') || '' : '';
  const requestedNext = pageMode ? params.get('next') : continuation;

  useEffect(() => {
    const socialError = params.get('error') || params.get('social');
    if (socialError) {
      setErrorKey(t('Auth.SOCIAL_LOGIN_FAILED'));
    }
  }, [location.search]);

  // S164 handoff: on `#recovery=ok`, pull the plaintext token out of the
  // server-side session (one-shot). On `invalid`/`expired`, or on any
  // other non-empty value (legacy pre-S164 email links that carried the
  // token directly in the hash), surface an invalid-link error so the
  // user gets feedback instead of a silent login screen.
  useEffect(() => {
    if (!recoveryStatus) {
      return;
    }
    // Strip the `recovery=…` sentinel from BOTH hash and query string so a
    // bookmark or page refresh does not re-trigger this effect against an
    // already-popped session entry (which would render a confusing
    // "invalid" error to a user who is mid-login).
    //
    // We use `history.replaceState` rather than `navigate(..., {replace})`
    // intentionally: react-router's `navigate` would trigger an immediate
    // re-render with an updated `useLocation()`, which would cause this
    // effect's cleanup to set `cancelled=true` and discard the in-flight
    // recovery-token fetch result. `replaceState` only mutates the browser
    // URL bar; `useLocation()` stays at `recovery=ok` for this render, the
    // fetch resolves, and `recoveryToken` gets set normally. The trade-off
    // is that `useLocation().hash` is stale for the page lifetime — fine
    // because nothing else in this component reads it.
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('recovery');
      const cleanSearch = cleanParams.toString();
      const cleanUrl =
        window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState(null, '', cleanUrl);
    }
    if (recoveryStatus === 'expired') {
      setErrorKey(t('Auth.RECOVERY_TOKEN_EXPIRED'));
      setRecoveryToken(null);
      return;
    }
    if (recoveryStatus !== 'ok') {
      // Catches `invalid` and any unknown value (including legacy email
      // links that carried the plaintext token before S164).
      setErrorKey(t('Auth.RECOVERY_TOKEN_INVALID'));
      setRecoveryToken(null);
      return;
    }
    let cancelled = false;
    setRecoveryFetching(true);
    fetchRecoverySessionToken()
      .then((token) => {
        if (cancelled) return;
        if (!token) {
          // Session entry missing or already consumed — treat as invalid.
          setErrorKey(t('Auth.RECOVERY_TOKEN_INVALID'));
          setRecoveryToken(null);
          return;
        }
        setRecoveryToken(token);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorKey(resolveErrorText(i18n, err, 'Auth.RECOVERY_TOKEN_INVALID'));
        setRecoveryToken(null);
      })
      .finally(() => {
        if (!cancelled) {
          setRecoveryFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [recoveryStatus]);

  // A person who is already signed in when this renders (for example after a
  // provider callback) goes through the same precedence as a fresh sign-in.
  useEffect(() => {
    if (loading || !user) return;
    const target = resolveContinuationTarget(requestedNext, user);
    if (pageMode) {
      navigate(target, { replace: true });
      return;
    }
    const identity = profileIdentity(user);
    if (handledIdentity.current === identity) return;
    handledIdentity.current = identity;
    if (user.security_state?.requires_additional_security === true) {
      navigate(target, { replace: true });
    } else {
      onSuccess?.({ user, target });
    }
  }, [loading, user, navigate, requestedNext, pageMode]);

  // --- Helper: Central Success Logic ---
  // A forced or required-security target is navigated here, never handed back
  // to the host, so an embedded continuation cannot skip it.
  const handleLoginSuccess = (currentUser, forcedTarget) => {
    login(currentUser); // Update Context
    const target = resolveContinuationTarget(requestedNext, currentUser, forcedTarget);
    if (pageMode) {
      navigate(target);
      return;
    }
    handledIdentity.current = profileIdentity(currentUser);
    if (forcedTarget || currentUser?.security_state?.requires_additional_security === true) {
      navigate(target);
    } else {
      onSuccess?.({ user: currentUser, target });
    }
  };

  // --- Handlers ---

  const handleSubmitCredentials = async ({ identifier, password }) => {
    setErrorKey(null);
    setSubmitting(true);
    try {
      // A) Recovery Flow
      if (recoveryToken) {
        const result = await loginWithRecoveryPassword(
          identifier,
          password,
          recoveryToken
        );
        handleLoginSuccess(result.user, RECOVERY_SECURITY_TARGET);
        return;
      }

      // B) Standard Password Login
      const result = await loginWithPassword(identifier, password);

      if (result.needsMfa) {
        setMfaState({
          availableTypes: result.availableTypes || [],
          identifier,
        });
        setStep('mfa');
      } else {
        handleLoginSuccess(result.user);
      }
    } catch (err) {
      setErrorKey(resolveErrorText(i18n, err, 'Auth.LOGIN_FAILED'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyLoginInitial = async () => {
    setErrorKey(null);
    setSubmitting(true);
    try {
      // Service handles browser interaction + API calls
      const passkeyUser = await loginWithPasskey();
      handleLoginSuccess(passkeyUser);
    } catch (err) {
      if (err.code !== 'Auth.PASSKEY_CANCELLED') {
        setErrorKey(resolveErrorText(i18n, err, 'Auth.PASSKEY_FAILED'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSuccess = ({ user: mfaUser, method }) => {
    // MFA component returns the user object after verifying the code
    handleLoginSuccess(mfaUser, method === 'recovery_code' ? RECOVERY_SECURITY_TARGET : undefined);
  };

  const handleMfaCancel = () => {
    setStep('credentials');
    setMfaState(null);
    setErrorKey(null);
  };

  // Embedded provider entry: the validated continuation becomes the callback URL
  // (no continuation -> `startSocialLogin`'s own `/login` default). The page keeps
  // its existing call unchanged.
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

  const socialProviders = Array.isArray(authMethods?.social_providers)
    ? authMethods.social_providers
    : [];
  const passwordLoginEnabled = Boolean(authMethods?.password_login) || Boolean(recoveryToken);
  const socialLoginEnabled = Boolean(authMethods?.social_login) && socialProviders.length > 0
    && (pageMode || showProviders);
  const passkeyLoginEnabled = Boolean(authMethods?.passkey_login);
  const signupModes = Array.isArray(authMethods?.signup_modes)
    ? authMethods.signup_modes.filter(Boolean)
    : [];
  const signupEnabled = signupModes.length > 0 || Boolean(authMethods?.signup);
  const passwordResetEnabled = Boolean(authMethods?.password_reset);
  const twoFactorRequired = Boolean(authMethods?.two_factor_required)
    || Number(authMethods?.required_auth_factor_count || 1) >= 2;

  const pageSignUp = signupEnabled ? () => navigate('/signup') : null;
  const pageForgotPassword = passwordResetEnabled ? () => navigate('/reset-request-password') : null;

  // --- Render ---

  const content = (
    <>
      {errorKey && (
        <Alert severity="error" sx={LOGIN_PAGE_ALERT_SX}>
          {errorKey}
        </Alert>
      )}

      {!pageMode && providerTransition && (
        <Alert severity="info" sx={LOGIN_PAGE_ALERT_SX}>
          {t('Auth.PROVIDER_TRANSITION', { provider: PROVIDER_NAMES[providerTransition] || providerTransition })}
        </Alert>
      )}

      {recoveryFetching && !errorKey && (
        <Alert severity="info" sx={LOGIN_PAGE_ALERT_SX}>
          {t('Auth.RECOVERY_LINK_VALIDATING', 'Validating recovery link…')}
        </Alert>
      )}

      {recoveryToken && !errorKey && (
        <Alert severity="info" sx={LOGIN_PAGE_ALERT_SX}>
          {t('Auth.RECOVERY_LOGIN_WARNING', 'Recovery link validated. Please enter your password.')}
        </Alert>
      )}

      {pageMode && twoFactorRequired && !recoveryToken && !recoveryFetching && (
        <Alert severity="info" sx={LOGIN_PAGE_ALERT_SX}>
          {t('Auth.TWO_FACTOR_REQUIRED_HINT', 'This app requires two authentication factors for full access.')}
        </Alert>
      )}

      {step === 'credentials' && (
        <LoginForm
          onSubmit={passwordLoginEnabled ? handleSubmitCredentials : null}
          onForgotPassword={pageMode ? pageForgotPassword : (onForgotPassword || null)}
          onSocialLogin={socialLoginEnabled
            ? (pageMode ? (provider) => startSocialLogin(provider) : handleProviderLogin)
            : null}
          socialProviders={socialProviders}
          onPasskeyLogin={passkeyLoginEnabled ? handlePasskeyLoginInitial : null}
          onSignUp={pageMode ? pageSignUp : (onSignUp || null)}
          // Block submit while the handoff is in flight so the user does not
          // race the recovery-token fetch with a normal password POST.
          disabled={submitting || recoveryFetching || Boolean(providerTransition)}
          initialIdentifier={recoveryEmail}
        />
      )}

      {step === 'mfa' && mfaState && (
        <Box>
          <MfaLoginComponent
            availableTypes={mfaState.availableTypes}
            identifier={mfaState.identifier}
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </Box>
      )}
    </>
  );

  if (!pageMode) {
    return <Box sx={{ width: '100%' }}>{content}</Box>;
  }

  return (
    <NarrowPage
      title={t('Auth.PAGE_LOGIN_TITLE')}
      subtitle={t('Auth.PAGE_LOGIN_SUBTITLE')}
    >
      <title>{`${t('App.NAME')} – ${t('Auth.PAGE_LOGIN_TITLE')}`}</title>
      {content}
    </NarrowPage>
  );
}

/**
 * Embeddable login for a host flow such as a setup wizard (requires no new DCM
 * version). Same controller as LoginPage, rendered without page framing, with the
 * MFA step inline.
 *
 * Props:
 * - `continuation`: same-origin path to return to (validated; anything else falls
 *   back to `/`). Also used as the provider callback URL.
 * - `onSuccess({ user, target })`: called once per signed-in person, after a
 *   password, passkey or MFA sign-in, or when the person is already signed in on
 *   arrival (provider callback). Not called when recovery or required additional
 *   security applies: the component then navigates to the security page itself.
 * - `onSignUp`, `onForgotPassword`: optional handlers; the buttons are hidden
 *   without them.
 * - `showProviders` (default true): Google/Microsoft entry when the app enables it.
 * A provider callback that returns with `?error=` or `?social=` shows the existing
 * failure message and the provider choice again.
 */
export function LoginContent({ continuation, onSuccess, onSignUp, onForgotPassword, showProviders = true }) {
  return (
    <LoginFlow
      continuation={continuation}
      onSuccess={onSuccess}
      onSignUp={onSignUp}
      onForgotPassword={onForgotPassword}
      showProviders={showProviders}
    />
  );
}
