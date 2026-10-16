import React, { useMemo } from 'react';
import { Alert, Button, FormControlLabel, Stack, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { defaultReceiptsApi } from './api';
import { useReceiptConsent } from './useReceiptConsent';

export const RECEIPT_CONSENT_CONTROL_SX = { alignItems: 'flex-start' };
export const RECEIPT_CONSENT_ALERT_SX = { width: '100%' };
export function ReceiptConsentSwitch({ api = defaultReceiptsApi, provider = 'OpenAI', consent, onChange, sx }) {
  const { t } = useTranslation(); const fallbackApi = useMemo(() => consent ? { getConsent: () => Promise.resolve({ granted: false }), setConsent: (v) => consent.set(v).then((answer) => ({ granted: answer })) } : api, [api, Boolean(consent)]); const own = useReceiptConsent(fallbackApi); const state = consent || own;
  const change = async (event) => { const answer = await state.set(event.target.checked); if (answer === event.target.checked) onChange?.(answer); };
  return <Stack spacing={1}>
    <FormControlLabel sx={[RECEIPT_CONSENT_CONTROL_SX, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} control={<Switch checked={Boolean(state.granted)} onChange={change} disabled={state.status === 'loading' || state.busy} inputProps={{ 'aria-label': t('Receipts.CONSENT', { provider }) }} />} label={t('Receipts.CONSENT', { provider })} />
    {(state.status === 'error' || state.error) && <Alert severity="error" sx={RECEIPT_CONSENT_ALERT_SX} action={<Button color="inherit" size="small" onClick={state.reload}>{t('Receipts.RETRY')}</Button>}>{t('Receipts.CONSENT_ERROR')}</Alert>}
  </Stack>;
}
export default ReceiptConsentSwitch;
