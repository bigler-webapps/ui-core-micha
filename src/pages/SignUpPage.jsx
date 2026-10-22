import React, { useContext, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NarrowPage } from '../layout/PageLayout';
import { AuthContext } from '../auth/AuthContext';
import {
  SIGN_UP_PAGE_ALERT_SX,
  SignUpContent,
  orderSignupModes,
  resolveSignupModes,
} from '../components/SignUpContent';

export { SIGN_UP_PAGE_ALERT_SX };

const MODE_SUBTITLES = {
  self_signup_access_code: 'Auth.PAGE_SIGNUP_SUBTITLE_ACCESS_CODE',
  self_signup_open: 'Auth.PAGE_SIGNUP_SUBTITLE_OPEN',
  self_signup_email_domain: 'Auth.PAGE_SIGNUP_SUBTITLE_EMAIL_DOMAIN',
  self_signup_qr: 'Auth.PAGE_SIGNUP_SUBTITLE_QR',
};

// The form and its sign-up logic live in SignUpContent (UCM-AUTH-14); the page
// keeps the route framing, the `?rt` QR token source and the login link.
export function SignUpPage({ preferredSignupMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { authMethods } = useContext(AuthContext);

  const serverSignupModes = useMemo(() => resolveSignupModes(authMethods), [authMethods]);
  const signupModes = useMemo(
    () => orderSignupModes(serverSignupModes, preferredSignupMode),
    [preferredSignupMode, serverSignupModes],
  );

  const query = new URLSearchParams(location.search);
  const tokenFromUrl = query.get('rt') || '';

  const [mode, setMode] = useState(() => (
    tokenFromUrl && signupModes.includes('self_signup_qr')
      ? 'self_signup_qr'
      : signupModes[0] || 'self_signup_access_code'
  ));

  const pageSubtitle = useMemo(() => {
    if (mode === 'self_signup_qr' && tokenFromUrl) {
      return t(
        'Auth.PAGE_SIGNUP_SUBTITLE_QR_READY',
        'Enter your email address to complete sign-up with the QR link you opened.',
      );
    }
    return t(
      MODE_SUBTITLES[mode] || 'Auth.PAGE_SIGNUP_SUBTITLE',
      'Choose a sign-up method and enter the required details.',
    );
  }, [mode, t, tokenFromUrl]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <NarrowPage
      title={t('Auth.LOGIN_SIGNUP_BUTTON')}
      subtitle={pageSubtitle}
    >
      <title>{`${t('App.NAME')} – ${t('Auth.LOGIN_SIGNUP_BUTTON')}`}</title>

      <SignUpContent
        registrationContextToken={tokenFromUrl}
        preferredSignupMode={preferredSignupMode}
        onModeChange={setMode}
      />

      {/* Always rendered, closed or open — a closed signup page must still
          leave the person a way forward (the Envelope's own Goal), not just
          say why the form is missing. */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2">
          {t('Auth.SIGNUP_ALREADY_HAVE_ACCOUNT')}{' '}
          <Button
            onClick={handleGoToLogin}
            variant="text"
            size="small"
          >
            {t('Auth.SIGNUP_GO_TO_LOGIN')}
          </Button>
        </Typography>
      </Box>
    </NarrowPage>
  );
}
