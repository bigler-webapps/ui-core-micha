import { createContext, useContext, useMemo, useRef } from 'react';

import apiClient from '../src/auth/apiClient';
import { RealtimeContext } from '../src/notifications/realtime';
import { notificationFixtures } from './fixtures';

const MockTransportContext = createContext(null);

/**
 * Stands in for the browser's WebSocket wherever a component (e.g.
 * NotificationsProvider) opens its own socket internally via
 * `useRealtimeCore` rather than reading it from context — that path can't be
 * satisfied by wrapping RealtimeContext.Provider, since the component never
 * looks at ambient context for it. Registering this as `window.WebSocket`
 * lets the harness intercept the connection at the point the component
 * actually creates it, instead of opening a real (and always-failing)
 * socket to a harness-local URL.
 */
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    MockWebSocket._instances.add(this);
    // Mirror the async-open timing of a real WebSocket handshake.
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send() {}

  close() {
    this.readyState = MockWebSocket.CLOSED;
    MockWebSocket._instances.delete(this);
    this.onclose?.(new CloseEvent('close'));
  }

  static _instances = new Set();

  static dispatch(frame) {
    const payload = { data: JSON.stringify(frame) };
    MockWebSocket._instances.forEach((socket) => {
      if (socket.readyState === MockWebSocket.OPEN) socket.onmessage?.(payload);
    });
  }
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Setup-wizard entry (UCM-AUTH-14): registration, confirmation, profile, privacy
// statement and the DCM 3.16.0 terms API. Terms acceptance is held in memory.
const SETUP_TERMS_DOCUMENT = { app: 'harness', version: '2026-10-21', url: 'https://example.test/terms' };
let setupTermsAcceptedAt = null;
const setupTermsBody = () => ({
  document: SETUP_TERMS_DOCUMENT,
  accepted: Boolean(setupTermsAcceptedAt),
  accepted_at: setupTermsAcceptedAt,
});
// User rows for entries that render the user list (UCM-BILL-9 access column).
let harnessUsers = [];
export function setHarnessUsers(users) { harnessUsers = users; }

const setupResponses = {
  'get /api/users/': () => harnessUsers,
  'post /api/users/register-request/': () => ({ code: 'Auth.INVITE_SENT' }),
  'post /api/users/register-confirm/': () => ({}),
  'patch /api/users/current/': (config) => ({ ...setupHarnessUser, ...JSON.parse(config.data || '{}') }),
  'get /api/utils/privacy/': () => ({ content: 'Harness privacy statement.' }),
  'get /api/terms/': () => setupTermsBody(),
  'post /api/terms/': () => {
    setupTermsAcceptedAt = setupTermsAcceptedAt || new Date().toISOString();
    return setupTermsBody();
  },
};

export const setupHarnessUser = {
  id: 71,
  username: 'mara',
  email: 'mara@example.test',
  first_name: '',
  last_name: '',
  accepted_privacy_statement: false,
  accepted_convenience_cookies: false,
};

export function createMockTransport({ notifications = notificationFixtures } = {}) {
  let feed = [...notifications];
  const subscribers = new Map();
  const reconnectSubscribers = new Set();

  return {
    async adapter(config) {
      const { method = 'get', url = '' } = config;
      let data = {};
      if (method === 'get' && url === '/api/notifications/feed/') {
        data = { results: feed };
      } else if (method === 'get' && url === '/api/notifications/feed/unread-count/') {
        data = { count: feed.filter((item) => !item.seen_at && !item.dismissed_at).length };
      } else if (method === 'post' && url === '/api/notifications/feed/mark/') {
        const { action, ids = [] } = JSON.parse(config.data || '{}');
        feed = feed.map((item) => (ids.includes(item.id)
          ? { ...item, [`${action}_at`]: item[`${action}_at`] || new Date().toISOString() }
          : item));
        data = { updated: ids.length };
      } else if (setupResponses[`${method} ${url}`]) {
        data = setupResponses[`${method} ${url}`](config);
      } else {
        return Promise.reject(new Error(`No harness response for ${method.toUpperCase()} ${url}`));
      }
      return { config, data, headers: {}, status: 200, statusText: 'OK' };
    },
    subscribe(envelope, handler) {
      const handlers = subscribers.get(envelope) || new Set();
      handlers.add(handler);
      subscribers.set(envelope, handlers);
      return () => handlers.delete(handler);
    },
    // Mirrors the shape `useRealtimeCore` returns (`{ subscribe, onReconnect }`,
    // the MSG-3 chunk-1 additive extension) so a component that calls
    // `onReconnect()` internally (e.g. MessagingProvider) can be exercised in
    // the harness the same way `dispatchReconnect()` lets it be triggered.
    onReconnect(handler) {
      reconnectSubscribers.add(handler);
      return () => reconnectSubscribers.delete(handler);
    },
    // Drives both consumption paths: components reading `useRealtime()`
    // from an ambient RealtimeContext (e.g. a harness entry composed
    // directly under MockTransportProvider), and components that open
    // their own socket internally (e.g. NotificationsProvider), which
    // receive the frame via the intercepted `window.WebSocket` instead.
    dispatch(frame) {
      const envelope = frame.envelope || 'notification';
      subscribers.get(envelope)?.forEach((handler) => handler(frame));
      MockWebSocket.dispatch(frame);
    },
    dispatchReconnect() {
      reconnectSubscribers.forEach((handler) => handler());
    },
  };
}

export function MockTransportProvider({ children }) {
  const transportRef = useRef(null);
  if (!transportRef.current) {
    transportRef.current = createMockTransport();
    apiClient.defaults.adapter = transportRef.current.adapter;
    window.WebSocket = MockWebSocket;
  }
  const transport = transportRef.current;
  const realtimeValue = useMemo(() => ({ subscribe: transport.subscribe, onReconnect: transport.onReconnect }), [transport]);

  return (
    <MockTransportContext.Provider value={transport}>
      <RealtimeContext.Provider value={realtimeValue}>{children}</RealtimeContext.Provider>
    </MockTransportContext.Provider>
  );
}

export function useMockTransport() {
  const transport = useContext(MockTransportContext);
  if (!transport) throw new Error('useMockTransport must be used within MockTransportProvider');
  return transport;
}
