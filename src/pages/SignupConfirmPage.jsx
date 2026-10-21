// src/pages/SignupConfirmPage.jsx
//
// S13: Completes a pending registration. Reads the signed pending-token from
// the URL (`?token=...`) and hands it to SignupConfirmContent, which asks for a
// password and POSTs to `register_confirm`. On success, the user is sent to
// /login to sign in explicitly — matches the existing invite/password-reset
// pattern and preserves any MFA / login-event flow the app may enforce.
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import {
  SIGNUP_CONFIRM_PAGE_ALERT_SX,
  SignupConfirmContent,
} from '../components/SignupConfirmContent';

export { SIGNUP_CONFIRM_PAGE_ALERT_SX };

export function SignupConfirmPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const tokenFromUrl = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('token') || '';
  }, [location.search]);

  return (
    <NarrowPage
      title={t('Auth.SIGNUP_CONFIRM_TITLE', 'Confirm your registration')}
      subtitle={t(
        'Auth.SIGNUP_CONFIRM_SUBTITLE',
        'Choose a password to finish creating your account.',
      )}
    >
      <title>{`${t('App.NAME')} – ${t('Auth.SIGNUP_CONFIRM_TITLE', 'Confirm your registration')}`}</title>

      <SignupConfirmContent
        token={tokenFromUrl}
        // Aligned with PasswordInvitePage; no implicit session that would bypass
        // MFA challenges or skip the explicit login event in audit logs.
        onSuccess={() => navigate('/login', { replace: true })}
        onGoToSignup={() => navigate('/signup')}
        onGoToLogin={() => navigate('/login')}
      />
    </NarrowPage>
  );
}
