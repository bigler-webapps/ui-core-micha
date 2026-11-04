import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate } from './format';

export function CancellationDialog({ open, contract, api, onClose, onCancelled }) {
  const { t, i18n } = useTranslation();
  const [type, setType] = useState('ordinary');
  const [requestedEndDate, setRequestedEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [state, setState] = useState('ready');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const guard = useRef(false);
  const typeLabelId = useId();
  const titleId = `contract-cancel-title-${contract?.reference || 'dialog'}`;

  useEffect(() => {
    if (!open) return;
    setType('ordinary'); setRequestedEndDate(''); setReason(''); setState('ready'); setResult(null); setError(false); guard.current = false;
  }, [open, contract?.reference]);

  const submit = async (event) => {
    event?.preventDefault?.();
    if (guard.current || state !== 'ready' && state !== 'error') return;
    if (type === 'extraordinary' && !reason.trim()) { setError('reason'); return; }
    if (typeof api?.cancelContract !== 'function' || !contract?.reference) { setError('request'); setState('error'); return; }
    const body = { cancellation_type: type };
    if (requestedEndDate) body.requested_end_date = requestedEndDate;
    if (type === 'extraordinary') body.reason = reason.trim();
    guard.current = true; setState('submitting'); setError(false);
    try {
      const response = await api.cancelContract(contract.reference, body);
      setResult(response?.declaration || response || {}); setState('success'); onCancelled?.(response);
    } catch {
      guard.current = false; setState('error'); setError('request');
    }
  };
  const close = () => { if (state !== 'submitting') onClose?.(); };
  const effectiveAt = result?.effective_at;

  return <Dialog open={open} onClose={close} disableEscapeKeyDown={state === 'submitting'} fullWidth maxWidth="sm" aria-labelledby={titleId}>
    <DialogTitle id={titleId}>{t(state === 'success' ? 'Billing.CANCEL_SUCCESS' : 'Billing.CANCEL_TITLE')}</DialogTitle>
    <DialogContent>
      {state === 'success' ? <Typography role="status">{formatDate(effectiveAt, i18n.language) ? t('Billing.CANCEL_SUCCESS_EFFECTIVE', { date: formatDate(effectiveAt, i18n.language) }) : t('Billing.CANCEL_PENDING_REVIEW')}</Typography> : <Stack component="form" onSubmit={submit} spacing={1.5} sx={{ pt: 1 }}>
        <Typography>{contract?.plan_name || contract?.plan_key || ''}</Typography>
        <FormControl>
          <FormLabel id={typeLabelId}>{t('Billing.CANCEL_TYPE_LABEL')}</FormLabel>
          <RadioGroup aria-labelledby={typeLabelId} value={type} onChange={(event) => { setType(event.target.value); setError(false); }}>
            <FormControlLabel value="ordinary" control={<Radio />} label={t('Billing.CANCEL_ORDINARY')} />
            <FormControlLabel value="extraordinary" control={<Radio />} label={t('Billing.CANCEL_EXTRAORDINARY')} />
          </RadioGroup>
        </FormControl>
        <TextField type="date" label={t('Billing.CANCEL_REQUESTED_END_DATE')} value={requestedEndDate} onChange={(event) => setRequestedEndDate(event.target.value)} InputLabelProps={{ shrink: true }} />
        {type === 'extraordinary' && <TextField label={t('Billing.CANCEL_REASON')} value={reason} onChange={(event) => { setReason(event.target.value); if (event.target.value.trim()) setError(false); }} required error={error === 'reason'} helperText={error === 'reason' ? t('Billing.CANCEL_REASON_REQUIRED') : undefined} inputProps={{ maxLength: 2000 }} multiline minRows={3} />}
        {error === 'request' && <Alert severity="error">{t('Billing.CANCEL_ERROR')}</Alert>}
        {state === 'submitting' && <Typography role="status"><CircularProgress size={16} /> {t('Billing.LOADING')}</Typography>}
      </Stack>}
    </DialogContent>
    <DialogActions>
      {state === 'success' ? <Button onClick={close}>{t('Billing.WITHDRAWAL_CLOSE')}</Button> : <>
        <Button onClick={close} disabled={state === 'submitting'}>{t('Billing.WITHDRAWAL_CANCEL')}</Button>
        <Button variant="contained" onClick={submit} disabled={state === 'submitting'}>{t('Billing.CANCEL_SUBMIT')}</Button>
      </>}
    </DialogActions>
  </Dialog>;
}

export default CancellationDialog;
