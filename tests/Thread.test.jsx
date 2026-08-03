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
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false }),
  };
}
// No `activeConversationId` on the provider: this matches how jg-ferien
// actually mounts it (the provider sits above the page that tracks which
// conversation is open, with no way to keep that prop in sync) — `Thread`'s
// own conversationId-driven fetch is the one exercised here, not the
// provider's separate activeConversationId-driven mount fetch (that path has
// its own dedicated coverage in MessagingProvider.test.jsx).
function renderThread(api, { userId = 9 } = {}) {
  return render(
    <AuthContext.Provider value={{ user: { id: userId } }}>
      <MessagingProvider api={api}><Thread conversationId={1} /></MessagingProvider>
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

  it('renders the two-state direct tick and never exposes supplied recipient details for a direct conversation', async () => {
    api.getReadStatus.mockResolvedValue({ all_read: false, recipient_detail: [{ display_name: 'Private recipient' }] });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'direct' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.SENT');
    expect(screen.queryByText('Private recipient')).toBeNull();
  });

  it('renders supplied recipient detail for a non-direct conversation with counts (the permitted case)', async () => {
    api.getReadStatus.mockResolvedValue({ all_read: false, read_count: 1, recipient_count: 2, recipient_detail: [{ display_name: 'Visible recipient' }] });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'group' }} /></MessagingProvider>);
    const tick = await screen.findByLabelText('MessagingReadTicks.READ_RATIO');
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
    api.getReadStatus.mockResolvedValue({ all_read: false, read_count: 0, recipient_count: 3 });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={2} conversation={{ id: 1, kind: 'group' }} /></MessagingProvider>);
    await waitFor(() => expect(screen.getByLabelText('MessagingReadTicks.READ_RATIO')).toBeTruthy());
  });

  it('fetches and shows a conversation\'s historical messages on open, with no realtime frame or optimistic send involved', async () => {
    // The bug this pins: nothing else in Thread/MessagingProvider ever calls
    // listMessages for the conversation actually opened when the host (like
    // jg-ferien) never wires `activeConversationId` into the provider itself
    // — cache.messages was otherwise only ever populated by a live frame or
    // this browser's own optimistic send, so any conversation whose only
    // messages predate the current session rendered as permanently empty
    // despite the conversation list correctly showing a last-message preview.
    renderThread(api);
    expect(await screen.findByText('Visible message')).toBeTruthy();
    expect(screen.queryByText('MessagingThread.EMPTY')).toBeNull();
    expect(api.listMessages).toHaveBeenCalledWith(1);
  });

  it('does not flash the empty state while the initial fetch is still pending', async () => {
    let resolveMessages;
    api.listMessages.mockReturnValueOnce(new Promise((resolve) => { resolveMessages = resolve; }));
    renderThread(api);
    expect(screen.queryByText('MessagingThread.EMPTY')).toBeNull();
    resolveMessages({ results: [{ id: 2, conversation_id: 1, body: 'Visible message' }], next_cursor: null });
    await screen.findByText('Visible message');
  });

  it('does not cover already-cached messages with the initial-load spinner while a redundant re-fetch is in flight', async () => {
    function Switcher({ conversationId }) {
      return <AuthContext.Provider value={{ user: { id: 9 } }}><MessagingProvider api={api}><Thread conversationId={conversationId} /></MessagingProvider></AuthContext.Provider>;
    }
    // First open (conversation 1): messages load and cache normally.
    const { rerender } = render(<Switcher conversationId={1} />);
    await screen.findByText('Visible message');
    // Switch away, then back to conversation 1 — the effect re-fires (a real
    // "close and reopen" or focus-regain), triggering a redundant re-fetch
    // against a cache that already has this conversation's messages. Make
    // that second fetch (the one for the switch BACK to 1) hang so the
    // assertion below is meaningful.
    rerender(<Switcher conversationId={2} />);
    let resolveSecondFetch;
    api.listMessages.mockImplementationOnce(() => new Promise((resolve) => { resolveSecondFetch = resolve; }));
    rerender(<Switcher conversationId={1} />);
    expect(screen.getByText('Visible message')).toBeTruthy();
    resolveSecondFetch({ results: [{ id: 2, conversation_id: 1, body: 'Visible message' }], next_cursor: null });
    await waitFor(() => expect(screen.getByText('Visible message')).toBeTruthy());
  });
});
