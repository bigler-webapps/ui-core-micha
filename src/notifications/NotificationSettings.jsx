import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { AuthContext } from '../auth/AuthContext';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getNotificationPreferences,
  getNotificationChannelMatrix,
  patchNotificationChannelChoice,
  getVapidPublicKey,
  patchNotificationPreferences,
  removePushSubscription,
  savePushSubscription,
  setNotificationCategorySubscription,
  urlBase64ToUint8Array,
} from './api';

export const NOTIFICATION_SETTINGS_ALERT_SX = { mb: 2 };
export const NOTIFICATION_SETTINGS_HINT_ALERT_SX = { mb: 1.5 };
export const NOTIFICATION_SETTINGS_REACH_ALERT_SX = { mb: 1 };
export const NOTIFICATION_SETTINGS_FORM_CONTROL_SX = { alignItems: 'flex-start', ml: 0 };
export const NOTIFICATION_SETTINGS_PUSH_CONTROL_SX = {
  alignItems: 'flex-start',
  ml: 0,
  mt: 1.5,
};
export const NOTIFICATION_SETTINGS_CATEGORY_CONTROL_SX = {
  alignItems: 'center',
  ml: 0,
  display: 'flex',
};

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
  const auth = useContext(AuthContext);
  return <AccountNotificationSettings key={auth?.user?.id ?? 'anonymous'} />;
}

function AccountNotificationSettings() {
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
  const [matrix, setMatrix] = useState([]);
  const [matrixError, setMatrixError] = useState('');
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [savingPair, setSavingPair] = useState(null);
  const matrixVersion = useRef(0);
  const active = useRef(true);

  const refreshMatrix = async () => {
    const version = ++matrixVersion.current;
    setMatrixLoading(true);
    setMatrixError('');
    try {
      const data = await getNotificationChannelMatrix();
      if (active.current && version === matrixVersion.current) setMatrix(data.results);
    } catch {
      if (active.current && version === matrixVersion.current) setMatrixError(t('NotificationSettings.MATRIX_LOAD_ERROR'));
    } finally {
      if (active.current && version === matrixVersion.current) setMatrixLoading(false);
    }
  };

  useEffect(() => {
    active.current = true;
    refreshMatrix();
    return () => { active.current = false; matrixVersion.current += 1; };
  }, []);

  const handleChoice = async (row, choice) => {
    if (savingPair) return;
    const pair = `${row.category}:${row.channel}`;
    ++matrixVersion.current;
    setMatrixLoading(false);
    setSavingPair(pair);
    setMatrixError('');
    try {
      const updated = await patchNotificationChannelChoice(row.category, row.channel, choice);
      if (active.current) setMatrix((current) => current.map((item) => (
        item.category === row.category && item.channel === row.channel ? updated : item
      )));
    } catch {
      if (active.current) setMatrixError(t('NotificationSettings.MATRIX_SAVE_ERROR'));
    } finally {
      if (active.current) setSavingPair(null);
    }
  };

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
      if (active.current) refreshMatrix();
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
      if (active.current) refreshMatrix();
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
      {error && <Alert severity="error" sx={NOTIFICATION_SETTINGS_ALERT_SX} onClose={() => setError('')}>{error}</Alert>}
      {conflict && <Alert severity="warning" sx={NOTIFICATION_SETTINGS_ALERT_SX} onClose={() => setConflict('')}>{conflict}</Alert>}

      <Box sx={{ py: 2 }}>
        <FormControlLabel
          control={<Switch checked={Boolean(preferences?.email_opt_in)} onChange={handleEmailToggle} disabled={savingEmail} />}
          label={<Box><Typography variant="body1">{t('NotificationSettings.EMAIL_LABEL')}</Typography><Typography variant="caption" color="text.secondary">{t('NotificationSettings.EMAIL_HINT')}</Typography></Box>}
          labelPlacement="end"
          sx={NOTIFICATION_SETTINGS_FORM_CONTROL_SX}
        />
      </Box>

      <Divider />

      <Box sx={{ py: 2 }}>
        {iosNeedsInstall && <Alert severity="info" sx={NOTIFICATION_SETTINGS_HINT_ALERT_SX}>{t('NotificationSettings.IOS_HINT')}</Alert>}
        {!pushSupported && !iosNeedsInstall && <Alert severity="warning" sx={NOTIFICATION_SETTINGS_HINT_ALERT_SX}>{t('NotificationSettings.PUSH_NOT_SUPPORTED')}</Alert>}
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
          sx={NOTIFICATION_SETTINGS_FORM_CONTROL_SX}
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
          sx={NOTIFICATION_SETTINGS_PUSH_CONTROL_SX}
        />
      </Box>

      <Divider />
      <Box sx={{ py: 2 }}>
        {matrixLoading && <Typography role="status">{t('NotificationSettings.MATRIX_LOADING')}</Typography>}
        {matrixError && <Alert severity="error" action={<Button onClick={refreshMatrix}>{t('NotificationSettings.RETRY')}</Button>}>{matrixError}</Alert>}
        {matrix.length > 0 && <Typography variant="subtitle2" gutterBottom>{t('NotificationSettings.MATRIX_TITLE')}</Typography>}
        {matrix.map((row) => (
          <Box key={`${row.category}:${row.channel}`} sx={{ py: 1, overflowWrap: 'anywhere' }}>
            <FormControl component="fieldset" aria-busy={Boolean(savingPair)}>
              <FormLabel component="legend">{row.label_key ? t(row.label_key, { defaultValue: row.label }) : row.label}</FormLabel>
              <RadioGroup row value={row.choice} onChange={(event) => handleChoice(row, event.target.value)}>
                <FormControlLabel value="inherit" control={<Radio />} label={t('NotificationSettings.CHOICE_INHERIT')} />
                <FormControlLabel value="enabled" control={<Radio />} label={t('NotificationSettings.CHOICE_ON')} />
                <FormControlLabel value="disabled" control={<Radio />} label={t('NotificationSettings.CHOICE_OFF')} />
              </RadioGroup>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              {t(row.effective_enabled ? 'NotificationSettings.EFFECTIVE_ON' : 'NotificationSettings.EFFECTIVE_OFF')}
            </Typography>
            {row.channel === 'push' && !pushSubscribed && <Typography variant="body2" color="text.secondary">{t('NotificationSettings.PUSH_DEVICE_UNAVAILABLE')}</Typography>}
            {savingPair === `${row.category}:${row.channel}` && <Typography role="status">{t('NotificationSettings.MATRIX_SAVING')}</Typography>}
          </Box>
        ))}
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
                  <Alert key={notificationType.key} severity="warning" sx={NOTIFICATION_SETTINGS_REACH_ALERT_SX}>
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
                sx={NOTIFICATION_SETTINGS_CATEGORY_CONTROL_SX}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export default NotificationSettings;
