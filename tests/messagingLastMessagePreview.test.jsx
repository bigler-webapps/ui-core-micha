// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

const realtimeSubscribers = new Map();
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (envelope, handler) => { realtimeSubscribers.set(envelope, handler); return () => realtimeSubscribers.delete(envelope); },
    onReconnect: () => () => {},
  }),
}));
function dispatchMessagingFrame(frame) { realtimeSubscribers.get('messaging')?.(frame); }

import { ConversationList } from '../src/messaging/ConversationList';
import { applyFrame, MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';

function cache() { return { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } }; }

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('last-message preview and conversation reorder', () => {
  it('moves a conversation to the top and updates its preview from a server-shaped conversation_upsert frame', async () => {
    const api = {
      listConversations: vi.fn().mockResolvedValue({
        results: [
          { id: 1, title: 'Older', last_message_at: '2026-07-31T09:00:00Z', last_message: { excerpt: 'Old preview' } },
          { id: 2, title: 'Newer', last_message_at: '2026-07-31T10:00:00Z', last_message: { excerpt: 'Newer preview' } },
        ],
        next_cursor: null,
      }),
      getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
      listMessages: vi.fn().mockResolvedValue({ results: [] }),
    };
    render(<MessagingProvider api={api}><ConversationList /></MessagingProvider>);
    await screen.findByText('Newer preview');
    // Server-shaped conversation_upsert payload: serialize_conversation_core's
    // real keys (id, last_message_at, last_message: {excerpt}), not a
    // client-invented shape.
    dispatchMessagingFrame({
      envelope: 'messaging', type: 'conversation_upsert', event_id: 'evt-1', conversation_id: 1,
      id: '1', last_message_at: '2026-07-31T12:00:00Z', last_message: { excerpt: 'Fresh reply' },
    });
    await screen.findByText('Fresh reply');
    const rows = screen.getAllByRole('button').map((el) => el.textContent);
    const olderIndex = rows.findIndex((text) => text.includes('Older'));
    const newerIndex = rows.findIndex((text) => text.includes('Newer'));
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);
  });

  it('reflects an edited or deleted last message through a REST refresh', async () => {
    const api = {
      listConversations: vi.fn()
        .mockResolvedValueOnce({ results: [{ id: 1, title: 'Chat', last_message: { excerpt: 'Original text' } }], next_cursor: null })
        .mockResolvedValueOnce({ results: [{ id: 1, title: 'Chat', last_message: { excerpt: '' } }], next_cursor: null }),
      getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
      listMessages: vi.fn().mockResolvedValue({ results: [] }),
    };
    function Refresher() {
      const { refreshConversations } = useMessaging();
      return <button onClick={() => refreshConversations()}>refresh</button>;
    }
    render(<MessagingProvider api={api}><ConversationList /><Refresher /></MessagingProvider>);
    await screen.findByText('Original text');
    screen.getByText('refresh').click();
    await waitFor(() => expect(screen.queryByText('Original text')).toBeNull());
    await screen.findByText('MessagingList.NO_MESSAGES');
  });

  it('applies a real message_edited frame (dcm always attaches frame.message) and updates the edited body', () => {
    const state = { ...cache(), messages: { 'msg-1': { id: 'msg-1', conversation_id: 'conv-1', body: 'Before' } } };
    // dcm's publish_messaging_event (realtime.py) always attaches a full
    // frame.message = serialize_message(message) for message_edited, never
    // just {message_id} alone — verified against django_core_micha's actual
    // realtime.py. This is the real wire shape, not a client-invented one.
    const next = applyFrame(state, {
      envelope: 'messaging', type: 'message_edited', event_id: 'evt-2', conversation_id: 'conv-1', message_id: 'msg-1',
      message: { id: 'msg-1', conversation_id: 'conv-1', body: 'After edit', edited_at: '2026-07-31T12:00:00Z' },
    }, null);
    expect(next.messages['msg-1'].body).toBe('After edit');
    expect(next.messages['msg-1'].edited_at).toBe('2026-07-31T12:00:00Z');
  });

  it('keys a message_edited frame by message_id defensively, even if a producer ever omitted frame.message', () => {
    const state = { ...cache(), messages: { 'msg-1': { id: 'msg-1', conversation_id: 'conv-1', body: 'Before' } } };
    const next = applyFrame(state, { envelope: 'messaging', type: 'message_edited', event_id: 'evt-3', conversation_id: 'conv-1', message_id: 'msg-1' }, null);
    expect(next.messages['msg-1']).toBeTruthy();
    expect(next.messages['conv-1']).toBeUndefined();
  });
});
