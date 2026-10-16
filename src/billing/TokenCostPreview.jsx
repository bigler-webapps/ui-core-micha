import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatTokens } from './format';

export function TokenCostPreview({ cost, alternatives = [], balance }) {
  const { t, i18n } = useTranslation();
  if (!Number.isInteger(cost) || cost < 0 || !Number.isInteger(balance) || balance < 0 || !Array.isArray(alternatives)
    || alternatives.some((item) => !item || typeof item.label !== 'string' || !Number.isInteger(item.cost) || item.cost < 0)) return null;
  const insufficient = balance < cost;
  // "47 Token, mit Übersetzung 71 · Guthaben 1'153": the cost and its alternatives, then the balance.
  const costs = [t('Billing.COST', { tokens: formatTokens(cost, i18n.language) })];
  alternatives.forEach(({ label, cost: alternativeCost }) => costs.push(`${label} ${formatTokens(alternativeCost, i18n.language)}`));
  const parts = [costs.join(', '), t('Billing.BALANCE', { tokens: formatTokens(balance, i18n.language) })];
  return <Stack component="span" direction="row" spacing={0.5} flexWrap="wrap" aria-live="polite">
    <Typography component="span" color={insufficient ? 'error' : 'text.primary'}>{parts.join(' · ')}</Typography>
    {insufficient && <Typography component="span" color="error">{t('Billing.NOT_ENOUGH')}</Typography>}
  </Stack>;
}

export default TokenCostPreview;
