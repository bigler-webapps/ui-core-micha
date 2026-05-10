import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { updateAuthPolicy } from '../auth/authApi';

export function AllowedEmailDomainsManager({
  domains = [],
  enabled = false,
  onPolicyChange,
  canEdit = true,
}) {
  const { t } = useTranslation();
  const [domainsText, setDomainsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setDomainsText((domains || []).join('\n'));
  }, [domains]);

  const handleSave = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const allowedEmailDomains = domainsText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);
      const next = await updateAuthPolicy({
        allowed_email_domains: allowedEmailDomains,
      });
      setDomainsText((next?.allowed_email_domains || allowedEmailDomains).join('\n'));
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
        {t('Auth.ALLOWED_EMAIL_DOMAINS_TITLE', 'Allowed Email Domains')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Auth.ALLOWED_EMAIL_DOMAINS_CARD_HINT',
          'Only addresses from these domains can use email-domain sign-up.',
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        label={t('Auth.ALLOWED_EMAIL_DOMAINS_LABEL', 'Allowed email domains')}
        helperText={t(
          'Auth.ALLOWED_EMAIL_DOMAINS_HINT',
          'One domain per line, e.g. example.org. You can leave this empty temporarily.',
        )}
        multiline
        minRows={4}
        fullWidth
        value={domainsText}
        onChange={(event) => setDomainsText(event.target.value)}
        disabled={busy || !canEdit}
      />

      <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave} disabled={busy || !canEdit}>
        {t('Common.SAVE', 'Save')}
      </Button>
    </Box>
  );
}
