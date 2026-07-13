import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getVapidPublicKey,
  patchNotificationPreferences,
  savePushSubscription,
  urlBase64ToUint8Array,
} from '../../notifications/api';

export function BrowserPushStep({ onComplete, onDismiss, ctx }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailOptedIn, setEmailOptedIn] = useState(Boolean(ctx?.emailOptedIn));
  const [pushSubscribed, setPushSubscribed] = useState(Boolean(ctx?.pushState?.subscribed));
  const [error, setError] = useState('');
  const pushSupported = Boolean(ctx?.pushState?.supported);

  useEffect(() => {
    setEmailOptedIn(Boolean(ctx?.emailOptedIn));
  }, [ctx?.emailOptedIn]);

  useEffect(() => {
    setPushSubscribed(Boolean(ctx?.pushState?.subscribed));
  }, [ctx?.pushState?.subscribed]);

  const handleEmailToggle = async (event) => {
    const nextEmailOptedIn = event.target.checked;
    const previousEmailOptedIn = emailOptedIn;
    setSavingEmail(true);
    setError('');
    setEmailOptedIn(nextEmailOptedIn);
    try {
      await patchNotificationPreferences({ email_opt_in: nextEmailOptedIn });
    } catch {
      setEmailOptedIn(previousEmailOptedIn);
      setError(t('NotificationSettings.SAVE_ERROR'));
    } finally {
      setSavingEmail(false);
    }
  };

  const enable = async () => {
    setLoading(true);
    setError('');
    try {
      if (typeof Notification === 'undefined') {
        setError(t('NotificationSettings.PUSH_ERROR'));
        return;
      }
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
      setPushSubscribed(true);
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><NotificationsIcon color="primary" /><Typography variant="h6">{t('Onboarding.NOTIFICATIONS_TITLE')}</Typography></Box>
      <Typography variant="body2" color="text.secondary">{t('Onboarding.NOTIFICATIONS_BODY')}</Typography>
      {error && <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>}
      <FormControlLabel
        control={<Switch checked={emailOptedIn} onChange={handleEmailToggle} disabled={savingEmail} />}
        label={<Box><Typography variant="body1">{t('Onboarding.EMAIL_NOTIFICATIONS_LABEL')}</Typography><Typography variant="caption" color="text.secondary">{t('Onboarding.EMAIL_NOTIFICATIONS_HINT')}</Typography></Box>}
        labelPlacement="end"
        sx={{ alignItems: 'flex-start', ml: 0 }}
      />
      {pushSupported && (
        <Box>
          <Typography variant="body1" gutterBottom>{t('Onboarding.PUSH_NOTIFICATIONS_LABEL')}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>{t('Onboarding.PUSH_NOTIFICATIONS_HINT')}</Typography>
          {pushSubscribed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="body2">{t('Onboarding.PUSH_ENABLED')}</Typography>
            </Box>
          ) : (
            <Button variant="contained" onClick={enable} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined}>{t('NotificationSettings.PUSH_ENABLE')}</Button>
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={onDismiss} disabled={loading || savingEmail}>{t('Onboarding.SKIP')}</Button>
        <Button variant="contained" onClick={onComplete} disabled={loading || savingEmail}>{t('Onboarding.CONTINUE')}</Button>
      </Box>
    </Box>
  );
}

export default BrowserPushStep;
