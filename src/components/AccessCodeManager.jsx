// src/auth/components/AccessCodeManager.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Slider,
  Button,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

// Pfad ggf. anpassen je nach Struktur: von src/auth/components zu src/auth/authApi
import {
  fetchAccessCodes,
  createAccessCode,
  deleteAccessCode,
} from '../auth/authApi';

export const ACCESS_CODE_ACTION_SX = {
  minWidth: 120,
  height: 40,
  whiteSpace: 'nowrap',
};
export const ACCESS_CODE_PRIMARY_ACTION_SX = { ...ACCESS_CODE_ACTION_SX, mt: 1 };
export const ACCESS_CODE_ALERT_SX = { mb: 2 };
export const ACCESS_CODE_VALUE_FIELD_SX = {
  '& .MuiInputBase-input': {
    fontFamily: 'monospace',
    letterSpacing: '0.04em',
  },
};

export function AccessCodeManager() {
  const { t } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [length, setLength] = useState(12);
  const [manualCode, setManualCode] = useState('');

  const [errorKey, setErrorKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);
  const [copyNotice, setCopyNotice] = useState('');

  // Helper that prefers backend error code if available
  const setErrorFromErrorObject = (err, fallbackCode) => {
    const backendCode = err?.code;
    setErrorKey(backendCode || fallbackCode);
  };

  // Load all access codes from backend
  const loadCodes = async () => {
    setLoading(true);
    setErrorKey(null);
    setSuccessKey(null);
    try {
      const data = await fetchAccessCodes();
      setCodes(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorFromErrorObject(err, 'Auth.ACCESS_CODE_LIST_FAILED');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generates a random code with the selected length
  const generateRandomCode = (len) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    return Array.from(array, (x) => alphabet[x % alphabet.length]).join('');
  };

  const handleCreateCode = async (code) => {
    setSubmitting(true);
    setErrorKey(null);
    setSuccessKey(null);
    try {
      const created = await createAccessCode(code);
      setCodes((prev) => [...prev, created]);
      setSuccessKey('Auth.ACCESS_CODE_SAVE_SUCCESS');
    } catch (err) {
      setErrorFromErrorObject(err, 'Auth.ACCESS_CODE_SAVE_FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateClick = async () => {
    const code = generateRandomCode(length);
    await handleCreateCode(code);
  };

  const handleAddManual = async () => {
    if (!manualCode.trim()) {
      setErrorKey('Auth.SIGNUP_ACCESS_CODE_REQUIRED');
      return;
    }
    await handleCreateCode(manualCode.trim());
    setManualCode('');
  };

  const handleDelete = async (id) => {
    setErrorKey(null);
    setSuccessKey(null);
    try {
      await deleteAccessCode(id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
      setSuccessKey('Auth.ACCESS_CODE_DELETE_SUCCESS');
    } catch (err) {
      setErrorFromErrorObject(err, 'Auth.ACCESS_CODE_DELETE_FAILED');
    }
  };

  const handleCopyCode = async (codeValue) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeValue);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopyNotice(t('Auth.ACCESS_CODE_COPY_SUCCESS', 'Code kopiert.'));
      window.setTimeout(() => setCopyNotice(''), 1800);
    } catch (_err) {
      setCopyNotice(t('Auth.ACCESS_CODE_COPY_FALLBACK', 'Code markieren und mit Ctrl+C kopieren.'));
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {errorKey && (
        <Alert severity="error" sx={ACCESS_CODE_ALERT_SX}>
          {t(errorKey)}
        </Alert>
      )}
      {successKey && (
        <Alert severity="success" sx={ACCESS_CODE_ALERT_SX}>
          {t(successKey)}
        </Alert>
      )}
      {copyNotice && (
        <Alert severity="info" sx={ACCESS_CODE_ALERT_SX}>
          {copyNotice}
        </Alert>
      )}

      {/* Active codes list */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('Auth.ACCESS_CODE_SECTION_ACTIVE')}
        </Typography>
        {codes.length === 0 ? (
          <Typography variant="body2">
            {t('Auth.ACCESS_CODE_NONE')}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {codes.map((code) => (
              <Box
                key={code.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 1,
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 560,
                }}
              >
                <TextField
                  value={code.code}
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      readOnly: true,
                      onFocus: (event) => event.target.select(),
                    },
                  }}
                  sx={ACCESS_CODE_VALUE_FIELD_SX}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleCopyCode(code.code)}
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  sx={ACCESS_CODE_ACTION_SX}
                >
                  {t('Auth.ACCESS_CODE_COPY_BUTTON', t('Auth.MFA_RECOVERY_COPY_TOOLTIP', 'Kopieren'))}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleDelete(code.id)}
                  startIcon={<DeleteIcon fontSize="small" />}
                  sx={ACCESS_CODE_ACTION_SX}
                >
                  {t('Common.DELETE', 'Löschen')}
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Generator */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('Auth.ACCESS_CODE_SECTION_GENERATE')}
        </Typography>

        <Box sx={{ maxWidth: 360 }}>
          <Typography variant="body2" gutterBottom>
            {t('Auth.ACCESS_CODE_LENGTH_LABEL', { length })}
          </Typography>
          <Slider
            min={6}
            max={32}
            step={1}
            value={length}
            onChange={(_, val) => setLength(val)}
            valueLabelDisplay="auto"
            disabled={submitting}
          />
        </Box>

        <Button
          variant="contained"
          size="small"
          sx={ACCESS_CODE_PRIMARY_ACTION_SX}
          onClick={handleGenerateClick}
          disabled={submitting}
        >
          {submitting
            ? t('Auth.SAVE_BUTTON_LOADING')
            : t('Auth.ACCESS_CODE_GENERATE_BUTTON')}
        </Button>
      </Box>

      {/* Manual add */}
      <Box sx={{ mb: 2, maxWidth: 360 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('Auth.ACCESS_CODE_SECTION_MANUAL')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label={t('Auth.ACCESS_CODE_LABEL')}
            fullWidth
            size="small"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={submitting}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddManual}
            disabled={submitting}
            sx={ACCESS_CODE_ACTION_SX}
          >
            {t('Auth.ACCESS_CODE_ADD_BUTTON')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
