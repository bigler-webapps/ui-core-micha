// src/auth/components/SecurityComponent.jsx
import React, { useContext, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PasswordChangeForm } from './PasswordChangeForm';
import { SocialLoginButtons } from './SocialLoginButtons';
import { PasskeysComponent } from './PasskeysComponent';
import { MFAComponent } from './MFAComponent';
import { changePassword } from '../auth/authApi';
import { startSocialLogin } from '../utils/authService';
import { AuthContext } from '../auth/AuthContext';

export function SecurityComponent({
  fromRecovery = false,
  fromWeakLogin = false,
}) {
  const { t } = useTranslation();
  const { authMethods } = useContext(AuthContext);

  const [messageKey, setMessageKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const socialProviders = Array.isArray(authMethods?.social_providers)
    ? authMethods.social_providers
    : [];
  const canChangePassword = Boolean(authMethods?.password_change);
  const socialLoginEnabled = Boolean(authMethods?.social_login) && socialProviders.length > 0;
  const passkeysEnabled = Boolean(authMethods?.passkeys_manage);
  const mfaEnabled = Boolean(authMethods?.mfa_enabled);

  const sectionOrder = useMemo(
    () => [
      canChangePassword ? 'password' : null,
      socialLoginEnabled ? 'social' : null,
      passkeysEnabled ? 'passkeys' : null,
      mfaEnabled ? 'mfa' : null,
    ].filter(Boolean),
    [canChangePassword, socialLoginEnabled, passkeysEnabled, mfaEnabled],
  );

  const needsDividerAfter = (section) => {
    const idx = sectionOrder.indexOf(section);
    return idx !== -1 && idx < sectionOrder.length - 1;
  };

  const handleSocialClick = async (provider) => {
    setMessageKey(null);
    setErrorKey(null);
    try {
      await startSocialLogin(provider, {
        process: 'connect',
        callbackUrl: `${window.location.origin}/account?tab=security`,
      });
    } catch (err) {
      setErrorKey(err.code || 'Auth.SOCIAL_LOGIN_FAILED');
    }
  };

  const handlePasswordChange = async (currentPassword, newPassword) => {
    setMessageKey(null);
    setErrorKey(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessageKey('Auth.RESET_PASSWORD_SUCCESS');
    } catch (err) {
      setErrorKey(err.code || 'Auth.PASSWORD_CHANGE_FAILED');
    }
  };

  return (
    <Box>
      {fromRecovery && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('Security.RECOVERY_LOGIN_WARNING')}
        </Alert>
      )}

      {fromWeakLogin && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('Security.WEAK_LOGIN_WARNING')}
        </Alert>
      )}

      {messageKey && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t(messageKey)}
        </Alert>
      )}
      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {canChangePassword && (
        <>
          <Typography variant="h6" gutterBottom>
            {t('Auth.LOGIN_PASSWORD_LABEL')}
          </Typography>
          <PasswordChangeForm onSubmit={handlePasswordChange} />
          {needsDividerAfter('password') && <Divider sx={{ my: 3 }} />}
        </>
      )}

      {socialLoginEnabled && (
        <>
          <Typography variant="h6" gutterBottom>
            {t('Security.SOCIAL_SECTION_TITLE')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('Security.SOCIAL_SECTION_DESCRIPTION')}
          </Typography>
          <SocialLoginButtons
            onProviderClick={handleSocialClick}
            providers={socialProviders}
          />
          {needsDividerAfter('social') && <Divider sx={{ my: 3 }} />}
        </>
      )}

      {passkeysEnabled && (
        <>
          <PasskeysComponent />
          {needsDividerAfter('passkeys') && <Divider sx={{ my: 3 }} />}
        </>
      )}

      {mfaEnabled && <MFAComponent />}
    </Box>
  );
};

