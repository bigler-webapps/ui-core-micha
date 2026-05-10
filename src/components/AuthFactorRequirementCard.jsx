import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { fetchAuthPolicy, updateAuthPolicy } from '../auth/authApi';

export function AuthFactorRequirementCard({ canEdit = true, policy = null }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (policy) {
      setValue(String(policy?.required_auth_factor_count || 1));
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        const data = await fetchAuthPolicy();
        if (active) {
          setValue(String(data?.required_auth_factor_count || 1));
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
    const nextValue = event.target.value;
    const previous = value;
    setValue(nextValue);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateAuthPolicy({ required_auth_factor_count: Number(nextValue) });
      setSuccess(t('Auth.AUTH_FACTOR_SAVE_SUCCESS', 'Factor requirement saved.'));
    } catch (err) {
      setValue(previous);
      setError(t(err?.code || 'Auth.AUTH_POLICY_UPDATE_FAILED', 'Could not save factor requirement.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.AUTH_FACTOR_TITLE', 'Authentication Requirements')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Auth.AUTH_FACTOR_HINT',
          'Define the minimum number of authentication factors required for sign-in.',
        )}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <FormControl>
        <RadioGroup value={value} onChange={handleChange}>
          <FormControlLabel
            value="1"
            control={<Radio disabled={busy || !canEdit} />}
            label={t('Auth.ONE_FACTOR_LABEL', 'Allow single-factor authentication')}
          />
          <FormControlLabel
            value="2"
            control={<Radio disabled={busy || !canEdit} />}
            label={t('Auth.TWO_FACTOR_LABEL', 'Require two-factor authentication')}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
