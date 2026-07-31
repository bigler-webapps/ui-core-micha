// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const feedApi = vi.hoisted(() => ({
  getNotificationFeed: vi.fn(),
  getUnreadCount: vi.fn(),
  markNotifications: vi.fn(),
}));

vi.mock('../src/notifications/feedApi', () => feedApi);

import { AuthContext } from '../src/auth/AuthContext';
import { NotificationsProvider, useNotifications } from '../src/notifications/NotificationsProvider';
import { useRealtime } from '../src/notifications/realtime';

class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.close = vi.fn(() => this.onclose?.());
    MockWebSocket.instances.push(this);
  }
}

function StreamConsumer({ envelope, testId }) {
  const { subscribe } = useRealtime();
  const [received, setReceived] = React.useState([]);

  React.useEffect(
    () => subscribe(envelope, (data) => setReceived((prev) => [...prev, data])),
    [subscribe, envelope],
  );

  return <output data-testid={testId}>{JSON.stringify(received)}</output>;
}

function ReconnectConsumer() {
  const { onReconnect } = useRealtime();
  const [count, setCount] = React.useState(0);
  React.useEffect(() => onReconnect(() => setCount((current) => current + 1)), [onReconnect]);
  return <output data-testid="reconnect-count">{count}</output>;
}

function NotificationsConsumer() {
  const notifications = useNotifications();
  return (
    <>
      <output data-testid="notifications">{JSON.stringify(notifications.notifications)}</output>
      <output data-testid="unread-count">{notifications.unreadCount}</output>
      <output data-testid="context-keys">{JSON.stringify(Object.keys(notifications).sort())}</output>
    </>
  );
}

function renderWithStreams({ streams = [], user = { id: 4 } } = {}) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <NotificationsProvider>
        <NotificationsConsumer />
        {streams.map(({ envelope, testId }) => (
          <StreamConsumer key={testId} envelope={envelope} testId={testId} />
        ))}
      </NotificationsProvider>
    </AuthContext.Provider>,
  );
}

function received(testId) {
  return JSON.parse(screen.getByTestId(testId).textContent);
}

describe('realtime primitive (NOTIF-13)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    feedApi.getNotificationFeed.mockResolvedValue({ results: [] });
    feedApi.getUnreadCount.mockResolvedValue({ count: 0 });
    feedApi.markNotifications.mockResolvedValue({ updated: 1 });
  });

  it('ignores an unknown/unsubscribed envelope type — feed and unreadCount untouched', async () => {
    renderWithStreams();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      envelope: 'message',
      type: 'chat.new',
      body: 'hello',
    }) });

    expect(screen.getByTestId('unread-count').textContent).toBe('0');
    expect(currentNotificationsAreEmpty()).toBe(true);
  });

  function currentNotificationsAreEmpty() {
    return JSON.parse(screen.getByTestId('notifications').textContent).length === 0;
  }

  it('routes two subscribers on distinct envelope types from one socket, each seeing only their own', async () => {
    renderWithStreams({ streams: [
      { envelope: 'message', testId: 'message-stream' },
      { envelope: 'other', testId: 'other-stream' },
    ] });
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ envelope: 'message', body: 'a' }) });
    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ envelope: 'other', body: 'b' }) });

    await waitFor(() => expect(received('message-stream')).toHaveLength(1));
    expect(received('message-stream')[0]).toEqual(expect.objectContaining({ body: 'a' }));
    expect(received('other-stream')).toHaveLength(1);
    expect(received('other-stream')[0]).toEqual(expect.objectContaining({ body: 'b' }));
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('unsubscribe stops delivery for that subscriber without affecting others', async () => {
    function Harness() {
      const { subscribe } = useRealtime();
      const [messageReceived, setMessageReceived] = React.useState([]);
      const [otherReceived, setOtherReceived] = React.useState([]);
      const [messageSubscribed, setMessageSubscribed] = React.useState(true);

      React.useEffect(() => {
        if (!messageSubscribed) return undefined;
        return subscribe('message', (data) => setMessageReceived((prev) => [...prev, data]));
      }, [subscribe, messageSubscribed]);

      React.useEffect(
        () => subscribe('other', (data) => setOtherReceived((prev) => [...prev, data])),
        [subscribe],
      );

      return (
        <>
          <output data-testid="message-received">{JSON.stringify(messageReceived)}</output>
          <output data-testid="other-received">{JSON.stringify(otherReceived)}</output>
          <button onClick={() => setMessageSubscribed(false)}>unsubscribe-message</button>
        </>
      );
    }

    const { unmount } = render(
      <AuthContext.Provider value={{ user: { id: 4 } }}>
        <NotificationsProvider>
          <Harness />
        </NotificationsProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'unsubscribe-message' }));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ envelope: 'message', body: 'after-unsub' }) });
    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ envelope: 'other', body: 'still-alive' }) });

    await waitFor(() => expect(received('other-received')).toHaveLength(1));
    expect(received('message-received')).toHaveLength(0);
    expect(received('other-received')[0]).toEqual(expect.objectContaining({ body: 'still-alive' }));

    unmount();
  });

  it('keeps a subscriber registered across a close/backoff/reopen cycle with no re-registration', async () => {
    vi.useFakeTimers();
    try {
      renderWithStreams({ streams: [{ envelope: 'message', testId: 'message-stream' }] });
      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

      const firstSocket = MockWebSocket.instances[0];
      firstSocket.onclose();
      await vi.advanceTimersByTimeAsync(1_000);

      expect(MockWebSocket.instances).toHaveLength(2);
      MockWebSocket.instances[1].onmessage({ data: JSON.stringify({ envelope: 'message', body: 'after-reopen' }) });

      await vi.waitFor(() => expect(received('message-stream')).toHaveLength(1));
      expect(received('message-stream')[0]).toEqual(expect.objectContaining({ body: 'after-reopen' }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('additively signals consumers when a closed connection re-establishes', async () => {
    vi.useFakeTimers();
    try {
      render(
        <AuthContext.Provider value={{ user: { id: 4 } }}>
          <NotificationsProvider><ReconnectConsumer /></NotificationsProvider>
        </AuthContext.Provider>,
      );
      await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
      MockWebSocket.instances[0].onopen();
      expect(screen.getByTestId('reconnect-count').textContent).toBe('0');
      MockWebSocket.instances[0].onclose();
      await vi.advanceTimersByTimeAsync(1_000);
      MockWebSocket.instances[1].onopen();
      await vi.waitFor(() => expect(screen.getByTestId('reconnect-count').textContent).toBe('1'));
    } finally {
      vi.useRealTimers();
    }
  });

  it("NotificationsProvider's public context value is unchanged", async () => {
    renderWithStreams();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    expect(JSON.parse(screen.getByTestId('context-keys').textContent)).toEqual(
      ['markDismissed', 'markDone', 'markSeen', 'notifications', 'refresh', 'unreadCount'].sort(),
    );
  });
});
