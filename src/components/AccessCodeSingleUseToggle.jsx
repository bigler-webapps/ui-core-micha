import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { fetchAuthPolicy, updateAuthPolicy } from '../auth/authApi';

export function AccessCodeSingleUseToggle({ canEdit = true, policy = null, onPolicyChange = null }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (policy) {
      setValue(Boolean(policy?.access_code_single_use));
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        const data = await fetchAuthPolicy();
        if (active) {
          setValue(Boolean(data?.access_code_single_use));
        }
      } catch {
        // Keep defaults when policy is unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, [policy]);

  const handleChange = async (event) => {
    if (!canEdit) {
      return;
    }
    const nextValue = event.target.checked;
    const previous = value;
    setValue(nextValue);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateAuthPolicy({ access_code_single_use: nextValue });
      if (onPolicyChange) {
        onPolicyChange((current) => ({ ...(current || {}), ...(updated || {}) }));
      }
      setSuccess(t('Auth.ACCESS_CODE_SINGLE_USE_SAVE_SUCCESS', 'Access code policy saved.'));
    } catch (err) {
      setValue(previous);
      setError(t(err?.code || 'Auth.AUTH_POLICY_UPDATE_FAILED', 'Could not save access code policy.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.ACCESS_CODE_SINGLE_USE_TITLE', 'Access Code Single-Use')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Auth.ACCESS_CODE_SINGLE_USE_HINT',
          'When enabled, each access code can be redeemed only once. Recommended.',
        )}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <FormControlLabel
        control={
          <Switch
            checked={value}
            disabled={busy || !canEdit}
            onChange={handleChange}
          />
        }
        label={t('Auth.ACCESS_CODE_SINGLE_USE_TOGGLE', 'Codes are single-use')}
      />
    </Box>
  );
}
