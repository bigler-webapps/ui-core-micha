// src/auth/pages/PasswordChangePage.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import { PasswordChangeForm } from '../components/PasswordChangeForm';
import { changePassword } from '../auth/authApi';

export function PasswordChangePage() {
  const { t } = useTranslation();

  const [submitting, setSubmitting] = useState(false);
  const [successKey, setSuccessKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const handleSubmit = async (oldPassword, newPassword) => {
    setSuccessKey(null);
    setErrorKey(null);
    setSubmitting(true);

    try {
      await changePassword(oldPassword, newPassword);
      setSuccessKey('Auth.RESET_PASSWORD_SUCCESS');
    } catch (err) {
      setErrorKey(err.code || 'Auth.PASSWORD_CHANGE_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NarrowPage
      title={t('Auth.CHANGE_PASSWORD_BUTTON')}
      subtitle={t('Auth.PAGE_CHANGE_PASSWORD_SUBTITLE')}
    >
      <Helmet>
        <title>
          {t('App.NAME')} – {t('Auth.CHANGE_PASSWORD_BUTTON')}
        </title>
      </Helmet>

      {successKey && (
        <Typography color="primary" gutterBottom>
          {t(successKey)}
        </Typography>
      )}

      {errorKey && (
        <Typography color="error" gutterBottom>
          {t(errorKey)}
        </Typography>
      )}

      <PasswordChangeForm
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </NarrowPage>
  );
}
