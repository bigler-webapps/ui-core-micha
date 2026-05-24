// src/auth/pages/PasswordInvitePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import { PasswordSetForm } from '../components/PasswordSetForm';
import { verifyResetToken, setNewPassword } from '../auth/authApi';

export function PasswordInvitePage() {
  const { uid, token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const searchParams = new URLSearchParams(location.search);
  const nextPath = searchParams.get('next');

  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);
  const [checked, setChecked] = useState(false);

  // Unterscheidung Invite-Link vs klassischer Reset
  const isInvite = location.pathname.startsWith('/invite/');

  // Page-Titel/Subtitel-Keys anhand isInvite bestimmen
  const pageTitleKey = isInvite
    ? 'Auth.PAGE_INVITE_TITLE'
    : 'Auth.PAGE_RESET_PASSWORD_TITLE';

  const pageSubtitleKey = isInvite
    ? 'Auth.PAGE_INVITE_SUBTITLE'
    : 'Auth.PAGE_RESET_PASSWORD_SUBTITLE';

  useEffect(() => {
    if (!uid || !token) {
      setErrorKey('Auth.RESET_LINK_INVALID');
      setChecked(true);
      return;
    }

    const check = async () => {
      try {
        await verifyResetToken(uid, token);
        setChecked(true);
      } catch (err) {
        setErrorKey(err.code || 'Auth.RESET_LINK_INVALID');
        setChecked(true);
      }
    };

    check();
  }, [uid, token]);

  const handleSubmit = async (newPassword) => {
    if (!uid || !token) {
      setErrorKey('Auth.RESET_LINK_INVALID');
      return;
    }

    setSubmitting(true);
    setErrorKey(null);
    setSuccessKey(null);

    try {
      await setNewPassword(uid, token, newPassword);
      setSuccessKey(
        isInvite
          ? 'Auth.RESET_PASSWORD_SUCCESS_INVITE'
          : 'Auth.RESET_PASSWORD_SUCCESS_RESET',
      );
      // Same-origin check via URL parser — startsWith('/') alone misses
      // bypasses like `/\evil.com`, which WHATWG-parses to `https://evil.com/`
      // for special schemes. The parser normalises backslashes and protocol-
      // relative forms, so any cross-origin result is caught here.
      let safeNextPath = null;
      // Require leading-slash absolute path on the raw input (rejects
      // relative inputs like `account/settings` and protocol-relative `//host`
      // before they reach the URL parser, which would normalise both into a
      // same-origin pathname starting with `/`).
      if (
        nextPath &&
        typeof nextPath === 'string' &&
        nextPath.startsWith('/') &&
        !nextPath.startsWith('//')
      ) {
        try {
          const parsed = new URL(nextPath, window.location.origin);
          // Catches WHATWG bypasses like `/\evil.com` that resolve to a
          // different origin even though the raw input started with `/`.
          if (parsed.origin === window.location.origin) {
            safeNextPath = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch {
          // fall through to default redirect
        }
      }
      const target = safeNextPath
        ? `/login?next=${encodeURIComponent(safeNextPath)}`
        : '/login';
      navigate(target);
    } catch (err) {
      setErrorKey(err.code || 'Auth.RESET_PASSWORD_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading/Validierung des Links
  if (!checked && !errorKey) {
    return (
      <NarrowPage title={t('Auth.PAGE_CHECKING_LINK_TITLE')}>
        <Typography>{t('Auth.PAGE_CHECKING_LINK_TEXT')}</Typography>
      </NarrowPage>
    );
  }

  return (
    <NarrowPage
      title={t(pageTitleKey)}
      subtitle={t(pageSubtitleKey)}
    >
      <Helmet>
        <title>
          {t('App.NAME')} – {t(pageTitleKey)}
        </title>
      </Helmet>

      {errorKey && (
        <Typography color="error" gutterBottom>
          {t(errorKey)}
        </Typography>
      )}

      {successKey && (
        <Typography color="primary" gutterBottom>
          {t(successKey)}
        </Typography>
      )}

      {!successKey && !errorKey && (
        <PasswordSetForm onSubmit={handleSubmit} submitting={submitting} />
      )}
    </NarrowPage>
  );
}
