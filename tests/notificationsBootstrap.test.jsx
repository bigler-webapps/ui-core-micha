// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const feedApi = vi.hoisted(() => ({
  getNotificationFeed: vi.fn(), getUnreadCount: vi.fn(), markNotifications: vi.fn(),
}));
const realtime = vi.hoisted(() => ({ activeValues: [], renders: [] }));
const authApi = vi.hoisted(() => ({
  fetchBootstrap: vi.fn(), fetchAuthMethods: vi.fn(), fetchCurrentUser: vi.fn(), logoutSession: vi.fn(),
}));
vi.mock('../src/notifications/feedApi', () => feedApi);
vi.mock('../src/auth/authApi', () => authApi);
vi.mock('../src/auth/apiClient', () => ({ ensureCsrfToken: vi.fn(), default: {} }));
vi.mock('../src/auth/ReauthModal', () => ({ ReauthModal: () => null }));
vi.mock('../src/notifications/realtime', async () => {
  const ReactModule = await import('react');
  return {
    DEFAULT_ENVELOPE: {},
    RealtimeContext: ReactModule.createContext({ subscribe: () => () => {}, onReconnect: () => () => {} }),
    useRealtimeCore: ({ active }) => {
      realtime.activeValues.push(active);
      // The provider renders before its children in each pass: pair this value with the count the
      // consumer renders right after it.
      realtime.renders.push({ active, count: null });
      return { subscribe: () => () => {}, onReconnect: () => () => {} };
    },
  };
});

import { AuthContext, AuthProvider } from '../src/auth/AuthContext';
import { NotificationsProvider, useNotifications } from '../src/notifications/NotificationsProvider';

function Consumer() {
  const { notifications, unreadCount } = useNotifications();
  const last = realtime.renders.at(-1);
  if (last && last.count === null) last.count = notifications.length;
  return <>
    <output data-testid="notifications">{JSON.stringify(notifications)}</output>
    <output data-testid="unread">{unreadCount}</output>
  </>;
}

describe('NotificationsProvider bootstrap seed', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    realtime.activeValues = [];
    realtime.renders = [];
  });

  it('starts from the AuthProvider bootstrap and activates the socket only with the seeded feed', async () => {
    authApi.fetchBootstrap.mockResolvedValue({
      user: { id: 7, first_name: 'Asha' },
      auth_methods: {},
      notifications: { feed: { results: [{ id: 1, notification_id: 11 }] }, unread_count: { count: 1 } },
      extensions: {},
    });
    render(
      <AuthProvider bootstrap>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('1'));
    expect(JSON.parse(screen.getByTestId('notifications').textContent)).toEqual([
      expect.objectContaining({ id: 1, notification_id: 11, seen: false }),
    ]);
    expect(feedApi.getNotificationFeed).not.toHaveBeenCalled();
    expect(feedApi.getUnreadCount).not.toHaveBeenCalled();
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled();
    const firstActive = realtime.renders.find((entry) => entry.active);
    expect(firstActive).toBeTruthy();
    expect(realtime.renders.filter((entry) => entry.active && entry.count === 0)).toEqual([]);
  });

  it('falls back to the separate auth and notification requests once when the bootstrap fails', async () => {
    authApi.fetchBootstrap.mockRejectedValue({ response: { status: 500, data: { detail: 'bootstrap_part_failed', part: 'notifications.feed' } } });
    authApi.fetchAuthMethods.mockResolvedValue({});
    authApi.fetchCurrentUser.mockResolvedValue({ id: 7 });
    feedApi.getNotificationFeed.mockResolvedValue({ results: [{ id: 3, notification_id: 13 }] });
    feedApi.getUnreadCount.mockResolvedValue({ count: 2 });
    render(
      <AuthProvider bootstrap>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('2'));
    expect(authApi.fetchBootstrap).toHaveBeenCalledTimes(1);
    expect(authApi.fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(feedApi.getNotificationFeed).toHaveBeenCalledTimes(1);
    expect(feedApi.getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('seeds normalized feed and count before activating the socket without requests', async () => {
    const seed = {
      userId: 4,
      notifications: {
        feed: { results: [{ id: 2, notification_id: 12, content: { title_key: 'hello' }, seen_at: null }] },
        unread_count: { count: 5 },
      },
    };
    const consumeBootstrapNotificationSeed = vi.fn();
    const { rerender } = render(
      <AuthContext.Provider value={{ user: { id: 4 }, bootstrapNotificationSeed: seed, consumeBootstrapNotificationSeed }}>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('5'));
    expect(JSON.parse(screen.getByTestId('notifications').textContent)).toEqual([
      expect.objectContaining({ id: 2, notification_id: 12, content: { title_key: 'hello' }, seen: false, dismissed: false, done: false }),
    ]);
    expect(feedApi.getNotificationFeed).not.toHaveBeenCalled();
    expect(feedApi.getUnreadCount).not.toHaveBeenCalled();
    expect(consumeBootstrapNotificationSeed).toHaveBeenCalledOnce();
    expect(realtime.activeValues.at(-1)).toBe(true);

    rerender(
      <AuthContext.Provider value={{ user: { id: 4 }, bootstrapNotificationSeed: seed, consumeBootstrapNotificationSeed }}>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthContext.Provider>,
    );
    expect(feedApi.getNotificationFeed).not.toHaveBeenCalled();
  });

  it('does not use a seed belonging to another user', async () => {
    feedApi.getNotificationFeed.mockResolvedValue({ results: [] });
    feedApi.getUnreadCount.mockResolvedValue({ count: 0 });
    render(
      <AuthContext.Provider value={{ user: { id: 4 }, bootstrapNotificationSeed: {
        userId: 3, notifications: { feed: { results: [] }, unread_count: { count: 99 } },
      } }}>
        <NotificationsProvider><Consumer /></NotificationsProvider>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(feedApi.getNotificationFeed).toHaveBeenCalledOnce());
    expect(screen.getByTestId('unread').textContent).toBe('0');
  });
});
