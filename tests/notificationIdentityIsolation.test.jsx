// @vitest-environment jsdom
import React, { Suspense, startTransition, useLayoutEffect, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ getNotificationFeed: vi.fn(), getUnreadCount: vi.fn(), markNotifications: vi.fn(), markAllNotificationsSeen: vi.fn() }));
vi.mock('../src/notifications/feedApi', () => api);
import { AuthContext } from '../src/auth/AuthContext';
import { NotificationsProvider, useNotifications } from '../src/notifications/NotificationsProvider';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
class Socket { constructor() { Socket.instances.push(this); } close() {} }
Socket.instances = [];
vi.stubGlobal('WebSocket', Socket);
afterEach(() => { cleanup(); Socket.instances = []; vi.resetAllMocks(); });

function Probe({ identity, observations }) {
  const n = useNotifications();
  const snapshot = () => ({ identity, rows: n.notifications.map(x => x.id), count: n.unreadCount, more: n.hasMore, loading: n.loadingMore, capable: n.canMarkAll, error: n.feedError });
  observations.push({ phase: 'render', ...snapshot() });
  useLayoutEffect(() => { observations.push({ phase: 'commit', ...snapshot() }); });
  const [local, setLocal] = useState(0);
  return <><output data-testid="rows">{n.notifications.map(x => x.id).join(',')}</output><output data-testid="local">{local}</output><button onClick={() => setLocal(1)}>local</button><button onClick={n.loadMore}>more</button><button onClick={() => n.refresh().catch(() => {})}>refresh</button><button onClick={() => n.markSeen([1]).catch(() => {})}>mark</button></>;
}
const tree = (identity, observations, extra = null) => <AuthContext.Provider value={{ user: identity ? { id: identity } : null }}><NotificationsProvider><Probe identity={identity} observations={observations} />{extra}</NotificationsProvider></AuthContext.Provider>;
const neutral = { rows: [], count: 0, more: false, loading: false, capable: false, error: false };
const first = (observations, identity, phase) => observations.find(x => x.identity === identity && x.phase === phase);

function Capture({ save }) {
  const notifications = useNotifications();
  useLayoutEffect(() => { save(notifications); });
  return null;
}

it.each(['first page', 'continuation'])('stops an old refresh after a delayed %s', async delayedPage => {
  const observations = [], delayed = deferred();
  let captured;
  const save = value => { captured = value; };
  api.getUnreadCount.mockResolvedValue({ count: 1 });
  api.getNotificationFeed
    .mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a2' })
    .mockResolvedValueOnce({ results: [{ id: 2 }], next: '/a3' })
    .mockResolvedValueOnce({ results: [{ id: 3 }], next: null });
  const view = render(tree('A', observations, <Capture save={save} />));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1'));
  fireEvent.click(screen.getByText('more'));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1,2'));
  fireEvent.click(screen.getByText('more'));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1,2,3'));
  if (delayedPage === 'continuation') {
    api.getNotificationFeed.mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a2' });
  }
  api.getNotificationFeed.mockReturnValueOnce(delayed.promise)
    .mockResolvedValueOnce({ results: [{ id: 4 }], next: null });
  let pending;
  act(() => { pending = captured.refresh(); });
  await waitFor(() => expect(api.getNotificationFeed).toHaveBeenCalledTimes(delayedPage === 'first page' ? 4 : 5));
  view.rerender(tree('B', observations, <Capture save={save} />));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('4'));
  const calls = api.getNotificationFeed.mock.calls.length;
  await act(async () => { delayed.resolve({ results: [{ id: 9 }], next: '/stale' }); await pending; });
  expect(api.getNotificationFeed).toHaveBeenCalledTimes(calls);
  expect(screen.getByTestId('rows').textContent).toBe('4');
});

it('ignores captured account A actions after account B commits', async () => {
  const observations = [];
  let captured;
  const save = value => { captured = value; };
  api.getNotificationFeed.mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a', capabilities: { mark_all_seen: true } })
    .mockResolvedValueOnce({ results: [{ id: 2 }], next: '/b', capabilities: { mark_all_seen: true } });
  api.getUnreadCount.mockResolvedValue({ count: 1 });
  const view = render(tree('A', observations, <Capture save={save} />));
  await waitFor(() => expect(captured?.canMarkAll).toBe(true));
  const old = captured;
  view.rerender(tree('B', observations, <Capture save={save} />));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2'));
  const feedCalls = api.getNotificationFeed.mock.calls.length;
  const unreadCalls = api.getUnreadCount.mock.calls.length;
  await act(async () => { await old.refresh(); await old.markSeen([1]); await old.loadMore(); await old.markAllSeen(); });
  expect(api.getNotificationFeed).toHaveBeenCalledTimes(feedCalls);
  expect(api.getUnreadCount).toHaveBeenCalledTimes(unreadCalls);
  expect(api.markNotifications).not.toHaveBeenCalled();
  expect(api.markAllNotificationsSeen).not.toHaveBeenCalled();
  expect(screen.getByTestId('rows').textContent).toBe('2');
  expect(captured.unreadCount).toBe(1);
  expect(captured.hasMore).toBe(true);
  expect(captured.marking).toBe(false);
});

it.each(['B', null])('hides account A on the first render and commit for %s', async identity => {
  const observations = [], next = deferred();
  api.getNotificationFeed.mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a', capabilities: { mark_all_seen: true } }).mockReturnValueOnce(next.promise);
  api.getUnreadCount.mockResolvedValue({ count: 3 });
  const view = render(tree('A', observations));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1'));
  fireEvent.click(screen.getByText('local'));
  view.rerender(tree(identity, observations));
  expect(first(observations, identity, 'render')).toMatchObject(neutral);
  expect(first(observations, identity, 'commit')).toMatchObject(neutral);
  expect(screen.getByTestId('local').textContent).toBe('1');
  if (identity) {
    await act(async () => { next.resolve({ results: [{ id: 2 }], next: null }); await next.promise; });
    await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2'));
  }
});

it('isolates separate logout and login from delayed pages, marks, refreshes and old socket events', async () => {
  const observations = [], page = deferred(), mark = deferred(), refresh = deferred(), b = deferred();
  let captured;
  const save = value => { captured = value; };
  api.getNotificationFeed.mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a' }).mockReturnValueOnce(page.promise).mockReturnValueOnce(refresh.promise).mockReturnValueOnce(b.promise).mockResolvedValueOnce({ results: [{ id: 2 }], next: '/b' }).mockResolvedValueOnce({ results: [{ id: 3 }], next: null });
  api.getUnreadCount.mockResolvedValue({ count: 1 });
  api.markNotifications.mockReturnValueOnce(mark.promise).mockResolvedValue({});
  const view = render(tree('A', observations, <Capture save={save} />));
  await waitFor(() => expect(Socket.instances[0]?.onmessage).toBeTruthy());
  const oldSocket = Socket.instances[0];
  fireEvent.click(screen.getByText('local')); fireEvent.click(screen.getByText('more')); fireEvent.click(screen.getByText('mark')); fireEvent.click(screen.getByText('refresh'));
  view.rerender(tree(null, observations, <Capture save={save} />));
  expect(first(observations, null, 'commit')).toMatchObject(neutral);
  view.rerender(tree('B', observations, <Capture save={save} />));
  expect(first(observations, 'B', 'commit')).toMatchObject(neutral);
  await act(async () => { b.resolve({ results: [{ id: 2 }], next: null }); await b.promise; });
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2'));
  await act(async () => { page.resolve({ results: [{ id: 9 }], next: null }); refresh.resolve({ results: [{ id: 9 }], next: null }); mark.reject(new Error('synthetic')); await Promise.allSettled([page.promise, refresh.promise, mark.promise]); oldSocket.onmessage?.({ data: JSON.stringify({ type: 'notification.created', id: 9 }) }); });
  expect(screen.getByTestId('rows').textContent).toBe('2');
  expect(captured.markError).toBe(false);
  expect(captured.marking).toBe(false);
  expect(screen.getByTestId('local').textContent).toBe('1');
  fireEvent.click(screen.getByText('refresh'));
  await waitFor(() => expect(api.getNotificationFeed).toHaveBeenCalledTimes(5));
  await waitFor(() => expect(first(observations.slice().reverse(), 'B', 'commit').more).toBe(true));
  fireEvent.click(screen.getByText('more'));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2,3'));
  fireEvent.click(screen.getByText('mark'));
  expect(api.markNotifications).toHaveBeenCalledTimes(2);
});

it('keeps account A operations and pagination intact after a suspended account render is abandoned', async () => {
  const observations = [], page = deferred(), mark = deferred(), never = new Promise(() => {});
  api.getNotificationFeed.mockResolvedValueOnce({ results: [{ id: 1 }], next: '/a' }).mockReturnValueOnce(page.promise);
  api.getUnreadCount.mockResolvedValue({ count: 1 }); api.markNotifications.mockReturnValue(mark.promise);
  function Suspend({ active }) { if (active) throw never; return null; }
  function App() { const [identity, setIdentity] = useState('A'); return <><button onClick={() => startTransition(() => setIdentity('B'))}>try B</button><button onClick={() => setIdentity('A')}>keep A</button><Suspense fallback="waiting">{tree(identity, observations, <Suspend active={identity === 'B'} />)}</Suspense></>; }
  render(<App />);
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1'));
  fireEvent.click(screen.getByText('more')); fireEvent.click(screen.getByText('mark'));
  fireEvent.click(screen.getByText('try B'));
  await waitFor(() => expect(first(observations, 'B', 'render')).toBeTruthy());
  fireEvent.click(screen.getByText('keep A'));
  await act(async () => { page.resolve({ results: [{ id: 2 }], next: null }); mark.resolve({}); await Promise.all([page.promise, mark.promise]); });
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1,2'));
  expect(api.getNotificationFeed).toHaveBeenCalledTimes(2);
});
