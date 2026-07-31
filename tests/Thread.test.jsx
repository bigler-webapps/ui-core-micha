// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count != null ? `${key}:${options.count}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AuthContext } from '../src/auth/AuthContext';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Thread } from '../src/messaging/Thread';

function makeApi() {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, kind: 'group' }] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    listMessages: vi.fn().mockResolvedValue({ results: [{ id: 2, conversation_id: 1, body: 'Visible message', created_at: '2026-07-31T10:00:00Z' }], next_cursor: 'signed-opaque-cursor' }),
    listThread: vi.fn().mockResolvedValue({ results: [] }),
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false, delivered_count: 2 }),
  };
}
function renderThread(api, { userId = 9 } = {}) {
  return render(
    <AuthContext.Provider value={{ user: { id: userId } }}>
      <MessagingProvider api={api} activeConversationId={1}><Thread conversationId={1} /></MessagingProvider>
    </AuthContext.Provider>,
  );
}

describe('messaging Thread surfaces', () => {
  let api;
  beforeEach(() => { api = makeApi(); });
  afterEach(cleanup);

  it('uses the opaque message cursor and shows a rejected older page as an error', async () => {
    api.listMessages.mockResolvedValueOnce({ results: [{ id: 2, conversation_id: 1, body: 'Visible message' }], next_cursor: 'signed-opaque-cursor' }).mockRejectedValueOnce(new Error('bad cursor'));
    renderThread(api);
    await screen.findByText('Visible message');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingThread.LOAD_OLDER' }));
    await screen.findByRole('alert');
    expect(api.listMessages).toHaveBeenLastCalledWith(1, { cursor: 'signed-opaque-cursor' });
    expect(screen.getByText('Visible message')).toBeTruthy();
  });

  it('renders deleted content as a redacted placeholder', () => {
    render(<MessageBubble message={{ id: 4, body: 'Stale secret', deleted_at: '2026-07-31T10:00:00Z' }} />);
    expect(screen.getByText('MessagingThread.DELETED')).toBeTruthy();
    expect(screen.queryByText('Stale secret')).toBeNull();
  });

  it('renders aggregate read state and never exposes supplied recipient details for a direct conversation', async () => {
    api.getReadStatus.mockResolvedValue({ all_read: false, delivered_count: 2, recipient_detail: [{ display_name: 'Private recipient' }] });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'direct' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.DELIVERED:2');
    expect(screen.queryByText('Private recipient')).toBeNull();
  });

  it('renders supplied recipient detail for a non-direct conversation (the permitted case)', async () => {
    api.getReadStatus.mockResolvedValue({ all_read: false, delivered_count: 2, recipient_detail: [{ display_name: 'Visible recipient' }] });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'group' }} /></MessagingProvider>);
    const tick = await screen.findByLabelText('MessagingReadTicks.DELIVERED:2');
    fireEvent.click(tick);
    await screen.findByText('Visible recipient');
  });

  it('only mounts ReadTicks (and its REST call) for the current user\'s own messages, not every message in the timeline', async () => {
    api.listMessages.mockResolvedValue({
      results: [
        { id: 2, conversation_id: 1, body: 'Mine', created_at: '2026-07-31T10:00:00Z', sender: { id: 9 } },
        { id: 3, conversation_id: 1, body: 'Theirs', created_at: '2026-07-31T10:01:00Z', sender: { id: 42 } },
      ],
      next_cursor: null,
    });
    renderThread(api, { userId: 9 });
    await screen.findByText('Mine');
    await screen.findByText('Theirs');
    await waitFor(() => expect(api.getReadStatus).toHaveBeenCalledTimes(1));
    expect(api.getReadStatus).toHaveBeenCalledWith(2);
  });

  it('does not mount ReadTicks (or fire a REST call) for a still-pending optimistic own message', async () => {
    api.listMessages.mockResolvedValue({
      results: [{ id: 'local-r9', conversation_id: 1, body: 'Sending...', created_at: '2026-07-31T10:00:00Z', sender: { id: 9 }, status: 'pending', client_request_id: 'r9' }],
      next_cursor: null,
    });
    renderThread(api, { userId: 9 });
    await screen.findByText('Sending...');
    expect(api.getReadStatus).not.toHaveBeenCalled();
  });

  it('mounts Thread and ReadTicks independently', async () => {
    renderThread(api);
    await screen.findByLabelText('MessagingThread.TIMELINE');
    cleanup();
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'group' }} /></MessagingProvider>);
    await waitFor(() => expect(screen.getByLabelText('MessagingReadTicks.DELIVERED:2')).toBeTruthy());
  });
});
