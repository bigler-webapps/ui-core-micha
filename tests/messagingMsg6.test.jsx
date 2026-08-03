// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

let frameHandler;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count != null ? `${key}:${options.count}` : key, i18n: { language: 'de-DE' } }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: (_envelope, handler) => { frameHandler = handler; return () => {}; }, onReconnect: () => () => {} }) }));

import { MessageBubble } from '../src/messaging/MessageBubble';
import { ConversationList } from '../src/messaging/ConversationList';
import { applyFrame, MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Thread } from '../src/messaging/Thread';
import { messagingTranslations } from '../src/i18n/messagingTranslations';
import { AuthContext } from '../src/auth/AuthContext';

const api = (overrides = {}) => ({ listConversations: vi.fn().mockResolvedValue({ results: [{ id: 'c1', kind: 'group' }] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), listThread: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }), getReadStatus: vi.fn().mockResolvedValue({ all_read: false, delivered_count: 1, recipient_detail: [{ user_id: 'u2', display_name: 'Ava' }] }), markConversationRead: vi.fn().mockResolvedValue({}), ...overrides });
const state = () => ({ conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } });
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

  it('applies read and thread-read frames to cache and lets ReadTicks change without another REST call', async () => {
    const client = api();
    render(<MessagingProvider api={client} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'group' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.DELIVERED:1');
    act(() => frameHandler({ type: 'read_state', conversation_id: 'c1', user_id: 'u2', last_read_at: '2026-08-03T10:00:00Z' }));
    await screen.findByLabelText('MessagingReadTicks.ALL_READ');
    expect(client.getReadStatus).toHaveBeenCalledTimes(1);
    const next = applyFrame(state(), { type: 'thread_read_state', root_id: 'root-1', user_id: 'u2', last_read_at: '2026-08-03T10:00:00Z' });
    expect(next.receipts['thread:root-1:u2'].last_read_at).toBe('2026-08-03T10:00:00Z');
  });

  it('updates direct-conversation ReadTicks from a read frame without another REST call', async () => {
    const client = api();
    render(<MessagingProvider api={client} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'direct', other_user_id: 'u2' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.DELIVERED:1');
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

  it('defines singular reply labels for de, en, and fr', () => {
    expect(messagingTranslations['MessagingThread.SHOW_REPLIES_one']).toEqual({ de: '{{count}} Antwort anzeigen', en: 'Show {{count}} reply', fr: 'Afficher {{count}} réponse' });
  });
});
