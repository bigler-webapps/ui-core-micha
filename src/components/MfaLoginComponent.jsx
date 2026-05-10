import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { authenticateWithMFA, fetchCurrentUser, requestMfaSupportHelp } from '../auth/authApi';
import { loginWithPasskey } from '../utils/authService';

export function MfaLoginComponent({ availableTypes, identifier, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [infoKey, setInfoKey] = useState(null);
  const [helpRequested, setHelpRequested] = useState(false);

  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');

  const types = Array.isArray(availableTypes) ? availableTypes : [];
  const supportsTotpOrRecovery =
    types.includes('totp') || types.includes('recovery_codes');
  const supportsWebauthn = types.includes('webauthn');

  const handleSubmitCode = async (event) => {
    event.preventDefault();
    setErrorKey(null);
    setInfoKey(null);
    setSubmitting(true);
    try {
      const trimmed = code.trim();
      const isRecovery = trimmed.length > 6;

      await authenticateWithMFA({ code: trimmed });

      const user = await fetchCurrentUser();

      onSuccess({
        user,
        method: isRecovery ? 'recovery_code' : 'totp',
      });
    } catch (err) {
      setErrorKey(err.code || 'Auth.MFA_AUTHENTICATE_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskey = async () => {
    setErrorKey(null);
    setInfoKey(null);
    setSubmitting(true);
    try {
      // Use standard passkey login (starts a fresh session flow).
      // This allows users to bypass the password MFA step if they have a valid passkey.
      const user = await loginWithPasskey();
      onSuccess({ user, method: 'webauthn' });
    } catch (err) {
      // Detailed error handling
      if (err.code === 'Auth.PASSKEY_CANCELLED') {
          // User cancelled - show specific key or just ignore
          setErrorKey('Auth.PASSKEY_CANCELLED');
      } else {
          // eslint-disable-next-line no-console
          console.error(err);
          setErrorKey('Auth.PASSKEY_FAILED');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openHelpDialog = () => {
    setErrorKey(null);
    setInfoKey(null);
    setHelpDialogOpen(true);
  };

  const handleNeedHelp = async () => {
    setErrorKey(null);
    setInfoKey(null);
    setSubmitting(true);
    try {
      await requestMfaSupportHelp(identifier || '', helpMessage || '');
      setHelpRequested(true);
      setInfoKey('Auth.MFA_HELP_REQUESTED');
      setHelpDialogOpen(false);
      setHelpMessage('');
    } catch (err) {
      setErrorKey(err.code || 'Auth.MFA_HELP_REQUEST_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {t(
          'Auth.MFA_SUBTITLE',
          'Please confirm your login using one of the available methods.',
        )}
      </Typography>

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {infoKey && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(infoKey)}
        </Alert>
      )}

      <Stack spacing={2}>
        {supportsWebauthn && (
          <Button
            variant="contained"
            fullWidth
            onClick={handlePasskey}
            disabled={submitting || helpRequested}
          >
            {t('Auth.LOGIN_USE_PASSKEY_BUTTON', 'Use passkey / security key')}
          </Button>
        )}

        <Divider sx={{ my: 2 }}>
          {t('Auth.LOGIN_OR')}
        </Divider>

        {supportsTotpOrRecovery && (
          <Box component="form" onSubmit={handleSubmitCode}>
            <TextField
              label={t(
                'Auth.MFA_CODE_LABEL',
                'Authenticator code (or recovery code)',
              )}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              disabled={submitting || helpRequested}
              autoComplete="one-time-code"
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting || !code.trim() || helpRequested}
            >
              {t('Auth.MFA_VERIFY', 'Verify')}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2 }}>
          {t('Auth.LOGIN_OR')}
        </Divider>

        

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('Auth.MFA_BACK_TO_LOGIN', 'Back to login')}
          </Button>

          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="secondary"
            onClick={openHelpDialog}
            disabled={submitting || helpRequested}
          >
            {t(
              'Auth.MFA_NEED_HELP',
              "I can't use any of these methods",
            )}
          </Button>
        </Stack>
      </Stack>
       <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t('Auth.MFA_HELP_DIALOG_TITLE', 'Need help with sign-in')}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t(
              'Auth.MFA_HELP_DIALOG_DESCRIPTION',
              'Describe briefly why you cannot use the available methods. A support person will review your request.',
            )}
          </Typography>
          <TextField
            label={t('Auth.MFA_HELP_MESSAGE_LABEL', 'Your message to support')}
            multiline
            minRows={3}
            fullWidth
            value={helpMessage}
            onChange={(e) => setHelpMessage(e.target.value)}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHelpDialogOpen(false)}
            disabled={submitting}
          >
            {t('Common.CANCEL', 'Cancel')}
          </Button>
          <Button
            onClick={handleNeedHelp}
            disabled={submitting}
            variant="contained"
          >
            {t('Auth.MFA_HELP_SUBMIT', 'Send request')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    
  );
  
};

