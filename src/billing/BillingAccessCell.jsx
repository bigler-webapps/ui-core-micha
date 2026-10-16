import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate } from './format';
import { FreeAccessSwitch } from './FreeAccessSwitch';

export function accountAccessText(account, t, language) {
  if (!account) return t('Billing.OP_READ_ONLY');
  const access = account.access || {};
  if (access.source === 'subscription') {
    const date = formatDate(account.term_ends_at || access.ends_at, language);
    const plan = account.plan_key || '';
    return [t('Billing.OP_PLAN', { plan }), date && t('Billing.OP_UNTIL', { date }), access.status === 'read_only' && t('Billing.OP_READ_ONLY')].filter(Boolean).join(' · ');
  }
  if (access.source === 'team') {
    const date = formatDate(access.ends_at, language);
    return [t('Billing.OP_TEAM_SEAT'), date && t('Billing.OP_UNTIL', { date }), access.status === 'read_only' && t('Billing.OP_READ_ONLY')].filter(Boolean).join(' · ');
  }
  if (access.source === 'free') return [t('Billing.OP_FREE_ACCESS'), access.status === 'read_only' && t('Billing.OP_READ_ONLY')].filter(Boolean).join(' · ');
  return t('Billing.OP_READ_ONLY');
}

export function BillingAccessCell({ account, api, onChanged }) {
  const { t, i18n } = useTranslation();
  return <Stack spacing={0.5}><Typography>{accountAccessText(account, t, i18n.language)}</Typography>{account && <FreeAccessSwitch account={account} api={api} onChanged={onChanged} />}</Stack>;
}

export default BillingAccessCell;
