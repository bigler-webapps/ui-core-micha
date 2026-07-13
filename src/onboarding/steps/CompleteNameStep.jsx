import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PersonIcon from '@mui/icons-material/Person';
import { updateUserProfile } from '../../auth/authApi';

export function CompleteNameStep({ onComplete }) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await updateUserProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      onComplete();
    } catch {
      setError(t('Onboarding.COMPLETE_NAME_ERROR'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon color="primary" /><Typography variant="h6">{t('Onboarding.COMPLETE_NAME_TITLE')}</Typography></Box>
      <Typography variant="body2" color="text.secondary">{t('Onboarding.COMPLETE_NAME_BODY')}</Typography>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <TextField label={t('Onboarding.FIRST_NAME_LABEL')} value={firstName} onChange={(event) => setFirstName(event.target.value)} required fullWidth size="small" />
      <TextField label={t('Onboarding.LAST_NAME_LABEL')} value={lastName} onChange={(event) => setLastName(event.target.value)} required fullWidth size="small" />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="contained" type="submit" disabled={loading || !firstName.trim() || !lastName.trim()} startIcon={loading ? <CircularProgress size={16} /> : undefined}>{t('Onboarding.SAVE')}</Button></Box>
    </Box>
  );
}

export default CompleteNameStep;
