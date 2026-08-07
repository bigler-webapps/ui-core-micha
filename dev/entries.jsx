import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

import { AuthContext } from '../src/auth/AuthContext';
import { BarChart } from '../src/components/charts/BarChart';
import { ChartFrame } from '../src/components/charts/ChartFrame';
import { TimeSeriesChart } from '../src/components/charts/TimeSeriesChart';
import { NotificationBell } from '../src/notifications/NotificationBell';
import { NotificationsProvider } from '../src/notifications/NotificationsProvider';
import { useRealtime } from '../src/notifications/realtime';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { ConversationList } from '../src/messaging/ConversationList';
import { ConversationLaunchers } from '../src/messaging/ConversationLaunchers';
import { DirectMessageLauncher } from '../src/messaging/DirectMessageLauncher';
import { Thread } from '../src/messaging/Thread';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Composer } from '../src/messaging/Composer';
import { AttachmentList } from '../src/messaging/AttachmentList';
import { ReactionBar } from '../src/messaging/ReactionBar';
import { PollCard } from '../src/messaging/PollCard';
import { MessagingScopeConfig } from '../src/messaging/MessagingScopeConfig';
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

function TimeSeriesChartEntry() {
  // Mirrors the live jg-ferien Aktivität bug: 24 hourly buckets (1-day
  // range), distinct_users (integer) on primary, presence_hours
  // (fractional) on a CHART-5 secondary axis.
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    distinct_users: [0, 1, 1, 2, 2, 1, 1, 1, 2, 1, 1, 1, 0, 0, 1, 1, 0, 1, 2, 1, 0, 1, 1, 1][hour],
    presence_hours: [0, 0.02, 0.09, 1.8, 0.85, 0.55, 0.52, 0, 0.3, 0.1, 0.05, 0.02, 0, 0, 0.12, 0.08, 0, 0.02, 1.1, 0.4, 0, 0.1, 0.12, 0.22][hour],
  }));
  const data = {
    xLabels: buckets.map((b) => `${String(b.hour).padStart(2, '0')}:00`),
    series: [
      { key: 'distinct_users', label: 'Eindeutige Nutzer', data: buckets.map((b) => b.distinct_users) },
      { key: 'presence_hours', label: 'Anwesenheitszeit (Std.)', data: buckets.map((b) => b.presence_hours), axis: 'secondary' },
    ],
  };
  return (
    <TimeSeriesChart
      title="Aktivität"
      xAxisLabel="Zeit"
      yAxisLabel="Anzahl"
      secondaryYAxisLabel="Stunden"
      data={data}
      defaultRange="1d"
    />
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
    : ({ results: [
        { id: 12, kind: 'group', title: 'Support group', unread_count: 1, last_message_at: '2026-07-31T09:00:00Z', last_message: { excerpt: 'Can someone help?' } },
        // Row 42 (MSG-3d): two managed conversations, distinguishable only via
        // external_key — ucm renders whatever ConversationListEntry's
        // resolveManagedLabel resolver below returns, never the raw value.
        { id: 30, kind: 'managed', external_key: 'all', last_message_at: '2026-07-29T09:00:00Z' },
        { id: 31, kind: 'managed', external_key: 'team', last_message_at: '2026-07-28T09:00:00Z' },
      ], next_cursor: 'signed-next-page' }),
  // GET conversations/{id}/messages/ returns roots only (design §REST); replies
  // come from GET messages/{root_id}/thread/ (listThread below), never mixed in here.
  // reply_count with no thread_last_read_at (MSG-3d row 27): the unread-reply
  // marker on the thread toggle should render visibly by default here.
  listMessages: async (conversationId, { cursor } = {}) => cursor
    ? ({ results: [{ id: 42, conversation_id: conversationId, body: 'An older message', created_at: '2026-07-30T09:00:00Z', sender: { id: 2, display_name: 'Alex' } }], next_cursor: null })
    : ({ results: [
        { id: 44, conversation_id: conversationId, body: 'Hallo', created_at: '2026-07-31T09:00:00Z', sender: { id: 1, display_name: 'Harness user' }, reply_count: 1, last_reply_at: '2026-07-31T09:05:00Z', thread_last_read_at: null },
        { id: 46, conversation_id: conversationId, body: 'A short incoming message', created_at: '2026-07-31T09:01:00Z', sender: { id: 2, display_name: 'Alex' } },
        { id: 47, conversation_id: conversationId, body: 'averylongunbrokensinglemessagetokenthatshouldwrapcleanlyonasmallviewportandatbrowserzoomwithoutforcingthebubblepastitscap', created_at: '2026-07-31T09:02:00Z', sender: { id: 2, display_name: 'Alex' } },
        { id: 48, conversation_id: conversationId, kind: 'announcement', title: 'Schedule update', body: 'The meeting starts at 18:30.', link_target: '/events/12', created_at: '2026-07-31T09:03:00Z', sender: { id: 2, display_name: 'Alex' } },
        { id: 49, conversation_id: conversationId, kind: 'poll', body: 'Poll', poll: { id: 8, question: 'Where should we meet?', options: [{ id: 1, text: 'Library', vote_count: 2 }, { id: 2, text: 'Café', vote_count: 3 }], allow_multiple: false }, created_at: '2026-07-31T09:04:00Z', sender: { id: 2, display_name: 'Alex' } },
        { id: 50, conversation_id: conversationId, body: 'Attached notes', attachments: [{ id: 5, filename: 'notes.pdf', content_type: 'application/pdf' }], created_at: '2026-07-31T09:05:00Z', sender: { id: 1, display_name: 'Harness user' } },
      ], next_cursor: 'signed-older-page' }),
  listThread: async (rootId) => ({ results: [{ id: 45, reply_to: rootId, body: 'A reply', created_at: '2026-07-31T09:05:00Z', sender: { display_name: 'Sam' } }], next_cursor: null }),
  getReadStatus: async () => ({ all_read: false, delivered_count: 2 }),
  getUnreadCount: async () => ({ unread_count: 1, by_conversation: { 12: 1 } }),
  markConversationRead: async () => ({}),
  // The response's last_read_at (MSG-3d) maps onto the root's own
  // thread_last_read_at cache field — clicking "Show replies" in this harness
  // should make the unread-reply marker disappear.
  markThreadRead: async () => ({ last_read_at: new Date().toISOString() }),
  archiveConversation: async (id, archived) => ({ id, archived }),
  patchConversationPreferences: async (id, patch) => ({ id, ...patch }),
  createGroupConversation: async (payload) => ({ id: 20, title: payload.title || 'Opened group', kind: 'group' }),
  createDirectConversation: async (payload) => ({ id: 21, title: `Direct message with ${payload.target_user_id}`, kind: 'direct' }),
  createBroadcastConversation: async () => ({ id: 21, title: 'Announcements', kind: 'broadcast' }),
  createMessage: async (conversationId, payload) => ({ id: 46, conversation_id: conversationId, body: payload.body, client_request_id: payload.client_request_id, sender: { display_name: 'Harness user' } }),
  uploadAttachments: async (conversationId, formData) => ({ id: 47, conversation_id: conversationId, body: formData.get('body'), attachments: [{ id: 5, filename: 'example.png', content_type: 'image/png' }] }),
  getAttachment: async () => new Blob(['harness']),
  getAttachmentThumbnail: async () => new Blob(['harness'], { type: 'image/png' }),
  addReaction: async (messageId, emoji) => ({ reactions: [{ emoji, count: 1, reacted: true }] }),
  removeReaction: async () => ({ reactions: [] }),
  createPoll: async (conversationId, payload) => ({ id: 48, conversation_id: conversationId, poll: { id: 8, question: payload.question, options: payload.options.map((text, index) => ({ id: index + 1, text, vote_count: 0 })), allow_multiple: payload.allow_multiple } }),
  votePoll: async (pollId, optionIds) => ({ poll: { id: pollId, question: 'Where should we meet?', options: [{ id: 1, text: 'Library', vote_count: optionIds.includes(1) ? 1 : 0, selected: optionIds.includes(1) }, { id: 2, text: 'Café', vote_count: optionIds.includes(2) ? 1 : 0, selected: optionIds.includes(2) }], allow_multiple: false } }),
  closePoll: async (pollId) => ({ poll: { id: pollId, question: 'Where should we meet?', options: [{ id: 1, text: 'Library', vote_count: 2 }, { id: 2, text: 'Café', vote_count: 3 }], closed_at: new Date().toISOString() } }),
  getConversationConfig: async () => ({ dm_policy: 'all', group_chat_enabled: true, everyone_can_post: true }),
  patchConversationConfig: async (_id, patch) => ({ dm_policy: 'all', group_chat_enabled: true, everyone_can_post: true, ...patch }),
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
        resolveManagedLabel={(conversation) => (conversation.external_key === 'all' ? 'Everyone' : conversation.external_key === 'team' ? 'My team' : null)}
      />
      {opened && <Typography sx={{ mt: 2 }}>Opened: {opened.title}</Typography>}
    </MessagingProvider>
  );
}

function ThreadEntry() { return <AuthContext.Provider value={{ user: { id: 1, display_name: 'Harness user' } }}><MessagingProvider api={messagingHarnessApi} activeConversationId={12}><Thread conversationId={12} onAnnouncementLink={(target) => window.alert(`Open ${target}`)} /></MessagingProvider></AuthContext.Provider>; }
function MessageBubbleEntry() { return <AuthContext.Provider value={{ user: { id: 1, display_name: 'Harness user' } }}><MessagingProvider api={messagingHarnessApi} active={false}><Stack spacing={1} alignItems="stretch"><MessageBubble message={{ id: 44, body: 'Hallo', sender: { id: 1, display_name: 'Harness user' }, created_at: '2026-07-31T09:00:00Z', reactions: [{ emoji: '👍', count: 1, reacted: false }] }} conversation={{ kind: 'group' }} onReply={() => window.alert('Reply requested')}><ReadTicks messageId={44} conversation={{ kind: 'group' }} /></MessageBubble><MessageBubble message={{ id: 45, body: 'Incoming direct message', sender: { id: 2, display_name: 'Alex' }, created_at: '2026-07-31T09:01:00Z' }} conversation={{ kind: 'direct' }} onReply={() => window.alert('Reply requested')} /></Stack></MessagingProvider></AuthContext.Provider>; }
function ConversationLaunchersEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><ConversationLaunchers groupLaunchers={[{ id: 'volunteers', label: 'Open volunteers group', payload: { title: 'Volunteers', participant_ids: [1, 2] } }]} broadcastLauncher={{ label: 'Open announcements', payload: { scope: { kind: 'global' } } }} onOpen={(conversation) => window.alert(`Opened: ${conversation.title}`)} /></MessagingProvider>; }
function DirectMessageLauncherEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><DirectMessageLauncher candidates={[{ id: 2, display_name: 'Alex' }, { id: 3, display_name: 'Sam' }]} onOpen={(conversation) => window.alert(`Opened: ${conversation.title}`)} /></MessagingProvider>; }
function ReadTicksEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><ReadTicks messageId={44} conversation={{ id: 12, kind: 'group' }} /></MessagingProvider>; }
function ComposerEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><Composer conversationId={12} replyTarget={{ id: 44, sender: { display_name: 'Alex' } }} allowAnnouncement linkTarget="/events/12/info" /></MessagingProvider>; }
function AttachmentListEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><AttachmentList attachments={[{ id: 5, filename: 'example.png', content_type: 'image/png' }, { id: 6, filename: 'notes.pdf', content_type: 'application/pdf' }]} /></MessagingProvider>; }
function ReactionBarEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><ReactionBar message={{ id: 44, reactions: [{ emoji: '👍', count: 2, reacted: false }, { emoji: '🎉', count: 1, reacted: true }] }} /></MessagingProvider>; }
function PollCardEntry() { return <AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={messagingHarnessApi} active={false}><PollCard message={{ id: 48, poll: { id: 8, question: 'Where should we meet?', options: [{ id: 1, text: 'Library', vote_count: 2 }, { id: 2, text: 'Café', vote_count: 3 }], allow_multiple: false, created_by: 1 }}} /></MessagingProvider></AuthContext.Provider>; }
function MessagingScopeConfigEntry() { return <MessagingProvider api={messagingHarnessApi} active={false}><MessagingScopeConfig conversationId={12} /></MessagingProvider>; }

export const entries = [
  { id: 'notification-bell', label: 'Notifications / Bell', Component: NotificationBellEntry },
  { id: 'bar-chart', label: 'Charts / BarChart', Component: BarChartEntry },
  { id: 'time-series-chart', label: 'Charts / TimeSeriesChart', Component: TimeSeriesChartEntry },
  { id: 'realtime-adapter', label: 'Transport / Realtime adapter', Component: RealtimeAdapterEntry },
  { id: 'messaging-provider', label: 'Messaging / Provider state', Component: MessagingProviderEntry },
  { id: 'messaging-conversation-list', label: 'Messaging / Conversation list', Component: ConversationListEntry },
  { id: 'messaging-thread', label: 'Messaging / Thread', Component: ThreadEntry },
  { id: 'messaging-message-bubble', label: 'Messaging / Message bubble', Component: MessageBubbleEntry },
  { id: 'messaging-conversation-launchers', label: 'Messaging / Conversation launchers', Component: ConversationLaunchersEntry },
  { id: 'messaging-direct-message-launcher', label: 'Messaging / Direct message launcher', Component: DirectMessageLauncherEntry },
  { id: 'messaging-read-ticks', label: 'Messaging / Read ticks', Component: ReadTicksEntry },
  { id: 'messaging-composer', label: 'Messaging / Composer', Component: ComposerEntry },
  { id: 'messaging-attachment-list', label: 'Messaging / Attachment list', Component: AttachmentListEntry },
  { id: 'messaging-reaction-bar', label: 'Messaging / Reaction bar', Component: ReactionBarEntry },
  { id: 'messaging-poll-card', label: 'Messaging / Poll card', Component: PollCardEntry },
  { id: 'messaging-scope-config', label: 'Messaging / Scope config', Component: MessagingScopeConfigEntry },
];
