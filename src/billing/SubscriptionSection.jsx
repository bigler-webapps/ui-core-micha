import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { defaultBillingApi } from './api';
import { DEFAULT_PAYMENT_HOSTS, isTrustedPaymentUrl } from './safeUrl';
import { useBilling } from './useBilling';
import { formatDate, formatPrice, formatTokens } from './format';
import { PlanPicker } from './PlanPicker';
import { TokenBalanceBadge } from './TokenBalanceBadge';
import { AccessEndedBanner } from './AccessEndedBanner';
import { WithdrawalSection } from './WithdrawalSection';

export const SUBSCRIPTION_SECTION_ALERT_SX = { width: '100%' };
export const SUBSCRIPTION_SECTION_SEAT_SELECT_SX = { flex: '1 1 auto', minWidth: 0 };

function isStatus(error, status) { return error?.response?.status === status; }
function activeUntil(access, t, language) {
  const date = formatDate(access?.ends_at, language);
  return date ? t('Billing.ACTIVE_UNTIL', { date }) : null;
}

export function SubscriptionSection({ api = defaultBillingApi, redirect = (url) => window.location.assign(url), allowedHosts = DEFAULT_PAYMENT_HOSTS, onRenew, describePlan, withdrawal = true, seatCandidates, sx }) {
  const { t, i18n } = useTranslation();
  const { state, me, reload } = useBilling(api);
  const [withdrawnPurchases, setWithdrawnPurchases] = useState({});
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
      if (!isTrustedPaymentUrl(result?.url, allowedHosts)) throw new Error('invalid_billing_url');
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
  const hasSeatLimit = Number.isInteger(me.team?.seats_used) && Number.isInteger(me.team?.seats_total) && me.team.seats_used >= me.team.seats_total;
  const occupiedIds = new Set([
    ...(Array.isArray(seats) ? seats.map((seat) => seat?.user_id) : []),
    ...(Array.isArray(me.team?.seat_holders) ? me.team.seat_holders.map((holder) => holder?.user_id) : []),
  ].filter((id) => id != null).map(String));
  const eligibleSeatCandidates = Array.isArray(seatCandidates)
    ? seatCandidates.filter((candidate) => candidate?.id != null && !occupiedIds.has(String(candidate.id)))
    : [];
  const selectedSeatCandidate = eligibleSeatCandidates.find((candidate) => String(candidate.id) === seatInput);
  if (!sourceLine && access.status === 'active') return <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t('Billing.ERROR_LOAD')}</Alert>;

  return <Stack sx={sx} spacing={2}>
    {access.status === 'read_only' ? <>
      <AccessEndedBanner endedAt={access.ends_at} onRenew={onRenew || (() => {
        renewalPickerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        renewalPickerRef.current?.querySelector('input[type="radio"]')?.focus();
      })} />
      <div ref={renewalPickerRef}><PlanPicker plans={me.plans || []} api={api} redirect={redirect} allowedHosts={allowedHosts} describePlan={describePlan} /></div>
    </> : <>
      <Typography variant="h5">{t('Billing.HEADING')}</Typography>
      <Typography>{sourceLine}</Typography>
      {access.source !== 'free' && dateLine && <Typography>{dateLine}</Typography>}
      {me.subscription && typeof me.subscription === 'object' && typeof me.subscription.plan_key === 'string' && typeof me.subscription.renews === 'boolean' && formatDate(me.subscription.current_period_end, i18n.language) && <Stack spacing={0.5}>
        <Typography>{t('Billing.OP_PLAN', { plan: me.subscription.plan_name || me.subscription.plan_key })}</Typography>
        {formatDate(me.subscription.current_period_end, i18n.language) && <Typography>{formatDate(me.subscription.current_period_start, i18n.language) ? `${formatDate(me.subscription.current_period_start, i18n.language)} – ${formatDate(me.subscription.current_period_end, i18n.language)}` : t('Billing.OP_UNTIL', { date: formatDate(me.subscription.current_period_end, i18n.language) })}</Typography>}
        {typeof me.subscription.renews === 'boolean' && <Typography>{t(me.subscription.renews ? 'Billing.OP_RENEWS' : 'Billing.OP_ENDS')}</Typography>}
      </Stack>}
      {access.source === 'subscription' && <Stack direction="row" spacing={1} alignItems="center">
        <Button disabled={busy} onClick={() => safeRedirect(() => api.openPortal(), 'Billing.ERROR_PORTAL')}>{t('Billing.MANAGE')}</Button>
        <Typography>{t('Billing.MANAGE_DETAILS')}</Typography>
      </Stack>}
      {access.source === 'team' && seatError && !seats && <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t('Billing.ERROR_LOAD')}</Alert>}
      {me.team && Number.isInteger(me.team.seats_used) && Number.isInteger(me.team.seats_total) && <Stack spacing={0.5}>
        <Typography>{t('Billing.OP_SEATS_USED', { n: formatTokens(me.team.seats_used, i18n.language), m: formatTokens(me.team.seats_total, i18n.language) })}</Typography>
        {(Array.isArray(me.team.seat_holders) ? me.team.seat_holders : []).map((holder) => <Stack key={holder.user_id}>
          <Typography>{holder.name || holder.email}</Typography>{holder.name && <Typography color="text.secondary">{holder.email}</Typography>}
        </Stack>)}
      </Stack>}
      {access.source === 'team' && seats && <Stack spacing={1}>
        <Typography>{t('Billing.TEAM_SEATS')}</Typography>
        {seats.map((seat) => <Stack key={seat.user_id} direction="row" spacing={1} alignItems="center">
          {(() => { const holder = (me.team?.seat_holders || []).find((entry) => String(entry.user_id) === String(seat.user_id)); return <Stack><Typography>{holder?.name || holder?.email || String(seat.user_id)}</Typography>{holder?.name && <Typography color="text.secondary">{holder.email}</Typography>}</Stack>; })()}
          <Button disabled={busy} onClick={() => updateSeat(() => api.removeSeat({ userId: seat.user_id }))}>{t('Billing.SEAT_REMOVE')}</Button>
        </Stack>)}
        {hasSeatLimit ? <Typography color="text.secondary">{t('Billing.ERROR_SEAT_LIMIT')}</Typography> : <Stack direction="row" spacing={1}>
          {Array.isArray(seatCandidates) ? <TextField select SelectProps={{ displayEmpty: true }} size="small" label={t('Billing.SEAT_PICK')} value={seatInput} onChange={(event) => setSeatInput(event.target.value)} sx={SUBSCRIPTION_SECTION_SEAT_SELECT_SX}>
            <MenuItem value="">{t('Billing.SEAT_PICK')}</MenuItem>
            {eligibleSeatCandidates.map((candidate) => <MenuItem key={String(candidate.id)} value={String(candidate.id)}><Stack><Typography>{candidate.name}</Typography>{candidate.email && <Typography variant="body2" color="text.secondary">{candidate.email}</Typography>}</Stack></MenuItem>)}
          </TextField> : <TextField size="small" label={t('Billing.SEAT_USER')} value={seatInput} onChange={(event) => setSeatInput(event.target.value)} />}
          <Button disabled={busy || (Array.isArray(seatCandidates) ? !selectedSeatCandidate : !seatInput.trim())} onClick={() => updateSeat(() => {
            if (Array.isArray(seatCandidates)) {
              return selectedSeatCandidate ? api.addSeat({ userId: selectedSeatCandidate.id }) : undefined;
            }
            return seatInput.includes('@') ? api.addSeat({ email: seatInput.trim() }) : api.addSeat({ userId: seatInput.trim() });
          })}>{t('Billing.SEATS_ADD')}</Button>
        </Stack>}
        {seatError && <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{typeof seatError === 'string' ? t(seatError) : t('Billing.ERROR_LOAD')}</Alert>}
      </Stack>}
      {actionError && <Alert severity="error" sx={SUBSCRIPTION_SECTION_ALERT_SX}>{t(actionError)}</Alert>}
      {me.seat && typeof me.seat === 'object' && formatDate(me.seat.ends_at, i18n.language) && <Typography>{t('Billing.OP_SEAT_UNTIL', { date: formatDate(me.seat.ends_at, i18n.language) })}</Typography>}
    </>}

    <Stack direction="row" spacing={1} alignItems="center"><Typography>{t('Billing.BALANCE_LABEL')}</Typography><TokenBalanceBadge balance={tokens.balance} /></Stack>
    <Typography>{t('Billing.BALANCE', { tokens: formatTokens(tokens.balance, i18n.language) })}</Typography>
    {Array.isArray(tokens.grants) && tokens.grants.length > 0 && <Stack spacing={0.5}>{tokens.grants.map((grant, index) => {
      if (!['plan', 'package'].includes(grant?.source) || !Number.isInteger(grant.amount) || !Number.isInteger(grant.remaining)) return null;
      return <Stack key={`${grant.source}-${grant.expires_at || 'never'}-${index}`} spacing={0.25}>
        <Typography>{t(grant.source === 'plan' ? 'Billing.OP_GRANT_PLAN' : 'Billing.OP_GRANT_PACKAGE')}: {formatTokens(grant.amount, i18n.language)}</Typography>
        <Typography>{formatTokens(grant.remaining, i18n.language)} {t('Billing.OP_REMAINING')}</Typography>
        {formatDate(grant.expires_at, i18n.language) && <Typography>{t('Billing.OP_VALID_UNTIL', { date: formatDate(grant.expires_at, i18n.language) })}</Typography>}
      </Stack>;
    })}</Stack>}
    {packagePlans.length > 0 && <Stack spacing={1}>
      <Typography variant="h6">{t('Billing.BUY_PACKAGE')}</Typography>
      {packagePlans.map((plan) => <Stack key={plan.key} direction="row" spacing={1} alignItems="center">
        <Typography>{formatPrice(plan.amount_cents, i18n.language)} · {t('Billing.PACKAGE_TOKENS', { tokens: formatTokens(plan.tokens, i18n.language) })}</Typography>
        <Button disabled={busy} onClick={() => safeRedirect(() => api.startCheckout(plan.key), 'Billing.ERROR_CHECKOUT')}>{t('Billing.PACKAGE_BUY')}</Button>
      </Stack>)}
    </Stack>}
    {withdrawal && <WithdrawalSection api={api} plans={me.plans} sessionWithdrawals={withdrawnPurchases} onWithdrawn={(result, purchase) => {
      if (purchase?.id != null) setWithdrawnPurchases((current) => ({ ...current, [purchase.id]: { result, purchase } }));
      reload();
    }} />}
  </Stack>;
}

export default SubscriptionSection;
