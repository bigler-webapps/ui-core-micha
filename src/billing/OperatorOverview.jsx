import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import StatTile from '../components/StatTile';
import { defaultBillingApi } from './api';
import { formatTokens, formatUsdMicros } from './format';

export const OPERATOR_OVERVIEW_ALERT_SX = { width: '100%' };
const hiddenStatus = (error) => [401, 403, 404].includes(error?.response?.status);
const currentUtcMonth = () => new Date().toISOString().slice(0, 7);

export function OperatorOverview({ api = defaultBillingApi, sx }) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(currentUtcMonth);
  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setState('loading');
    Promise.resolve().then(() => api.getOperatorOverview({ month })).then((result) => {
      if (generation.current !== current) return;
      setData(result); setState('ready');
    }).catch((error) => {
      if (generation.current !== current) return;
      setData(null); setState(hiddenStatus(error) ? 'hidden' : 'error');
    });
    return () => { generation.current += 1; };
  }, [api, month, attempt]);
  if (state === 'hidden') return null;
  if (state === 'error') return <Stack sx={sx} spacing={1}><Alert severity="error" sx={OPERATOR_OVERVIEW_ALERT_SX}>{t('Billing.OP_LOAD_ERROR')}</Alert><Button onClick={() => setAttempt((value) => value + 1)}>{t('Billing.RETRY')}</Button></Stack>;
  if (state === 'loading') return <Stack sx={sx} spacing={2}><Typography variant="h5">{t('Billing.OP_OVERVIEW_TITLE')}</Typography><TextField type="month" label={t('Billing.OP_MONTH')} value={month} onChange={(event) => setMonth(event.target.value)} /></Stack>;
  if (state !== 'ready') return null;

  const accounts = data?.accounts || { active: 0, by_source: { subscription: {}, team_seat: 0, free_access: 0 } };
  const subscriptions = data?.subscriptions || { new: 0, ended: 0 };
  const tokens = data?.tokens || { granted: 0, used: 0, expired: 0 };
  const models = Array.isArray(data?.ai_cost?.by_model) ? data.ai_cost.by_model : [];
  const n = (value) => formatTokens(Number.isInteger(value) ? value : 0, i18n.language);
  const planRows = Object.entries(accounts.by_source?.subscription || {}).map(([plan, value]) => t('Billing.OP_PLAN', { plan }) + ': ' + n(value));
  const activeLines = [...planRows, `${t('Billing.OP_TEAM_SEAT')}: ${n(accounts.by_source?.team_seat)}`, `${t('Billing.OP_FREE_ACCESS')}: ${n(accounts.by_source?.free_access)}`];
  const packages = data?.team?.packages_sold || 0;
  const tokenPackages = data?.token_packages?.sold || 0;
  const packageTokens = data?.token_packages?.tokens || 0;
  const tiles = [
    [t('Billing.OP_ACTIVE_ACCOUNTS'), n(accounts.active), activeLines],
    [t('Billing.OP_NEW_SUBSCRIPTIONS'), n(subscriptions.new)],
    [t('Billing.OP_ENDED_SUBSCRIPTIONS'), n(subscriptions.ended)],
    [t('Billing.OP_PACKAGES_SOLD'), n(packages + tokenPackages), undefined, `${n(packageTokens)} ${t('Billing.OP_TOKENS_GRANTED')}`],
    [t('Billing.OP_TOKENS_GRANTED'), n(tokens.granted)],
    [t('Billing.OP_TOKENS_USED'), n(tokens.used)],
    [t('Billing.OP_TOKENS_EXPIRED'), n(tokens.expired)],
    [t('Billing.OP_AI_COST'), formatUsdMicros(data?.ai_cost?.usd_micros || 0, i18n.language)],
    [t('Billing.OP_COST_PER_TOKEN'), data?.ai_cost?.usd_micros_per_used_token == null ? '–' : formatUsdMicros(data.ai_cost.usd_micros_per_used_token, i18n.language, { fractionDigits: 6 })],
  ];
  return <Stack sx={sx} spacing={2}>
    <Typography variant="h5">{t('Billing.OP_OVERVIEW_TITLE')}</Typography>
    <TextField type="month" label={t('Billing.OP_MONTH')} value={month} onChange={(event) => setMonth(event.target.value)} />
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>{tiles.map(([label, value, lines, caption]) => <StatTile key={label} label={label} value={value} caption={caption} minWidth={170}>{lines?.map((line) => <Typography key={line} variant="body2">{line}</Typography>)}</StatTile>)}</Stack>
    <Card><CardContent><Typography variant="h6">{t('Billing.OP_AI_COST')}</Typography>
      {models.length ? <Table size="small"><TableHead><TableRow><TableCell>{t('Billing.OP_PROVIDER')}</TableCell><TableCell>{t('Billing.OP_MODEL')}</TableCell><TableCell>{t('Billing.OP_CALLS')}</TableCell><TableCell>{t('Billing.OP_COST_USD')}</TableCell></TableRow></TableHead><TableBody>{models.map((model, index) => <TableRow key={`${model.provider}-${model.model}-${index}`}><TableCell>{model.provider}</TableCell><TableCell>{model.model}</TableCell><TableCell>{n(model.calls)}</TableCell><TableCell>{formatUsdMicros(model.usd_micros, i18n.language)}</TableCell></TableRow>)}</TableBody></Table> : <Typography color="text.secondary">{t('Billing.OP_NO_AI_COST')}</Typography>}
    </CardContent></Card>
  </Stack>;
}

export default OperatorOverview;
