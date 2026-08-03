// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.sender ? `${key}:${options.sender}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AuthContext } from '../src/auth/AuthContext';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { applyFrame, MessagingProvider } from '../src/messaging/MessagingProvider';
import { Thread } from '../src/messaging/Thread';

function makeApi(messages = []) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, kind: 'group' }] }),
    listMessages: vi.fn().mockResolvedValue({ results: messages }),
    listThread: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    markConversationRead: vi.fn().mockResolvedValue({}),
    markThreadRead: vi.fn().mockResolvedValue({}),
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false }),
  };
}
function renderBubble(ui) {
  return render(<MessagingProvider api={makeApi()} active={false}>{ui}</MessagingProvider>);
}

afterEach(cleanup);

describe('messaging threading and quoting', () => {
  it('groups REST-loaded server-shaped reply_to_id messages under their root', async () => {
    const api = makeApi([
      { id: 10, conversation_id: 1, body: 'Root', sender: { display_name: 'Ava' }, created_at: '2026-07-31T10:00:00Z' },
      { id: 11, conversation_id: 1, body: 'Server reply', reply_to_id: 10, sender: { display_name: 'Ben' }, created_at: '2026-07-31T10:01:00Z' },
    ]);
    render(<MessagingProvider api={api} activeConversationId={1}><Thread conversationId={1} /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.queryByText('Server reply')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /MessagingThread\.SHOW_REPLIES/ }));
    expect(await screen.findByText('Server reply')).toBeTruthy();
  });

  it('groups realtime server-shaped reply_to_id messages under their root', () => {
    const state = { conversations: {}, messages: { 10: { id: 10, conversation_id: 1, body: 'Root' } }, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } };
    const next = applyFrame(state, { type: 'message', conversation_id: 1, message: { id: 11, body: 'Realtime reply', reply_to_id: 10 } }, 1);
    expect(next.messages[11].reply_to_id).toBe(10);
    expect(Object.values(next.messages).filter((message) => !((message.reply_to_id ?? message.reply_to))).map((message) => message.id)).toEqual([10]);
  });

  it('renders a quoted sender and snippet, blanking deleted quoted content', () => {
    const { rerender } = renderBubble(<MessageBubble message={{ id: 2, body: 'Reply' }} replyTo={{ id: 1, body: 'Quoted words', sender: { display_name: 'Ava' } }} />);
    expect(screen.getByText('MessagingThread.REPLY_TO:Ava')).toBeTruthy();
    expect(screen.getByText('Quoted words')).toBeTruthy();
    rerender(<MessagingProvider api={makeApi()} active={false}><MessageBubble message={{ id: 2, body: 'Reply' }} replyTo={{ id: 1, body: 'Secret', deleted_at: '2026-07-31T10:00:00Z', sender: { display_name: 'Ava' } }} /></MessagingProvider>);
    expect(screen.getByText('MessagingThread.DELETED')).toBeTruthy();
    expect(screen.queryByText('Secret')).toBeNull();
  });

  it('labels an attachment-only quoted source distinctly from a deleted one', () => {
    renderBubble(<MessageBubble message={{ id: 2, body: 'Reply' }} replyTo={{ id: 1, attachments: [{ id: 9, filename: 'photo.png' }], sender: { display_name: 'Ava' } }} />);
    expect(screen.getByText('MessagingThread.QUOTE_ATTACHMENT')).toBeTruthy();
    expect(screen.queryByText('MessagingThread.DELETED')).toBeNull();
  });

  it("clears the Thread's own reply-target state when the message being replied to is deleted", async () => {
    const api = makeApi([{ id: 20, conversation_id: 1, body: 'Reply target', sender: { id: 1, display_name: 'Ava' }, created_at: '2026-07-31T10:00:00Z' }]);
    api.deleteMessage = vi.fn().mockResolvedValue({});
    render(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={api} activeConversationId={1}><Thread conversationId={1} /></MessagingProvider></AuthContext.Provider>);
    await screen.findByText('Reply target');
    fireEvent.click(screen.getByRole('button', { name: /MessagingActions\.MENU/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /MessagingThread\.REPLY\b/ }));
    expect(screen.getByText(/MessagingThread\.REPLYING_TO/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /MessagingActions\.MENU/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /MessagingActions\.DELETE/ }));
    fireEvent.click(screen.getByRole('button', { name: /MessagingActions\.DELETE/ }));
    await waitFor(() => expect(api.deleteMessage).toHaveBeenCalledWith(20));
    await waitFor(() => expect(screen.queryByText(/MessagingThread\.REPLYING_TO/)).toBeNull());
  });

  it('jumps from a quote to the original message', () => {
    const onJumpToMessage = vi.fn();
    renderBubble(<MessageBubble message={{ id: 2, body: 'Reply' }} replyTo={{ id: 1, body: 'Quoted words', sender: { display_name: 'Ava' } }} onJumpToMessage={onJumpToMessage} />);
    fireEvent.click(screen.getByText('Quoted words'));
    expect(onJumpToMessage).toHaveBeenCalledWith(1);
  });
});
