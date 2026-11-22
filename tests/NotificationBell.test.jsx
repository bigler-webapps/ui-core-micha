// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import axe from 'axe-core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notificationsTranslations } from '../src/i18n/notificationsTranslations';
import { createUiCoreTranslations } from '../src/i18n/uiCoreTranslations';

const notifications = vi.hoisted(() => ({
  useNotifications: vi.fn(),
}));
const translation = vi.hoisted(() => ({
  t: vi.fn((key, options) => key === 'NotificationBell.UNREAD' ? `${options.count} unread` : `translated:${key}`),
  real: false,
}));

vi.mock('../src/notifications/NotificationsProvider', () => notifications);
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useTranslation: (...args) => translation.real ? actual.useTranslation(...args) : translation };
});

import { NotificationBell } from '../src/notifications/NotificationBell';

describe('NotificationBell', () => {
  afterEach(() => {
    cleanup();
    translation.real = false;
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
    fireEvent.click(screen.getByRole('button', { name: /translated:NotificationBell.TITLE/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /translated:NotificationBell.TITLE/ }));
    fireEvent.click(screen.getByText('translated:NotificationBell.MARK_ALL'));
    expect(markAllSeen).toHaveBeenCalledOnce(); expect(markSeen).not.toHaveBeenCalled();
    notifications.useNotifications.mockReturnValue({ ...state, canMarkAll: false }); view.rerender(<NotificationBell />);
    fireEvent.click(screen.getByText('translated:NotificationBell.MARK_LOADED'));
    expect(markSeen).toHaveBeenCalledWith([7]);
  });

  it('loads more, displays loading, and retries a failed page', () => {
    const loadMore = vi.fn(); const state = { ...notifications.useNotifications(), hasMore: true, loadMore };
    notifications.useNotifications.mockReturnValue(state); const view = render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /translated:NotificationBell.TITLE/ }));
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
    render(<NotificationBell />); fireEvent.click(screen.getByRole('button', { name: /translated:NotificationBell.TITLE/ }));
    expect(screen.queryByText('translated:NotificationBell.END')).toBeNull();
    fireEvent.click(screen.getByText('translated:NotificationBell.RETRY')); expect(refresh).toHaveBeenCalledOnce();
  });

  it('names the button with the displayed count as it changes, including overflow', () => {
    const state = notifications.useNotifications();
    const view = render(<NotificationBell />);
    for (const [count, displayed] of [[0, '0'], [2, '2'], [120, '99+'], [3, '3']]) {
      notifications.useNotifications.mockReturnValue({ ...state, unreadCount: count });
      view.rerender(<NotificationBell />);
      const button = screen.getByRole('button', { name: `translated:NotificationBell.TITLE ${displayed} unread` });
      expect(button.getAttribute('aria-label').split(displayed)).toHaveLength(2);
      if (count) expect(button.textContent).toContain(displayed);
    }
  });

  it('provides the unread count in supported translations', () => {
    for (const locale of ['de', 'fr', 'en', 'sw']) {
      expect(notificationsTranslations['NotificationBell.UNREAD'][locale]).toContain('{{count}}');
      expect(notificationsTranslations['NotificationBell.TITLE'][locale]).toBeTruthy();
    }
  });

  it('renders interpolated catalogue names and passes the axe label rule with a visible badge', async () => {
    translation.real = true;
    const messages = createUiCoreTranslations();
    const i18n = i18next.createInstance();
    const resources = Object.fromEntries(['de', 'fr', 'en', 'sw'].map((locale) => [locale, {
      translation: Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value[locale]])),
    }]));
    await i18n.init({ lng: 'en', fallbackLng: false, resources, interpolation: { escapeValue: false } });
    const state = notifications.useNotifications();
    const view = render(<I18nextProvider i18n={i18n}><NotificationBell /></I18nextProvider>);
    for (const [locale, expected] of Object.entries({ de: 'Benachrichtigungen 2 ungelesen', fr: 'Notifications 2 non lues', en: 'Notifications 2 unread', sw: 'Arifa 2 ambazo hazijasomwa' })) {
      await i18n.changeLanguage(locale);
      const button = await screen.findByRole('button', { name: expected });
      expect(button.textContent).toContain('2');
      expect((await axe.run(button, { runOnly: ['label-content-name-mismatch'] })).violations).toEqual([]);
    }
    notifications.useNotifications.mockReturnValue({ ...state, unreadCount: 120 });
    view.rerender(<I18nextProvider i18n={i18n}><NotificationBell /></I18nextProvider>);
    const overflow = screen.getByRole('button', { name: 'Arifa 99+ ambazo hazijasomwa' });
    expect(overflow.textContent).toContain('99+');
    expect((await axe.run(overflow, { runOnly: ['label-content-name-mismatch'] })).violations).toEqual([]);
  });

  it('closes the notification menu with Escape and restores focus', async () => {
    render(<NotificationBell />);
    const trigger = screen.getByRole('button', { name: /translated:NotificationBell.TITLE/ });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
