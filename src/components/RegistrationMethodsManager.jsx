import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { updateAuthPolicy } from '../auth/authApi';

const EMPTY_POLICY = {
  allow_admin_invite: true,
  allow_self_signup_access_code: false,
  allow_self_signup_open: false,
  allow_self_signup_email_domain: false,
  allow_self_signup_qr: false,
  allowed_email_domains: [],
  signup_qr_expiry_days: 90,
  required_auth_factor_count: 1,
};

export function RegistrationMethodsManager({
  policy: authPolicy,
  error = '',
  onPolicyChange,
  canEdit = true,
}) {
  const { t } = useTranslation();
  const [policyState, setPolicyState] = useState(EMPTY_POLICY);
  const [busyField, setBusyField] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authPolicy) {
      return;
    }
    setPolicyState({ ...EMPTY_POLICY, ...authPolicy });
  }, [authPolicy]);

  const toggle = (field) => async (_event, checked) => {
    const previous = policyState[field];
    setPolicyState((prev) => ({ ...prev, [field]: checked }));
    setBusyField(field);
    setSaveError('');
    setSuccess('');
    try {
      const next = await updateAuthPolicy({ [field]: checked });
      setPolicyState((prev) => ({ ...prev, ...next }));
      setSuccess(t('Auth.AUTH_POLICY_SAVE_SUCCESS', 'Authentication settings saved.'));
      if (onPolicyChange) onPolicyChange(next);
    } catch (err) {
      setPolicyState((prev) => ({ ...prev, [field]: previous }));
      setSaveError(t(err?.code || 'Auth.AUTH_POLICY_UPDATE_FAILED', 'Could not save authentication settings.'));
    } finally {
      setBusyField('');
    }
  };

  if (!authPolicy && !error) {
    return (
      <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.REGISTRATION_METHODS_TITLE', 'Registration Methods')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t('Auth.REGISTRATION_METHODS_HINT', 'Choose which signup and invite flows are active for this app.')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack spacing={1}>
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(policyState.allow_admin_invite)}
              onChange={toggle('allow_admin_invite')}
              disabled={Boolean(busyField) || !canEdit}
            />
          )}
          label={t('Auth.ADMIN_INVITE_LABEL', 'Admin invite')}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(policyState.allow_self_signup_access_code)}
              onChange={toggle('allow_self_signup_access_code')}
              disabled={Boolean(busyField) || !canEdit}
            />
          )}
          label={t('Auth.SIGNUP_ACCESS_CODE_LABEL', 'Self-signup with access code')}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(policyState.allow_self_signup_open)}
              onChange={toggle('allow_self_signup_open')}
              disabled={Boolean(busyField) || !canEdit}
            />
          )}
          label={t('Auth.SIGNUP_OPEN_LABEL', 'Open self-signup')}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(policyState.allow_self_signup_email_domain)}
              onChange={toggle('allow_self_signup_email_domain')}
              disabled={Boolean(busyField) || !canEdit}
            />
          )}
          label={t('Auth.SIGNUP_EMAIL_DOMAIN_LABEL', 'Self-signup by email domain')}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={Boolean(policyState.allow_self_signup_qr)}
              onChange={toggle('allow_self_signup_qr')}
              disabled={Boolean(busyField) || !canEdit}
            />
          )}
          label={t('Auth.SIGNUP_QR_LABEL', 'Self-signup by QR')}
        />
      </Stack>

      {policyState.allow_self_signup_email_domain && !(policyState.allowed_email_domains || []).length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t(
            'Auth.EMAIL_DOMAIN_CURRENTLY_BLOCKED_HINT',
            'Email-domain signup is enabled, but it stays blocked until at least one allowed domain is saved.',
          )}
        </Alert>
      )}
    </Box>
  );
}
