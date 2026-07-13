import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getNotificationPreferences,
  getVapidPublicKey,
  patchNotificationPreferences,
  removePushSubscription,
  savePushSubscription,
  urlBase64ToUint8Array,
} from './api';

function getPushSupport() {
  return typeof navigator !== 'undefined'
    && typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

function getIosInstallState() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  return isIos && !standalone;
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState('');

  const pushSupported = getPushSupport();
  const iosNeedsInstall = getIosInstallState();

  useEffect(() => {
    let cancelled = false;

    getNotificationPreferences()
      .then((data) => {
        if (!cancelled) setPreferences(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('NotificationSettings.LOAD_ERROR'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    if (!pushSupported) return undefined;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushSubscribed(Boolean(subscription));
      })
      .catch(() => {
        if (!cancelled) setPushSubscribed(false);
      });

    return () => { cancelled = true; };
  }, [pushSupported]);

  const handleEmailToggle = async (event) => {
    const email_opt_in = event.target.checked;
    setSavingEmail(true);
    setError('');
    try {
      const updated = await patchNotificationPreferences({ email_opt_in });
      setPreferences(updated);
    } catch {
      setError(t('NotificationSettings.SAVE_ERROR'));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleEnablePush = async () => {
    setSavingPush(true);
    setError('');
    setConflict('');
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
      const updated = await patchNotificationPreferences({ push_opt_in: true });
      setPreferences(updated);
      setPushSubscribed(true);
    } catch (requestError) {
      if (requestError?.response?.status === 409) {
        setConflict(t('NotificationSettings.PUSH_CONFLICT'));
      } else {
        setError(t('NotificationSettings.PUSH_ERROR'));
      }
    } finally {
      setSavingPush(false);
    }
  };

  const handleDisablePush = async () => {
    setSavingPush(true);
    setError('');
    setConflict('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await removePushSubscription({ endpoint });
      }
      setPushSubscribed(false);
    } catch {
      setError(t('NotificationSettings.PUSH_ERROR'));
    } finally {
      setSavingPush(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationsIcon />
        {t('NotificationSettings.TITLE')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('NotificationSettings.SUBTITLE')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {conflict && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setConflict('')}>{conflict}</Alert>}

      <Box sx={{ py: 2 }}>
        <FormControlLabel
          control={<Switch checked={Boolean(preferences?.email_opt_in)} onChange={handleEmailToggle} disabled={savingEmail} />}
          label={<Box><Typography variant="body1">{t('NotificationSettings.EMAIL_LABEL')}</Typography><Typography variant="caption" color="text.secondary">{t('NotificationSettings.EMAIL_HINT')}</Typography></Box>}
          labelPlacement="end"
          sx={{ alignItems: 'flex-start', ml: 0 }}
        />
      </Box>

      <Divider />

      <Box sx={{ py: 2 }}>
        <Typography variant="body1" gutterBottom>{t('NotificationSettings.PUSH_LABEL')}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>{t('NotificationSettings.PUSH_HINT')}</Typography>
        {iosNeedsInstall && <Alert severity="info" sx={{ mb: 1.5 }}>{t('NotificationSettings.IOS_HINT')}</Alert>}
        {!pushSupported && !iosNeedsInstall && <Alert severity="warning">{t('NotificationSettings.PUSH_NOT_SUPPORTED')}</Alert>}
        {pushSupported && !iosNeedsInstall && (pushSubscribed ? (
          <Button variant="outlined" color="error" onClick={handleDisablePush} disabled={savingPush} startIcon={savingPush ? <CircularProgress size={16} /> : undefined}>{t('NotificationSettings.PUSH_DISABLE')}</Button>
        ) : (
          <Button variant="contained" onClick={handleEnablePush} disabled={savingPush} startIcon={savingPush ? <CircularProgress size={16} /> : undefined}>{t('NotificationSettings.PUSH_ENABLE')}</Button>
        ))}
      </Box>
    </Box>
  );
}

export default NotificationSettings;
