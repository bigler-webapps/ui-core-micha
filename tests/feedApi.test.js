import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../src/auth/apiClient', () => ({ default: client }));

import { getNotificationFeed, getUnreadCount, markNotifications } from '../src/notifications/feedApi';

describe('notification feed API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the feed with an optional status filter', async () => {
    const data = { count: 1, results: [] };
    client.get.mockResolvedValue({ data });

    await expect(getNotificationFeed({ status: 'unseen' })).resolves.toBe(data);

    expect(client.get).toHaveBeenCalledWith('/api/notifications/feed/', { params: { status: 'unseen' } });
  });

  it('loads the unread count', async () => {
    const data = { count: 3 };
    client.get.mockResolvedValue({ data });

    await expect(getUnreadCount()).resolves.toBe(data);

    expect(client.get).toHaveBeenCalledWith('/api/notifications/feed/unread-count/');
  });

  it('marks recipient rows with the supplied action and ids', async () => {
    const data = { updated: 2 };
    client.post.mockResolvedValue({ data });

    await expect(markNotifications({ action: 'seen', ids: [4, 8] })).resolves.toBe(data);

    expect(client.post).toHaveBeenCalledWith('/api/notifications/feed/mark/', {
      action: 'seen',
      ids: [4, 8],
    });
  });
});
