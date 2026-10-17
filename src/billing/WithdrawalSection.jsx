import React, { useEffect, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, formatPrice } from './format';
import { WithdrawalDialog } from './WithdrawalDialog';

export const WITHDRAWAL_SECTION_ALERT_SX = { width: '100%' };

const is404 = (error) => error?.response?.status === 404;
const deadline = (purchase) => {
  const date = new Date(purchase.purchased_at);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + 14);
  return date.toISOString();
};

export function WithdrawalSection({ api, plans = [], onWithdrawn, sessionWithdrawals = {}, sx }) {
  const { t, i18n } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [withdrawn, setWithdrawn] = useState({});
  const [selected, setSelected] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (typeof api?.listWithdrawals !== 'function') return undefined;
    let live = true;
    Promise.resolve().then(() => api.listWithdrawals()).then((data) => {
      if (live) { setPurchases(Array.isArray(data?.purchases) ? data.purchases : []); setLoadError(false); }
    }).catch((error) => {
      if (!live) return;
      if (is404(error)) { setPurchases([]); setLoadError(false); }
      else setLoadError(true);
    });
    return () => { live = false; };
  }, [api, reload]);

  const handleWithdrawn = (purchaseId, result) => {
    setWithdrawn((current) => ({ ...current, [purchaseId]: { purchase: purchases.find((item) => String(item.id) === String(purchaseId)), result } }));
    setSelected(null);
    onWithdrawn?.(result, purchases.find((item) => String(item.id) === String(purchaseId)));
    setReload((count) => count + 1);
  };
  const successful = { ...sessionWithdrawals, ...withdrawn };

  if (loadError) return <Stack sx={sx} spacing={1}>
    <Alert severity="error" sx={WITHDRAWAL_SECTION_ALERT_SX}>{t('Billing.WITHDRAWAL_LOAD_ERROR')}</Alert>
    <Button onClick={() => setReload((count) => count + 1)}>{t('Billing.RETRY')}</Button>
    {Object.entries(successful).map(([id, entry]) => <Stack key={id} spacing={0.5} role="status">
      <Typography>{t('Billing.WITHDRAWAL_DONE')}</Typography>
      <Typography>{t('Billing.WITHDRAWAL_DONE_DETAIL', { date: formatDateTime((entry?.result || entry)?.withdrawn_at, i18n.language) })}</Typography>
    </Stack>)}
  </Stack>;
  if (!purchases.length && !Object.keys(successful).length) return null;
  const findPlan = (key) => plans.find((plan) => plan?.key === key)?.name || key;

  return <Stack sx={sx} spacing={1}>
    <Typography variant="h6">{t('Billing.PURCHASES')}</Typography>
    {purchases.map((purchase) => {
      const success = successful[purchase.id];
      const withdrawnAt = purchase.withdrawn_at || (success && (success?.result || success)?.withdrawn_at);
      const deadlineText = formatDate(deadline(purchase), i18n.language);
      let status = null;
      if (withdrawnAt) status = <Typography color="text.secondary">{t('Billing.WITHDRAWN_ON', { date: formatDate(withdrawnAt, i18n.language) })}</Typography>;
      else if (purchase.eligible === true) status = <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button onClick={() => setSelected(purchase)}>{t('Billing.WITHDRAWAL_BUTTON')}</Button>
        {deadlineText && <Typography color="text.secondary">{t('Billing.WITHDRAWAL_UNTIL', { date: deadlineText })}</Typography>}
      </Stack>;
      else if (purchase.reason === 'period_over') status = <Typography color="text.secondary">{t('Billing.WITHDRAWAL_PERIOD_OVER')}</Typography>;
      return <Stack key={purchase.id} direction="row" spacing={1} justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
        <Stack sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography>{findPlan(purchase.plan_key)}</Typography>
          <Typography variant="body2" color="text.secondary">{formatDate(purchase.purchased_at, i18n.language)} · {formatPrice(purchase.amount_paid_cents, i18n.language, purchase.currency)}</Typography>
        </Stack>
        {status}
      </Stack>;
    })}
    {Object.entries(successful).map(([id, entry]) => <Stack key={id} spacing={0.5} role="status">
      <Typography>{t('Billing.WITHDRAWAL_DONE')}</Typography>
      <Typography>{t('Billing.WITHDRAWAL_DONE_DETAIL', { date: formatDateTime((entry?.result || entry)?.withdrawn_at, i18n.language) })}</Typography>
    </Stack>)}
    <WithdrawalDialog open={Boolean(selected)} purchase={selected} api={api} onClose={() => setSelected(null)} onWithdrawn={(result) => selected && handleWithdrawn(selected.id, result)} />
  </Stack>;
}

export default WithdrawalSection;
