import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatPrice } from './format';

export const WITHDRAWAL_DIALOG_ALERT_SX = { width: '100%' };

export function describeCalculation(preview, t, language) {
  const currency = preview?.currency || 'USD';
  const price = (value) => formatPrice(value, language, currency);
  const items = [t('Billing.WITHDRAWAL_PAID', { amount: price(preview?.amount_paid_cents) })];
  const time = Number(preview?.time_share_cents) || 0;
  const token = Number(preview?.token_share_cents) || 0;
  if (time !== 0 || (preview?.kind !== 'token_package' && token === 0)) items.push(t('Billing.WITHDRAWAL_TIME_SHARE', { amount: price(time) }));
  if (token !== 0 || preview?.kind === 'token_package') items.push(t('Billing.WITHDRAWAL_TOKEN_SHARE', { amount: price(token) }));
  items.push(t('Billing.WITHDRAWAL_USED', { amount: price(Math.max(time, token)) }));
  items.push(t('Billing.WITHDRAWAL_REFUND', { amount: price(preview?.refund_cents) }));
  return items.join(' · ');
}

export function WithdrawalDialog({ open, purchase, api, onClose, onWithdrawn }) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const confirmGuard = useRef(false);
  const notified = useRef(false);
  const previewRequest = useRef(null);
  const titleId = `withdrawal-title-${purchase?.id}`;

  useEffect(() => {
    if (!open || !purchase || typeof api?.previewWithdrawal !== 'function') {
      if (!open) previewRequest.current = null;
      return undefined;
    }
    const requestKey = String(purchase.id) + ':' + attempt;
    let live = true;
    setState('loading'); setPreview(null); setResult(null); setErrorStatus(null);
    confirmGuard.current = false; notified.current = false;
    let request = previewRequest.current?.key === requestKey ? previewRequest.current.promise : null;
    if (!request) {
      request = Promise.resolve().then(() => api.previewWithdrawal(purchase.id));
      previewRequest.current = { key: requestKey, promise: request };
    }
    request.then((data) => {
      if (!live) return;
      setPreview(data); setState(data?.eligible ? 'ready' : 'not_possible');
    }).catch((error) => {
      if (!live) return;
      setErrorStatus(error?.response?.status); setState('preview_error');
    });
    return () => { live = false; };
  }, [open, purchase?.id, api, attempt]);

  const confirm = async () => {
    if (confirmGuard.current || !['ready', 'confirm_error'].includes(state) || typeof api?.confirmWithdrawal !== 'function') return;
    confirmGuard.current = true; setState('submitting'); setErrorStatus(null);
    try {
      const value = await api.confirmWithdrawal(purchase.id);
      setResult(value); setState('success');
      if (!notified.current) { notified.current = true; onWithdrawn?.(value, purchase); }
    } catch (error) {
      setErrorStatus(error?.response?.status); setState(error?.response?.status === 409 ? 'not_possible' : 'confirm_error');
      confirmGuard.current = false;
    }
  };

  const close = () => { if (state !== 'submitting') onClose?.(); };
  const amount = formatPrice(preview?.refund_cents, i18n.language, preview?.currency);
  const none = !(Number(preview?.refund_cents) > 0);

  return <Dialog open={open} onClose={close} disableEscapeKeyDown={state === 'submitting'} fullWidth maxWidth="sm" aria-labelledby={titleId}>
    <DialogTitle id={titleId}>{t(state === 'success' ? 'Billing.WITHDRAWAL_DONE' : 'Billing.WITHDRAWAL_TITLE')}</DialogTitle>
    <DialogContent>
      {state === 'loading' && <Stack direction="row" spacing={1} alignItems="center" role="status"><CircularProgress size={20} /><Typography>{t('Billing.LOADING')}</Typography></Stack>}
      {state === 'preview_error' && <Alert severity="error" sx={WITHDRAWAL_DIALOG_ALERT_SX}>{t('Billing.WITHDRAWAL_PREVIEW_ERROR')}</Alert>}
      {(state === 'not_possible') && <Alert severity="info">{t('Billing.WITHDRAWAL_NOT_POSSIBLE')}</Alert>}
      {(state === 'ready' || state === 'submitting' || state === 'confirm_error') && <Stack spacing={1}>
        <Typography>{t('Billing.WITHDRAWAL_EFFECT')}</Typography>
        <Typography>{none ? t('Billing.WITHDRAWAL_REFUND_NONE') : t('Billing.WITHDRAWAL_REFUND', { amount })}</Typography>
        <Typography>{t('Billing.WITHDRAWAL_CALCULATION', { explanation: describeCalculation({ ...preview, kind: purchase?.kind }, t, i18n.language) })}</Typography>
        {state === 'confirm_error' && <Alert severity="error" sx={WITHDRAWAL_DIALOG_ALERT_SX}>{t('Billing.WITHDRAWAL_ERROR')}</Alert>}
        {state === 'submitting' && <Typography role="status"><CircularProgress size={16} /> {t('Billing.LOADING')}</Typography>}
      </Stack>}
      {state === 'success' && <Typography>{t('Billing.WITHDRAWAL_DONE_DETAIL', { date: formatDateTime(result?.withdrawn_at, i18n.language) })}</Typography>}
    </DialogContent>
    <DialogActions>
      {state === 'ready' || state === 'confirm_error' ? <>
        <Button onClick={close} disabled={state === 'submitting'}>{t('Billing.WITHDRAWAL_CANCEL')}</Button>
        <Button variant="contained" onClick={confirm} disabled={state === 'submitting'}>{t('Billing.WITHDRAWAL_CONFIRM')}</Button>
      </> : state === 'preview_error' ? <>
        <Button onClick={close}>{t('Billing.WITHDRAWAL_CLOSE')}</Button>
        <Button onClick={() => setAttempt((n) => n + 1)}>{t('Billing.RETRY')}</Button>
      </> : (state === 'success' || state === 'not_possible') && <Button onClick={close}>{t('Billing.WITHDRAWAL_CLOSE')}</Button>}
    </DialogActions>
  </Dialog>;
}

export default WithdrawalDialog;
