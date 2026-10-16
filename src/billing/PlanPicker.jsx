import React, { useMemo, useState } from 'react';
import { Alert, Button, ButtonBase, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatPrice, formatTokens } from './format';
import { defaultBillingApi } from './api';

export const PLAN_PICKER_CARD_SX = { width: { xs: '100%', sm: 'calc(50% - 8px)' } };
export const PLAN_PICKER_SELECTED_CARD_SX = { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 };
export const PLAN_PICKER_ALERT_SX = { width: '100%' };
export const PLAN_PICKER_CARD_ACTION_SX = { width: '100%', height: '100%', textAlign: 'left' };

export function PlanPicker({ plans = [], kinds = ['subscription', 'team_package'], api = defaultBillingApi, redirect = (url) => window.location.assign(url), describePlan, onError }) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [interval, setInterval] = useState('month');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const subscriptionPlans = plans.filter((plan) => kinds.includes('subscription') && plan?.kind === 'subscription');
  const intervals = [...new Set(subscriptionPlans.map((plan) => plan.interval).filter((value) => value === 'month' || value === 'year'))];
  const filteredPlans = useMemo(() => plans.filter((plan) => kinds.includes(plan?.kind)
    && (plan.kind !== 'subscription' || intervals.length < 2 || plan.interval === interval)), [plans, kinds, intervals.length, interval]);

  const choose = (plan) => setSelected(plan?.key ?? null);
  const continueToPayment = async () => {
    if (busy || selected === null) return;
    setBusy(true);
    setError(false);
    try {
      const result = await api.startCheckout(selected);
      if (typeof result?.url !== 'string' || !result.url.startsWith('https://')) throw new Error('invalid_checkout_url');
      redirect(result.url);
    } catch (cause) {
      setError(true);
      onError?.(cause);
    } finally { setBusy(false); }
  };

  return <Stack spacing={2}>
    {intervals.length > 1 && <ToggleButtonGroup exclusive value={interval} onChange={(_, value) => { if (value) setInterval(value); }} aria-label={t('Billing.PLAN_INTERVAL')}>
      <ToggleButton value="month">{t('Billing.MONTHLY')}</ToggleButton>
      <ToggleButton value="year">{t('Billing.YEARLY')}</ToggleButton>
    </ToggleButtonGroup>}
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
      {filteredPlans.map((plan) => {
        const active = selected === plan.key;
        const suffix = plan.kind === 'subscription' ? (plan.interval === 'year' ? t('Billing.PER_YEAR') : t('Billing.PER_MONTH')) : '';
        return <Card key={plan.key} variant="outlined" sx={[PLAN_PICKER_CARD_SX, active && PLAN_PICKER_SELECTED_CARD_SX]}>
          <ButtonBase component="button" role="radio" aria-checked={active} aria-pressed={active} onClick={() => choose(plan)} sx={PLAN_PICKER_CARD_ACTION_SX}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{plan.name}</Typography>
                <Typography>{formatPrice(plan.amount_cents, i18n.language)}{suffix}</Typography>
                {plan.kind === 'team_package' && <Typography>{t('Billing.SEATS', { count: plan.seats })} · {t('Billing.TERM_MONTHS', { count: plan.term_months })}</Typography>}
                {Number.isFinite(plan.token_allowance) && plan.token_allowance > 0 && <Typography>{t('Billing.TOKENS_INCLUDED', { tokens: formatTokens(plan.token_allowance, i18n.language) })}</Typography>}
                {describePlan?.(plan)}
              </Stack>
            </CardContent>
          </ButtonBase>
        </Card>;
      })}
    </Stack>
    {error && <Alert severity="error" sx={PLAN_PICKER_ALERT_SX}>{t('Billing.ERROR_CHECKOUT')}</Alert>}
    <Button variant="contained" disabled={selected === null || busy} onClick={continueToPayment}>{t('Billing.CONTINUE_TO_PAYMENT')}</Button>
  </Stack>;
}

export default PlanPicker;
