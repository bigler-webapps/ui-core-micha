import React from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatShortDate } from './format';
import SoftChip from '../components/SoftChip';

export const BILLING_ACCESS_BADGE_SX = { maxWidth: '100%' };

export function accountAccessText(account, t, language, { planNames = {}, isOperator = false } = {}) {
  if (!account) return '–'; // no row for this person (not loaded): say nothing rather than claim read-only
  const access = account.access || {};
  if (isOperator) return t('Billing.OP_OPERATOR');
  if (access.status === 'read_only') return t('Billing.OP_READ_ONLY');
  if (access.source === 'subscription') {
    const date = formatShortDate(account.term_ends_at || access.ends_at, language);
    const plan = planNames[account.plan_key] || t('Billing.OP_SUBSCRIPTION');
    return [plan, date && t('Billing.OP_UNTIL', { date })].filter(Boolean).join(' · ');
  }
  if (access.source === 'team') {
    const date = formatShortDate(access.ends_at, language);
    return [t('Billing.OP_TEAM'), date && t('Billing.OP_UNTIL', { date })].filter(Boolean).join(' · ');
  }
  if (access.source === 'free' && access.status !== 'read_only') return t('Billing.OP_FREE_ACCESS_SHORT');
  return t('Billing.OP_READ_ONLY');
}

export function BillingAccessCell({ account, planNames, isOperator = false }) {
  const { t, i18n } = useTranslation();
  if (!account) return '–';
  const access = account.access || {};
  const label = accountAccessText(account, t, i18n.language, { planNames, isOperator });
  // Operator is neutral; the others are the kit's soft tinted status chips, as in the prototype.
  if (isOperator) return <Chip size="small" variant="outlined" label={label} sx={BILLING_ACCESS_BADGE_SX} />;
  const tone = access.status === 'read_only' ? 'warning' : access.source === 'subscription' ? 'success' : 'primary';
  return <SoftChip tone={tone} label={label} />;
}

export function BillingAccessError({ onRetry }) {
  const { t } = useTranslation();
  return <Stack direction="row" spacing={1} alignItems="center"><Typography color="error">{t('Billing.OP_LOAD_ERROR')}</Typography>{onRetry && <Button size="small" onClick={onRetry}>{t('Billing.RETRY')}</Button>}</Stack>;
}

export default BillingAccessCell;
