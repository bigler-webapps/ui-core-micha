import { useEffect, useState } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import InboxIcon from '@mui/icons-material/Inbox';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { AuthContext } from '../src/auth/AuthContext';
import { MobileBottomNav } from '../src/components/MobileBottomNav';
import { BarChart } from '../src/components/charts/BarChart';
import { ChartFrame } from '../src/components/charts/ChartFrame';
import { LineChart } from '../src/components/charts/LineChart';
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

const MOBILE_NAV_DESTINATIONS = [
  { route: '/triage', label: 'Triage', icon: InboxIcon, badgeCount: 7 },
  { route: '/board', label: 'Board', icon: ViewKanbanIcon, badgeCount: 3 },
  { route: '/chat', label: 'Chat', icon: ChatBubbleOutlineIcon },
  { route: '/status', label: 'Status', icon: ScheduleIcon },
  { route: '/more', label: 'Mehr', icon: MoreHorizIcon, emphasis: true },
];

const PLAIN_MOBILE_NAV_THEME = createTheme();

function MobileBottomNavEntry() {
  const [activeRoute, setActiveRoute] = useState('/triage');

  return (
    <Box sx={{ minHeight: 180 }}>
      <Typography variant="h6">Mobile bottom navigation</Typography>
      <Typography color="text.secondary">
        The baseline and plain-MUI variants use the same five destinations. Both keep their edge
        and evenly divided actions; their label and icon density may differ.
      </Typography>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">createAppTheme baseline</Typography>
          <MobileBottomNav
            destinations={MOBILE_NAV_DESTINATIONS}
            activeRoute={activeRoute}
            onNavigate={setActiveRoute}
            hideAbove="xl"
            sx={{ position: 'relative', width: '100%', mt: 1 }}
          />
        </Box>
        <ThemeProvider theme={PLAIN_MOBILE_NAV_THEME}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2">Plain createTheme</Typography>
            <MobileBottomNav
              destinations={MOBILE_NAV_DESTINATIONS}
              activeRoute={activeRoute}
              onNavigate={setActiveRoute}
              hideAbove="xl"
              sx={{ position: 'relative', width: '100%', mt: 1 }}
            />
          </Box>
        </ThemeProvider>
      </Stack>
    </Box>
  );
}

function BarChartEntry() {
  return (
    <ChartFrame title="Monthly cases" subtitle="Standalone BarChart entry" minHeight={360}>
      <BarChart {...barChartFixture} xAxisLabel="Month" yAxisLabel="Cases" height={320} />
    </ChartFrame>
  );
}

function StatusChip({ label, tone }) {
  return (
    <Chip
      label={label}
      sx={{ bgcolor: `${tone}.fill`, color: `${tone}.fillText` }}
    />
  );
}

const MUI_STATUS_TONES = ['success', 'warning', 'error', 'info'];

function ThemeBaselineEntry() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" gutterBottom>Shared theme baseline</Typography>
        <Typography color="text.secondary">
          Real MUI surfaces rendered through createAppTheme.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        <Button variant="contained">Contained</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
        <Tooltip title="More actions">
          <IconButton aria-label="More actions"><MoreVertIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Divider />

      <Stack direction="column" spacing={2} sx={{ '@container (min-width: 900px)': { flexDirection: 'row' } }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">Paper</Typography>
          <Typography variant="body2" color="text.secondary">Outlined, with no resting shadow.</Typography>
        </Paper>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6">Card</Typography>
            <Typography variant="body2" color="text.secondary">Eight-pixel surface radius.</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip label="Default chip" variant="outlined" />
        <StatusChip label="Success" tone="success" />
        <StatusChip label="Warning" tone="warning" />
        <StatusChip label="Critical" tone="error" />
        <StatusChip label="Info" tone="info" />
        <StatusChip label="Stale" tone="stale" />
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">MUI status colours using palette main</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {MUI_STATUS_TONES.map((tone) => (
            <Button key={tone} color={tone} variant="contained">{tone}</Button>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {MUI_STATUS_TONES.map((tone) => (
            <Chip key={tone} color={tone} label={tone} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {MUI_STATUS_TONES.map((tone) => (
            <Alert key={tone} severity={tone} variant="filled">{tone}</Alert>
          ))}
        </Stack>
      </Stack>

      <Stack direction="column" spacing={2} alignItems="flex-start" sx={{ '@container (min-width: 900px)': { flexDirection: 'row' } }}>
        <TextField label="Project name" defaultValue="Baseline harness" fullWidth />
        <FormControl fullWidth>
          <InputLabel id="baseline-status-label">Status</InputLabel>
          <Select labelId="baseline-status-label" label="Status" defaultValue="active">
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="stale">Stale</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel control={<Checkbox defaultChecked />} label="Enabled" />
      </Stack>

      <Stack spacing={1}>
        <Alert severity="success">Success status on its own tint.</Alert>
        <Alert severity="warning">Warning status on its own tint.</Alert>
        <Alert severity="error">Critical status on its own tint.</Alert>
        <Alert severity="info">Info status using MUI's info hue family.</Alert>
        <Alert icon={false} sx={{ bgcolor: 'stale.bg', color: 'stale.text' }}>Stale freshness status.</Alert>
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Application</TableCell><TableCell>Status</TableCell><TableCell align="right">Cases</TableCell></TableRow></TableHead>
          <TableBody>
            <TableRow><TableCell>hram</TableCell><TableCell>Healthy</TableCell><TableCell align="right">128</TableCell></TableRow>
            <TableRow><TableCell>jg-ferien</TableCell><TableCell>Stale</TableCell><TableCell align="right">42</TableCell></TableRow>
          </TableBody>
        </Table>
      </Paper>

      <ChartFrame title="Series ramp" subtitle="Six categorical baseline colours" minHeight={360}>
        <BarChart
          xAxis={[{ scaleType: 'band', data: ['Baseline'] }]}
          series={[
            { label: 'Series 1', data: [8] },
            { label: 'Series 2', data: [12] },
            { label: 'Series 3', data: [10] },
            { label: 'Series 4', data: [16] },
            { label: 'Series 5', data: [13] },
            { label: 'Series 6', data: [9] },
          ]}
          xAxisLabel="Series"
          yAxisLabel="Cases"
          height={320}
        />
      </ChartFrame>

      <Stack
        direction="column"
        spacing={2}
        sx={{ '@container (min-width: 900px)': { flexDirection: 'row' } }}
      >
        <ChartFrame title="Chart defaults" subtitle="No caller chrome props" minHeight={360}>
          <LineChart
            xAxis={[{ data: ['Jan', 'Feb', 'Mar', 'Apr'] }]}
            series={[
              { label: 'Observed', data: [8, 12, 10, 16] },
              { label: 'Forecast', data: [7, 11, 13, 15] },
            ]}
            xAxisLabel="Month"
            yAxisLabel="Cases"
            height={320}
          />
        </ChartFrame>
        <ChartFrame title="Caller overrides" subtitle="Tuned ticks, marks, grid and legend" minHeight={360}>
          <LineChart
            xAxis={[{
              data: ['Jan', 'Feb', 'Mar', 'Apr'],
              tickLabelStyle: { fontSize: 14, angle: -25 },
            }]}
            series={[
              { label: 'Observed', data: [8, 12, 10, 16], showMark: true },
              { label: 'Forecast', data: [7, 11, 13, 15], showMark: true },
            ]}
            xAxisLabel="Month"
            yAxisLabel="Cases"
            grid={{ vertical: true }}
            legendPosition={{ vertical: 'top', horizontal: 'end' }}
            height={320}
          />
        </ChartFrame>
      </Stack>

      <Stack
        direction="column"
        spacing={2}
        sx={{ '@container (min-width: 900px)': { flexDirection: 'row' } }}
      >
        <ChartFrame title="Default titleVariant" subtitle="h6, unchanged for existing callers" minHeight={160}>
          <Typography variant="body2" color="text.secondary">Panel body placeholder</Typography>
        </ChartFrame>
        <ChartFrame title="Dense panel title" subtitle="titleVariant=&quot;subtitle2&quot;" titleVariant="subtitle2" minHeight={160}>
          <Typography variant="body2" color="text.secondary">Panel body placeholder</Typography>
        </ChartFrame>
      </Stack>
    </Stack>
  );
}

function TimeSeriesChartEntry() {
  // Real API response from the live jg-ferien Aktivität bug (1-week range,
  // 4h granularity), pasted verbatim by the operator -- reproducing the
  // exact bucket_start/distinct_users/presence_hours combination.
  const buckets = [
    { bucket_start: '2026-08-05T08:00:00+00:00', distinct_users: 1, presence_hours: 0.0 },
    { bucket_start: '2026-08-05T12:00:00+00:00', distinct_users: 1, presence_hours: 0.0 },
    { bucket_start: '2026-08-05T16:00:00+00:00', distinct_users: 2, presence_hours: 0.17 },
    { bucket_start: '2026-08-05T20:00:00+00:00', distinct_users: 2, presence_hours: 0.09 },
    { bucket_start: '2026-08-06T04:00:00+00:00', distinct_users: 1, presence_hours: 0.05 },
    { bucket_start: '2026-08-06T08:00:00+00:00', distinct_users: 1, presence_hours: 0.05 },
    { bucket_start: '2026-08-06T12:00:00+00:00', distinct_users: 2, presence_hours: 0.01 },
    { bucket_start: '2026-08-06T20:00:00+00:00', distinct_users: 1, presence_hours: 0.01 },
    { bucket_start: '2026-08-07T00:00:00+00:00', distinct_users: 1, presence_hours: 0.01 },
    { bucket_start: '2026-08-07T04:00:00+00:00', distinct_users: 1, presence_hours: 0.03 },
    { bucket_start: '2026-08-07T08:00:00+00:00', distinct_users: 1, presence_hours: 0.03 },
  ];
  // Short, time-only labels: a verbose format (e.g. "08/05, 10:00 AM") can
  // trip a known, unfixed MUI X-Charts bug where insufficient measured
  // space collapses the ENTIRE tick label to an empty string instead of a
  // shortened one (mui/mui-x#18768, duplicate of #18399) -- confirmed live
  // in jg-ferien with its real DM Sans font metrics. Keep consumer labels
  // short regardless of range/granularity.
  function formatBucketLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const data = {
    xLabels: buckets.map((b) => formatBucketLabel(b.bucket_start)),
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
      defaultRange="1w"
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
  { id: 'theme-baseline', label: 'Theme / Shared baseline', Component: ThemeBaselineEntry },
  { id: 'mobile-bottom-nav', label: 'Navigation / Mobile bottom nav', Component: MobileBottomNavEntry },
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
