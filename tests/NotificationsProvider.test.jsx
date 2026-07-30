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

class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.close = vi.fn(() => this.onclose?.());
    MockWebSocket.instances.push(this);
  }
}

const firstNotification = {
  id: 1,
  notification_id: 101,
  content: { title_key: 'first.title' },
  seen_at: null,
  dismissed_at: null,
  done_at: null,
};

const secondNotification = {
  id: 2,
  notification_id: 102,
  content: { title_key: 'second.title' },
  seen_at: null,
  dismissed_at: null,
  done_at: null,
};

function Consumer() {
  const notifications = useNotifications();
  return (
    <>
      <output data-testid="notifications">{JSON.stringify(notifications.notifications)}</output>
      <output data-testid="unread-count">{notifications.unreadCount}</output>
      <button onClick={() => notifications.markSeen([1])}>seen</button>
      <button onClick={() => notifications.markDismissed([2])}>dismissed</button>
      <button onClick={() => notifications.markDone([1])}>done</button>
    </>
  );
}

function renderProvider({ children = <Consumer />, user = { id: 4 }, ...providerProps } = {}) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <NotificationsProvider {...providerProps}>{children}</NotificationsProvider>
    </AuthContext.Provider>,
  );
}

function currentNotifications() {
  return JSON.parse(screen.getByTestId('notifications').textContent);
}

describe('NotificationsProvider', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    feedApi.getNotificationFeed.mockResolvedValue({ results: [firstNotification, secondNotification] });
    feedApi.getUnreadCount.mockResolvedValue({ count: 2 });
    feedApi.markNotifications.mockResolvedValue({ updated: 1 });
  });

  it('seeds state from the feed and unread-count endpoints', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('2'));

    expect(currentNotifications()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, notification_id: 101, seen: false }),
      expect.objectContaining({ id: 2, notification_id: 102, dismissed: false }),
    ]));
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('prepends a new notification push and increments the unread count', async () => {
    renderProvider();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'payment_due',
      notification_id: 303,
      content: { title_key: 'payment.title', body_key: 'payment.body', params: { amount: 20 } },
    }) });

    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('3'));
    expect(currentNotifications()[0]).toEqual(expect.objectContaining({
      id: 303,
      notification_id: 303,
      notification_type: 'payment_due',
      seen: false,
    }));
  });

  it('applies a status push to the matching notification without duplication', async () => {
    renderProvider();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'notification.status',
      notification_id: 101,
      status: { seen: true, dismissed: false, done: true },
    }) });

    await waitFor(() => expect(currentNotifications()[0]).toEqual(expect.objectContaining({
      notification_id: 101,
      seen: true,
      dismissed: false,
      done: true,
    })));
    expect(currentNotifications()).toHaveLength(2);
    expect(currentNotifications()[1]).toEqual(expect.objectContaining({ notification_id: 102, seen: false }));
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
  });

  it('decrements unread count on a cross-tab status push and does not double-count a repeat push', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('2'));
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'notification.status',
      notification_id: 101,
      status: { seen: true, dismissed: false, done: false },
    }) });
    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('1'));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'notification.status',
      notification_id: 101,
      status: { seen: true, dismissed: false, done: true },
    }) });
    await waitFor(() => expect(currentNotifications()[0]).toEqual(expect.objectContaining({ done: true })));
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
  });

  it('constructs only one WebSocket across a provider re-render', async () => {
    const { rerender } = renderProvider();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    rerender(
      <AuthContext.Provider value={{ user: { id: 4 } }}>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthContext.Provider>,
    );

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('closes the socket on unmount', async () => {
    const { unmount } = renderProvider();
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];

    unmount();

    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('marks rows optimistically and sends each canonical action', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('2'));

    fireEvent.click(screen.getByRole('button', { name: 'seen' }));
    expect(currentNotifications()[0]).toEqual(expect.objectContaining({ seen: true }));
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
    expect(feedApi.markNotifications).toHaveBeenCalledWith({ action: 'seen', ids: [1] });

    fireEvent.click(screen.getByRole('button', { name: 'dismissed' }));
    expect(currentNotifications()[1]).toEqual(expect.objectContaining({ dismissed: true }));
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
    expect(feedApi.markNotifications).toHaveBeenCalledWith({ action: 'dismissed', ids: [2] });

    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    expect(currentNotifications()[0]).toEqual(expect.objectContaining({ done: true }));
    expect(feedApi.markNotifications).toHaveBeenCalledWith({ action: 'done', ids: [1] });
  });

  it('folds two WS messages for the same notification_id into one feed entry with a single unread increment (NOTIF-12 D2)', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('2'));
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'payment_due',
      channel: 'chip',
      notification_id: 404,
      content: { title_key: 'chip.title' },
    }) });
    await waitFor(() => expect(screen.getByTestId('unread-count').textContent).toBe('3'));

    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({
      type: 'payment_due',
      channel: 'popup',
      notification_id: 404,
      content: { title_key: 'popup.title' },
    }) });

    await waitFor(() => expect(currentNotifications().find((n) => n.notification_id === 404).content)
      .toEqual({ title_key: 'popup.title' }));
    expect(currentNotifications().filter((n) => n.notification_id === 404)).toHaveLength(1);
    expect(screen.getByTestId('unread-count').textContent).toBe('3');
  });

  it('NOTIF-13 R1 guard: does not open the socket until the REST seed resolves', async () => {
    let resolveFeed;
    feedApi.getNotificationFeed.mockReturnValue(new Promise((resolve) => { resolveFeed = resolve; }));

    renderProvider();

    expect(MockWebSocket.instances).toHaveLength(0);

    resolveFeed({ results: [] });
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
  });
});
