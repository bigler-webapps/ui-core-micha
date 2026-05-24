import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Box, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

// Layout & Context
import { NarrowPage } from '../layout/PageLayout';
import { AuthContext } from '../auth/AuthContext';

// API & Services (Clean Architecture)
import {
  fetchRecoverySessionToken,
  loginWithPassword,
  loginWithRecoveryPassword,
} from '../auth/authApi';
import { loginWithPasskey, startSocialLogin } from '../utils/authService';

// Components
import { LoginForm } from '../components/LoginForm';
import { MfaLoginComponent } from '../components/MfaLoginComponent';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, authMethods } = useContext(AuthContext);
  const { t } = useTranslation();

  // State
  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [mfaState, setMfaState] = useState(null); // { availableTypes: [...], identifier }
  // S164: token never travels through the URL/fragment anymore. It is held
  // in component state only, fetched from the server-side session handoff
  // endpoint when the redirect lands the SPA here with `#recovery=ok`.
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [recoveryFetching, setRecoveryFetching] = useState(false);

  // URL Params parsing
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(
    String(location.hash || "").startsWith("#") ? String(location.hash).slice(1) : String(location.hash || ""),
  );
  // After S164 the hash carries only a status sentinel: `ok`, `invalid`, or
  // `expired`. We also accept the same key from query params as a defensive
  // fallback for proxies that strip fragments.
  const recoveryStatus = String(
    hashParams.get('recovery') || params.get('recovery') || '',
  ).toLowerCase();
  // Backward-compatible fallback for legacy links using query parameters.
  const recoveryEmail = hashParams.get('email') || params.get('email') || '';
  const requestedNext = params.get('next');

  const getRedirectTarget = (currentUser, options = {}) => {
    if (options.forceSecurityRedirect) {
      return options.forceSecurityRedirect;
    }

    const requiresExtra = currentUser?.security_state?.requires_additional_security === true;
    if (requiresExtra) {
      return '/account?tab=security&from=weak_login';
    }

    if (requestedNext && requestedNext.startsWith('/')) {
      return requestedNext;
    }

    return '/';
  };

  useEffect(() => {
    const socialError = params.get('error') || params.get('social');
    if (socialError) {
      setErrorKey('Auth.SOCIAL_LOGIN_FAILED');
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
      setErrorKey('Auth.RECOVERY_TOKEN_EXPIRED');
      setRecoveryToken(null);
      return;
    }
    if (recoveryStatus !== 'ok') {
      // Catches `invalid` and any unknown value (including legacy email
      // links that carried the plaintext token before S164).
      setErrorKey('Auth.RECOVERY_TOKEN_INVALID');
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
          setErrorKey('Auth.RECOVERY_TOKEN_INVALID');
          setRecoveryToken(null);
          return;
        }
        setRecoveryToken(token);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorKey(err?.code || 'Auth.RECOVERY_TOKEN_INVALID');
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

  useEffect(() => {
    if (loading || !user) return;
    navigate(getRedirectTarget(user), { replace: true });
  }, [loading, user, navigate, requestedNext]);

  // --- Helper: Central Success Logic ---
  const handleLoginSuccess = (user) => {
    login(user); // Update Context
    navigate(getRedirectTarget(user));
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
        login(result.user);
        navigate(
          getRedirectTarget(result.user, {
            forceSecurityRedirect: '/account?tab=security&from=recovery',
          }),
        );
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
      setErrorKey(err.code || 'Auth.LOGIN_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyLoginInitial = async () => {
    setErrorKey(null);
    setSubmitting(true);
    try {
      // Service handles browser interaction + API calls
      const user = await loginWithPasskey();
      handleLoginSuccess(user);
    } catch (err) {
      // 'Auth.PASSKEY_CANCELLED' is generic, maybe ignore visually or show specific hint
      if (err.code !== 'Auth.PASSKEY_CANCELLED') {
         setErrorKey(err.code || 'Auth.PASSKEY_FAILED');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSuccess = ({ user, method }) => {
    // MFA component should return the user object after verifying code
    if (method === 'recovery_code') {
      login(user);
      navigate(
        getRedirectTarget(user, {
          forceSecurityRedirect: '/account?tab=security&from=recovery',
        }),
      );
    } else {
      handleLoginSuccess(user);
    }
  };

  const handleMfaCancel = () => {
    setStep('credentials');
    setMfaState(null);
    setErrorKey(null);
  };

  const socialProviders = Array.isArray(authMethods?.social_providers)
    ? authMethods.social_providers
    : [];
  const passwordLoginEnabled = Boolean(authMethods?.password_login) || Boolean(recoveryToken);
  const socialLoginEnabled = Boolean(authMethods?.social_login) && socialProviders.length > 0;
  const passkeyLoginEnabled = Boolean(authMethods?.passkey_login);
  const signupModes = Array.isArray(authMethods?.signup_modes)
    ? authMethods.signup_modes.filter(Boolean)
    : [];
  const signupEnabled = signupModes.length > 0 || Boolean(authMethods?.signup);
  const passwordResetEnabled = Boolean(authMethods?.password_reset);
  const twoFactorRequired = Boolean(authMethods?.two_factor_required)
    || Number(authMethods?.required_auth_factor_count || 1) >= 2;

  // --- Render ---

  return (
    <NarrowPage
      title={t('Auth.PAGE_LOGIN_TITLE')}
      subtitle={t('Auth.PAGE_LOGIN_SUBTITLE')}
    >
      <Helmet>
        <title>{t('App.NAME')} – {t('Auth.PAGE_LOGIN_TITLE')}</title>
      </Helmet>

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {recoveryFetching && !errorKey && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('Auth.RECOVERY_LINK_VALIDATING', 'Validating recovery link…')}
        </Alert>
      )}

      {recoveryToken && !errorKey && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('Auth.RECOVERY_LOGIN_WARNING', 'Recovery link validated. Please enter your password.')}
        </Alert>
      )}

      {twoFactorRequired && !recoveryToken && !recoveryFetching && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('Auth.TWO_FACTOR_REQUIRED_HINT', 'This app requires two authentication factors for full access.')}
        </Alert>
      )}

      {step === 'credentials' && (
        <LoginForm
          onSubmit={passwordLoginEnabled ? handleSubmitCredentials : null}
          onForgotPassword={
            passwordResetEnabled ? () => navigate('/reset-request-password') : null
          }
          onSocialLogin={socialLoginEnabled ? (provider) => startSocialLogin(provider) : null}
          socialProviders={socialProviders}
          onPasskeyLogin={passkeyLoginEnabled ? handlePasskeyLoginInitial : null}
          onSignUp={signupEnabled ? () => navigate('/signup') : null}
          // Block submit while the handoff is in flight so the user does not
          // race the recovery-token fetch with a normal password POST.
          disabled={submitting || recoveryFetching}
          initialIdentifier={recoveryEmail}
        />
      )}

      {step === 'mfa' && mfaState && (
        <Box>
           {/* Assuming MfaLoginComponent handles the API call to authenticateWithMFA */}
          <MfaLoginComponent
            availableTypes={mfaState.availableTypes}
            identifier={mfaState.identifier}
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </Box>
      )}
    </NarrowPage>
  );
}
