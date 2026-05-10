import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { updateAuthPolicy } from '../auth/authApi';

const DEFAULT_EXPIRY_DAYS = 90;

function clampExpiryDays(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_EXPIRY_DAYS;
  }
  return parsed;
}

export function QrSignupValidityManager({
  enabled = false,
  expiryDays = DEFAULT_EXPIRY_DAYS,
  onPolicyChange,
  canEdit = true,
}) {
  const { t } = useTranslation();
  const [currentExpiryDays, setCurrentExpiryDays] = useState(String(expiryDays || DEFAULT_EXPIRY_DAYS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setCurrentExpiryDays(String(expiryDays || DEFAULT_EXPIRY_DAYS));
  }, [expiryDays]);

  const handleSave = async () => {
    const nextDays = clampExpiryDays(currentExpiryDays);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const next = await updateAuthPolicy({
        signup_qr_expiry_days: nextDays,
      });
      setCurrentExpiryDays(String(next?.signup_qr_expiry_days || nextDays));
      setSuccess(t('Auth.AUTH_POLICY_SAVE_SUCCESS', 'Authentication settings saved.'));
      if (onPolicyChange) onPolicyChange(next);
    } catch (err) {
      setError(t(err?.code || 'Auth.AUTH_POLICY_UPDATE_FAILED', 'Could not save authentication settings.'));
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.SIGNUP_QR_VALIDITY_TITLE', 'QR Signup Validity')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Auth.SIGNUP_QR_VALIDITY_HINT',
          'Set the default validity for newly generated QR signup links.',
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
        <TextField
          label={t('Auth.SIGNUP_QR_EXPIRY_DAYS_LABEL', 'QR signup validity (days)')}
          helperText={t(
            'Auth.SIGNUP_QR_EXPIRY_DAYS_HINT',
            'Default validity for newly generated QR signup links.',
          )}
          type="number"
          value={currentExpiryDays}
          onChange={(event) => setCurrentExpiryDays(event.target.value)}
          disabled={busy || !canEdit}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={busy || !canEdit}
          sx={{ minWidth: 120, mt: { sm: '8px' } }}
        >
          {t('Common.SAVE', 'Save')}
        </Button>
      </Stack>
    </Box>
  );
}
