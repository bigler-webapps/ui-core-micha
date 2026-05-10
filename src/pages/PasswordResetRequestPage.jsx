// src/auth/pages/PasswordResetRequestPage.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import { requestPasswordReset } from '../auth/authApi';
import {PasswordResetRequestForm } from '../components/PasswordResetRequestForm';

export function PasswordResetRequestPage() {
  const { t } = useTranslation();

  const [submitting, setSubmitting] = useState(false);
  const [successKey, setSuccessKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const handleSubmit = async (email) => {
    setSuccessKey(null);
    setErrorKey(null);

    if (!email) {
      setErrorKey('Auth.EMAIL_REQUIRED');
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      // Kein User-Leak, immer gleiche Success-Meldung
      setSuccessKey('Auth.RESET_REQUEST_ACCEPTED');
    } catch (err) {
      setErrorKey(err.code || 'Auth.RESET_REQUEST_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NarrowPage
      title={t('Auth.PAGE_RESET_PASSWORD_TITLE')}
      subtitle={t('Auth.PAGE_RESET_REQUEST_SUBTITLE')}
    >
      <Helmet>
        <title>
          {t('App.NAME')} – {t('Auth.PAGE_RESET_PASSWORD_TITLE')}
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

      <PasswordResetRequestForm
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </NarrowPage>
  );
}
