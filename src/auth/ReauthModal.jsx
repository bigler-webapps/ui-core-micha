import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import apiClient from './apiClient';
import { HEADLESS_BASE } from './authConfig.jsx';
import { rejectReauth, resolveReauth, subscribe } from './reauth';

export function ReauthModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return subscribe((active) => {
      setOpen(active);
      if (!active) {
        setPassword('');
        setError(null);
        setLoading(false);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`${HEADLESS_BASE}/auth/reauthenticate`, { password });
      resolveReauth();
    } catch {
      setError(t('Auth.REAUTH_FAILED'));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    rejectReauth(new Error('cancelled'));
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('Auth.REAUTH_TITLE')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            type="password"
            label={t('Auth.LOGIN_PASSWORD_LABEL')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={loading}>
            {t('Auth.MFA_TOTP_CANCEL_BUTTON')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !password}>
            {loading ? t('Auth.MFA_TOTP_VERIFY_BUTTON_LOADING') : t('Auth.MFA_VERIFY')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
