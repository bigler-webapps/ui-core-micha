// src/components/ProfileComponent.jsx
import React, { useEffect, useState, useContext } from 'react';
import {
  Box,
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
// WICHTIG: Importiere den Context, um die bereits geladenen Daten zu nutzen
import { AuthContext } from '../auth/AuthContext'; 
import { fetchCookieStatement, fetchPrivacyStatement } from '../auth/authApi';

export function ProfileComponent({
  onSubmit,
  submitText,
  showName = true,
  showPrivacy = true,
  showCookies = true,
  showStatements = true,
  privacyStatementText = null,
  cookieStatementText = null,
}) {
  const { t } = useTranslation();
  
  // WICHTIG: Wir holen den User direkt aus dem globalen State
  // Das verhindert den doppelten Request und den ReferenceError
  const { user, loading: authLoading } = useContext(AuthContext);

  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  // Lokaler State für das Formular
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);
  const [privacyStatement, setPrivacyStatement] = useState(privacyStatementText || '');
  const [cookieStatement, setCookieStatement] = useState(cookieStatementText || '');
  const [loadingPrivacyStatement, setLoadingPrivacyStatement] = useState(false);
  const [loadingCookieStatement, setLoadingCookieStatement] = useState(false);

  // Synchronisiere Formular-Daten, sobald der User aus dem Context da ist
  useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setEmail(user.email ?? '');
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setAcceptedPrivacy(Boolean(user.accepted_privacy_statement)); 
      setAcceptedCookies(Boolean(user.accepted_convenience_cookies));
    }
  }, [user]);

  useEffect(() => {
    if (privacyStatementText !== null && privacyStatementText !== undefined) {
      setPrivacyStatement(String(privacyStatementText));
    }
  }, [privacyStatementText]);

  useEffect(() => {
    if (cookieStatementText !== null && cookieStatementText !== undefined) {
      setCookieStatement(String(cookieStatementText));
    }
  }, [cookieStatementText]);

  useEffect(() => {
    let cancelled = false;

    const loadStatements = async () => {
      if (!showStatements) return;

      if (showPrivacy && (privacyStatementText === null || privacyStatementText === undefined)) {
        setLoadingPrivacyStatement(true);
        try {
          const text = await fetchPrivacyStatement();
          if (!cancelled) setPrivacyStatement(text || '');
        } catch (err) {
          if (!cancelled) setPrivacyStatement('');
        } finally {
          if (!cancelled) setLoadingPrivacyStatement(false);
        }
      }

      if (showCookies && (cookieStatementText === null || cookieStatementText === undefined)) {
        setLoadingCookieStatement(true);
        try {
          const text = await fetchCookieStatement();
          if (!cancelled) setCookieStatement(text || '');
        } catch (err) {
          if (!cancelled) setCookieStatement('');
        } finally {
          if (!cancelled) setLoadingCookieStatement(false);
        }
      }
    };

    loadStatements();

    return () => {
      cancelled = true;
    };
  }, [showStatements, showPrivacy, showCookies, privacyStatementText, cookieStatementText]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSubmit) return;

    setSaving(true);
    setErrorKey(null);
    setSuccessKey(null);

    const payload = {
      ...(showName && {
        first_name: firstName,
        last_name: lastName,
      }),
      ...(showPrivacy && {
        accepted_privacy_statement: acceptedPrivacy,
      }),
      ...(showCookies && {
        accepted_convenience_cookies: acceptedCookies,
      }),
    };

    try {
      await onSubmit(payload);
      setSuccessKey('Profile.UPDATE_SUCCESS');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Profile update error:", err);
      setErrorKey(err.code || 'Auth.PROFILE_UPDATE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  // Wenn der AuthContext noch initial lädt
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Falls kein User eingeloggt ist
  if (!user) {
    return (
        <Alert severity="warning">
            {t('Auth.NOT_LOGGED_IN', 'User not logged in.')}
        </Alert>
    );
  }

  const submitLabel = submitText || t('Profile.SAVE_BUTTON');
  const submitLabelLoading = t('Profile.SAVE_BUTTON_LOADING');

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {errorKey && (
        <Alert severity="error">
          {t(errorKey)}
        </Alert>
      )}
      {successKey && (
        <Alert severity="success">
          {t(successKey)}
        </Alert>
      )}

      {/* Read-Only Felder */}
      <Stack spacing={2}>
        <TextField
          label={t('Profile.USERNAME_LABEL')}
          value={username}
          fullWidth
          disabled
        />
        <TextField
          label={t('Auth.EMAIL_LABEL')}
          type="email"
          value={email}
          fullWidth
          disabled
        />
      </Stack>

      {/* Editierbare Felder */}
      {showName && (
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <TextField
            label={t('Profile.FIRST_NAME_LABEL')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('Profile.LAST_NAME_LABEL')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
        </Stack>
      )}

      {(showPrivacy || showCookies) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('Profile.PRIVACY_SECTION_TITLE')}
          </Typography>

          <Stack spacing={1}>
            {showPrivacy && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  />
                }
                label={t('Profile.ACCEPT_PRIVACY_LABEL')}
              />
            )}

            {showCookies && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptedCookies}
                    onChange={(e) => setAcceptedCookies(e.target.checked)}
                  />
                }
                label={t('Profile.ACCEPT_COOKIES_LABEL')}
              />
            )}
          </Stack>

          {showStatements && (
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              {showPrivacy && (
                <Accordion disableGutters>
                  <AccordionSummary>
                    <Typography variant="body2" fontWeight={600}>
                      {t('Profile.PRIVACY_STATEMENT_TITLE', 'Privacy statement')}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {loadingPrivacyStatement ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('Profile.STATEMENT_LOADING', 'Loading statement...')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {privacyStatement || t('Profile.PRIVACY_STATEMENT_EMPTY', 'Privacy statement is currently unavailable.')}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}

              {showCookies && (
                <Accordion disableGutters>
                  <AccordionSummary>
                    <Typography variant="body2" fontWeight={600}>
                      {t('Profile.COOKIES_STATEMENT_TITLE', 'Cookie statement')}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {loadingCookieStatement ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('Profile.STATEMENT_LOADING', 'Loading statement...')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {cookieStatement || t('Profile.COOKIES_STATEMENT_EMPTY', 'Cookie statement is currently unavailable.')}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
        >
          {saving ? submitLabelLoading : submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
