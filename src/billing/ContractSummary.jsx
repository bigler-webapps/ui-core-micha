import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPrice, formatTokens } from './format';

const REFUND_STATUSES = new Set(['pending', 'requested', 'succeeded', 'failed', 'requires_action', 'cancelled']);
const statusKey = (status) => REFUND_STATUSES.has(status) ? `Billing.REFUND_STATUS_${status.toUpperCase()}` : 'Billing.REFUND_STATUS_UNKNOWN';
const DECLARATION_STATUSES = new Set(['received', 'awaiting_confirmation', 'needs_review', 'accepted', 'scheduled', 'effective', 'rejected']);
const declarationKindKey = (kind) => kind === 'withdrawal' ? 'Billing.DECLARATION_WITHDRAWAL' : 'Billing.DECLARATION_CANCELLATION';
const declarationStatusKey = (status) => DECLARATION_STATUSES.has(status) ? `Billing.DECLARATION_STATUS_${status.toUpperCase()}` : 'Billing.DECLARATION_STATUS_UNKNOWN';

export function ContractSummary({ contract, onCancel, sx }) {
  const { t, i18n } = useTranslation();
  if (!contract || typeof contract !== 'object') return null;
  const phaseKey = ({ initial: 'Billing.CONTRACT_PHASE_INITIAL', continuation: 'Billing.CONTRACT_PHASE_CONTINUATION', none: 'Billing.CONTRACT_PHASE_NONE' })[contract.phase];
  const statusSuffix = ({ active: 'ACTIVE', cancellation_scheduled: 'CANCELLATION_SCHEDULED', ended: 'ENDED', withdrawn: 'WITHDRAWN' })[contract.status];
  const paidThrough = contract.phase === 'initial' ? contract.initial_term_end : contract.phase === 'continuation' ? contract.current_period_end : null;
  const nextCharge = contract.next_charge;

  return <Stack sx={sx} spacing={0.5}>
    <Typography variant="h6">{contract.plan_name || contract.plan_key || t('Billing.CONTRACT_TITLE')}</Typography>
    {phaseKey && <Typography>{t(phaseKey)}</Typography>}
    {statusSuffix && <Typography>{t(`Billing.CONTRACT_STATUS_${statusSuffix}`)}</Typography>}
    {formatDate(contract.started_at, i18n.language) && <Typography>{t('Billing.CONTRACT_STARTED_AT', { date: formatDate(contract.started_at, i18n.language) })}</Typography>}
    {formatDate(paidThrough, i18n.language) && <Typography>{t('Billing.CONTRACT_PAID_THROUGH', { date: formatDate(paidThrough, i18n.language) })}</Typography>}
    {nextCharge && <Stack spacing={0.25}>
      <Typography>{t('Billing.CONTRACT_NEXT_CHARGE', { amount: formatPrice(nextCharge.amount_cents, i18n.language, nextCharge.currency) })}</Typography>
      {formatDate(nextCharge.date, i18n.language) && <Typography>{t('Billing.CONTRACT_NEXT_CHARGE_DATE', { date: formatDate(nextCharge.date, i18n.language) })}</Typography>}
      {Number.isFinite(nextCharge.token_allowance) && <Typography>{t('Billing.CONTRACT_NEXT_ALLOWANCE', { tokens: formatTokens(nextCharge.token_allowance, i18n.language) })}</Typography>}
    </Stack>}
    {contract.status === 'cancellation_scheduled' && formatDate(contract.cancel_effective_at, i18n.language) && <Typography>{t('Billing.CONTRACT_CANCEL_EFFECTIVE', { date: formatDate(contract.cancel_effective_at, i18n.language) })}</Typography>}
    {Array.isArray(contract.declarations) && contract.declarations.map((declaration, index) => <Typography key={declaration?.reference || index} color="text.secondary">{t('Billing.CONTRACT_DECLARATION', { kind: t(declarationKindKey(declaration?.kind)), status: t(declarationStatusKey(declaration?.status)) })}</Typography>)}
    {Array.isArray(contract.refunds) && contract.refunds.map((refund, index) => <Stack key={`${refund?.status || 'refund'}-${index}`} spacing={0.25}>
      <Typography>{t(statusKey(refund?.status))}</Typography>
      {Number.isFinite(refund?.amount_cents) && <Typography>{formatPrice(refund.amount_cents, i18n.language, refund.currency)}</Typography>}
      {formatDate(refund?.due_by, i18n.language) && <Typography>{t('Billing.CONTRACT_REFUND_DUE', { date: formatDate(refund.due_by, i18n.language) })}</Typography>}
    </Stack>)}
    {contract.status === 'active' && onCancel && <Button onClick={onCancel} sx={{ alignSelf: 'flex-start' }}>{t('Billing.CANCEL_OPEN')}</Button>}
  </Stack>;
}

export default ContractSummary;
