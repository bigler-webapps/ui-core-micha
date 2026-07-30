// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params && Object.keys(params).length ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const onboardingModule = vi.hoisted(() => ({ useOnboarding: vi.fn() }));
vi.mock('../src/onboarding/OnboardingProvider', () => onboardingModule);

const notificationsModule = vi.hoisted(() => ({ useNotifications: vi.fn() }));
vi.mock('../src/notifications/NotificationsProvider', () => notificationsModule);

const realtimeModule = vi.hoisted(() => ({ useRealtime: vi.fn(), DEFAULT_ENVELOPE: 'notification' }));
vi.mock('../src/notifications/realtime', () => realtimeModule);

import { PopupSurface } from '../src/notifications/PopupSurface';

describe('PopupSurface (NOTIF-12 scope B/C)', () => {
  let handler;
  let subscribeFn;
  let markSeen;
  let markDismissed;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = null;
    subscribeFn = (envelope, fn) => {
      handler = fn;
      return () => { handler = null; };
    };
    markSeen = vi.fn();
    markDismissed = vi.fn();
    notificationsModule.useNotifications.mockReturnValue({ markSeen, markDismissed, markDone: vi.fn() });
    onboardingModule.useOnboarding.mockReturnValue({ activeSteps: [] });
    realtimeModule.useRealtime.mockImplementation(() => ({ subscribe: subscribeFn }));
  });

  afterEach(() => {
    cleanup();
  });

  function push(data) {
    act(() => {
      handler(data);
    });
  }

  it('renders nothing when no popup-eligible notification is present', () => {
    render(<PopupSurface />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a popup-eligible notification once, marking seen exactly once on display, and shows the notification title (not the onboarding header)', () => {
    render(<PopupSurface />);

    push({ notification_id: 1, channel: 'popup', content: { title_key: 'T', body_key: 'B', params: {} } });

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('T')).toBeTruthy();
    expect(screen.queryByText('Onboarding.SETUP')).toBeNull();
    expect(markSeen).toHaveBeenCalledTimes(1);
    expect(markSeen).toHaveBeenCalledWith([1]);
  });

  it('marks using the wire recipient_id (feed/mark/ id-space), not the notification_id, when present', () => {
    render(<PopupSurface />);

    push({ notification_id: 10, recipient_id: 999, channel: 'popup', content: { title_key: 'T' } });

    expect(markSeen).toHaveBeenCalledWith([999]);

    fireEvent.click(screen.getByRole('button', { name: 'PopupSurface.CLOSE' }));

    expect(markDismissed).toHaveBeenCalledWith([999]);
  });

  it('fires markDismissed, never markDone, when the popup is closed', () => {
    const { markDone } = notificationsModule.useNotifications();
    render(<PopupSurface />);
    push({ notification_id: 1, channel: 'popup', content: { title_key: 'T' } });

    fireEvent.click(screen.getByRole('button', { name: 'PopupSurface.CLOSE' }));

    expect(markDismissed).toHaveBeenCalledWith([1]);
    expect(markDone).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignores a chip-channel message and a channel-less legacy message — no popup storm', () => {
    render(<PopupSurface />);

    push({ notification_id: 2, channel: 'chip', content: { title_key: 'T' } });
    push({ notification_id: 3, content: { title_key: 'T' } });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('ignores a notification.status message regardless of its channel field', () => {
    render(<PopupSurface />);

    push({ type: 'notification.status', notification_id: 4, channel: 'popup', status: {} });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('coexistence: a blocking onboarding step suppresses the popup; it appears once the step clears, never stacking two dialogs', () => {
    onboardingModule.useOnboarding.mockReturnValue({ activeSteps: [{ id: 'cookie_consent', blocking: true }] });
    const { rerender } = render(<PopupSurface />);

    push({ notification_id: 5, channel: 'popup', content: { title_key: 'T' } });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(markSeen).not.toHaveBeenCalled();

    onboardingModule.useOnboarding.mockReturnValue({ activeSteps: [] });
    rerender(<PopupSurface />);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(markSeen).toHaveBeenCalledWith([5]);
  });

  it('coexistence: a non-blocking onboarding step also suppresses the popup, never stacking two dialogs', () => {
    onboardingModule.useOnboarding.mockReturnValue({ activeSteps: [{ id: 'browser_push', blocking: false }] });
    const { rerender } = render(<PopupSurface />);

    push({ notification_id: 6, channel: 'popup', content: { title_key: 'T' } });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(markSeen).not.toHaveBeenCalled();

    onboardingModule.useOnboarding.mockReturnValue({ activeSteps: [] });
    rerender(<PopupSurface />);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(markSeen).toHaveBeenCalledWith([6]);
  });
});
