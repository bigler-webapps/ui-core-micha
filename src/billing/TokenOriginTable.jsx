import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTokens } from './format';
import { BILLING_TOKEN_ORIGINS } from './wire';

const ORIGIN_KEYS = {
  plan: 'Billing.OP_GRANT_PLAN',
  package: 'Billing.OP_GRANT_PACKAGE',
  credit: 'Billing.ORIGIN_credit',
  trial: 'Billing.ORIGIN_trial',
};

const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

function validPool(pool) {
  return pool && typeof pool === 'object'
    && typeof pool.plan_key === 'string' && typeof pool.plan_name === 'string'
    && (pool.expires_at == null || typeof pool.expires_at === 'string')
    && nonNegativeInteger(pool.amount) && nonNegativeInteger(pool.remaining);
}

function OriginGrid({ rows, t, language }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(0, 1fr) auto auto' }, columnGap: 2, rowGap: 0.5, alignItems: 'baseline', fontSize: '0.8125rem' }}>
    <Typography variant="caption">{t('Billing.ORIGIN_HEADER')}</Typography>
    <Box component="span" sx={{ textAlign: 'right', color: 'text.secondary', fontSize: '0.75rem' }}>{t('Billing.OP_REMAINING')}</Box>
    <Box component="span" sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', color: 'text.secondary', fontSize: '0.75rem' }}>{t('Billing.VALID_HEADER')}</Box>
    {rows.map((row) => {
      const share = row.amount === 0 ? 0 : Math.max(0, Math.min(1, row.remaining / row.amount));
      const expiry = formatDate(row.expires_at, language);
      return <React.Fragment key={row.key}>
        <Typography>{t(row.nameKey, row.nameValues)}</Typography>
        <Box component="span" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatTokens(row.remaining, language)}</Box>
        <Box component="span" sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, color: 'text.secondary', textAlign: { xs: 'left', sm: 'right' }, mt: { xs: -0.5, sm: 0 } }}>
          {row.expires_at == null ? t('Billing.NEVER_EXPIRES') : expiry ? t('Billing.EXPIRES_ON', { date: expiry }) : ''}
        </Box>
        {row.amount > 0 && <Box aria-label={`${formatTokens(row.remaining, language)} / ${formatTokens(row.amount, language)}`} sx={{ gridColumn: '1 / -1', height: 6, borderRadius: 3, bgcolor: (theme) => theme.palette.action.hover, overflow: 'hidden', mb: 0.75 }}>
          <Box style={{ width: `${share * 100}%`, height: '100%' }} sx={{ bgcolor: 'primary.main' }} />
        </Box>}
      </React.Fragment>;
    })}
  </Box>;
}

export function TokenOriginTable({ tokens, sx }) {
  const { t, i18n } = useTranslation();
  const grants = Array.isArray(tokens?.grants) ? tokens.grants : [];
  const hasLegacyGrant = grants.some((grant) => !BILLING_TOKEN_ORIGINS.includes(grant?.origin));

  if (hasLegacyGrant) return grants.length > 0 ? <Box sx={sx}>
    {grants.map((grant, index) => {
      if (!['plan', 'package'].includes(grant?.source) || !nonNegativeInteger(grant.amount) || !nonNegativeInteger(grant.remaining)) return null;
      return <Box key={`${grant.source}-${grant.expires_at || 'never'}-${index}`} sx={{ mb: 0.5 }}>
        <Typography>{t(grant.source === 'plan' ? 'Billing.OP_GRANT_PLAN' : 'Billing.OP_GRANT_PACKAGE')}: {formatTokens(grant.amount, i18n.language)}</Typography>
        <Typography>{formatTokens(grant.remaining, i18n.language)} {t('Billing.OP_REMAINING')}</Typography>
        {formatDate(grant.expires_at, i18n.language) && <Typography>{t('Billing.OP_VALID_UNTIL', { date: formatDate(grant.expires_at, i18n.language) })}</Typography>}
      </Box>;
    })}
  </Box> : null;

  const rows = grants.filter((grant) => nonNegativeInteger(grant?.amount) && nonNegativeInteger(grant?.remaining))
    .map((grant, index) => ({
      key: `grant-${index}`,
      amount: grant.amount,
      remaining: grant.remaining,
      expires_at: grant.expires_at ?? null,
      nameKey: 'Billing.ORIGIN_LINE',
      nameValues: { name: t(ORIGIN_KEYS[grant.origin]), amount: formatTokens(grant.amount, i18n.language) },
    }));
  if (validPool(tokens?.pool)) rows.push({
    key: 'pool', amount: tokens.pool.amount, remaining: tokens.pool.remaining,
    expires_at: tokens.pool.expires_at ?? null,
    nameKey: 'Billing.ORIGIN_LINE',
    nameValues: { name: t('Billing.ORIGIN_pool'), amount: formatTokens(tokens.pool.amount, i18n.language) },
  });

  if (!rows.length) return null;
  return <OriginGrid rows={rows} t={t} language={i18n.language} />;
}

export default TokenOriginTable;
