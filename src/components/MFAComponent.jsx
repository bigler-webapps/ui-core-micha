// src/auth/components/MFAComponent.jsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import { fetchAuthenticators, requestTotpKey, activateTotp, deactivateTotp, fetchRecoveryCodes, generateRecoveryCodes  } from '../auth/authApi';

export function MFAComponent() {
  const { t } = useTranslation();

  const [authenticators, setAuthenticators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState(null);

  // Setup State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [totpData, setTotpData] = useState(null); // { secret, key_uri }
  const [verifyCode, setVerifyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery Codes State
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecovery, setShowRecovery] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const data = await fetchAuthenticators();
      setAuthenticators(Array.isArray(data) ? data : []);
    } catch (err) {
      // 404 / leer einfach schlucken
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totpAuthenticator = authenticators.find((a) => a.type === 'totp');

  // --- HANDLER: TOTP START ---
  const handleStartSetup = async () => {
    setErrorKey(null);
    setIsSettingUp(true);

    try {
      const result = await requestTotpKey();

      if (result.exists) {
        setIsSettingUp(false);
        setErrorKey('Auth.MFA_TOTP_ALREADY_ACTIVE');
        return;
      }

      setTotpData({
        secret: result.secret,
        key_uri: result.key_uri,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorKey(err.code || 'Auth.TOTP_REQUEST_FAILED');
      setIsSettingUp(false);
    }
  };

  // --- HANDLER: TOTP VERIFY ---
  const handleVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    try {
      await activateTotp(verifyCode);
      setIsSettingUp(false);
      setVerifyCode('');
      setTotpData(null);
      await loadData();
      await handleShowRecoveryCodes();
    } catch (err) {
      setErrorKey(err.code || 'Auth.MFA_AUTHENTICATE_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  // --- HANDLER: TOTP DELETE ---
  const handleDeleteTotp = async () => {
    // Achtung: confirm-Text jetzt übersetzt
    // eslint-disable-next-line no-alert
    const ok = window.confirm(t('Auth.MFA_TOTP_DISABLE_CONFIRM'));
    if (!ok) return;

    setErrorKey(null);
    try {
      await deactivateTotp();
      await loadData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorKey(err.code || 'Auth.TOTP_DEACTIVATE_FAILED');
    }
  };

  // --- HANDLER: RECOVERY CODES ---
  const handleShowRecoveryCodes = async () => {
    setErrorKey(null);
    try {
      const data = await fetchRecoveryCodes();
      const codes = data.codes || data.unused_codes || [];
      setRecoveryCodes(Array.isArray(codes) ? codes : []);
      setShowRecovery(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorKey(err.code || 'Auth.RECOVERY_CODES_FETCH_FAILED');
    }
  };

  const handleGenerateNewRecoveryCodes = async () => {
    setErrorKey(null);
    try {
      const data = await generateRecoveryCodes();
      const codes = data.codes || data.unused_codes || [];
      setRecoveryCodes(Array.isArray(codes) ? codes : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorKey(err.code || 'Auth.RECOVERY_CODES_GENERATE_FAILED');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.MFA_TOTP_TITLE')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {t('Auth.MFA_TOTP_DESCRIPTION')}
      </Typography>

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {/* --- CASE 1: TOTP IS ACTIVE --- */}
      {totpAuthenticator ? (
        <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f0fdf4' }}>
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                color="success.main"
                fontWeight="bold"
              >
                {t('Auth.MFA_TOTP_STATUS_ACTIVE')}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteTotp}
            >
              {t('Auth.MFA_TOTP_BUTTON_DISABLE')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        !isSettingUp && (
          <Button variant="contained" onClick={handleStartSetup}>
            {t('Auth.MFA_TOTP_BUTTON_SETUP')}
          </Button>
        )
      )}

      {/* --- WIZARD: SETUP --- */}
      {isSettingUp && totpData && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {t('Auth.MFA_TOTP_QR_TITLE')}
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems="center"
            >
              {/* QR CODE */}
              <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid #eee' }}>
                <QRCodeSVG value={totpData.key_uri} size={150} />
              </Box>

              {/* MANUAL ENTRY & VERIFY */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" gutterBottom>
                  {t('Auth.MFA_TOTP_MANUAL_HINT')}
                </Typography>
                <Typography
                  variant="mono"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: '#eee',
                    p: 1,
                    borderRadius: 1,
                    display: 'inline-block',
                    mb: 2,
                  }}
                >
                  {totpData.secret}
                </Typography>

                <form onSubmit={handleVerify}>
                  <TextField
                    label={t('Auth.MFA_TOTP_CODE_LABEL')}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    fullWidth
                    required
                    sx={{ mb: 2 }}
                    autoComplete="off"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting
                        ? t('Auth.MFA_TOTP_VERIFY_BUTTON_LOADING')
                        : t('Auth.MFA_TOTP_VERIFY_BUTTON')}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsSettingUp(false);
                        setTotpData(null);
                        setVerifyCode('');
                      }}
                      disabled={submitting}
                    >
                      {t('Auth.MFA_TOTP_CANCEL_BUTTON')}
                    </Button>
                  </Stack>
                </form>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 3 }} />

      {/* --- RECOVERY CODES --- */}
      <Typography variant="h6" gutterBottom>
        {t('Auth.MFA_RECOVERY_TITLE')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {t('Auth.MFA_RECOVERY_DESCRIPTION')}
      </Typography>

      {!showRecovery ? (
        <Button variant="outlined" onClick={handleShowRecoveryCodes}>
          {t('Auth.MFA_RECOVERY_VIEW_BUTTON')}
        </Button>
      ) : (
        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('Auth.MFA_RECOVERY_WARNING')}
          </Alert>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {Array.isArray(recoveryCodes) &&
              recoveryCodes.map((code) => (
                <Box
                  key={code}
                  sx={{
                    bgcolor: 'white',
                    border: '1px solid #ddd',
                    p: 1,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {code}
                  <Tooltip title={t('Auth.MFA_RECOVERY_COPY_TOOLTIP')}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyCode(code)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
          </Stack>
          <Button
            sx={{ mt: 2 }}
            size="small"
            onClick={handleGenerateNewRecoveryCodes}
          >
            {t('Auth.MFA_RECOVERY_GENERATE_NEW')}
          </Button>
        </Box>
      )}
    </Box>
  );
};


