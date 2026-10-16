import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatTokens } from './format';

export const TOKEN_BALANCE_BADGE_SX = { fontVariantNumeric: 'tabular-nums' };

export function TokenBalanceBadge({ balance, lowBelow, sx }) {
  const { t, i18n } = useTranslation();
  if (!Number.isFinite(balance)) return null;
  const label = t('Billing.BALANCE', { tokens: formatTokens(balance, i18n.language) });
  return <Chip label={label} aria-label={label} color={Number.isFinite(lowBelow) && balance < lowBelow ? 'warning' : 'default'} sx={[TOKEN_BALANCE_BADGE_SX, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} />;
}

export default TokenBalanceBadge;
