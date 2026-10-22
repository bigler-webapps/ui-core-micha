import { useEffect, useMemo, useState } from 'react';
import { ChatComposer } from '../src/chat/ChatComposer';
import { ModelPicker } from '../src/chat/ModelPicker';
import { ReceiptCaptureCard } from '../src/receipts/ReceiptCaptureCard';
import { OperatorOverview } from '../src/billing/OperatorOverview';
import { BillingAccessCell } from '../src/billing/BillingAccessCell';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { createUiCoreTranslations } from '../src/i18n/uiCoreTranslations';
import { SetupWizardShell } from '../src/onboarding/SetupWizardShell';
import { SignUpContent } from '../src/components/SignUpContent';
import { SignupConfirmContent } from '../src/components/SignupConfirmContent';
import { LoginContent } from '../src/components/LoginContent';
import { ProfileStepContent } from '../src/components/ProfileStepContent';
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

// Setup wizard (UCM-AUTH-14): the shell with the real account and profile
// components, in informal German, against the harness transport (see
// mockTransport.jsx). Open `#setup-wizard` for the bare entry at the browser's
// own viewport. Step labels and titles are host copy, as in a consuming app.
const setupTranslations = createUiCoreTranslations({ germanVariant: 'informal' });
const setupI18n = i18next.createInstance();
setupI18n.init({
  lng: 'de',
  fallbackLng: 'de',
  resources: { de: { translation: Object.fromEntries(Object.entries(setupTranslations).map(([key, value]) => [key, value.de])) } },
  interpolation: { escapeValue: false },
});

const SETUP_STEPS = ['Konto', 'Profil', 'Projekt', 'Daten', 'Zugang', 'Abschluss'].map((label, index) => ({ id: `step-${index}`, label }));
const SETUP_AUTH_METHODS = {
  signup_modes: ['self_signup_open'],
  social_login: true,
  social_providers: ['google', 'microsoft'],
  password_login: true,
  password_reset: true,
};
const SETUP_STATES = [
  ['account', 'Konto'],
  ['confirmation', 'Passwort'],
  ['login', 'Anmeldung'],
  ['profile', 'Profil'],
];

function SetupWizardEntry() {
  const [state, setState] = useState('account');
  const [sentTo, setSentTo] = useState('');
  const [signUpRound, setSignUpRound] = useState(0);
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [completed, setCompleted] = useState('');
  const signedIn = state === 'profile';
  const auth = useMemo(() => ({
    user: signedIn ? setupHarnessUser : null,
    loading: false,
    login: () => {},
    authMethods: SETUP_AUTH_METHODS,
  }), [signedIn]);

  const views = {
    account: {
      title: sentTo ? 'E-Mail bestätigen' : 'Konto anlegen',
      description: sentTo || undefined,
      content: <SignUpContent key={signUpRound} showProviders continuation="/setup" onSubmitted={setSentTo} />,
      // Changing the email remounts the content with an empty form.
      onBack: sentTo ? () => { setSentTo(''); setSignUpRound((round) => round + 1); } : undefined,
      backLabel: 'E-Mail ändern',
    },
    confirmation: {
      title: 'Passwort festlegen',
      content: <SignupConfirmContent token="harness-token" onSuccess={() => setState('login')} />,
      onBack: () => setState('account'),
    },
    login: {
      title: 'Mit dem neuen Konto anmelden',
      content: <LoginContent continuation="/setup" onSuccess={() => setState('profile')} />,
    },
    profile: {
      title: 'Profil vervollständigen',
      description: `${setupHarnessUser.email} · E-Mail`,
      content: <ProfileStepContent formId="setup-profile" termsEnabled draft={profileDraft} onDraftChange={setProfileDraft} onBusyChange={setProfileBusy} onComplete={() => setCompleted('Profil gespeichert')} />,
      onBack: () => setState('account'),
      primaryForm: 'setup-profile',
      primaryLabel: 'Weiter zum Projekt',
    },
  };
  const view = views[state];

  return (
    <I18nextProvider i18n={setupI18n}>
      <AuthContext.Provider value={auth}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 2 }} aria-label="Harness state">
          {SETUP_STATES.map(([key, label]) => (
            <Button key={key} size="small" variant={state === key ? 'contained' : 'outlined'} onClick={() => setState(key)}>{label}</Button>
          ))}
          {completed && <Typography role="status" variant="body2">{completed}</Typography>}
        </Stack>
        <SetupWizardShell
          steps={SETUP_STEPS}
          currentStepId={signedIn ? 'step-1' : 'step-0'}
          completedStepIds={signedIn ? ['step-0'] : []}
          reachableStepIds={signedIn ? ['step-0'] : []}
          onSelectStep={(id) => setState(id === 'step-1' ? 'profile' : 'account')}
          title={view.title}
          description={view.description}
          onBack={view.onBack}
          backLabel={view.backLabel}
          primaryForm={view.primaryForm}
          primaryLabel={view.primaryLabel}
          busy={signedIn && profileBusy}
        >
          {view.content}
        </SetupWizardShell>
      </AuthContext.Provider>
    </I18nextProvider>
  );
}
import { MobileBottomNav } from '../src/components/MobileBottomNav';
import { SectionNav } from '../src/layout/SectionNav';
import { BarChart } from '../src/components/charts/BarChart';
import { ChartFrame } from '../src/components/charts/ChartFrame';
import { LineChart } from '../src/components/charts/LineChart';
import { TimeSeriesChart } from '../src/components/charts/TimeSeriesChart';
import {
  ScatterChart,
  ScatterReferenceCurve,
  ScatterReferenceLine,
} from '../src/components/charts/ScatterChart';
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
import { setupHarnessUser, useMockTransport } from './mockTransport';

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

const SECTION_NAV_GROUPS = [
  {
    key: 'my-account',
    label: 'Mein Konto',
    items: [
      { key: 'profile', label: 'Profil' },
      { key: 'security', label: 'Sicherheit' },
    ],
  },
  {
    key: 'management',
    label: 'Verwaltung',
    items: [
      { key: 'users', label: 'Benutzer' },
      { key: 'invite', label: 'Einladen' },
    ],
  },
  {
    key: 'help',
    label: 'Hilfe',
    items: [{ key: 'support', label: 'Support' }],
  },
  {
    key: 'more',
    label: 'Weitere',
    items: [{ key: 'notifications', label: 'Benachrichtigungen' }],
  },
];

function SectionNavEntry() {
  const [desktopKey, setDesktopKey] = useState('users');
  const [mobileKey, setMobileKey] = useState('users');

  return (
    <Stack spacing={2}>
      <Box>
        <Typography component="h1" variant="h5">Secondary section navigation</Typography>
        <Typography color="text.secondary">
          The promoted grouped shell in desktop and mobile modes, using the prototype's four groups.
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={4} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Desktop mode</Typography>
          <SectionNav
            mode="desktop"
            groups={SECTION_NAV_GROUPS}
            activeKey={desktopKey}
            onSelect={setDesktopKey}
          >
            <Paper variant="outlined" sx={{ p: 3, minHeight: 280 }}>
              <Typography variant="h6">{SECTION_NAV_GROUPS.flatMap((group) => group.items).find((item) => item.key === desktopKey)?.label}</Typography>
              <Typography color="text.secondary">Desktop content remains beside the sticky 280 px sidebar.</Typography>
            </Paper>
          </SectionNav>
        </Box>
        <Box sx={{ width: '100%', maxWidth: 375 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Mobile mode (375 px)</Typography>
          <SectionNav
            mode="mobile"
            groups={SECTION_NAV_GROUPS}
            activeKey={mobileKey}
            onSelect={setMobileKey}
            title="Bereich wechseln"
            triggerEyebrow="Bereich"
          >
            <Paper variant="outlined" sx={{ p: 3, minHeight: 220 }}>
              <Typography variant="h6">{SECTION_NAV_GROUPS.flatMap((group) => group.items).find((item) => item.key === mobileKey)?.label}</Typography>
              <Typography color="text.secondary">Open the trigger to reach every section in the drawer.</Typography>
            </Paper>
          </SectionNav>
        </Box>
      </Stack>
    </Stack>
  );
}

function BarChartEntry() {
  return (
    <ChartFrame title="Monthly cases" subtitle="Standalone BarChart entry" minHeight={360}>
      <BarChart {...barChartFixture} xAxisLabel="Month" yAxisLabel="Cases" height={320} />
    </ChartFrame>
  );
}

// THEME-11 rendered-verification fixture -- a genuinely LINEAR (not band/point) x-axis, whose
// last tick label sits AT the plot edge rather than centred like a band axis. Right margin is
// the one side deliberately trimmed less (16 vs 8) for exactly this case.
function LinearXAxisLineChartEntry() {
  return (
    <ChartFrame title="Linear x-axis (shape check)" subtitle="THEME-11: last tick label must not clip against the trimmed right margin" minHeight={360}>
      <LineChart
        xAxis={[{ scaleType: 'linear', data: [0, 250, 500, 750, 1000] }]}
        series={[{ label: 'Value', data: [4, 9, 6, 14, 11] }]}
        xAxisLabel="Budget"
        yAxisLabel="Outcome"
        height={320}
      />
    </ChartFrame>
  );
}

// THEME-10 rendered-verification fixture -- shape 1: allocation-performance's cloud + computed
// envelope curve + individually marked points, including a hollow status-quo marker and a
// continuous per-point colour the caller resolves itself (`getPointStyle`).
const ALLOCATION_POINTS = [
  { id: 'sq', x: 0, y: 0, equity: 0.5, isStatusQuo: true },
  { id: 'p1', x: 100000, y: 400, equity: 0.2 },
  { id: 'p2', x: 250000, y: 900, equity: 0.35 },
  { id: 'p3', x: 400000, y: 1500, equity: 0.55 },
  { id: 'p4', x: 550000, y: 1900, equity: 0.72 },
  { id: 'p5', x: 700000, y: 2100, equity: 0.9, isSelected: true },
];
const ALLOCATION_ENVELOPE = [
  { x: 0, y: 0 }, { x: 250000, y: 900 }, { x: 550000, y: 1900 }, { x: 700000, y: 2100 },
];

function equityColor(value) {
  // Stand-in continuous scale: the app owns this in reality (getColorScale); the preset only
  // needs to APPLY a resolved colour per point via getPointStyle.
  const hue = 220 - value * 160;
  return `hsl(${hue}, 55%, 45%)`;
}

function AllocationShapeScatterEntry() {
  return (
    <ChartFrame title="Allocation performance (shape check)" subtitle="Cloud + envelope + hollow status-quo + selected diamond" minHeight={420}>
      <ScatterChart
        series={[{ id: 'candidates', data: ALLOCATION_POINTS }]}
        xAxisLabel="Cost"
        yAxisLabel="DALYs averted"
        getPointStyle={(point) => ({
          hollow: point.isStatusQuo,
          shape: point.isSelected ? 'diamond' : 'circle',
          color: point.isStatusQuo ? undefined : equityColor(point.equity),
          radius: point.isStatusQuo || point.isSelected ? 7 : 6,
        })}
        height={360}
      >
        <ScatterReferenceCurve points={ALLOCATION_ENVELOPE} color="#2E7D32" dashed={false} />
      </ScatterChart>
    </ChartFrame>
  );
}

// THEME-10 rendered-verification fixture -- shape 2: access-gap's bubble cloud (data-driven
// radius, explicit z-order) + labelled y=x reference diagonal + categorical colouring with a
// discrete legend + both axes pinned 0-1 with a fixed tick set.
const ACCESS_DIVISION_COLORS = { north: '#0F62FE', south: '#24A148', east: '#FF832B' };
const ACCESS_POINTS = {
  north: [
    { id: 'n1', x: 0.62, y: 0.7, pop: 12000 },
    { id: 'n2', x: 0.4, y: 0.5, pop: 3000 },
    { id: 'n3', x: 0.8, y: 0.75, pop: 18000 },
  ],
  south: [
    { id: 's1', x: 0.3, y: 0.35, pop: 5000 },
    { id: 's2', x: 0.55, y: 0.5, pop: 9000 },
  ],
  east: [
    { id: 'e1', x: 0.7, y: 0.6, pop: 2000 },
    { id: 'e2', x: 0.45, y: 0.4, pop: 30000 },
  ],
};
const ACCESS_TICKS = [0, 0.25, 0.5, 0.75, 1];
const pctFormatter = (value, context) => (context?.location === 'tick'
  ? `${Math.round(value * 100)}%`
  : `${(value * 100).toFixed(1)}%`);

function AccessShapeScatterEntry() {
  return (
    <ChartFrame title="Access gap (shape check)" subtitle="Bubble cloud + labelled y=x diagonal + categorical legend, fixed 0-1 axes" minHeight={420}>
      <ScatterChart
        series={Object.entries(ACCESS_POINTS).map(([division, data]) => ({
          id: division,
          label: division,
          data,
          color: ACCESS_DIVISION_COLORS[division],
        }))}
        xAxisLabel="Coverage"
        yAxisLabel="Care-seeking rate"
        xAxis={[{ min: 0, max: 1, tickInterval: ACCESS_TICKS, valueFormatter: pctFormatter }]}
        yAxis={[{ min: 0, max: 1, tickInterval: ACCESS_TICKS, valueFormatter: pctFormatter }]}
        sizeAccessor={(point) => point.pop}
        height={360}
      >
        <ScatterReferenceLine
          from={{ x: 0, y: 0 }}
          to={{ x: 1, y: 1 }}
          color="#B0B0B0"
          dashed
          label="No gap"
          labelAt={{ x: 0.88, y: 0.93 }}
          labelAngle={-45}
        />
      </ScatterChart>
    </ChartFrame>
  );
}

// THEME-10 rendered-verification fixture -- shape 3: optimization-results' cloud (no bubble
// sizing, no categorical colour -- the plainest of the three shapes) + a dashed reference
// threshold line + a hollow status-quo marker, added per ui_reviewer finding U2: the other two
// fixtures don't exercise "no yAxis min/max set, no explicit palette" together, which is exactly
// the combination reviewer finding R1 (sizeYAxisForContent's number-vs-point-object mismatch)
// slipped through on.
const OPTIMIZATION_POINTS = [
  { id: 'sq', x: 0, y: 0.42, isStatusQuo: true },
  { id: 'c1', x: 120000, y: 0.55 },
  { id: 'c2', x: 260000, y: 0.68 },
  { id: 'c3', x: 400000, y: 0.79 },
];

function OptimizationShapeScatterEntry() {
  return (
    <ChartFrame title="Optimization results (shape check)" subtitle="Cloud + dashed threshold + hollow status-quo, no bubble/no categorical colour" minHeight={420}>
      <ScatterChart
        series={[{ id: 'candidates', data: OPTIMIZATION_POINTS }]}
        xAxisLabel="Cost"
        yAxisLabel="Coverage"
        getPointStyle={(point) => (point.isStatusQuo ? { hollow: true } : {})}
        height={360}
      >
        <ScatterReferenceLine
          from={{ x: 0, y: 0.6 }}
          to={{ x: 400000, y: 0.6 }}
          color="#0F62FE"
          dashed
        />
      </ScatterChart>
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
              // UCM-CHART-12: rotation is now REQUESTED via xLabels="angled" below, not implied by
              // this angle alone -- but an "angled" axis still honours a caller-set angle as an
              // override of its own -45deg default, so this keeps the fixture's original -25deg
              // shape (reviewer finding R3: an unannounced drift to -45deg here would have been a
              // pure demo-visual accident, not an intended change).
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
            xLabels="angled"
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


const pickerEntries = [
  { id: 'claude_code:opus-5', driver: 'claude_code', model: 'opus-5', label: 'Claude Opus 5', provider: 'claude_code', level: 'top', efforts: ['low', 'medium', 'high', 'max'], billing: 'subscription', estimate: {} },
  { id: 'api:opus-5-5', driver: 'api', model: 'opus-5-5', label: 'Claude Opus 5.5', provider: 'anthropic', level: 'best', efforts: ['low', 'medium', 'high'], billing: 'pay_per_use', estimate: { low: { min: 8000, max: 12000, unit: 'tokens' }, medium: { min: 14000, max: 22000, unit: 'tokens' }, high: { min: 30000, max: 52000, unit: 'tokens' } } },
  { id: 'api:sonnet-5-5', driver: 'api', model: 'sonnet-5-5', label: 'Claude Sonnet 5.5', provider: 'anthropic', level: 'balanced', default: true, efforts: ['low', 'medium', 'high'], billing: 'pay_per_use', estimate: { low: { min: 2000, max: 4000, unit: 'tokens' }, medium: { min: 4000, max: 8000, unit: 'tokens' }, high: { min: 9000, max: 16000, unit: 'tokens' } } },
  { id: 'openai:gpt-6', driver: 'openai', model: 'gpt-6', label: 'GPT-6', provider: 'openai', level: 'balanced', efforts: ['medium', 'high'], billing: 'pay_per_use', estimate: { medium: { min: 2, max: 2, unit: 'level' }, high: { min: 3, max: 3, unit: 'level' } } },
  { id: 'api:haiku-5-5', driver: 'api', model: 'haiku-5-5', label: 'Claude Haiku 5.5', provider: 'anthropic', level: 'fast', efforts: ['low', 'medium'], billing: 'pay_per_use', estimate: { low: { min: 600, max: 1200, unit: 'tokens' }, medium: { min: 1200, max: 2400, unit: 'tokens' } } },
];

function ChatPickerEntry() {
  const [selection, setSelection] = useState({ entry: 'api:sonnet-5-5', effort: 'medium' });
  const [open, setOpen] = useState(true);
  return <Stack spacing={2} sx={{ minHeight: 560, justifyContent: 'flex-end' }}>
    <ChatComposer value="" onChange={() => {}} onSend={() => {}} onStop={() => {}} actions={<ModelPicker entries={pickerEntries} selection={selection} onChange={setSelection} open={open} onOpenChange={setOpen} balance={1153} longChat onNewChat={() => {}} />} />
  </Stack>;
}

function ChatCompactComposerEntry() {
  const [selection, setSelection] = useState({ entry: 'api:sonnet-5-5', effort: 'medium' });
  const [state, setState] = useState('empty');
  const [draft, setDraft] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(true);
  const items = state === 'one' ? ['Klimaanalyse'] : state === 'several' ? ['Klimaanalyse', 'Interview 04', 'Feldnotiz'] : [];
  const running = state === 'running';
  const context = <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0, overflow: 'hidden', flexWrap: 'nowrap' }}>{items.map((item) => <Chip key={item} size="small" label={item} sx={{ minWidth: 0, flexShrink: 1 }} />)}{state === 'several' ? <Chip size="small" label="+2" sx={{ flexShrink: 0 }} /> : null}</Stack>;
  const notice = noticeOpen ? { id: 'long-chat', text: 'Lange Unterhaltung: ältere Teile werden zusammengefasst.', action: 'Neuer Chat', onAction: () => setDraft(''), onDismiss: () => setNoticeOpen(false) } : null;
  // German, like the prototype: the same informal-German instance as the setup-wizard entry.
  return <I18nextProvider i18n={setupI18n}><Stack spacing={1} sx={{ width: 'min(100%, 760px)', mx: 'auto', mt: 2 }}>
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {['empty', 'one', 'several', 'running'].map((next) => <Button key={next} size="small" variant={state === next ? 'contained' : 'outlined'} onClick={() => setState(next)}>{next}</Button>)}
      <Button size="small" variant={noticeOpen ? 'contained' : 'outlined'} onClick={() => setNoticeOpen((open) => !open)}>{noticeOpen ? 'Notice shown' : 'Notice closed'}</Button>
    </Stack>
    <ChatComposer layout="compact" value={draft} onChange={setDraft} onSend={() => setDraft('')} onStop={() => setState('empty')} running={running} context={context} notice={notice}
      actions={<ModelPicker entries={pickerEntries} selection={selection} onChange={setSelection} balance={1153} shortLabel />} />
  </Stack></I18nextProvider>;
}


const receiptA = { merchant: 'Coop Pronto Bern', date: '2026-10-14', total: '14.60', currency: 'CHF', payment_method: 'card', confidence: 'high', items: [{ description: 'Sandwich', amount: '7.90', box: { x: 0.1, y: 0.3, w: 0.8, h: 0.05 } }, { description: 'Mineralwasser', amount: '2.50', box: null }, { description: 'Kaffee', amount: '4.20', box: null }], vat: [], box: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }, account_suggestions: [{ account_id: '6640', confidence: 'low' }] };
const receiptB = { ...receiptA, merchant: 'SBB Billett', total: '23.40', confidence: 'high', items: [], box: { x: 0, y: 0, w: 0.5, h: 0.5 }, account_suggestions: [] };
const receiptC = { ...receiptA, merchant: '', total: '', confidence: 'low', items: [], box: null, account_suggestions: [] };
const receiptsHarnessApi = (mode) => {
  let granted = mode !== 'noconsent';
  return {
    getConsent: async () => ({ granted }),
    setConsent: async (value) => { granted = value; return { granted }; },
    readReceipts: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (mode === 'several') return [receiptA, receiptB, receiptC];
      if (mode === 'nothing') return [];
      if (mode === 'unavailable') { const error = new Error('x'); error.response = { data: { code: 'provider_unavailable' } }; throw error; }
      return [receiptA];
    },
  };
};

function ReceiptsEntry() {
  const [mode, setMode] = useState('one');
  const [values, setValues] = useState({ merchant: 'Coop Pronto Bern', date: '', total: '', currency: 'CHF', payment_method: 'cash', account: '', items: [] });
  const [last, setLast] = useState('');
  const api = useMemo(() => receiptsHarnessApi(mode), [mode]);
  return <Stack spacing={2}>
    <Stack direction="row" spacing={1} flexWrap="wrap">{['one', 'several', 'nothing', 'unavailable', 'noconsent'].map((item) => <Button key={item} size="small" variant={mode === item ? 'contained' : 'outlined'} onClick={() => setMode(item)}>{item}</Button>)}</Stack>
    <ReceiptCaptureCard key={mode} api={api} values={values} accountLabel={(id) => id + ' Verpflegung'} onApply={(next, meta) => { setValues((current) => ({ ...current, ...next })); setLast(meta.mode + ': ' + Object.keys(next).join(', ')); }} onSelectReceipts={(list) => setLast(list.length + ' selected')} onUploadOnly={() => setLast('upload only')} />
    <Typography variant="caption" data-testid="receipts-last">{last}</Typography>
    <Typography variant="caption">{JSON.stringify(values)}</Typography>
  </Stack>;
}

const operatorOverviewData = { app: 'demo', month: '2026-10', accounts: { active: 42, by_source: { subscription: { monthly: 20, yearly: 9 }, team_seat: 8, free_access: 5 } }, subscriptions: { new: 6, ended: 2 }, team: { packages_active: 2, packages_sold: 1, seats_total: 12, seats_used: 8 }, token_packages: { sold: 4, tokens: 400000 }, tokens: { granted: 1200000, used: 830000, expired: 40000 }, ai_cost: { calls: 1830, usd_micros: 21450000, by_model: [{ provider: 'openai', model: 'gpt-6', calls: 1200, usd_micros: 15000000, input_tokens: 900000, output_tokens: 300000, cache_tokens: 0 }, { provider: 'anthropic', model: 'sonnet-5-5', calls: 630, usd_micros: 6450000, input_tokens: 500000, output_tokens: 120000, cache_tokens: 10000 }], usd_micros_per_used_token: 25843 } };
const operatorHarnessApi = { getOperatorOverview: async () => operatorOverviewData };
const operatorAccounts = [
  { user_id: 1, email: 'anna@example.test', name: 'Anna', access: { status: 'active', source: 'subscription', ends_at: '2026-12-01T00:00:00Z' }, plan_key: 'yearly', term_ends_at: '2026-12-01T00:00:00Z', token_balance: 1200, free_access: null },
  { user_id: 2, email: 'ben@example.test', name: 'Ben', access: { status: 'active', source: 'free', ends_at: null }, plan_key: null, term_ends_at: null, token_balance: 0, free_access: { reason: 'Pilot', granted_by: 'op@example.test', granted_at: '2026-10-01T00:00:00Z' } },
  { user_id: 3, email: 'cara@example.test', name: 'Cara', access: { status: 'read_only', source: null, ends_at: '2026-09-01T00:00:00Z' }, plan_key: null, term_ends_at: null, token_balance: 0, free_access: null },
];
function OperatorBillingEntry() {
  return <Stack spacing={3}>
    <OperatorOverview api={operatorHarnessApi} />
    <Stack spacing={1}>{operatorAccounts.map((account) => <BillingAccessCell key={account.user_id} account={account} api={{ grantFreeAccess: async () => ({ user_id: account.user_id, free_access: { reason: 'x', granted_by: 'op', granted_at: '2026-10-17T00:00:00Z' }, access: { status: 'active', source: 'free', ends_at: null } }), revokeFreeAccess: async () => ({ user_id: account.user_id, free_access: null, access: { status: 'read_only', source: null, ends_at: null } }) }} onChanged={() => {}} />)}</Stack>
  </Stack>;
}

const seatsHarnessMe = { access: { status: 'active', source: 'team', ends_at: '2027-04-01T00:00:00Z' }, tokens: { balance: 1214, grants: [] }, plans: [], team: { plan_key: 'team5', plan_name: 'Team', ends_at: '2027-04-01T00:00:00Z', seats_total: 5, seats_used: 3, seat_holders: [{ user_id: 1, name: 'Team-Zahlerin', email: 'zahlerin@example.test' }, { user_id: 2, name: 'Amina Juma', email: 'amina@example.test' }, { user_id: 3, name: 'Joseph Mwita', email: 'joseph@example.test' }] } };
const seatsHarnessApi = { getMe: async () => seatsHarnessMe, listSeats: async () => ({ seats: [{ user_id: 1 }, { user_id: 2 }, { user_id: 3 }] }), addSeat: async () => ({}), removeSeat: async () => ({}) };
function BillingSeatsEntry() {
  return <Stack spacing={4}>
    <SubscriptionSection api={seatsHarnessApi} withdrawal={false} seatCandidates={[{ id: 2, name: 'Amina Juma' }, { id: 4, name: 'Fatma Said' }, { id: 5, name: 'Peter Kibona' }]} />
    <SubscriptionSection api={seatsHarnessApi} withdrawal={false} />
  </Stack>;
}

const originPurchases = { purchases: [
  { id: 'p1', kind: 'subscription', plan_key: 'solo-month', purchased_at: new Date(Date.now() - 6 * 86400000).toISOString(), amount_paid_cents: 600, currency: 'usd', eligible: true, reason: '', withdrawn_at: null },
  { id: 'p2', kind: 'token_package', plan_key: 'pack-500', purchased_at: new Date(Date.now() - 4 * 86400000).toISOString(), amount_paid_cents: 1000, currency: 'usd', eligible: true, reason: '', withdrawn_at: null },
  { id: 'p3', kind: 'team_package', plan_key: 'team5', purchased_at: '2026-10-02T10:00:00Z', amount_paid_cents: 10000, currency: 'usd', eligible: false, reason: 'period_over', withdrawn_at: null },
  { id: 'p4', kind: 'subscription', plan_key: 'solo-year', purchased_at: '2026-09-20T10:00:00Z', amount_paid_cents: 5000, currency: 'usd', eligible: false, reason: 'business_purchase', withdrawn_at: null },
  { id: 'p5', kind: 'subscription', plan_key: 'solo-month', purchased_at: '2026-09-01T10:00:00Z', amount_paid_cents: 600, currency: 'usd', eligible: false, reason: 'period_over', withdrawn_at: '2026-09-03T10:00:00Z' },
] };
const originMe = (extra) => ({ access: { status: 'active', source: 'subscription', ends_at: '2026-11-17T00:00:00Z' }, plans: [{ key: 'solo-month', name: 'Einzel monatlich' }, { key: 'pack-500', name: 'Paket 500 Token' }, { key: 'team5', name: 'Team bis 5 Personen' }, { key: 'solo-year', name: 'Einzel jaehrlich' }], ...extra });
const originSolo = originMe({ tokens: { balance: 553, grants: [{ source: 'plan', origin: 'plan', amount: 120, remaining: 73, expires_at: '2026-11-17T00:00:00Z' }, { source: 'purchase', origin: 'package', amount: 500, remaining: 480, expires_at: null }], pool: null } });
const originSeat = originMe({ access: { status: 'active', source: 'team', ends_at: '2027-04-17T00:00:00Z' }, tokens: { balance: 0, grants: [], pool: { plan_key: 'team5', plan_name: 'Team', amount: 1500, remaining: 1214, expires_at: '2027-04-17T00:00:00Z' } }, seat: { plan_key: 'team5', plan_name: 'Team', ends_at: '2027-04-17T00:00:00Z', payer_name: 'Micha Bigler' } });
const originOld = originMe({ tokens: { balance: 553, grants: [{ source: 'plan', amount: 120, remaining: 73, expires_at: '2026-11-17T00:00:00Z' }] } });
const originApi = (me, purchases) => ({ getMe: async () => me, listSeats: async () => ({ seats: [] }), listWithdrawals: async () => purchases });
function BillingOriginsEntry() {
  return <Stack spacing={5}>
    <SubscriptionSection api={originApi(originSolo, originPurchases)} />
    <SubscriptionSection api={originApi(originSeat, { purchases: [] })} />
    <SubscriptionSection api={originApi(originOld, { purchases: [] })} />
  </Stack>;
}

export const entries = [
  { id: 'theme-baseline', label: 'Theme / Shared baseline', Component: ThemeBaselineEntry },
  { id: 'mobile-bottom-nav', label: 'Navigation / Mobile bottom nav', Component: MobileBottomNavEntry },
  { id: 'section-nav', label: 'Navigation / Section nav', Component: SectionNavEntry },
  { id: 'notification-bell', label: 'Notifications / Bell', Component: NotificationBellEntry },
  { id: 'bar-chart', label: 'Charts / BarChart', Component: BarChartEntry },
  { id: 'linear-x-line-chart', label: 'Charts / LineChart (linear x-axis)', Component: LinearXAxisLineChartEntry },
  { id: 'scatter-chart-allocation-shape', label: 'Charts / ScatterChart (allocation shape)', Component: AllocationShapeScatterEntry },
  { id: 'scatter-chart-access-shape', label: 'Charts / ScatterChart (access shape)', Component: AccessShapeScatterEntry },
  { id: 'scatter-chart-optimization-shape', label: 'Charts / ScatterChart (optimization shape)', Component: OptimizationShapeScatterEntry },
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
  { id: 'chat-model-picker', label: 'Chat / Model picker', Component: ChatPickerEntry },
  { id: 'chat-compact-composer', label: 'Chat / Compact composer', Component: ChatCompactComposerEntry, fullViewport: true },
  { id: 'receipts-capture', label: 'Receipts / Capture card', Component: ReceiptsEntry },
  { id: 'billing-operator', label: 'Billing / Operator overview and access', Component: OperatorBillingEntry },
  { id: 'billing-seats', label: 'Billing / Seats with candidates', Component: BillingSeatsEntry },
  { id: 'billing-origins', label: 'Billing / Balance by origin and purchases', Component: BillingOriginsEntry },
  { id: 'setup-wizard', label: 'Auth / Setup wizard', Component: SetupWizardEntry, fullViewport: true },
];
