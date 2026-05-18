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

export function EmailVerificationRequirementCard({ canEdit = true, policy = null, onPolicyChange = null }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (policy) {
      setValue(Boolean(policy?.require_email_verification));
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        const data = await fetchAuthPolicy();
        if (active) {
          setValue(Boolean(data?.require_email_verification));
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
      const updated = await updateAuthPolicy({ require_email_verification: nextValue });
      if (onPolicyChange) {
        onPolicyChange((current) => ({ ...(current || {}), ...(updated || {}) }));
      }
      setSuccess(t('Auth.EMAIL_VERIFICATION_SAVE_SUCCESS', 'Email verification requirement saved.'));
    } catch (err) {
      setValue(previous);
      setError(t(err?.code || 'Auth.AUTH_POLICY_UPDATE_FAILED', 'Could not save email verification requirement.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.EMAIL_VERIFICATION_TITLE', 'Email Verification')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Auth.EMAIL_VERIFICATION_HINT',
          'Require verified email ownership before social sign-in can link to an account. Recommended.',
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
        label={t('Auth.EMAIL_VERIFICATION_TOGGLE', 'Require email verification')}
      />
    </Box>
  );
}
