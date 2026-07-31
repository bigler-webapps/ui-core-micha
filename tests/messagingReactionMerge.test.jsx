// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.emoji ? `${key}:${options.emoji}:${options.count}` : key }) }));

const realtimeSubscribers = new Map();
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (envelope, handler) => { realtimeSubscribers.set(envelope, handler); return () => realtimeSubscribers.delete(envelope); },
    onReconnect: () => () => {},
  }),
}));
function dispatchMessagingFrame(frame) { realtimeSubscribers.get('messaging')?.(frame); }

import { ReactionBar } from '../src/messaging/ReactionBar';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';

function baseApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    addReaction: vi.fn(), removeReaction: vi.fn(),
    ...overrides,
  };
}
// ReactionBar is prop-driven (matches every other messaging leaf component) —
// a live-frame test must read the message back out of the cache.
function ConnectedReactionBar({ messageId }) {
  const { cache } = useMessaging();
  return <ReactionBar message={cache.messages[messageId]} />;
}

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('reaction frame/REST merge against the real aggregate-only contract', () => {
  it('an unrelated reaction frame updates its own emoji without touching the viewer\'s known reacted state on other emoji', async () => {
    const api = baseApi();
    render(<MessagingProvider api={api} active={false}><ConnectedReactionBar messageId="msg-1" /></MessagingProvider>);
    // Seed: the viewer has already reacted with 👍 (locally known — e.g. from
    // an earlier REST confirmation), the server aggregate never carries that.
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'seed', conversation_id: 'conv-1', message: { id: 'msg-1', conversation_id: 'conv-1', body: 'Hi', reactions: [{ emoji: '👍', count: 1, reacted: true }] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:1' })).toBeTruthy());
    // A different viewer reacts with 🎉 — dcm's real reaction frame shape
    // (serialize_reactions): {emoji, count} only, never reacted, for the
    // WHOLE aggregate list including 👍.
    dispatchMessagingFrame({ envelope: 'messaging', type: 'reaction', event_id: 'evt-1', conversation_id: 'conv-1', message_id: 'msg-1', reactions: [{ emoji: '👍', count: 1 }, { emoji: '🎉', count: 1 }] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:🎉:1' })).toBeTruthy());
    const thumbsUp = screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:1' });
    expect(thumbsUp.className.includes('MuiChip-colorPrimary')).toBe(true); // still marked as the viewer's own reaction
  });

  it('the viewer\'s own optimistic reacted flag survives its own REST confirmation, which returns an aggregate-only shape', async () => {
    const api = baseApi({ addReaction: vi.fn().mockResolvedValue({ reactions: [{ emoji: '👍', count: 1 }] }) });
    render(<MessagingProvider api={api} active={false}><ConnectedReactionBar messageId="msg-1" /></MessagingProvider>);
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'seed', conversation_id: 'conv-1', message: { id: 'msg-1', conversation_id: 'conv-1', body: 'Hi', reactions: [] } });
    await waitFor(() => screen.getByLabelText('MessagingReactions.ADD'));
    fireEvent.click(screen.getByLabelText('MessagingReactions.ADD'));
    fireEvent.click(screen.getByText('👍'));
    await waitFor(() => expect(api.addReaction).toHaveBeenCalledWith('msg-1', '👍'));
    await waitFor(() => {
      const chip = screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:1' });
      expect(chip.className.includes('MuiChip-colorPrimary')).toBe(true);
    });
  });

  it('a duplicate event_id changes nothing', async () => {
    const api = baseApi();
    render(<MessagingProvider api={api} active={false}><ConnectedReactionBar messageId="msg-1" /></MessagingProvider>);
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'seed', conversation_id: 'conv-1', message: { id: 'msg-1', conversation_id: 'conv-1', body: 'Hi', reactions: [{ emoji: '👍', count: 1 }] } });
    await waitFor(() => screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:1' }));
    dispatchMessagingFrame({ envelope: 'messaging', type: 'reaction', event_id: 'dup-1', conversation_id: 'conv-1', message_id: 'msg-1', reactions: [{ emoji: '👍', count: 2 }] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:2' })).toBeTruthy());
    dispatchMessagingFrame({ envelope: 'messaging', type: 'reaction', event_id: 'dup-1', conversation_id: 'conv-1', message_id: 'msg-1', reactions: [{ emoji: '👍', count: 99 }] });
    expect(screen.queryByRole('button', { name: 'MessagingReactions.TOGGLE:👍:99' })).toBeNull();
    expect(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE:👍:2' })).toBeTruthy();
  });
});
