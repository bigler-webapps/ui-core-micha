import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { AuthContext } from '../auth/AuthContext';
import { fetchPrivacyStatement, updateUserProfile } from '../auth/authApi';
import { defaultTermsApi } from '../auth/termsApi';
import { resolveErrorText } from '../utils/resolveErrorText';
import { profileIdentity, refreshProfileDraft } from '../utils/profileDraft';

export const PROFILE_STEP_OPTION_SX = { alignItems: 'flex-start' };
export const PROFILE_STEP_CHECKBOX_SX = { mt: -0.5 };

// Only http(s) documents are linked; the terms URL comes from the server.
function safeDocumentUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function termsFromResponse(body) {
  return {
    document: body?.document || null,
    accepted: body?.accepted === true,
  };
}

/**
 * Profile completion for a setup flow: first and last name, one required
 * statement and the optional convenience cookies.
 *
 * Without `termsEnabled` the required statement is the privacy statement, as in
 * the existing profile. With `termsEnabled` (requires django-core-micha >= 3.16.0
 * and the app's terms API) it is one combined statement for the terms of use and
 * the privacy statement. It is pre-checked only when the server reports the
 * current terms version as accepted AND privacy as accepted; never because of a
 * provider login, an existing account or privacy alone. Without `termsEnabled` no
 * terms request is made.
 *
 * Props:
 * - `draft` / `onDraftChange(draft)`: host-controlled draft
 *   `{ identity, values: { firstName, lastName, acceptedPrivacy, acceptedCookies },
 *   editedFields: [...] }`. A draft is shown only for the person it belongs to;
 *   for anyone else the current person's server values are used. Without
 *   `onDraftChange` the draft is kept inside the component.
 * - `onComplete(user)`: called only after every required write succeeded (the
 *   profile update and, with terms, the acceptance). Repeating after a partial
 *   failure is safe; both writes are idempotent.
 * - `termsApi` (default `defaultTermsApi`): a `createTermsApi()` client, for an
 *   app that mounts the terms API at another prefix. Create it once (module
 *   level); a new object on every render reloads the terms each time.
 * - `privacyUrl`: link target for the privacy statement; without it the statement
 *   text can be shown inline.
 * - `formId`: renders the form with this id and without its own submit button, so
 *   a host action (for example `SetupWizardShell`'s `primaryForm`) submits it.
 * - `submitLabel`, `disabled`, `onBusyChange(busy)`.
 */
export function ProfileStepContent({
  draft,
  onDraftChange,
  onComplete,
  onBusyChange,
  termsEnabled = false,
  termsApi = defaultTermsApi,
  privacyUrl,
  formId,
  submitLabel,
  disabled = false,
}) {
  const { t, i18n } = useTranslation();
  const { user, login } = useContext(AuthContext) || {};
  const identity = profileIdentity(user);

  const [internalDraft, setInternalDraft] = useState(null);
  const [terms, setTerms] = useState(null); // { owner, document, accepted }
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyText, setPrivacyText] = useState('');
  const [errorKey, setErrorKey] = useState(null);
  const [saving, setSaving] = useState(false);
  // Synchronous guard: two submits in the same tick both still see `saving` false.
  const savingRef = useRef(false);
  const errorRef = useRef(null);

  const activeDraft = onDraftChange ? draft : internalDraft;
  const draftMatches = Boolean(activeDraft) && activeDraft.identity === identity;
  const editedFields = new Set(draftMatches ? activeDraft.editedFields || [] : []);
  const { values } = refreshProfileDraft(
    user,
    identity,
    editedFields,
    draftMatches ? activeDraft.values || {} : {},
  );
  const currentTerms = terms && terms.owner === identity ? terms : null;

  const commit = (patch) => {
    Object.keys(patch).forEach((key) => editedFields.add(key));
    const next = {
      identity,
      values: {
        firstName: values.firstName,
        lastName: values.lastName,
        acceptedPrivacy: values.acceptedPrivacy,
        acceptedCookies: values.acceptedCookies,
        ...patch,
      },
      editedFields: [...editedFields],
    };
    if (onDraftChange) onDraftChange(next);
    else setInternalDraft(next);
  };

  const applyTerms = useCallback((body, owner, privacyAccepted) => {
    const next = termsFromResponse(body);
    setTerms({ owner, ...next });
    setTermsChecked(next.accepted && Boolean(privacyAccepted));
    return next;
  }, []);

  // Terms evidence is per person: reset and reload whenever the identity changes.
  useEffect(() => {
    setTerms(null);
    setTermsChecked(false);
    if (!termsEnabled || !user) return undefined;
    let active = true;
    const privacyAccepted = Boolean(user.accepted_privacy_statement);
    termsApi.getAcceptance()
      .then((body) => {
        if (active) applyTerms(body, identity, privacyAccepted);
      })
      .catch(() => {
        // The terms API answers with machine codes (e.g. terms_not_configured),
        // not display text, so the step shows its own message.
        if (active) setErrorKey(t('Auth.TERMS_LOAD_FAILED'));
      });
    return () => {
      active = false;
    };
  }, [termsEnabled, termsApi, identity]);

  useEffect(() => {
    onBusyChange?.(saving);
  }, [saving]);

  // A validation or save error takes focus, so keyboard and screen-reader users
  // land on it instead of staying on the submit control.
  useEffect(() => {
    if (errorKey) errorRef.current?.focus();
  }, [errorKey]);

  const togglePrivacyText = async () => {
    if (!privacyOpen && !privacyText) {
      try {
        setPrivacyText(await fetchPrivacyStatement());
      } catch {
        // Non-fatal: the link simply won't reveal inline text this time.
      }
    }
    setPrivacyOpen((previous) => !previous);
  };

  const requiredChecked = termsEnabled ? termsChecked : Boolean(values.acceptedPrivacy);

  const handleRequiredChange = (event) => {
    const { checked } = event.target;
    if (termsEnabled) setTermsChecked(checked);
    commit({ acceptedPrivacy: checked });
  };

  // Returns true when the acceptance is on record for the current version.
  const acceptCurrentTerms = async (version) => {
    try {
      const body = await termsApi.accept(version);
      const accepted = applyTerms(body, identity, true).accepted;
      if (!accepted) throw new Error('terms_not_confirmed');
      return true;
    } catch (err) {
      const body = err?.response?.status === 409 ? err.response.data : null;
      if (body?.detail === 'version_mismatch') {
        // The page showed an older version: take the current document and the
        // person's actual acceptance of it from the 409 body.
        if (applyTerms(body, identity, true).accepted) return true;
        setTermsChecked(false);
        setErrorKey(t('Auth.TERMS_VERSION_CHANGED'));
        return false;
      }
      throw err;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current || disabled || !user) return;
    if (!(values.firstName || '').trim() || !(values.lastName || '').trim()) {
      setErrorKey(t('Auth.PROFILE_NAME_REQUIRED'));
      return;
    }
    if (!requiredChecked) {
      setErrorKey(t(termsEnabled ? 'Auth.TERMS_PRIVACY_REQUIRED' : 'Auth.PRIVACY_REQUIRED'));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setErrorKey(null);
    let stage = 'terms_load';
    try {
      let termsState = currentTerms;
      if (termsEnabled && !termsState) {
        const body = await termsApi.getAcceptance();
        termsState = { owner: identity, ...termsFromResponse(body) };
        setTerms(termsState);
      }
      if (termsEnabled && !termsState?.document?.version) {
        throw new Error('terms_not_available');
      }

      stage = 'profile';
      const updatedUser = await updateUserProfile({
        first_name: (values.firstName || '').trim(),
        last_name: (values.lastName || '').trim(),
        accepted_privacy_statement: true,
        accepted_convenience_cookies: Boolean(values.acceptedCookies),
      });
      if (updatedUser) login?.(updatedUser);

      if (termsEnabled && !termsState.accepted) {
        stage = 'terms';
        const accepted = await acceptCurrentTerms(termsState.document.version);
        if (!accepted) return;
      }

      onComplete?.(updatedUser || user);
    } catch (err) {
      if (stage === 'profile') {
        setErrorKey(resolveErrorText(i18n, err, 'Auth.PROFILE_UPDATE_FAILED'));
      } else {
        setErrorKey(t(stage === 'terms' ? 'Auth.TERMS_ACCEPTANCE_FAILED' : 'Auth.TERMS_LOAD_FAILED'));
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const privacyHref = safeDocumentUrl(privacyUrl);
  const termsHref = safeDocumentUrl(currentTerms?.document?.url);
  const busy = disabled || saving;

  const privacyLink = privacyHref ? (
    <Link href={privacyHref} target="_blank" rel="noopener noreferrer">
      {t('Auth.PRIVACY_LINK_LABEL')}
    </Link>
  ) : (
    <Link component="button" type="button" variant="body1" onClick={togglePrivacyText} sx={{ verticalAlign: 'baseline' }}>
      {t('Auth.PRIVACY_LINK_LABEL')}
    </Link>
  );

  const termsLink = termsHref ? (
    <Link href={termsHref} target="_blank" rel="noopener noreferrer">
      {t('Auth.TERMS_LINK_LABEL')}
    </Link>
  ) : t('Auth.TERMS_LINK_LABEL');

  const requiredLabel = termsEnabled ? (
    <span>
      {t('Auth.TERMS_PRIVACY_PREFIX')}
      {termsLink}
      {t('Auth.TERMS_PRIVACY_AND')}
      {privacyLink}
      {t('Auth.TERMS_PRIVACY_SUFFIX')}
    </span>
  ) : (
    <span>
      {t('Auth.PRIVACY_REQUIRED_LABEL')}{' '}
      {privacyLink}
      {t('Auth.TERMS_PRIVACY_SUFFIX')}
    </span>
  );

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={saving || undefined}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {errorKey && <Alert ref={errorRef} severity="error" tabIndex={-1}>{errorKey}</Alert>}

      <TextField
        label={t('Profile.FIRST_NAME_LABEL')}
        value={values.firstName || ''}
        onChange={(event) => commit({ firstName: event.target.value })}
        autoComplete="given-name"
        required
        fullWidth
        disabled={busy}
      />
      <TextField
        label={t('Profile.LAST_NAME_LABEL')}
        value={values.lastName || ''}
        onChange={(event) => commit({ lastName: event.target.value })}
        autoComplete="family-name"
        required
        fullWidth
        disabled={busy}
      />

      <Stack spacing={0.5}>
        <FormControlLabel
          sx={PROFILE_STEP_OPTION_SX}
          control={(
            <Checkbox
              checked={requiredChecked}
              onChange={handleRequiredChange}
              disabled={busy || (termsEnabled && !currentTerms)}
              sx={PROFILE_STEP_CHECKBOX_SX}
            />
          )}
          label={requiredLabel}
        />
        {privacyOpen && privacyText && !privacyHref && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', pl: 4 }}>
            {privacyText}
          </Typography>
        )}
        <FormControlLabel
          sx={PROFILE_STEP_OPTION_SX}
          control={(
            <Checkbox
              checked={Boolean(values.acceptedCookies)}
              onChange={(event) => commit({ acceptedCookies: event.target.checked })}
              disabled={busy}
              sx={PROFILE_STEP_CHECKBOX_SX}
            />
          )}
          label={t('Auth.CONVENIENCE_COOKIES_LABEL')}
        />
      </Stack>

      {!formId && (
        <Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {submitLabel || t('Profile.SAVE_BUTTON')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
