// src/auth/components/PasswordSetForm.jsx
import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Simple form to set a new password (once, with confirmation).
 * Caller passes onSubmit(newPassword) and handles redirect / API call.
 */
export function PasswordSetForm({ onSubmit, submitting = false }) {
  const { t } = useTranslation();

  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [localErrorKey, setLocalErrorKey] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalErrorKey(null);

    if (!password1 || !password2) {
      setLocalErrorKey('Auth.PASSWORD_SET_LOCAL_REQUIRED');
      return;
    }

    if (password1 !== password2) {
      setLocalErrorKey('Auth.PASSWORD_SET_LOCAL_MISMATCH');
      return;
    }

    if (onSubmit) {
      onSubmit(password1);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}
    >
      {localErrorKey && (
        <Box sx={{ color: 'error.main', fontSize: 14 }}>
          {t(localErrorKey)}
        </Box>
      )}

      <TextField
        label={t('Auth.NEW_PASSWORD_LABEL')}
        type="password"
        fullWidth
        autoComplete="new-password"
        value={password1}
        onChange={(e) => setPassword1(e.target.value)}
        disabled={submitting}
      />

      <TextField
        label={t('Auth.PASSWORD_CONFIRM_LABEL')}
        type="password"
        fullWidth
        autoComplete="new-password"
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        disabled={submitting}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
      >
        {submitting
          ? t('Auth.PASSWORD_SET_BUTTON_LOADING')
          : t('Auth.PASSWORD_SET_BUTTON')}
      </Button>
    </Box>
  );
};

