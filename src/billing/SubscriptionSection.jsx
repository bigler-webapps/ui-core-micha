import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { defaultBillingApi } from './api';
import { useBilling } from './useBilling';
import { formatDate, formatPrice, formatTokens } from './format';
import { PlanPicker } from './PlanPicker';
import { TokenBalanceBadge } from './TokenBalanceBadge';
import { AccessEndedBanner } from './AccessEndedBanner';

export const SUBSCRIPTION_SECTION_ALERT_SX = { width: '100%' };

function isStatus(error, status) { return error?.response?.status === status; }
function activeUntil(access, t, language) {
  const date = formatDate(access?.ends_at, language);
  return date ? t('Billing.ACTIVE_UNTIL', { date }) : null;
}

export function SubscriptionSection({ api = defaultBillingApi, redirect = (url) => window.location.assign(url), onRenew, describePlan, sx }) {
  const { t, i18n } = useTranslation();
  const { state, me, reload } = useBilling(api);
  const [seats, setSeats] = useState(null);
  const [seatError, setSeatError] = useState(null);
  const [seatInput, setSeatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const renewalPickerRef = useRef(null);

  useEffect(() => {
    let live = true;
    setSeats(null);
    setSeatError(null);
    if (state === 'ready' && me?.access?.status === 'active' && me.access.source === 'team') {
      api.listSeats().then((result) => { if (live) setSeats(Array.isArray(result?.seats) ? result.seats : []); }).catch((error) => {
        if (!live) return;
        if (isStatus(error, 404)) setSeats(false);
        else setSeatError(error);
      });
    }
    return () => { live = false; };
  }, [api, state, me]);

  const safeRedirect = async (operation, errorKey) => {
    setBusy(true); setActionError(null);
    try {
      const result = await operation();
      if (typeof result?.url !== 'string' || !result.url.startsWith('https://')) throw new Error('invalid_billing_url');
      redirect(result.url);
    } catch (error) { setActionError(errorKey); }
    finally { setBusy(false); }
  };

  const updateSeat = async (operation) => {
    setBusy(true); setSeatError(null);
    try {
      await operation();
      const result = await api.listSeats();
      setSeats(Array.isArray(result?.seats) ? result.seats : []);
      setSeatInput('');
    } catch (error) {
      setSeatError(isStatus(error, 409) ? 'Billing.ERROR_SEAT_LIMIT' : isStatus(error, 400) ? 'Billing.ERROR_SEAT_USER' : 'Billing.ERROR_LOAD');
    } finally { setBusy(false); }
  };

  if (state === 'loading') return <Stack sx={sx} role="status" direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t('Billing.LOADING')}</Typography></Stack>;
  if (state === 'error' || !me?.access) return <Stack sx={sx} spacing={1}><Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t('Billing.ERROR_LOAD')}</Alert><Button onClick={reload}>{t('Billing.RETRY')}</Button></Stack>;

  const { access, tokens } = me;
  if (!['active', 'read_only'].includes(access.status) || !Number.isFinite(tokens?.balance)) return <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t('Billing.ERROR_LOAD')}</Alert>;
  const dateLine = activeUntil(access, t, i18n.language);
  const packagePlans = (Array.isArray(me.plans) ? me.plans : []).filter((plan) => plan?.kind === 'token_package');
  const sourceLine = access.source === 'subscription' ? t('Billing.SOURCE_SUBSCRIPTION') : access.source === 'team' ? t('Billing.SOURCE_TEAM') : access.source === 'free' ? t('Billing.SOURCE_FREE') : null;
  if (!sourceLine && access.status === 'active') return <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t('Billing.ERROR_LOAD')}</Alert>;

  return <Stack sx={sx} spacing={2}>
    {access.status === 'read_only' ? <>
      <AccessEndedBanner endedAt={access.ends_at} onRenew={onRenew || (() => {
        renewalPickerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        renewalPickerRef.current?.querySelector('button[role="radio"]')?.focus();
      })} />
      <div ref={renewalPickerRef}><PlanPicker plans={me.plans || []} api={api} redirect={redirect} describePlan={describePlan} /></div>
    </> : <>
      <Typography variant="h5">{t('Billing.HEADING')}</Typography>
      <Typography>{sourceLine}</Typography>
      {access.source !== 'free' && dateLine && <Typography>{dateLine}</Typography>}
      {access.source === 'subscription' && <Stack direction="row" spacing={1} alignItems="center">
        <Button disabled={busy} onClick={() => safeRedirect(() => api.openPortal(), 'Billing.ERROR_PORTAL')}>{t('Billing.MANAGE')}</Button>
        <Typography>{t('Billing.MANAGE_DETAILS')}</Typography>
      </Stack>}
      {access.source === 'team' && seats && <Stack spacing={1}>
        <Typography>{t('Billing.TEAM_SEATS')}</Typography>
        {seats.map((seat) => <Stack key={seat.user_id} direction="row" spacing={1} alignItems="center">
          <Typography>{String(seat.user_id)}</Typography>
          <Button disabled={busy} onClick={() => updateSeat(() => api.removeSeat({ userId: seat.user_id }))}>{t('Billing.SEAT_REMOVE')}</Button>
        </Stack>)}
        <Stack direction="row" spacing={1}>
          <TextField size="small" label={t('Billing.SEAT_USER')} value={seatInput} onChange={(event) => setSeatInput(event.target.value)} />
          <Button disabled={busy || !seatInput.trim()} onClick={() => updateSeat(() => seatInput.includes('@') ? api.addSeat({ email: seatInput.trim() }) : api.addSeat({ userId: seatInput.trim() }))}>{t('Billing.SEATS_ADD')}</Button>
        </Stack>
        {seatError && <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{typeof seatError === 'string' ? t(seatError) : t('Billing.ERROR_LOAD')}</Alert>}
      </Stack>}
      {actionError && <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t(actionError)}</Alert>}
    </>}

    <Stack direction="row" spacing={1} alignItems="center"><Typography>{t('Billing.BALANCE_LABEL')}</Typography><TokenBalanceBadge balance={tokens.balance} /></Stack>
    <Typography>{t('Billing.BALANCE', { tokens: formatTokens(tokens.balance, i18n.language) })}</Typography>
    {packagePlans.length > 0 && <Stack spacing={1}>
      <Typography variant="h6">{t('Billing.BUY_PACKAGE')}</Typography>
      {packagePlans.map((plan) => <Stack key={plan.key} direction="row" spacing={1} alignItems="center">
        <Typography>{formatPrice(plan.amount_cents, i18n.language)} · {t('Billing.PACKAGE_TOKENS', { tokens: formatTokens(plan.tokens, i18n.language) })}</Typography>
        <Button disabled={busy} onClick={() => safeRedirect(() => api.startCheckout(plan.key), 'Billing.ERROR_CHECKOUT')}>{t('Billing.PACKAGE_BUY')}</Button>
      </Stack>)}
    </Stack>}
  </Stack>;
}

export default SubscriptionSection;
