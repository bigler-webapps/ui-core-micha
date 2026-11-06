import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';
import { PrivacyNoticeLink } from './PrivacyNoticeLink';

function localized(value, language) {
  if (!value || typeof value !== 'object') return '';
  const normalized = String(language || '').replace('_', '-').toLowerCase();
  const exact = Object.keys(value).find((key) => key.toLowerCase() === normalized);
  if (exact) return value[exact];
  const base = normalized.split('-')[0];
  const match = Object.keys(value).find((key) => key.toLowerCase() === base)
    || Object.keys(value).find((key) => key.toLowerCase().split('-')[0] === base);
  return value[match || Object.keys(value)[0]] || '';
}

function storageText(storage) {
  if (!storage || typeof storage !== 'object') return '';
  return [storage.kind, storage.name, storage.scope, storage.lifetime].filter(Boolean).join(' · ');
}

function ServiceDetails({ purpose, locale, t }) {
  const services = purpose.services || [];
  const justification = typeof purpose.justification === 'string'
    ? purpose.justification
    : localized(purpose.justification, locale);
  return (
    <Stack spacing={1}>
      {justification && <Typography variant="body2">{justification}</Typography>}
      {services.map((service) => (
        <Box key={service.id}>
          {service.provider && (
            <Typography variant="body2">
              {t('Privacy.PROVIDER_STORAGE_DETAIL', { provider: service.provider })}
            </Typography>
          )}
          {service.browser_storage?.length > 0 && (
            <Box component="ul" sx={{ my: 0.5, pl: 3 }}>
              {service.browser_storage.map((storage, index) => (
                <li key={`${service.id}-storage-${index}`}>
                  <Typography variant="body2">{storageText(storage)}</Typography>
                </li>
              ))}
            </Box>
          )}
          {service.server_retention && (
            <Typography variant="body2">
              {t('Privacy.SERVER_RETENTION', { retention: service.server_retention })}
            </Typography>
          )}
          {service.data_categories?.length > 0 && (
            <Typography variant="body2">{t('Privacy.DATA_CATEGORIES', { values: service.data_categories.join(', ') })}</Typography>
          )}
          {service.recipients?.length > 0 && (
            <Typography variant="body2">{t('Privacy.RECIPIENTS', { values: service.recipients.join(', ') })}</Typography>
          )}
          {service.transfers?.length > 0 && (
            <Typography variant="body2">{t('Privacy.TRANSFERS', { values: service.transfers.join(', ') })}</Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function NecessaryStorage({ storage, t }) {
  if (!Array.isArray(storage) || storage.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2">{t('Privacy.NECESSARY_STORAGE')}</Typography>
      <Box component="ul" sx={{ my: 0.5, pl: 3 }}>
        {storage.map((item, index) => (
          <li key={`necessary-storage-${index}`}><Typography variant="body2">{storageText(item)}</Typography></li>
        ))}
      </Box>
    </Box>
  );
}

export function PrivacySettingsPanel({ onClose }) {
  const privacy = usePrivacy();
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const manifest = privacy?.manifest;
  const purposes = useMemo(
    () => manifest?.purposes?.filter((purpose) => !purpose.required) || [],
    [manifest],
  );
  const required = useMemo(
    () => manifest?.purposes?.filter((purpose) => purpose.required) || [],
    [manifest],
  );

  useEffect(() => {
    if (privacy?.status !== 'ready') return;
    const nextDraft = {};
    purposes.forEach((purpose) => {
      nextDraft[purpose.id] = privacy.choices?.choices?.[purpose.id]?.state === 'granted';
    });
    setDraft(nextDraft);
  }, [privacy?.status, privacy?.choices, purposes]);

  if (!privacy || privacy.status === 'unconfigured') return null;
  if (privacy.status === 'loading') {
    return <Typography role="status">{t('Privacy.LOADING')}</Typography>;
  }
  if (privacy.status === 'error' || !manifest) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="error" role="alert">{t('Privacy.UNAVAILABLE')}</Alert>
        <Button type="button" variant="outlined" onClick={privacy.retry}>{t('Privacy.RETRY')}</Button>
      </Stack>
    );
  }

  const locale = i18n.language;
  const hasOtherGrant = purposes.some((purpose) => privacy.choices?.choices?.[purpose.id]?.state === 'granted');
  const onlyNecessaryActive = purposes.length > 0 && purposes.every(
    (purpose) => privacy.choices?.choices?.[purpose.id]?.state === 'refused',
  );
  const setPurpose = (purposeId, checked) => setDraft((previous) => ({ ...previous, [purposeId]: checked }));
  const save = async () => {
    setSaving(true);
    try {
      await privacy.save(Object.fromEntries(purposes.map((purpose) => [
        purpose.id,
        draft[purpose.id] ? 'granted' : 'refused',
      ])), 'settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2">{t('Privacy.CHANGE_ANYTIME')}</Typography>
      {manifest.controller?.name && (
        <Typography variant="body2">
          <strong>{t('Privacy.CONTROLLER')}:</strong> {manifest.controller.name}
          {manifest.controller.contact ? ` · ${manifest.controller.contact}` : ''}
        </Typography>
      )}

      {purposes.length === 0 && <Typography>{t('Privacy.NO_OPTIONAL')}</Typography>}

      {required.length > 0 && (
            <Box>
              <Typography variant="subtitle1">{t('Privacy.ALWAYS_ACTIVE')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('Privacy.REQUIRED_INFORMATION')}</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {required.map((purpose) => (
                  <Accordion key={purpose.id} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={600}>{localized(purpose.label, locale)}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {localized(purpose.summary, locale) && <Typography variant="body2" sx={{ mb: 1 }}>{localized(purpose.summary, locale)}</Typography>}
                      <ServiceDetails purpose={purpose} locale={locale} t={t} />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
      )}

      {purposes.length > 0 && (
        <>
          <Stack spacing={1}>
            {purposes.map((purpose) => (
              <Box key={purpose.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={Boolean(draft[purpose.id])}
                      onChange={(event) => setPurpose(purpose.id, event.target.checked)}
                      disabled={saving || privacy.saveState === 'saving'}
                    />
                  )}
                  label={localized(purpose.label, locale)}
                />
                {localized(purpose.summary, locale) && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>{localized(purpose.summary, locale)}</Typography>
                )}
                <Accordion disableGutters elevation={0} sx={{ mt: 0.5 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">{t('Privacy.DETAILS')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ServiceDetails purpose={purpose} locale={locale} t={t} />
                  </AccordionDetails>
                </Accordion>
              </Box>
            ))}
          </Stack>

          {privacy.saveState === 'error' && (
            <Alert severity="error" role="alert">{t(hasOtherGrant ? 'Privacy.SAVE_ERROR_WITH_GRANTS' : 'Privacy.SAVE_ERROR')}</Alert>
          )}
          {privacy.saveState === 'saved' && (
            <Alert severity="success" role="status">
              {onlyNecessaryActive ? t('Privacy.NECESSARY_ONLY_ACTIVE') : t('Privacy.SAVED')}
            </Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button type="button" variant="contained" disabled={saving || privacy.saveState === 'saving'} onClick={save}>
              {saving || privacy.saveState === 'saving' ? t('Privacy.SAVING') : t('Privacy.SAVE')}
            </Button>
            {privacy.saveState === 'error' && (
              <Button type="button" variant="outlined" disabled={saving} onClick={privacy.retry}>{t('Privacy.RETRY')}</Button>
            )}
          </Stack>
        </>
      )}

      <NecessaryStorage storage={manifest.necessary_storage} t={t} />

      <Box>
        <Typography variant="body2" component="span">{t('Privacy.NOTICE_EXPLANATION')} </Typography>
        <PrivacyNoticeLink />
      </Box>
      {onClose && <Button type="button" onClick={onClose}>{t('Privacy.CLOSE')}</Button>}
    </Stack>
  );
}

export function PrivacySettingsDialog() {
  const privacy = usePrivacy();
  const { t } = useTranslation();
  if (!privacy || privacy.status === 'unconfigured' || !privacy.settingsOpen) return null;
  return (
    <Dialog
      open
      onClose={privacy.closeSettings}
      aria-labelledby="privacy-settings-title"
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="privacy-settings-title">{t('Privacy.SETTINGS_TITLE')}</DialogTitle>
      <DialogContent dividers><PrivacySettingsPanel /></DialogContent>
      <DialogActions>
        <Button type="button" onClick={privacy.closeSettings}>{t('Privacy.CLOSE')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PrivacySettingsDialog;
