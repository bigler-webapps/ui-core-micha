import React, { useEffect, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from './format';
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
  const eligible = purchases.filter((item) => item?.eligible === true && item.withdrawn_at == null && !successful[item.id]);

  if (loadError) return <Stack sx={sx} spacing={1}>
    <Alert severity="error" sx={WITHDRAWAL_SECTION_ALERT_SX}>{t('Billing.WITHDRAWAL_LOAD_ERROR')}</Alert>
    <Button onClick={() => setReload((count) => count + 1)}>{t('Billing.RETRY')}</Button>
    {Object.entries(successful).map(([id, entry]) => <Stack key={id} spacing={0.5} role="status">
      <Typography>{t('Billing.WITHDRAWAL_DONE')}</Typography>
      <Typography>{t('Billing.WITHDRAWAL_DONE_DETAIL', { date: formatDateTime((entry?.result || entry)?.withdrawn_at, i18n.language) })}</Typography>
    </Stack>)}
  </Stack>;
  if (!eligible.length && !Object.keys(successful).length) return null;
  const findPlan = (key) => plans.find((plan) => plan?.key === key)?.name || key;

  return <Stack sx={sx} spacing={1}>
    {eligible.map((purchase) => <Stack key={purchase.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Typography>{findPlan(purchase.plan_key)}</Typography>
      <Typography>{formatDate(purchase.purchased_at, i18n.language)}</Typography>
      <Typography>{t('Billing.WITHDRAWAL_UNTIL', { date: formatDate(deadline(purchase), i18n.language) })}</Typography>
      <Button onClick={() => setSelected(purchase)}>{t('Billing.WITHDRAWAL_BUTTON')}</Button>
    </Stack>)}
    {Object.entries(successful).map(([id, entry]) => <Stack key={id} spacing={0.5} role="status">
      <Typography>{t('Billing.WITHDRAWAL_DONE')}</Typography>
      <Typography>{t('Billing.WITHDRAWAL_DONE_DETAIL', { date: formatDateTime((entry?.result || entry)?.withdrawn_at, i18n.language) })}</Typography>
    </Stack>)}
    <WithdrawalDialog open={Boolean(selected)} purchase={selected} api={api} onClose={() => setSelected(null)} onWithdrawn={(result) => selected && handleWithdrawn(selected.id, result)} />
  </Stack>;
}

export default WithdrawalSection;
