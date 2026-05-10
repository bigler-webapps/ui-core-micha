// src/auth/components/PasswordResetRequestForm.jsx
import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function PasswordResetRequestForm({ onSubmit, submitting = false }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    onSubmit(email);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}
    >
      <TextField
        label={t('Auth.EMAIL_LABEL')}
        type="email"
        required
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
      >
        {submitting
          ? t('Auth.RESET_REQUEST_BUTTON_LOADING')
          : t('Auth.RESET_REQUEST_BUTTON')}
      </Button>
    </Box>
  );
};

