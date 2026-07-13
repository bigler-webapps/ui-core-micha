import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getVapidPublicKey,
  patchNotificationPreferences,
  savePushSubscription,
  urlBase64ToUint8Array,
} from '../../notifications/api';

export function BrowserPushStep({ onComplete, onDismiss }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enable = async () => {
    setLoading(true);
    setError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError(t('NotificationSettings.PUSH_DENIED'));
        return;
      }
      const vapidPublicKey = await getVapidPublicKey();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await savePushSubscription(subscription.toJSON(), navigator.userAgent);
      await patchNotificationPreferences({ push_opt_in: true });
      onComplete();
    } catch (requestError) {
      if (requestError?.response?.status === 409) {
        setError(t('NotificationSettings.PUSH_CONFLICT'));
      } else {
        setError(t('NotificationSettings.PUSH_ERROR'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><NotificationsIcon color="primary" /><Typography variant="h6">{t('Onboarding.BROWSER_PUSH_TITLE')}</Typography></Box>
      <Typography variant="body2" color="text.secondary">{t('Onboarding.BROWSER_PUSH_BODY')}</Typography>
      {error && <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={onDismiss} disabled={loading}>{t('Onboarding.SKIP')}</Button>
        <Button variant="contained" onClick={enable} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined}>{t('NotificationSettings.PUSH_ENABLE')}</Button>
      </Box>
    </Box>
  );
}

export default BrowserPushStep;
