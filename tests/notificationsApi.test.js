import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../src/auth/apiClient', () => ({ default: client }));

import { getNotificationChannelMatrix, patchNotificationChannelChoice, removePushSubscription, savePushSubscription } from '../src/notifications/api';

describe('notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a push subscription with its user agent', async () => {
    client.post.mockResolvedValue({ data: { id: 1 } });
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/example' };

    await savePushSubscription(subscription, 'Example Browser');

    expect(client.post).toHaveBeenCalledWith(
      '/api/notifications/preferences/push-subscription/',
      { subscription, ua: 'Example Browser' },
    );
  });

  it('removes a push subscription by endpoint using an axios delete body', async () => {
    client.delete.mockResolvedValue({ data: null });

    await removePushSubscription({ endpoint: 'https://updates.push.services.mozilla.com/example' });

    expect(client.delete).toHaveBeenCalledWith(
      '/api/notifications/preferences/push-subscription/',
      { data: { endpoint: 'https://updates.push.services.mozilla.com/example' } },
    );
  });
});

it('reads the matrix, treats only a missing route as legacy, and sends exact pair choices', async () => {
  client.get.mockResolvedValueOnce({ data: { results: [{ category: 'messaging' }] } }).mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce({ response: { status: 500 } });
  expect(await getNotificationChannelMatrix()).toEqual({ results: [{ category: 'messaging' }] });
  expect(await getNotificationChannelMatrix()).toEqual({ results: [] });
  await expect(getNotificationChannelMatrix()).rejects.toEqual({ response: { status: 500 } });
  client.patch.mockResolvedValue({ data: { choice: 'inherit' } });
  expect(await patchNotificationChannelChoice('messaging', 'push', 'inherit')).toEqual({ choice: 'inherit' });
  expect(client.patch).toHaveBeenCalledWith('/api/notifications/preferences/channel-matrix/', { category: 'messaging', channel: 'push', choice: 'inherit' });
});
