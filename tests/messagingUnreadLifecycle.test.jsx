// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { ConversationList } from '../src/messaging/ConversationList';
import { messagingReducer, MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { Thread } from '../src/messaging/Thread';

function cache() { return { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } }; }
function State() { const { cache: current } = useMessaging(); return <output data-testid="cache">{JSON.stringify(current)}</output>; }
function makeApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), listThread: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    markConversationRead: vi.fn().mockResolvedValue({}), markThreadRead: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

afterEach(cleanup);

describe('messaging unread lifecycle', () => {
  it('marks the selected conversation read', async () => {
    const api = makeApi({ listConversations: vi.fn().mockResolvedValue({ results: [{ id: 12, title: 'Support' }] }) });
    render(<MessagingProvider api={api}><ConversationList /></MessagingProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Support/ }));
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledWith(12, undefined));
  });

  it('marks a conversation read when its thread opens', async () => {
    const api = makeApi();
    render(<MessagingProvider api={api} active={false}><Thread conversationId={12} /></MessagingProvider>);
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledWith(12, undefined));
  });

  it('decrements the global unread count by the selected conversation prior count', () => {
    const initial = { ...cache(), unread: { unread_count: 5, by_conversation: { 12: 2, 7: 3 } } };
    const next = messagingReducer(initial, { type: 'conversationRead', conversationId: 12 });
    expect(next.unread).toEqual({ unread_count: 3, by_conversation: { 12: 0, 7: 3 } });
  });

  it('marks a reply thread read when it expands', async () => {
    const api = makeApi({ listMessages: vi.fn().mockResolvedValue({ results: [{ id: 40, conversation_id: 12, body: 'Root', reply_count: 1 }] }) });
    render(<MessagingProvider api={api} activeConversationId={12}><Thread conversationId={12} /></MessagingProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'MessagingThread.SHOW_REPLIES' }));
    await waitFor(() => expect(api.markThreadRead).toHaveBeenCalledWith(40, undefined));
  });

  it('increments unread only for a new message in a non-active conversation', () => {
    const initial = { ...cache(), unread: { unread_count: 2, by_conversation: { 7: 2 } } };
    const incoming = { type: 'frame', activeConversationId: 7, frame: { type: 'message', conversation_id: 12, message: { id: 50, body: 'hello' } } };
    const nonActive = messagingReducer(initial, incoming);
    expect(nonActive.unread).toEqual({ unread_count: 3, by_conversation: { 7: 2, 12: 1 } });
    const active = messagingReducer(nonActive, { ...incoming, frame: { type: 'message', conversation_id: 7, message: { id: 51, body: 'active' } } });
    expect(active.unread).toEqual(nonActive.unread);
    const optimistic = messagingReducer(initial, { type: 'messageOptimistic', message: { id: 'local-r1', conversation_id: 12, client_request_id: 'r1', status: 'pending' } });
    const reconciled = messagingReducer(optimistic, { ...incoming, frame: { type: 'message', conversation_id: 12, message: { id: 52, client_request_id: 'r1', body: 'mine' } } });
    expect(reconciled.unread).toEqual(initial.unread);
  });
});
