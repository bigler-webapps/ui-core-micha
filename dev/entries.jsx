import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

import { AuthContext } from '../src/auth/AuthContext';
import { BarChart } from '../src/components/charts/BarChart';
import { ChartFrame } from '../src/components/charts/ChartFrame';
import { NotificationBell } from '../src/notifications/NotificationBell';
import { NotificationsProvider } from '../src/notifications/NotificationsProvider';
import { useRealtime } from '../src/notifications/realtime';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { ConversationList } from '../src/messaging/ConversationList';
import { barChartFixture } from './fixtures';
import { useMockTransport } from './mockTransport';

function NotificationBellEntry() {
  return (
    <AuthContext.Provider value={{ user: { id: 1, username: 'harness-user' } }}>
      <NotificationsProvider wsUrlBase="ws://127.0.0.1:9">
        <NotificationBell resolveLink={(link) => window.alert(`Navigate to ${link}`)} />
      </NotificationsProvider>
    </AuthContext.Provider>
  );
}

function BarChartEntry() {
  return (
    <ChartFrame title="Monthly cases" subtitle="Standalone BarChart entry" minHeight={360}>
      <BarChart {...barChartFixture} xAxisLabel="Month" yAxisLabel="Cases" height={320} />
    </ChartFrame>
  );
}

function RealtimeAdapterEntry() {
  const { subscribe } = useRealtime();
  const transport = useMockTransport();
  const [frames, setFrames] = useState([]);
  useEffect(() => subscribe('notification', (frame) => setFrames((current) => [frame, ...current])), [subscribe]);
  return (
    <Stack spacing={2}>
      <Typography>The mock provider accepts manually dispatched realtime frames without a socket.</Typography>
      <Button variant="contained" onClick={() => transport.dispatch({ envelope: 'notification', type: 'notification.created', notification_id: Date.now() })}>
        Dispatch notification frame
      </Button>
      <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'action.hover', overflow: 'auto' }}>
        {JSON.stringify(frames, null, 2)}
      </Box>
    </Stack>
  );
}

const messagingHarnessApi = {
  listConversations: async ({ cursor } = {}) => cursor
    ? ({ results: [{ id: 13, title: 'Archived planning', last_message_at: '2026-07-30T09:00:00Z' }], next_cursor: null })
    : ({ results: [{ id: 12, title: 'Support group', unread_count: 1, last_message_at: '2026-07-31T09:00:00Z', last_message: { body: 'Can someone help?' } }], next_cursor: 'signed-next-page' }),
  listMessages: async (conversationId) => ({ results: [{ id: 44, conversation_id: conversationId, body: 'Initial message' }], next_cursor: null }),
  getUnreadCount: async () => ({ unread_count: 1, by_conversation: { 12: 1 } }),
  archiveConversation: async (id, archived) => ({ id, archived }),
  patchConversationPreferences: async (id, patch) => ({ id, ...patch }),
  createGroupConversation: async (payload) => ({ id: 20, title: payload.title || 'Opened group', kind: 'group' }),
  createBroadcastConversation: async () => ({ id: 21, title: 'Announcements', kind: 'broadcast' }),
};

function MessagingStateDump() {
  const { cache } = useMessaging();
  const transport = useMockTransport();
  return (
    <Stack spacing={2}>
      <Typography>Provider-only entry: REST seed, a simulated messaging frame, and a simulated Layer-1 reconnect.</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => transport.dispatch({ envelope: 'messaging', type: 'message', event_id: `harness-${Date.now()}`, conversation_id: 12, message: { id: Date.now(), body: 'Live message' } })}>Dispatch messaging frame</Button>
        <Button variant="outlined" onClick={() => transport.dispatchReconnect()}>Simulate reconnect</Button>
      </Stack>
      <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'action.hover', overflow: 'auto' }}>{JSON.stringify(cache, null, 2)}</Box>
    </Stack>
  );
}

function MessagingProviderEntry() {
  return <MessagingProvider api={messagingHarnessApi} activeConversationId={12}><MessagingStateDump /></MessagingProvider>;
}

function ConversationListEntry() {
  const [opened, setOpened] = useState(null);
  return (
    <MessagingProvider api={messagingHarnessApi}>
      <ConversationList
        groupLaunchers={[{ id: 'volunteers', label: 'Open volunteers group', payload: { title: 'Volunteers', participant_ids: [1, 2] } }]}
        broadcastLauncher={{ label: 'Open announcements', payload: { scope: { kind: 'global' } } }}
        onOpen={(conversation) => setOpened(conversation)}
      />
      {opened && <Typography sx={{ mt: 2 }}>Opened: {opened.title}</Typography>}
    </MessagingProvider>
  );
}

export const entries = [
  { id: 'notification-bell', label: 'Notifications / Bell', Component: NotificationBellEntry },
  { id: 'bar-chart', label: 'Charts / BarChart', Component: BarChartEntry },
  { id: 'realtime-adapter', label: 'Transport / Realtime adapter', Component: RealtimeAdapterEntry },
  { id: 'messaging-provider', label: 'Messaging / Provider state', Component: MessagingProviderEntry },
  { id: 'messaging-conversation-list', label: 'Messaging / Conversation list', Component: ConversationListEntry },
];
