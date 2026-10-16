import React from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate } from './format';

export const ACCESS_ENDED_BANNER_ALERT_SX = { alignItems: 'center' };

export function AccessEndedBanner({ endedAt, deletionDate, onRenew }) {
  const { t, i18n } = useTranslation();
  return <Alert severity="warning" role="status" sx={ACCESS_ENDED_BANNER_ALERT_SX} action={<Button color="inherit" onClick={onRenew}>{t('Billing.RENEW')}</Button>}>
    <Stack spacing={0.5}>
      <span>{t('Billing.ENDED_TITLE')}</span>
      {formatDate(endedAt, i18n.language) && <span>{t('Billing.ENDED_ON', { date: formatDate(endedAt, i18n.language) })}</span>}
      {formatDate(deletionDate, i18n.language) && <span>{t('Billing.DELETION_ON', { date: formatDate(deletionDate, i18n.language) })}</span>}
    </Stack>
  </Alert>;
}

export default AccessEndedBanner;
