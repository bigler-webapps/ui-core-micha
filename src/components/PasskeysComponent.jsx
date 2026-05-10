// src/auth/components/PasskeysComponent.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { fetchPasskeys, deletePasskey } from '../auth/authApi';
import { registerPasskey } from '../utils/authService';
import { FEATURES } from '../auth/authConfig';

export function PasskeysComponent() {
  const { t } = useTranslation();

  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  const [messageKey, setMessageKey] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const passkeysSupported =
    typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const loadPasskeys = async () => {
    setErrorKey(null);
    try {
      const data = await fetchPasskeys();
      setPasskeys(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorKey(err.code || 'Auth.PASSKEY_LIST_FAILED');
    } finally {
      setLoading(false);
      setReloading(false);
    }
  };

  useEffect(() => {
    if (!FEATURES.passkeysEnabled || !passkeysSupported) {
      setLoading(false);
      return;
    }
    loadPasskeys();
  }, [passkeysSupported]);

  const handleCreate = async () => {
    setMessageKey(null);
    setErrorKey(null);

    if (!FEATURES.passkeysEnabled || !passkeysSupported) {
      setErrorKey('Auth.PASSKEY_NOT_AVAILABLE_ENV');
      return;
    }

    setCreating(true);
    try {
      const fallbackName =
        name?.trim() || `Passkey on ${navigator.platform || 'this device'}`;

      await registerPasskey(fallbackName);
      setMessageKey('Auth.PASSKEY_CREATE_SUCCESS');
      setName('');

      setReloading(true);
      await loadPasskeys();
    } catch (err) {
      // registerPasskey wirft normalisierte Errors mit .code
      setErrorKey(err.code || 'Auth.PASSKEY_CREATE_FAILED');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setMessageKey(null);
    setErrorKey(null);

    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deletePasskey(id);
      setPasskeys((prev) => prev.filter((pk) => pk.id !== id));
      setMessageKey('Auth.PASSKEY_DELETE_SUCCESS');
    } catch (err) {
      setErrorKey(err.code || 'Auth.PASSKEY_DELETE_FAILED');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!FEATURES.passkeysEnabled) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {t('Auth.PASSKEYS_TITLE')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('Auth.PASSKEYS_DISABLED_PROJECT')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Auth.PASSKEYS_TITLE')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t('Auth.PASSKEYS_DESCRIPTION')}
      </Typography>

      {!passkeysSupported && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('Auth.PASSKEY_BROWSER_NOT_SUPPORTED')}
        </Alert>
      )}

      {messageKey && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t(messageKey)}
        </Alert>
      )}
      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {/* Add passkey form */}
      {passkeysSupported && (
        <Box sx={{ mb: 3 }}>
          <Stack
            spacing={2}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          >
            <TextField
              label={t('Auth.PASSKEY_NAME_LABEL')}
              placeholder={t('Auth.PASSKEY_NAME_PLACEHOLDER')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating
                ? t('Auth.PASSKEY_ADD_BUTTON_LOADING')
                : t('Auth.PASSKEY_ADD_BUTTON')}
            </Button>
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* List of existing passkeys */}
      {loading ? (
        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {t('Auth.PASSKEY_EXISTING_TITLE')}
          </Typography>

          {reloading && (
            <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {passkeys.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('Auth.PASSKEY_NONE')}
            </Typography>
          ) : (
            <List dense>
              {passkeys.map((pk) => (
                <ListItem key={pk.id} divider>
                  <ListItemText
                    primary={pk.name || t('Auth.PASSKEY_DEFAULT_NAME')}
                    secondary={
                      pk.last_used_at
                        ? t('Auth.PASSKEY_LAST_USED_AT', {
                            value: pk.last_used_at,
                          })
                        : pk.created_at
                        ? t('Auth.PASSKEY_CREATED_AT', {
                            value: pk.created_at,
                          })
                        : undefined
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title={t('Auth.PASSKEY_DELETE_TOOLTIP')}>
                      <span>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDelete(pk.id)}
                          disabled={deletingIds.has(pk.id)}
                          size="small"
                        >
                          {deletingIds.has(pk.id) ? (
                            <CircularProgress size={18} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
};

