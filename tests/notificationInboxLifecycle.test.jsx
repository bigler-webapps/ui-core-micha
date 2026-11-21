// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
const api = vi.hoisted(() => ({ getNotificationFeed: vi.fn(), getUnreadCount: vi.fn(), markNotifications: vi.fn(), markAllNotificationsSeen: vi.fn() }));
vi.mock('../src/notifications/feedApi', () => api);
import { AuthContext } from '../src/auth/AuthContext';
import { NotificationsProvider, useNotifications } from '../src/notifications/NotificationsProvider';
class Socket { constructor() { Socket.current = this; } close() {} }
const push = data => act(() => Socket.current.onmessage({data: JSON.stringify(data)}));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
vi.stubGlobal('WebSocket', Socket);
function View() { const n = useNotifications(); return <><output data-testid="rows">{n.notifications.map(x => x.id).join(',')}</output><output data-testid="count">{n.unreadCount}</output><output data-testid="seen">{n.notifications.map(x => `${x.id}:${x.seen}`).join(",")}</output><output data-testid="capable">{String(n.canMarkAll)}</output><output data-testid="markError">{String(n.markError)}</output><button onClick={() => n.markSeen([1]).catch(() => {})}>seen</button><button onClick={() => n.refresh().catch(() => {})}>refresh</button><button onClick={n.loadMore}>more</button><button onClick={n.markAllSeen}>all</button><output>{String(n.feedError)}</output></>; }
afterEach(() => { cleanup(); Socket.current = null; vi.resetAllMocks(); });
describe('inbox lifecycle', () => {
 it('retains rows on page failure and retries without duplicates', async () => {
  api.getNotificationFeed.mockResolvedValueOnce({ results: Array.from({length: 20}, (_, i) => ({id: i + 1})), next: '/page2', capabilities: {mark_all_seen: true} }).mockRejectedValueOnce(new Error()).mockResolvedValueOnce({results: [{id: 20}, {id: 21}], next: null});
  api.getUnreadCount.mockResolvedValue({count: 21});
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('21'));
  fireEvent.click(screen.getByText('more')); await screen.findByText('true');
  expect(screen.getByTestId('rows').textContent.split(',')).toHaveLength(20);
  fireEvent.click(screen.getByText('more')); await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe(Array.from({length: 21}, (_, i) => i + 1).join(',')));
 });
 it('clears the old account and ignores a late page', async () => {
  let resolvePage;
  api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:'/page2'}).mockReturnValueOnce(new Promise(r => {resolvePage=r;})).mockResolvedValueOnce({results:[{id:2}],next:null});
  api.getUnreadCount.mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:2});
  const tree = id => <AuthContext.Provider value={{user:{id}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>;
  const {rerender} = render(tree(1)); await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1'));
  fireEvent.click(screen.getByText('more')); rerender(tree(2));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2'));
  await act(async () => { resolvePage({results:[{id:3}],next:null}); await Promise.resolve(); });
  expect(screen.getByTestId('rows').textContent).toBe('2');
 });
 it('bulk marks all including unloaded rows and discards a page started before the mark', async () => {
  const page = deferred(), bulk = deferred();
  api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:'/page2',capabilities:{mark_all_seen:true}}).mockReturnValueOnce(page.promise).mockResolvedValueOnce({results:[{id:1,seen:true},{id:3,seen:false}],next:'/page2',capabilities:{mark_all_seen:true}});
  api.getUnreadCount.mockResolvedValueOnce({count:2}).mockResolvedValueOnce({count:1});
  api.markAllNotificationsSeen.mockReturnValue(bulk.promise);
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByTestId('capable').textContent).toBe('true'));
  fireEvent.click(screen.getByText('more')); fireEvent.click(screen.getByText('all'));
  expect(api.markAllNotificationsSeen).toHaveBeenCalledOnce();
  push({type:'notification.created',id:3,notification_id:3});
  await act(async () => { bulk.resolve({updated:2,unread_count:1}); await bulk.promise; });
  await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
  await act(async () => { page.resolve({results:[{id:2,seen:false}],next:null}); await page.promise; });
  expect(screen.getByTestId('seen').textContent).toBe('1:true,3:false');
 });
 it('keeps unread data on failed bulk mark and allows retry', async () => {
  api.getNotificationFeed.mockResolvedValue({results:[{id:1}],next:null,capabilities:{mark_all_seen:true}});
  api.getUnreadCount.mockResolvedValue({count:4});
  api.markAllNotificationsSeen.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({updated:4,unread_count:0});
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
  fireEvent.click(screen.getByText('all')); await waitFor(() => expect(screen.getByTestId('markError').textContent).toBe('true'));
  expect(screen.getByTestId('seen').textContent).toBe('1:false'); expect(screen.getByTestId('count').textContent).toBe('4');
  fireEvent.click(screen.getByText('all')); await waitFor(() => expect(api.markAllNotificationsSeen).toHaveBeenCalledTimes(2));
 });
 it('gates bulk marking on legacy feeds and marks only selected loaded rows', async () => {
  api.getNotificationFeed.mockResolvedValue({results:[{id:1}],next:'/older'}); api.getUnreadCount.mockResolvedValue({count:2}); api.markNotifications.mockResolvedValue({});
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  fireEvent.click(screen.getByText('all')); expect(api.markAllNotificationsSeen).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('seen')); expect(api.markNotifications).toHaveBeenCalledWith({action:'seen',ids:[1]}); expect(screen.getByTestId('count').textContent).toBe('1');
 });
 it('refreshes on invalidation and retries a refresh when a live message arrives', async () => {
  const pending = deferred();
  api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:null}).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({results:[{id:2},{id:1}],next:null});
  api.getUnreadCount.mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:2});
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(Socket.current?.onmessage).toBeTruthy());
  push({type:'notification.inbox_changed'}); expect(api.getNotificationFeed).toHaveBeenCalledTimes(2);
  push({type:'notification.created',id:2,notification_id:2});
  await act(async () => { pending.resolve({results:[{id:1}],next:null}); await pending.promise; });
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2,1')); expect(screen.getByTestId('count').textContent).toBe('2');
 });
 it('preserves a live arrival when mark and recovery refresh fail', async () => {
  const mark = deferred(); api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:null}).mockRejectedValueOnce(new Error()); api.getUnreadCount.mockResolvedValue({count:1}); api.markNotifications.mockReturnValue(mark.promise);
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(Socket.current?.onmessage).toBeTruthy()); fireEvent.click(screen.getByText('seen')); push({type:'notification.created',id:2,notification_id:2});
  await act(async () => { mark.reject(new Error()); try { await mark.promise; } catch {} });
  await waitFor(() => expect(screen.getByTestId('seen').textContent).toBe('2:false,1:false')); expect(screen.getByTestId('count').textContent).toBe('2');
 });
 it('retains a page loaded during refresh', async () => {
  const pending = deferred(); api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:'/page2'}).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({results:[{id:2}],next:null}).mockResolvedValueOnce({results:[{id:1}],next:'/page2'}).mockResolvedValueOnce({results:[{id:2}],next:null}); api.getUnreadCount.mockResolvedValue({count:2});
  render(<AuthContext.Provider value={{user:{id:1}}}><NotificationsProvider><View /></NotificationsProvider></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1')); fireEvent.click(screen.getByText('refresh')); fireEvent.click(screen.getByText('more'));
  await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1,2'));
  await act(async () => { pending.resolve({results:[{id:1}],next:'/page2'}); await pending.promise; });
  await waitFor(() => expect(api.getNotificationFeed).toHaveBeenCalledTimes(5)); expect(screen.getByTestId('rows').textContent).toBe('1,2');
 });
 it('keeps children mounted and ignores old marks across logout and login', async () => {
  const pending = deferred(); api.markNotifications.mockReturnValue(pending.promise); api.getNotificationFeed.mockResolvedValueOnce({results:[{id:1}],next:null}).mockResolvedValueOnce({results:[{id:2}],next:null}); api.getUnreadCount.mockResolvedValue({count:1});
  function Child() { const [value, setValue] = React.useState(0); return <><button onClick={() => setValue(1)}>local</button><output data-testid="local">{value}</output><View /></>; }
  const tree = user => <AuthContext.Provider value={{user}}><NotificationsProvider><Child /></NotificationsProvider></AuthContext.Provider>;
  const view = render(tree({id:1})); await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('1')); fireEvent.click(screen.getByText('local')); fireEvent.click(screen.getByText('seen'));
  view.rerender(tree(null)); view.rerender(tree({id:2})); await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('2'));
  await act(async () => { pending.reject(new Error()); try { await pending.promise; } catch {} });
  expect(screen.getByTestId('rows').textContent).toBe('2'); expect(screen.getByTestId('local').textContent).toBe('1');
 });
});
