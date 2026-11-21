// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const notifications = vi.hoisted(() => ({
  useNotifications: vi.fn(),
}));
const translation = vi.hoisted(() => ({
  t: vi.fn((key) => `translated:${key}`),
}));

vi.mock('../src/notifications/NotificationsProvider', () => notifications);
vi.mock('react-i18next', () => ({ useTranslation: () => translation }));

import { NotificationBell } from '../src/notifications/NotificationBell';

describe('NotificationBell', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    notifications.useNotifications.mockReturnValue({
      unreadCount: 2,
      markSeen: vi.fn(),
      notifications: [{
        id: 7,
        notification_id: 70,
        seen: false,
        dismissed: false,
        content: {
          title_key: 'domain.notification.title',
          body_key: 'domain.notification.body',
          params: { name: 'Ada' },
          link: '/payments/7',
        },
      }],
    });
  });

  it('renders the unread badge, translates item content, and handles item navigation', () => {
    const resolveLink = vi.fn();
    render(<NotificationBell resolveLink={resolveLink} />);

    expect(screen.getByText('2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'translated:NotificationBell.TITLE' }));

    expect(screen.getByText('translated:domain.notification.title')).toBeTruthy();
    expect(screen.getByText('translated:domain.notification.body')).toBeTruthy();
    expect(translation.t).toHaveBeenCalledWith('domain.notification.title', { name: 'Ada' });
    expect(translation.t).toHaveBeenCalledWith('domain.notification.body', { name: 'Ada' });

    fireEvent.click(screen.getByText('translated:domain.notification.title'));

    expect(notifications.useNotifications.mock.results[0].value.markSeen).toHaveBeenCalledWith([7]);
    expect(resolveLink).toHaveBeenCalledWith('/payments/7');
  });
  it('offers account-wide marking when supported and loaded-only marking otherwise', () => {
    const markAllSeen = vi.fn(); const markSeen = vi.fn();
    const state = { ...notifications.useNotifications(), canMarkAll: true, markAllSeen, markSeen };
    notifications.useNotifications.mockReturnValue(state);
    const view = render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'translated:NotificationBell.TITLE' }));
    fireEvent.click(screen.getByText('translated:NotificationBell.MARK_ALL'));
    expect(markAllSeen).toHaveBeenCalledOnce(); expect(markSeen).not.toHaveBeenCalled();
    notifications.useNotifications.mockReturnValue({ ...state, canMarkAll: false }); view.rerender(<NotificationBell />);
    fireEvent.click(screen.getByText('translated:NotificationBell.MARK_LOADED'));
    expect(markSeen).toHaveBeenCalledWith([7]);
  });

  it('loads more, displays loading, and retries a failed page', () => {
    const loadMore = vi.fn(); const state = { ...notifications.useNotifications(), hasMore: true, loadMore };
    notifications.useNotifications.mockReturnValue(state); const view = render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'translated:NotificationBell.TITLE' }));
    fireEvent.click(screen.getByText('translated:NotificationBell.LOAD_MORE')); expect(loadMore).toHaveBeenCalledOnce();
    notifications.useNotifications.mockReturnValue({ ...state, loadingMore: true }); view.rerender(<NotificationBell />);
    expect(screen.getByText('translated:NotificationBell.LOADING').closest('button').disabled).toBe(true);
    notifications.useNotifications.mockReturnValue({ ...state, feedError: true }); view.rerender(<NotificationBell />);
    expect(screen.getByRole('alert').textContent).toContain('translated:NotificationBell.LOAD_ERROR');
    fireEvent.click(screen.getByText('translated:NotificationBell.RETRY')); expect(loadMore).toHaveBeenCalledTimes(2);
  });

  it('offers refresh retry without claiming the failed feed is complete', () => {
    const refresh = vi.fn().mockResolvedValue({});
    notifications.useNotifications.mockReturnValue({ ...notifications.useNotifications(), hasMore: false, feedError: true, refresh });
    render(<NotificationBell />); fireEvent.click(screen.getByRole('button', { name: 'translated:NotificationBell.TITLE' }));
    expect(screen.queryByText('translated:NotificationBell.END')).toBeNull();
    fireEvent.click(screen.getByText('translated:NotificationBell.RETRY')); expect(refresh).toHaveBeenCalledOnce();
  });
});
