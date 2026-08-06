import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
  setNotificationCategorySubscription,
  urlBase64ToUint8Array,
} from './api';

function reachLabelKey(notificationType) {
  const noActiveChannel = notificationType.active && notificationType.has_active_channel === false;
  if (notificationType.active && notificationType.passive) {
    // Scope C's bounded fallback: a "both" type still reaches the user passively
    // (chip) when no active channel is configured -- it is not undelivered, so it
    // must not show the "does not reach you" warning meant for active-only types.
    return noActiveChannel ? 'NotificationSettings.REACH_PASSIVE' : 'NotificationSettings.REACH_BOTH';
  }
  if (notificationType.active) {
    return noActiveChannel ? 'NotificationSettings.REACH_NO_ACTIVE_CHANNEL' : 'NotificationSettings.REACH_ACTIVE';
  }
  return 'NotificationSettings.REACH_PASSIVE';
}

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
  const [savingPreview, setSavingPreview] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState('');
  const [savingSubscription, setSavingSubscription] = useState(null);

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

  const handlePreviewToggle = async (event) => {
    const push_preview_opt_in = event.target.checked;
    setSavingPreview(true);
    setError('');
    try {
      const updated = await patchNotificationPreferences({ push_preview_opt_in });
      setPreferences(updated);
    } catch {
      setError(t('NotificationSettings.SAVE_ERROR'));
    } finally {
      setSavingPreview(false);
    }
  };

  const handleSubscriptionToggle = async (category, event) => {
    const requested = event.target.checked;
    setSavingSubscription(category);
    setError('');
    try {
      const result = await setNotificationCategorySubscription(category, requested);
      // Reflect what the server actually recorded, not the checkbox's optimistic
      // value -- a 2xx response with a different `subscribed` (e.g. a server-side
      // clamp) must not be silently overridden by what the user clicked.
      const confirmed = result?.subscribed ?? requested;
      setPreferences((current) => ({
        ...current,
        subscribable_categories: current.subscribable_categories.map((row) => (
          row.category === category ? { ...row, subscribed: confirmed } : row
        )),
      }));
    } catch {
      setError(t('NotificationSettings.SUBSCRIPTION_ERROR'));
    } finally {
      setSavingSubscription(null);
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
        {iosNeedsInstall && <Alert severity="info" sx={{ mb: 1.5 }}>{t('NotificationSettings.IOS_HINT')}</Alert>}
        {!pushSupported && !iosNeedsInstall && <Alert severity="warning" sx={{ mb: 1.5 }}>{t('NotificationSettings.PUSH_NOT_SUPPORTED')}</Alert>}
        <FormControlLabel
          control={(
            <Switch
              checked={pushSubscribed}
              onChange={(event) => (event.target.checked ? handleEnablePush() : handleDisablePush())}
              disabled={savingPush || !pushSupported || iosNeedsInstall}
            />
          )}
          label={<Box><Typography variant="body1">{t('NotificationSettings.PUSH_LABEL')}</Typography><Typography variant="caption" color="text.secondary">{t('NotificationSettings.PUSH_HINT')}</Typography></Box>}
          labelPlacement="end"
          sx={{ alignItems: 'flex-start', ml: 0 }}
        />
        <FormControlLabel
          control={(
            <Switch
              checked={preferences?.push_preview_opt_in !== false}
              onChange={handlePreviewToggle}
              disabled={savingPreview || !preferences?.push_opt_in}
            />
          )}
          label={<Box><Typography variant="body1">{t('NotificationSettings.PUSH_PREVIEW_LABEL')}</Typography><Typography variant="caption" color="text.secondary">{t('NotificationSettings.PUSH_PREVIEW_HINT')}</Typography></Box>}
          labelPlacement="end"
          sx={{ alignItems: 'flex-start', ml: 0, mt: 1.5 }}
        />
      </Box>

      {preferences?.notification_types?.length > 0 && (
        <>
          <Divider />
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('NotificationSettings.REACH_TITLE')}</Typography>
            {preferences.notification_types.map((notificationType) => {
              const labelKey = reachLabelKey(notificationType);
              const reachText = t(labelKey);
              // Reserve Alert (a colored banner) for the one case that is actually a
              // warning -- an active-only type nobody can currently reach. Routine
              // reach description is static settings copy, not a status message.
              if (labelKey === 'NotificationSettings.REACH_NO_ACTIVE_CHANNEL') {
                return (
                  <Alert key={notificationType.key} severity="warning" sx={{ mb: 1 }}>
                    <strong>{notificationType.label}</strong> — {reachText}
                  </Alert>
                );
              }
              return (
                <Box key={notificationType.key} sx={{ py: 0.5 }}>
                  <Typography variant="body2">{notificationType.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{reachText}</Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}

      {preferences?.subscribable_categories?.length > 0 && (
        <>
          <Divider />
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('NotificationSettings.SUBSCRIPTIONS_TITLE')}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('NotificationSettings.SUBSCRIPTIONS_SUBTITLE')}
            </Typography>
            {preferences.subscribable_categories.map((row) => (
              <FormControlLabel
                key={row.category}
                control={(
                  <Switch
                    checked={Boolean(row.subscribed)}
                    onChange={(event) => handleSubscriptionToggle(row.category, event)}
                    disabled={savingSubscription === row.category}
                  />
                )}
                label={row.label}
                labelPlacement="end"
                sx={{ alignItems: 'center', ml: 0, display: 'flex' }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export default NotificationSettings;
