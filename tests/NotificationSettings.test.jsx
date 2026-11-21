// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';

const notificationsApi = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
  getNotificationChannelMatrix: vi.fn().mockResolvedValue({ results: [] }),
  patchNotificationChannelChoice: vi.fn(),
  getVapidPublicKey: vi.fn(),
  patchNotificationPreferences: vi.fn(),
  removePushSubscription: vi.fn(),
  savePushSubscription: vi.fn(),
  setNotificationCategorySubscription: vi.fn(),
  urlBase64ToUint8Array: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock('../src/notifications/api', () => notificationsApi);
// A stable `t` reference, matching real react-i18next (which memoizes it) -- an unstable
// mock `t` would re-trigger the component's `useEffect(..., [t])` on every render and
// re-fetch preferences, clobbering any state update made in between (e.g. a toggle's
// optimistic-from-response update racing against a stale refetch).
const stableT = (key) => key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: stableT }) }));

import { NotificationSettings } from '../src/notifications/NotificationSettings';
import { AuthContext } from '../src/auth/AuthContext';

function installPushEnvironment(subscription) {
  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn(),
    },
  };
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve(registration) },
    userAgent: 'Unit Test Browser',
  });
  Object.defineProperty(window, 'PushManager', { value: class PushManager {}, configurable: true });
  return registration;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('NotificationSettings push toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: false });
    notificationsApi.patchNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: true });
    notificationsApi.getVapidPublicKey.mockResolvedValue('AQID');
  });

  it('enables push on this device and opts in after saving the subscription', async () => {
    const registration = installPushEnvironment(null);
    const subscription = {
      toJSON: vi.fn(() => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/example' })),
    };
    registration.pushManager.subscribe.mockResolvedValue(subscription);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });

    render(<NotificationSettings />);
    fireEvent.click(await screen.findByRole('switch', { name: /PUSH_LABEL/ }));

    await waitFor(() => expect(notificationsApi.patchNotificationPreferences).toHaveBeenCalledWith({ push_opt_in: true }));
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(notificationsApi.savePushSubscription).toHaveBeenCalledWith(
      { endpoint: 'https://fcm.googleapis.com/fcm/send/example' },
      'Unit Test Browser',
    );
    expect(notificationsApi.savePushSubscription.mock.invocationCallOrder[0])
      .toBeLessThan(notificationsApi.patchNotificationPreferences.mock.invocationCallOrder[0]);
  });

  it('unsubscribes and removes only this device without changing push_opt_in', async () => {
    const subscription = {
      endpoint: 'https://updates.push.services.mozilla.com/example',
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    installPushEnvironment(subscription);

    render(<NotificationSettings />);
    fireEvent.click(await screen.findByRole('switch', { name: /PUSH_LABEL/ }));

    await waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalledOnce());
    expect(notificationsApi.removePushSubscription).toHaveBeenCalledWith({ endpoint: subscription.endpoint });
    expect(notificationsApi.patchNotificationPreferences).not.toHaveBeenCalled();
  });
});

describe('NotificationSettings push preview toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getVapidPublicKey.mockResolvedValue('AQID');
  });

  it('renders checked when the preference is explicitly on', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: true, push_preview_opt_in: true,
    });

    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    expect(toggle.checked).toBe(true);
  });

  it('renders checked when the preference is absent entirely (default-on, not Boolean(undefined))', async () => {
    // Regression test for NOTIF-14: a naive `Boolean(preferences?.push_preview_opt_in)`
    // reads a missing field as false, misrepresenting the backend's true default. Must
    // fail against that implementation.
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: true });

    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    expect(toggle.checked).toBe(true);
  });

  it('renders unchecked when the preference is explicitly off', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: true, push_preview_opt_in: false,
    });

    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    expect(toggle.checked).toBe(false);
  });

  it('toggling calls patchNotificationPreferences with push_preview_opt_in and re-renders from the response', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: true, push_preview_opt_in: true,
    });
    notificationsApi.patchNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: true, push_preview_opt_in: false,
    });

    render(<NotificationSettings />);
    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    fireEvent.click(toggle);

    await waitFor(() => expect(notificationsApi.patchNotificationPreferences).toHaveBeenCalledWith({ push_preview_opt_in: false }));
    await waitFor(() => expect(toggle.checked).toBe(false));
  });

  it('is disabled when push notifications are not opted in for this account', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false, push_preview_opt_in: true,
    });

    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    expect(toggle.disabled).toBe(true);
  });

  it('is enabled when push notifications are opted in for this account', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: true, push_preview_opt_in: true,
    });

    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: /PUSH_PREVIEW_LABEL/ });
    expect(toggle.disabled).toBe(false);
  });
});

describe('NotificationSettings reach axis (NOTIF-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getVapidPublicKey.mockResolvedValue('AQID');
  });

  it('renders no reach or subscriptions sections when the server reports none (no new props)', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false, notification_types: [], subscribable_categories: [],
    });

    render(<NotificationSettings />);
    await screen.findByRole('switch', { name: /EMAIL_LABEL/ });

    expect(screen.queryByText('NotificationSettings.REACH_TITLE')).toBeNull();
    expect(screen.queryByText('NotificationSettings.SUBSCRIPTIONS_TITLE')).toBeNull();
  });

  it('shows the both-reach message for a type that is active and passive', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: true, push_opt_in: false,
      notification_types: [{ key: 'status.deploy_failed', category: 'status', label: 'Deploy failed', active: true, passive: true, has_active_channel: true }],
    });

    render(<NotificationSettings />);

    expect(await screen.findByText('Deploy failed')).toBeTruthy();
    expect(await screen.findByText('NotificationSettings.REACH_BOTH')).toBeTruthy();
  });

  it('shows the passive-only message for a type with no active reach', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false,
      notification_types: [{ key: 'status.deploy_recovered', category: 'status', label: 'Deploy recovered', active: false, passive: true, has_active_channel: null }],
    });

    render(<NotificationSettings />);

    expect(await screen.findByText('NotificationSettings.REACH_PASSIVE')).toBeTruthy();
  });

  it('shows the no-active-channel warning for an active-only type the user cannot currently be reached on (scope C)', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false,
      notification_types: [{ key: 'app.messaging.new_message', category: 'messaging', label: 'New messages', active: true, passive: false, has_active_channel: false }],
    });

    render(<NotificationSettings />);

    expect(await screen.findByText(/NotificationSettings\.REACH_NO_ACTIVE_CHANNEL/)).toBeTruthy();
    expect(await screen.findByText(/New messages/)).toBeTruthy();
  });

  it('shows the passive fallback (not the undelivered warning) for a both-type with no active channel configured', async () => {
    // Regression: scope C's bounded fallback means a both-type still reaches the
    // user passively (chip) with no active channel -- it must not be shown as
    // undelivered, which is reserved for active-only types.
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false,
      notification_types: [{ key: 'status.deploy_failed', category: 'status', label: 'Deploy failed', active: true, passive: true, has_active_channel: false }],
    });

    render(<NotificationSettings />);

    expect(await screen.findByText('NotificationSettings.REACH_PASSIVE')).toBeTruthy();
    expect(screen.queryByText(/NotificationSettings\.REACH_NO_ACTIVE_CHANNEL/)).toBeNull();
  });

  it('renders server-reported subscribable categories and toggles a subscription', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false,
      subscribable_categories: [{ category: 'ops', label: 'Operations', subscribed: false }],
    });
    notificationsApi.setNotificationCategorySubscription.mockResolvedValue({ category: 'ops', subscribed: true });

    render(<NotificationSettings />);
    const toggle = await screen.findByRole('switch', { name: 'Operations' });
    expect(toggle.checked).toBe(false);

    fireEvent.click(toggle);

    await waitFor(() => expect(notificationsApi.setNotificationCategorySubscription).toHaveBeenCalledWith('ops', true));
    await waitFor(() => expect(toggle.checked).toBe(true));
  });

  it('reflects the server response, not the clicked checkbox value, when they disagree', async () => {
    // Regression: a 2xx response reporting a different `subscribed` (e.g. a
    // server-side clamp) must win over what the user clicked.
    notificationsApi.getNotificationPreferences.mockResolvedValue({
      email_opt_in: false, push_opt_in: false,
      subscribable_categories: [{ category: 'ops', label: 'Operations', subscribed: false }],
    });
    notificationsApi.setNotificationCategorySubscription.mockResolvedValue({ category: 'ops', subscribed: false });

    render(<NotificationSettings />);
    const toggle = await screen.findByRole('switch', { name: 'Operations' });

    fireEvent.click(toggle);

    await waitFor(() => expect(notificationsApi.setNotificationCategorySubscription).toHaveBeenCalledWith('ops', true));
    await waitFor(() => expect(toggle.checked).toBe(false));
  });
});


describe('personal channel choices', () => {
  const row = { category: 'messaging', channel: 'push', label: 'Chat push', choice: 'inherit', effective_enabled: false };
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: true });
    notificationsApi.getNotificationChannelMatrix.mockResolvedValue({ results: [row] });
  });

  it('saves and resets the offered pair using the authoritative response even without a device subscription', async () => {
    installPushEnvironment(null);
    notificationsApi.patchNotificationChannelChoice.mockResolvedValueOnce({ ...row, choice: 'enabled', effective_enabled: true }).mockResolvedValueOnce(row);
    render(<NotificationSettings />);
    expect(await screen.findByText('Chat push')).toBeTruthy();
    expect(screen.getByText('NotificationSettings.PUSH_DEVICE_UNAVAILABLE')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'NotificationSettings.CHOICE_ON' }));
    await waitFor(() => expect(screen.getByText('NotificationSettings.EFFECTIVE_ON')).toBeTruthy());
    expect(notificationsApi.patchNotificationChannelChoice).toHaveBeenCalledWith('messaging', 'push', 'enabled');
    fireEvent.click(screen.getByRole('radio', { name: 'NotificationSettings.CHOICE_INHERIT' }));
    await waitFor(() => expect(screen.getByText('NotificationSettings.EFFECTIVE_OFF')).toBeTruthy());
  });

  it('retains the previous choice on failure and permits another selection', async () => {
    notificationsApi.patchNotificationChannelChoice.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ ...row, choice: 'disabled' });
    render(<NotificationSettings />);
    const off = await screen.findByRole('radio', { name: 'NotificationSettings.CHOICE_OFF' });
    fireEvent.click(off);
    expect(await screen.findByText('NotificationSettings.MATRIX_SAVE_ERROR')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'NotificationSettings.CHOICE_INHERIT' }).checked).toBe(true);
    fireEvent.click(off);
    await waitFor(() => expect(off.checked).toBe(true));
  });

  it('refreshes inherited effective values after changing the general email setting', async () => {
    const email = { ...row, channel: 'email', label: 'Chat email' };
    notificationsApi.getNotificationChannelMatrix.mockResolvedValueOnce({ results: [email] }).mockResolvedValueOnce({ results: [{ ...email, effective_enabled: true }] });
    notificationsApi.patchNotificationPreferences.mockResolvedValue({ email_opt_in: true, push_opt_in: true });
    render(<NotificationSettings />);
    await screen.findByText('Chat email');
    fireEvent.click(screen.getByRole('switch', { name: /EMAIL_LABEL/ }));
    expect(await screen.findByText('NotificationSettings.EFFECTIVE_ON')).toBeTruthy();
  });
});

it('does not show a delayed matrix response from the previous account', async () => {
  let resolveOld;
  notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false });
  notificationsApi.getNotificationChannelMatrix.mockReset().mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ results: [{ category: 'todo', channel: 'email', label: 'New account', choice: 'inherit', effective_enabled: false }] });
  const view = render(<AuthContext.Provider value={{ user: { id: 1 } }}><NotificationSettings /></AuthContext.Provider>);
  view.rerender(<AuthContext.Provider value={{ user: { id: 2 } }}><NotificationSettings /></AuthContext.Provider>);
  expect(await screen.findByText('New account')).toBeTruthy();
  await act(async () => { resolveOld({ results: [{ category: 'messaging', channel: 'email', label: 'Old account', choice: 'enabled', effective_enabled: true }] }); await Promise.resolve(); });
  expect(screen.queryByText('Old account')).toBeNull();
});

it('keeps the selected radio focused while saving', async () => {
  let resolveSave;
  notificationsApi.getNotificationPreferences.mockResolvedValue({email_opt_in:false});
  notificationsApi.getNotificationChannelMatrix.mockResolvedValue({results:[{category:'ops',channel:'email',label:'Ops',choice:'inherit',effective_enabled:false}]});
  notificationsApi.patchNotificationChannelChoice.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  render(<NotificationSettings />);
  const radio = await screen.findByRole('radio', {name:'NotificationSettings.CHOICE_ON'});
  radio.focus(); fireEvent.click(radio);
  expect(document.activeElement).toBe(radio); expect(radio.disabled).toBe(false);
  await act(async () => { resolveSave({category:'ops',channel:'email',label:'Ops',choice:'enabled',effective_enabled:true}); await Promise.resolve(); });
});
