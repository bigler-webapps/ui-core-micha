import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

/**
 * Host apps provide launchable scopes. This component owns the REST transition
 * that turns one into a normalized conversation, but deliberately does not
 * discover groups itself: that is app-specific scope-picker data.
 */
export function ConversationLaunchers({ groupLaunchers = [], broadcastLauncher, autoOpenBroadcast = false, onOpen }) {
  const { t } = useTranslation();
  const { openGroupConversation, openBroadcastConversation } = useMessaging();
  const [error, setError] = useState(null);
  const autoOpened = useRef(false);

  const open = async (kind, payload) => {
    setError(null);
    try {
      const conversation = kind === 'broadcast'
        ? await openBroadcastConversation(payload)
        : await openGroupConversation(payload);
      onOpen?.(conversation);
    } catch {
      setError(t('MessagingLaunchers.OPEN_ERROR'));
    }
  };

  useEffect(() => {
    if (!autoOpenBroadcast || !broadcastLauncher || autoOpened.current) return;
    autoOpened.current = true;
    open('broadcast', broadcastLauncher.payload ?? broadcastLauncher);
  }, [autoOpenBroadcast, broadcastLauncher]); // one intentional auto-open per mounted launcher

  return (
    <Stack spacing={1}>
      {broadcastLauncher && !autoOpenBroadcast && (
        <Button variant="outlined" onClick={() => open('broadcast', broadcastLauncher.payload ?? broadcastLauncher)}>
          {broadcastLauncher.label || t('MessagingLaunchers.OPEN_BROADCAST')}
        </Button>
      )}
      {groupLaunchers.map((launcher) => (
        <Button key={launcher.id ?? launcher.label} variant="outlined" onClick={() => open('group', launcher.payload ?? launcher)}>
          {launcher.label || t('MessagingLaunchers.OPEN_GROUP')}
        </Button>
      ))}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
