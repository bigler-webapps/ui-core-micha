import React, { useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function DeclarationConfirm({ api, token, onDone }) {
  const { t } = useTranslation();
  const [state, setState] = useState('ready');
  const [declaration, setDeclaration] = useState(null);
  const posted = useRef(false);

  const confirm = async () => {
    if (posted.current || state !== 'ready') return;
    posted.current = true; setState('submitting');
    try {
      const response = await api.confirmDeclaration(token);
      setDeclaration(response?.declaration || response || {}); setState('success'); onDone?.(response);
    } catch {
      setState('error');
    }
  };

  return <Stack spacing={1.5}>
    {state === 'ready' && <>
      <Typography>{t('Billing.DECLARATION_CONFIRM_TITLE')}</Typography>
      <Button variant="contained" onClick={confirm}>{t('Billing.DECLARATION_CONFIRM')}</Button>
    </>}
    {state === 'submitting' && <Typography role="status"><CircularProgress size={16} /> {t('Billing.LOADING')}</Typography>}
    {state === 'success' && <Typography role="status">{t('Billing.DECLARATION_CONFIRM_SUCCESS', { reference: declaration?.reference || '' })}</Typography>}
    {state === 'error' && <Alert severity="error">{t('Billing.DECLARATION_CONFIRM_ERROR')}</Alert>}
  </Stack>;
}

export default DeclarationConfirm;
