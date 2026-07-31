import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('../src/auth/apiClient', () => ({ default: client }));

import * as api from '../src/messaging/api';

const response = { data: { ok: true } };
beforeEach(() => { vi.clearAllMocks(); Object.values(client).forEach((method) => method.mockResolvedValue(response)); });

describe('messaging API contract', () => {
  it('uses the published conversations and message routes', async () => {
    await api.listConversations({ scope_kind: 'container', cursor: 'opaque' });
    await api.createDirectConversation({ target_user_id: 8 });
    await api.createGroupConversation({ title: 'Group' }); await api.createBroadcastConversation({}); await api.createManagedConversation({}); await api.createObjectThreadConversation({});
    await api.getConversationConfig(1); await api.patchConversationConfig(1, {}); await api.archiveConversation(1, true); await api.patchConversationPreferences(1, {});
    await api.listMessages(1, { cursor: 'opaque' }); await api.createMessage(1, { body: 'x' }, { idempotencyKey: 'key' }); await api.uploadAttachments(1, new FormData()); await api.createPoll(1, {});
    expect(client.get).toHaveBeenCalledWith('/api/messaging/conversations/', { params: { scope_kind: 'container', cursor: 'opaque' } });
    expect(client.post).toHaveBeenCalledWith('/api/messaging/conversations/direct/', { target_user_id: 8 });
    expect(client.post).toHaveBeenCalledWith('/api/messaging/conversations/1/messages/', { body: 'x' }, { headers: { 'Idempotency-Key': 'key' } });
    expect(client.get).toHaveBeenCalledWith('/api/messaging/conversations/1/messages/', { params: { cursor: 'opaque' } });
  });

  it('uses the published detail, receipt, poll and attachment routes', async () => {
    await api.getMessage(2); await api.patchMessage(2, {}); await api.deleteMessage(2); await api.addReaction(2, '👍'); await api.removeReaction(2, '👍');
    await api.listThread(2, { cursor: 'opaque' }); await api.markThreadRead(2); await api.markConversationRead(3); await api.getReadStatus(2); await api.votePoll(4, [5]); await api.closePoll(4); await api.getAttachment(6); await api.getAttachmentThumbnail(6); await api.getUnreadCount();
    expect(client.delete).toHaveBeenCalledWith('/api/messaging/messages/2/reactions/%F0%9F%91%8D/');
    expect(client.get).toHaveBeenCalledWith('/api/messaging/messages/2/thread/', { params: { cursor: 'opaque' } });
    expect(client.post).toHaveBeenCalledWith('/api/messaging/conversations/3/read/', {});
    expect(client.get).toHaveBeenCalledWith('/api/messaging/unread-count/');
  });
});
