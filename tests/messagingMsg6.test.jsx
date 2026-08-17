// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Thread.jsx (MSG-6f scope C) now subscribes to the messaging envelope
// independently of MessagingProvider's own subscription -- a Set of handlers,
// not a single captured variable, so frameHandler(...) still reaches every
// current subscriber, matching the real registry's multi-handler support.
let frameHandlers;
function frameHandler(frame) { frameHandlers.forEach((handler) => handler(frame)); }
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count != null ? `${key}:${options.count}` : key, i18n: { language: 'de-DE' } }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: (_envelope, handler) => { frameHandlers.add(handler); return () => frameHandlers.delete(handler); }, onReconnect: () => () => {} }) }));

import { MessageBubble } from '../src/messaging/MessageBubble';
import { ConversationList } from '../src/messaging/ConversationList';
import { applyFrame, MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Thread } from '../src/messaging/Thread';
import { messagingTranslations } from '../src/i18n/messagingTranslations';
import { AuthContext } from '../src/auth/AuthContext';

const api = (overrides = {}) => ({ listConversations: vi.fn().mockResolvedValue({ results: [{ id: 'c1', kind: 'group' }] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), listThread: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }), getReadStatus: vi.fn().mockResolvedValue({ all_read: false, read_count: 0, recipient_count: 1, recipient_detail: [{ user_id: 'u2', display_name: 'Ava' }] }), markConversationRead: vi.fn().mockResolvedValue({}), ...overrides });
const state = () => ({ conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } });
beforeEach(() => { frameHandlers = new Set(); });
afterEach(cleanup);

function PollHarness() { const { createConversationPoll, cache } = useMessaging(); return <><button onClick={() => createConversationPoll('c1', { question: 'Q' })}>create</button><output>{JSON.stringify(cache.messages)}</output></>; }

describe('MSG-6 messaging regressions', () => {
  it('uses the server message_id, never the poll id, for a newly-created poll cache row', async () => {
    const client = api({ createPoll: vi.fn().mockResolvedValue({ id: 'poll-9', message_id: 'message-9', question: 'Q', options: [] }) });
    render(<MessagingProvider api={client} active={false}><PollHarness /></MessagingProvider>);
    await act(async () => screen.getByText('create').click());
    const messages = JSON.parse(screen.getByText((_, node) => node.tagName === 'OUTPUT').textContent);
    expect(Object.keys(messages)).toEqual(['message-9']);
    expect(messages['message-9'].created_at).toBeTruthy();
    expect(messages['poll-9']).toBeUndefined();
  });

  it('renders time-only metadata in the active locale and one separator per changed root day', async () => {
    const time = vi.spyOn(Date.prototype, 'toLocaleTimeString'); time.mockReturnValue('10:41');
    render(<MessageBubble message={{ id: 1, body: 'Hi', created_at: '2026-08-03T10:41:00Z' }} />);
    expect(await screen.findByText('10:41')).toBeTruthy();
    expect(time).toHaveBeenCalledWith('de-DE', { hour: '2-digit', minute: '2-digit' });
    time.mockRestore();
    const client = api({ listMessages: vi.fn().mockResolvedValue({ results: [{ id: 1, conversation_id: 'c1', body: 'one', created_at: '2026-08-01T10:00:00Z' }, { id: 2, conversation_id: 'c1', body: 'two', created_at: '2026-08-01T11:00:00Z' }, { id: 3, conversation_id: 'c1', body: 'three', created_at: '2026-08-02T10:00:00Z' }] }) });
    render(<MessagingProvider api={client}><Thread conversationId="c1" /></MessagingProvider>);
    await screen.findByText('three');
    expect(screen.getAllByTestId('day-separator')).toHaveLength(1);
  });

  it('applies read frames to cache (for the per-person popover) but the group read ratio stays dcm\'s own numbers, not recomputed', async () => {
    const client = api();
    render(<MessagingProvider api={client} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'group' }} /></MessagingProvider>);
    const tick = await screen.findByLabelText('MessagingReadTicks.READ_RATIO');
    expect(tick.textContent).toBe('0/1');
    act(() => frameHandler({ type: 'read_state', conversation_id: 'c1', user_id: 'u2', last_read_at: '2026-08-03T10:00:00Z' }));
    // Deliberate, documented trade-off (see ReadTicks.jsx): the numeric ratio
    // is dcm's own read_count/recipient_count verbatim, never recomputed from
    // recipientDetail -- recipientDetail has no way to threshold against
    // this specific message's created_at, only dcm's own aggregate does.
    // So a read_state frame updates the *popover's* per-person list (proven
    // by the receipts assertion below) but the ratio digits only change on
    // the next read-status fetch, same as before this frame arrived.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByLabelText('MessagingReadTicks.READ_RATIO').textContent).toBe('0/1');
    expect(client.getReadStatus).toHaveBeenCalledTimes(1);
    const next = applyFrame(state(), { type: 'thread_read_state', root_id: 'root-1', user_id: 'u2', last_read_at: '2026-08-03T10:00:00Z' });
    expect(next.receipts['thread:root-1:u2'].last_read_at).toBe('2026-08-03T10:00:00Z');
  });

  it('updates direct-conversation ReadTicks from a read frame without another REST call', async () => {
    const client = api({ getReadStatus: vi.fn().mockResolvedValue({ all_read: false }) });
    render(<MessagingProvider api={client} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'direct', other_user_id: 'u2' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.SENT');
    act(() => frameHandler({ type: 'read_state', conversation_id: 'c1', user_id: 'u2', last_read_at: '2026-08-03T10:00:00Z' }));
    await screen.findByLabelText('MessagingReadTicks.ALL_READ');
    expect(client.getReadStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps Thread as the sole read-mark owner for direct mounts and list opens', async () => {
    const client = api({ listMessages: vi.fn().mockResolvedValue({ results: [] }) });
    function Surface() { const [conversationId, setConversationId] = React.useState(null); return <MessagingProvider api={client}><ConversationList onOpen={(conversation) => setConversationId(conversation.id)} />{conversationId && <Thread conversationId={conversationId} />}</MessagingProvider>; }
    render(<Surface />);
    await screen.findByText('MessagingList.UNTITLED');
    fireEvent.click(screen.getByText('MessagingList.UNTITLED'));
    await waitFor(() => expect(client.markConversationRead).toHaveBeenCalledTimes(1));
    client.markConversationRead.mockClear();
    render(<MessagingProvider api={client} active={false}><Thread conversationId="c1" /></MessagingProvider>);
    await waitFor(() => expect(client.markConversationRead).toHaveBeenCalledTimes(1));
  });

  it('updates the rendered thread unread state from a thread_read_state frame', async () => {
    const client = api({ listMessages: vi.fn().mockResolvedValue({ results: [{ id: 'root-1', conversation_id: 'c1', body: 'Root', sender: { id: 'u1' }, reply_count: 1, last_reply_at: '2026-08-03T10:00:00Z', thread_last_read_at: null }] }) });
    render(<AuthContext.Provider value={{ user: { id: 'u2' } }}><MessagingProvider api={client}><Thread conversationId="c1" /></MessagingProvider></AuthContext.Provider>);
    await screen.findByLabelText(/MessagingThread.UNREAD_REPLIES/);
    act(() => frameHandler({ type: 'thread_read_state', root_id: 'root-1', user_id: 'u2', last_read_at: '2026-08-03T11:00:00Z' }));
    await waitFor(() => expect(screen.queryByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeNull());
  });

  it('defines singular reply labels for de, en, fr, and sw', () => {
    expect(messagingTranslations['MessagingThread.SHOW_REPLIES_one']).toEqual({ de: '{{count}} Antwort anzeigen', en: 'Show {{count}} reply', fr: 'Afficher {{count}} réponse', sw: 'Onyesha jibu {{count}}' });
  });
});
