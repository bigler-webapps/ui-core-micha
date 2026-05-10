import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { sendAdminInvite } from '../auth/authApi';
import { useTranslation } from 'react-i18next';

export function UserInviteComponent() { // FIX: Removed apiUrl prop
  const { t } = useTranslation();
  const [inviteEmail, setInviteEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const actionButtonSx = {
    minWidth: 120,
    height: 40,
    textTransform: 'none',
    whiteSpace: 'nowrap',
  };

  const inviteUser = async () => {
    setMessage('');
    setError('');
    if (!inviteEmail) return;

    setLoading(true);
    try {
      const data = await sendAdminInvite(inviteEmail);
      
      setInviteEmail('');
      setMessage(data.detail || t('Auth.INVITE_SENT_SUCCESS', 'Invitation sent.'));
    } catch (err) {
      // err.message contains normalized text or code from authApi
      // eslint-disable-next-line no-console
      console.error('Error inviting user:', err);
      setError(t(err.code) || err.message || t('Auth.INVITE_FAILED'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        {t('Auth.INVITE_TITLE', 'Invite a new user')}
      </Typography>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label={t('Auth.EMAIL_LABEL', 'Email address')}
          type="email"
          variant="outlined"
          fullWidth
          size="small"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          disabled={loading}
          onKeyPress={(e) => {
              if (e.key === 'Enter') inviteUser();
          }}
        />
        <Button 
            variant="contained" 
            size="small"
            onClick={inviteUser} 
            disabled={loading || !inviteEmail}
            sx={actionButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t('Auth.INVITE_BUTTON', 'Invite')}
        </Button>
      </Box>
    </Box>
  );
}
