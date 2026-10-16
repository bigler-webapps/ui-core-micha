import React, { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch, TextField, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const FREE_ACCESS_SWITCH_ALERT_SX = { width: '100%' };
const statusOf = (error) => error?.response?.status;

export function FreeAccessSwitch({ account, api, onChanged, sx }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const active = Boolean(account?.free_access);
  const openDialog = () => { setReason(''); setError(null); setOpen(true); };
  const close = () => { if (!busy) setOpen(false); };
  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const answer = active ? await api.revokeFreeAccess(account.user_id) : await api.grantFreeAccess(account.user_id, reason.trim());
      onChanged?.(answer); setOpen(false);
    } catch (failure) {
      setError(statusOf(failure) === 403 ? 'Billing.OP_FORBIDDEN' : 'Billing.OP_SAVE_ERROR');
    } finally { inFlight.current = false; setBusy(false); }
  };
  const validReason = reason.trim().length > 0 && reason.trim().length <= 1000;
  return <>
    <Box sx={sx}><FormControlLabel control={<Switch checked={active} disabled={busy} onChange={openDialog} />} label={t('Billing.OP_FREE_ACCESS')} /></Box>
    <Dialog open={open} onClose={close}>
      <DialogTitle>{active ? t('Billing.OP_REVOKE_TITLE') : t('Billing.OP_FREE_ACCESS')}</DialogTitle>
      <DialogContent>
        {active ? <p>{t('Billing.OP_REVOKE_BODY')}</p> : <TextField label={t('Billing.OP_REASON')} multiline required fullWidth disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} inputProps={{ maxLength: 1001 }} />}
        {error && <Alert severity="error" sx={FREE_ACCESS_SWITCH_ALERT_SX}>{t(error)}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={close}>{t('Billing.OP_CANCEL')}</Button>
        <Button disabled={busy || (!active && !validReason)} onClick={submit}>{active ? t('Billing.OP_REVOKE') : t('Billing.OP_GRANT')}</Button>
      </DialogActions>
    </Dialog>
  </>;
}

export default FreeAccessSwitch;
