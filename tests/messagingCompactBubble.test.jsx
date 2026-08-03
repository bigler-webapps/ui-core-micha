// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count != null ? `${key}:${options.count}` : options?.sender ? `${key}:${options.sender}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AuthContext } from '../src/auth/AuthContext';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';

const api = () => ({
  getReadStatus: vi.fn().mockResolvedValue({ all_read: false }),
  getAttachment: vi.fn(), getAttachmentThumbnail: vi.fn(), addReaction: vi.fn(), removeReaction: vi.fn(),
  votePoll: vi.fn(), closePoll: vi.fn(),
});
function renderBubble(message, { conversation = { kind: 'group' }, replyTo, onJumpToMessage, child, ownId = 1 } = {}) {
  return render(<AuthContext.Provider value={{ user: { id: ownId } }}><MessagingProvider api={api()} active={false}><MessageBubble message={message} conversation={conversation} replyTo={replyTo} onJumpToMessage={onJumpToMessage}>{child}</MessageBubble></MessagingProvider></AuthContext.Provider>);
}

afterEach(cleanup);

describe('compact message bubbles', () => {
  it('keeps the timestamp and own-message status icon inside the bubble and has no standalone plain-message controls', async () => {
    const { container } = renderBubble({ id: 1, body: 'Hallo', sender: { id: 1, display_name: 'Me' }, created_at: '2026-08-02T10:00:00Z' }, { child: <ReadTicks messageId={1} conversation={{ kind: 'direct' }} /> });
    const tick = await screen.findByLabelText('MessagingReadTicks.SENT');
    const paper = container.querySelector('[data-message-id="1"] .MuiPaper-root');
    expect(paper.contains(tick)).toBe(true);
    expect(paper.querySelector('[data-testid="message-meta"]')).toBeTruthy();
    expect(screen.queryByText('MessagingThread.REPLY')).toBeNull();
    expect(screen.queryByLabelText('MessagingReactions.LABEL')).toBeNull();
  });

  it('marks own and incoming bubbles differently and only shows a sender in non-direct conversations', () => {
    const { container, rerender } = renderBubble({ id: 2, body: 'Mine', sender: { id: 1, display_name: 'Me' } });
    expect(container.querySelector('[data-message-id="2"]').getAttribute('data-message-side')).toBe('own');
    expect(screen.getByText('Me')).toBeTruthy();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={api()} active={false}><MessageBubble message={{ id: 3, body: 'Theirs', sender: { id: 9, display_name: 'Ava' } }} conversation={{ kind: 'direct' }} /></MessagingProvider></AuthContext.Provider>);
    expect(container.querySelector('[data-message-id="3"]').getAttribute('data-message-side')).toBe('incoming');
    expect(screen.queryByText('Ava')).toBeNull();
  });

  it('keeps a reply quote clickable inside the bubble', () => {
    const onJumpToMessage = vi.fn();
    const { container } = renderBubble({ id: 5, body: 'Reply', sender: { id: 1 } }, { replyTo: { id: 4, body: 'Quoted words', sender: { display_name: 'Ava' } }, onJumpToMessage });
    fireEvent.click(screen.getByText('Quoted words'));
    expect(onJumpToMessage).toHaveBeenCalledWith(4);
    expect(container.querySelector('[data-message-id="5"] .MuiPaper-root').contains(screen.getByText('Quoted words'))).toBe(true);
  });

  it('continues to render announcement, poll and attachment content inside the bubble', async () => {
    const { container, rerender } = renderBubble({ id: 6, kind: 'announcement', title: 'Notice', body: 'Update', sender: { id: 1 } });
    expect(container.querySelector('.MuiPaper-root').contains(screen.getByText('Notice'))).toBe(true);
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={api()} active={false}><MessageBubble message={{ id: 7, kind: 'poll', body: 'Poll', sender: { id: 1 }, poll: { id: 1, question: 'Where?', options: [], allow_multiple: false } }} conversation={{ kind: 'group' }} /></MessagingProvider></AuthContext.Provider>);
    expect(container.querySelector('.MuiPaper-root').contains(screen.getByText('Where?'))).toBe(true);
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={api()} active={false}><MessageBubble message={{ id: 8, body: 'File', sender: { id: 1 }, attachments: [{ id: 1, filename: 'notes.pdf', content_type: 'application/pdf' }] }} conversation={{ kind: 'group' }} /></MessagingProvider></AuthContext.Provider>);
    await waitFor(() => expect(screen.getByText(/MessagingAttachments\.DOWNLOAD/)).toBeTruthy());
    expect(container.querySelector('.MuiPaper-root').contains(screen.getByText(/MessagingAttachments\.DOWNLOAD/))).toBe(true);
  });
});
