import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { createSignupQr } from '../auth/authApi';

const DEFAULT_EXPIRY_DAYS = 90;
const DEFAULT_MAX_REDEMPTIONS = 1;

function clampExpiryDays(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_EXPIRY_DAYS;
  }
  return parsed;
}

function clampMaxRedemptions(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_REDEMPTIONS;
  }
  return parsed;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function QrSignupManager({
  enabled = false,
  expiryDays = DEFAULT_EXPIRY_DAYS,
}) {
  const { t } = useTranslation();
  const qrWrapperRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState(null);
  const [copyState, setCopyState] = useState('idle');
  const [maxRedemptions, setMaxRedemptions] = useState(DEFAULT_MAX_REDEMPTIONS);
  const hasGeneratedRef = useRef(false);

  const formattedExpiry = useMemo(() => {
    if (!result?.expires_at) {
      return '';
    }
    const parsed = new Date(result.expires_at);
    if (Number.isNaN(parsed.getTime())) {
      return result.expires_at;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }, [result]);

  const generate = async (daysOverride) => {
    if (!enabled) {
      setResult(null);
      return;
    }
    const nextDays = clampExpiryDays(daysOverride ?? expiryDays);
    const nextRedemptions = clampMaxRedemptions(maxRedemptions);
    setBusy(true);
    setError('');
    setSuccess('');
    setCopyState('idle');
    try {
      const data = await createSignupQr({
        expires_minutes: nextDays * 24 * 60,
        max_redemptions: nextRedemptions,
      });
      setResult(data);
      hasGeneratedRef.current = true;
      setSuccess(t('Auth.SIGNUP_QR_CREATE_SUCCESS', 'New QR signup link created.'));
    } catch (err) {
      setError(t(err?.code || 'Auth.SIGNUP_QR_CREATE_FAILED', 'Could not create signup QR.'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setError('');
      setSuccess('');
      setCopyState('idle');
      setMaxRedemptions(DEFAULT_MAX_REDEMPTIONS);
      hasGeneratedRef.current = false;
      return;
    }
    if (hasGeneratedRef.current) {
      return;
    }
    let active = true;
    const ensureInitialQr = async () => {
      setBusy(true);
      setError('');
      setSuccess('');
      setCopyState('idle');
      try {
        const days = clampExpiryDays(expiryDays);
        const data = await createSignupQr({
          expires_minutes: days * 24 * 60,
          max_redemptions: clampMaxRedemptions(maxRedemptions),
        });
        if (!active) return;
        setResult(data);
        hasGeneratedRef.current = true;
        setSuccess(t('Auth.SIGNUP_QR_CREATE_SUCCESS', 'New QR signup link created.'));
      } catch (err) {
        if (!active) return;
        setError(t(err?.code || 'Auth.SIGNUP_QR_CREATE_FAILED', 'Could not create signup QR.'));
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    };
    ensureInitialQr();
    return () => {
      active = false;
    };
  }, [enabled, expiryDays, t]);

  const handleCopyLink = async () => {
    const signupUrl = result?.signup_url;
    if (!signupUrl || !navigator?.clipboard?.writeText) {
      setCopyState('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopyState('copied');
    } catch (_error) {
      setCopyState('error');
    }
  };

  const handleSavePdf = () => {
    if (!result?.signup_url) {
      return;
    }
    const svgMarkup = qrWrapperRef.current?.innerHTML;
    if (!svgMarkup) {
      setError(t('Auth.SIGNUP_QR_PDF_NOT_READY', 'The QR image is not ready yet. Please try again.'));
      return;
    }

    const printWindow = window.open('', '_blank', 'width=960,height=900');
    if (!printWindow) {
      setError(t('Auth.SIGNUP_QR_PDF_BLOCKED', 'Popup blocked. Please allow popups to save the QR card as PDF.'));
      return;
    }

    const safeUrl = escapeHtml(result.signup_url);
    const safeExpiresAt = escapeHtml(formattedExpiry || result.expires_at || '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t('Auth.SIGNUP_QR_MANAGER_TITLE', 'QR Signup'))}</title>
          <style>
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              background: #f5f7fb;
              color: #122033;
            }
            .card {
              max-width: 720px;
              margin: 0 auto;
              border: 1px solid #d9e2f2;
              border-radius: 20px;
              background: #ffffff;
              padding: 32px;
              box-sizing: border-box;
            }
            .eyebrow {
              display: inline-block;
              padding: 6px 10px;
              border-radius: 999px;
              background: #e8f0ff;
              color: #23408e;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            h1 {
              margin: 16px 0 8px;
              font-size: 28px;
              line-height: 1.2;
            }
            .qr-box {
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 24px;
              border-radius: 16px;
              background: #ffffff;
              border: 1px solid #d9e2f2;
            }
            .meta {
              margin-top: 20px;
              padding: 16px;
              border-radius: 16px;
              background: #f8faff;
              border: 1px solid #d9e2f2;
              word-break: break-word;
              font-size: 14px;
              line-height: 1.5;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .card {
                border: 0;
                border-radius: 0;
                max-width: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="eyebrow">${escapeHtml(t('Auth.SIGNUP_QR_MANAGER_TITLE', 'QR Signup'))}</div>
            <h1>${escapeHtml(t('Auth.SIGNUP_QR_PRINT_TITLE', 'Sign-Up Access'))}</h1>
            <div class="qr-box">${svgMarkup}</div>
            <div class="meta">
              <strong>${escapeHtml(t('Auth.SIGNUP_QR_LINK_LABEL', 'Signup link'))}</strong><br />
              <a href="${safeUrl}">${safeUrl}</a><br /><br />
              <strong>${escapeHtml(t('Auth.SIGNUP_QR_VALID_UNTIL', 'Valid until'))}</strong>: ${safeExpiresAt}
            </div>
          </div>
          <script>
            window.addEventListener('load', function () {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!enabled) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.SIGNUP_QR_MANAGER_TITLE', 'QR Signup')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t('Auth.SIGNUP_QR_MANAGER_HINT', 'Generate and share QR signup links below.')}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          label={t('Auth.SIGNUP_QR_MAX_REDEMPTIONS_LABEL', 'Max redemptions')}
          type="number"
          size="small"
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
          helperText={t(
            'Auth.SIGNUP_QR_MAX_REDEMPTIONS_HINT',
            'How many people may sign up with the same QR. Default: 1.',
          )}
          disabled={busy}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {copyState === 'copied' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('Auth.SIGNUP_QR_LINK_COPIED', 'Signup link copied.')}
        </Alert>
      )}
      {copyState === 'error' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('Auth.SIGNUP_QR_COPY_UNAVAILABLE', 'Copying the link is not available in this browser.')}
        </Alert>
      )}

      {result?.signup_url && (
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#ffffff',
              py: 3,
              px: 2,
            }}
          >
            <Box ref={qrWrapperRef}>
              <QRCodeSVG value={result.signup_url} size={220} includeMargin />
            </Box>
          </Box>

          <Box
            sx={{
              mt: 2,
              borderRadius: 3,
              p: 2,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              {t('Auth.SIGNUP_QR_ACCESS_TITLE', 'Signup Access')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Auth.SIGNUP_QR_VALID_UNTIL', 'Valid until')}: {formattedExpiry || result.expires_at}
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => generate()} disabled={busy}>
              {t('Auth.SIGNUP_QR_NEW_BUTTON', 'New QR-Code')}
            </Button>
            <Button variant="outlined" onClick={handleCopyLink} disabled={!result?.signup_url || busy}>
              {t('Auth.SIGNUP_QR_COPY_BUTTON', 'Copy Link')}
            </Button>
            <Button variant="outlined" onClick={handleSavePdf} disabled={!result?.signup_url || busy}>
              {t('Auth.SIGNUP_QR_PDF_BUTTON', 'Save as PDF')}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
