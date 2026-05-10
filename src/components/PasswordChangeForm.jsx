import React, { useState } from 'react';
import { Box, TextField, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * A simplified form to handle password changes.
 * Does not require password confirmation.
 */
export function PasswordChangeForm({ onSubmit, submitting = false }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;

    // Parent steuert Loading/Errors, hier nur Aufruf
    await onSubmit(currentPassword, newPassword);

    // Optional: Felder zurücksetzen bei Erfolg (macht dein Parent aktuell so)
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500 }}>
      <Stack spacing={2}>
        <TextField
          label={t('Auth.CURRENT_PASSWORD_LABEL')}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          fullWidth
          disabled={submitting}
        />
        <TextField
          label={t('Auth.NEW_PASSWORD_LABEL')}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          fullWidth
          disabled={submitting}
        />
        <Box>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
          >
            {submitting
              ? t('Auth.CHANGE_PASSWORD_BUTTON_LOADING')
              : t('Auth.CHANGE_PASSWORD_BUTTON')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

