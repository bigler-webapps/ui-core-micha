// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), defaults: {} }));
vi.mock('../src/auth/apiClient', () => ({ default: client }));
import { getNotificationFeed, markAllNotificationsSeen } from '../src/notifications/feedApi';
describe('feed contract', () => {
  it('uses same-origin continuations and rejects another origin', async () => {
    client.get.mockResolvedValue({ data: { results: [], next: null } });
    await getNotificationFeed({ next: '/api/notifications/feed/?page=2' });
    expect(client.get.mock.calls.at(-1)[0]).toBe(new URL('/api/notifications/feed/?page=2', window.location.origin).href);
    const calls = client.get.mock.calls.length;
    await expect(getNotificationFeed({ next: 'https://other.example/feed' })).rejects.toThrow();
    expect(client.get).toHaveBeenCalledTimes(calls);
  });
  it('posts an empty object for account-scoped bulk marking', async () => {
    client.post.mockResolvedValue({ data: { updated: 4, unread_count: 1 } });
    expect(await markAllNotificationsSeen()).toEqual({ updated: 4, unread_count: 1 });
    expect(client.post).toHaveBeenCalledWith('/api/notifications/feed/mark-all-seen/', {});
  });
});
