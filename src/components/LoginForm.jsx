import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from './SocialLoginButtons';

export function LoginForm({
  onSubmit,
  onForgotPassword,
  onSocialLogin,
  socialProviders,
  onPasskeyLogin,
  onSignUp,
  error,           // bereits übersetzter Text oder t(errorKey) aus dem Parent
  disabled = false,
  initialIdentifier = '',
}) {
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');

  // Keep identifier in sync if initialIdentifier changes (e.g. recovery link)
  useEffect(() => {
    setIdentifier(initialIdentifier);
  }, [initialIdentifier]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    onSubmit({ identifier, password });
  };

  const supportsPasskey =
    !!onPasskeyLogin &&
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}

      {/* Sign in: Passkey zuerst, falls verfügbar */}
      {supportsPasskey && (
        <>
          <Button
            variant="contained"
            fullWidth
            type="button"
            onClick={onPasskeyLogin}
            disabled={disabled}
          >
            {t('Auth.LOGIN_USE_PASSKEY_BUTTON')}
          </Button>

          <Divider sx={{ my: 2 }}>
            {t('Auth.LOGIN_OR')}
          </Divider>
        </>
      )}

      {/* Sign in: E-Mail + Passwort */}
      {onSubmit && (
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
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={disabled}
          />

          <TextField
            label={t('Auth.LOGIN_PASSWORD_LABEL')}
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={disabled}
          >
            {t('Auth.PAGE_LOGIN_TITLE')}
          </Button>
        </Box>
      )}

      {/* Other ways to sign in */}
      {onSocialLogin && (
        <Box>
          <Divider sx={{ my: 2 }}>
            {t('Auth.LOGIN_OR')}
          </Divider>
          <SocialLoginButtons
            onProviderClick={onSocialLogin}
            providers={socialProviders}
          />
        </Box>
      )}
      {/* Account actions */}
      {(onSignUp || onForgotPassword) && (
      <Box>
        <Divider sx={{ my: 2 }}>
          {t('Auth.LOGIN_OR')}
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {onSignUp && (
            <Button
              type="button"
              variant="outlined"
              onClick={onSignUp}
              disabled={disabled}
              fullWidth
            >
              {t('Auth.LOGIN_SIGNUP_BUTTON')}
            </Button>
          )}

          {onForgotPassword && (
            <Button
              type="button"
              variant="outlined"
              onClick={onForgotPassword}
              disabled={disabled}
              fullWidth
            >
              {t('Auth.LOGIN_FORGOT_PASSWORD_BUTTON')}
            </Button>
          )}
        </Box>
      </Box>
      )}
    </Box>
  );
};
