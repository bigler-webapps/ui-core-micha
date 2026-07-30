import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { WizardDialogShell } from '../onboarding/WizardDialogShell';
import { useNotifications } from './NotificationsProvider';
import { DEFAULT_ENVELOPE, useRealtime } from './realtime';

function PopupStepComponent({ onDismiss, ctx }) {
  const { t } = useTranslation();
  const content = ctx?.content || {};

  return (
    <Stack spacing={2}>
      {content.body_key && (
        <Typography variant="body1">{t(content.body_key, content.params || {})}</Typography>
      )}
      <Button onClick={onDismiss} sx={{ alignSelf: 'flex-end' }}>
        {t('PopupSurface.CLOSE')}
      </Button>
    </Stack>
  );
}

const POPUP_STEP = { blocking: false, Component: PopupStepComponent };

/**
 * Renders popup-eligible notifications (NOTIF-12) through the onboarding
 * wizard's dialog shell, reusing only the renderer (design D-F7) — status
 * lives on NotificationRecipient via the existing feed/mark path, never in
 * the onboarding progress store.
 *
 * Deliberately session-live only: it watches the raw realtime stream for
 * `channel === "popup"` messages rather than the already-seeded feed list,
 * since the feed carries no per-channel discriminator (see NotificationsProvider).
 */
export function PopupSurface() {
  const { t } = useTranslation();
  const { markSeen, markDismissed } = useNotifications();
  const { subscribe } = useRealtime();
  const onboarding = useOnboarding();
  const [queue, setQueue] = useState([]);
  const seenIdsRef = useRef(new Set());

  const handleRealtimeMessage = useCallback((data) => {
    if (data.type === 'notification.status') return;
    if (data.channel !== 'popup') return;
    setQueue((previous) => {
      if (previous.some((item) => item.notification_id === data.notification_id)) return previous;
      return [...previous, {
        notification_id: data.notification_id,
        // recipient_id is the id feed/mark/ actually resolves against
        // (NotificationRecipient.pk, not Notification.pk). Fall back to
        // notification_id only for an older dcm that predates it — matching
        // NotificationsProvider's own normalizeNotificationPush precedent.
        markId: data.recipient_id ?? data.notification_id,
        content: data.content || {},
      }];
    });
  }, []);

  useEffect(() => subscribe(DEFAULT_ENVELOPE, handleRealtimeMessage), [subscribe, handleRealtimeMessage]);

  // Any active onboarding step — blocking or not — must win: OnboardingWizard
  // renders its own dialog for as long as onboarding.activeSteps is non-empty,
  // and two independent MUI Dialogs must never be mounted at once.
  const onboardingActive = Boolean(onboarding?.activeSteps?.length);
  const activePopup = queue[0];

  useEffect(() => {
    if (!activePopup || onboardingActive) return;
    if (activePopup.markId == null) return;
    if (seenIdsRef.current.has(activePopup.notification_id)) return;
    seenIdsRef.current.add(activePopup.notification_id);
    markSeen([activePopup.markId]);
  }, [activePopup, onboardingActive, markSeen]);

  const dismissActivePopup = useCallback(() => {
    if (!activePopup) return;
    if (activePopup.markId != null) markDismissed([activePopup.markId]);
    setQueue((previous) => previous.filter((item) => item.notification_id !== activePopup.notification_id));
  }, [activePopup, markDismissed]);

  if (!activePopup || onboardingActive) return null;

  return (
    <WizardDialogShell
      step={POPUP_STEP}
      stepIndex={0}
      total={1}
      onComplete={dismissActivePopup}
      onDismiss={dismissActivePopup}
      ctx={{ content: activePopup.content }}
      title={activePopup.content.title_key
        ? t(activePopup.content.title_key, activePopup.content.params || {})
        : t('PopupSurface.TITLE')}
    />
  );
}

export default PopupSurface;
