// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.message ? `${key}:${options.message}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AuthContext } from '../src/auth/AuthContext';
import { Composer } from '../src/messaging/Composer';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

function makeApi() {
  return {
    patchMessage: vi.fn().mockImplementation(async (id, patch) => ({ id, ...patch, edited_at: '2026-07-31T10:01:00Z' })),
    deleteMessage: vi.fn().mockImplementation(async (id) => ({ id, deleted_at: '2026-07-31T10:01:00Z' })),
  };
}
function renderBubble(message, { userId = 1, canModerateMessages = false, api = makeApi(), onReply } = {}) {
  const result = render(<AuthContext.Provider value={{ user: { id: userId } }}><MessagingProvider api={api} active={false}><MessageBubble message={message} canModerateMessages={canModerateMessages} onReply={onReply} /></MessagingProvider></AuthContext.Provider>);
  return { ...result, api };
}
function openActions() { fireEvent.click(screen.getByRole('button', { name: 'MessagingActions.MENU' })); }

afterEach(cleanup);

describe('message actions', () => {
  it('offers Reply, React and Copy for incoming messages, adding Edit and Delete only for authors or moderators', () => {
    const mine = { id: 1, body: 'Mine', sender: { id: 1 } };
    const theirs = { id: 2, body: 'Theirs', sender: { id: 2 } };
    const { unmount } = renderBubble(mine);
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
    openActions();
    ['MessagingThread.REPLY', 'MessagingReactions.ADD', 'MessagingActions.EDIT', 'MessagingActions.DELETE', 'MessagingActions.COPY'].forEach((name) => expect(screen.getByRole('menuitem', { name })).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingReactions.ADD' }));
    expect(screen.getByLabelText('MessagingReactions.LABEL')).toBeTruthy();
    expect(screen.getByText('👍')).toBeTruthy();
    unmount();
    renderBubble(theirs);
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
    openActions();
    ['MessagingThread.REPLY', 'MessagingReactions.ADD', 'MessagingActions.COPY'].forEach((name) => expect(screen.getByRole('menuitem', { name })).toBeTruthy());
    expect(screen.queryByRole('menuitem', { name: 'MessagingActions.EDIT' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'MessagingActions.DELETE' })).toBeNull();
    cleanup();
    renderBubble(theirs, { canModerateMessages: true });
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
    cleanup();
    renderBubble({ ...mine, deleted_at: '2026-07-31T10:00:00Z' });
    expect(screen.queryByRole('button', { name: 'MessagingActions.MENU' })).toBeNull();
    cleanup();
    renderBubble({ ...mine, kind: 'poll' });
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
  });

  it('opens the affordance from a tap and lets a keyboard user reveal and operate it', () => {
    const onReply = vi.fn();
    const { container } = renderBubble({ id: 3, body: 'Touch me', sender: { id: 2 } }, { onReply });
    const bubble = container.querySelector('[data-message-id="3"] .MuiPaper-root');
    fireEvent.click(bubble);
    expect(bubble.getAttribute('data-actions-visible')).toBe('true');
    const actions = screen.getByRole('button', { name: 'MessagingActions.MENU' });
    fireEvent.focus(actions);
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingThread.REPLY' }));
    expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
  });

  it('dismisses the tap-revealed affordance again on an outside interaction, but not on a reaction-picker click inside the same bubble', () => {
    const { container } = renderBubble({ id: 3, body: 'Touch me', sender: { id: 2 }, reactions: [{ emoji: '👍', count: 1, reacted: false }] });
    const bubble = container.querySelector('[data-message-id="3"] .MuiPaper-root');
    fireEvent.click(bubble);
    expect(bubble.getAttribute('data-actions-visible')).toBe('true');
    // A pointerdown inside the same message's own reaction row (a sibling of
    // the Paper, still within the article) must not count as "outside" —
    // otherwise every reaction click would prematurely hide the affordance.
    fireEvent.pointerDown(screen.getByText('👍 1'));
    expect(bubble.getAttribute('data-actions-visible')).toBe('true');
    // A pointerdown genuinely outside the message dismisses it — this is the
    // U1 fix: without it, the affordance stayed pinned visible forever after
    // any click that bubbled up to the bubble (Part A's "no visible
    // affordance at rest" requirement).
    fireEvent.pointerDown(document.body);
    expect(bubble.getAttribute('data-actions-visible')).toBeNull();
  });

  it('keeps each message bubble\'s tap-reveal state independent — revealing one does not dismiss another', () => {
    const api = makeApi();
    const { container } = render(
      <AuthContext.Provider value={{ user: { id: 1 } }}>
        <MessagingProvider api={api} active={false}>
          <MessageBubble message={{ id: 10, body: 'First', sender: { id: 2 } }} />
          <MessageBubble message={{ id: 11, body: 'Second', sender: { id: 2 } }} />
        </MessagingProvider>
      </AuthContext.Provider>
    );
    const bubbleA = container.querySelector('[data-message-id="10"] .MuiPaper-root');
    const bubbleB = container.querySelector('[data-message-id="11"] .MuiPaper-root');
    fireEvent.pointerDown(bubbleA);
    fireEvent.click(bubbleA);
    expect(bubbleA.getAttribute('data-actions-visible')).toBe('true');
    expect(bubbleB.getAttribute('data-actions-visible')).toBeNull();
    // Tapping bubble B is, from bubble A's perspective, an outside
    // interaction — A dismisses, B reveals; the two must never share state.
    // (A real tap fires pointerdown before click; fireEvent.click alone
    // wouldn't exercise the pointerdown-driven dismiss listener.)
    fireEvent.pointerDown(bubbleB);
    fireEvent.click(bubbleB);
    expect(bubbleA.getAttribute('data-actions-visible')).toBeNull();
    expect(bubbleB.getAttribute('data-actions-visible')).toBe('true');
  });

  it('edits an author message through the API and auto-cancels when deleted elsewhere', async () => {
    const api = makeApi();
    const message = { id: 4, body: 'Before', sender: { id: 1 } };
    const { rerender } = renderBubble(message, { api });
    openActions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingActions.EDIT' }));
    const field = screen.getByRole('textbox', { name: 'MessagingActions.EDIT' });
    fireEvent.change(field, { target: { value: 'After' } });
    fireEvent.click(screen.getByRole('button', { name: 'MessagingActions.SAVE' }));
    await waitFor(() => expect(api.patchMessage).toHaveBeenCalledWith(4, { body: 'After' }));
    openActions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingActions.EDIT' }));
    expect(screen.getByRole('textbox', { name: 'MessagingActions.EDIT' })).toBeTruthy();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={api} active={false}><MessageBubble message={{ ...message, deleted_at: '2026-07-31T10:02:00Z' }} /></MessagingProvider></AuthContext.Provider>);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'MessagingActions.EDIT' })).toBeNull());
  });

  it('requires confirmation before author or moderator deletion reaches the API', async () => {
    const api = makeApi();
    const { rerender } = renderBubble({ id: 5, body: 'Delete me', sender: { id: 1 } }, { api });
    openActions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingActions.DELETE' }));
    expect(api.deleteMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'MessagingActions.DELETE' }));
    await waitFor(() => expect(api.deleteMessage).toHaveBeenCalledWith(5));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const moderatorApi = makeApi();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={moderatorApi} active={false}><MessageBubble message={{ id: 6, body: 'Moderator delete', sender: { id: 2 } }} canModerateMessages /></MessagingProvider></AuthContext.Provider>);
    openActions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingActions.DELETE' }));
    fireEvent.click(screen.getByRole('button', { name: 'MessagingActions.DELETE' }));
    await waitFor(() => expect(moderatorApi.deleteMessage).toHaveBeenCalledWith(6));
  });

  it('clears a deleted reply target and copies the exact message body', async () => {
    const onReplyTargetChange = vi.fn();
    const replyTarget = { id: 7, body: 'Reply source', sender: { display_name: 'Ava' } };
    const { rerender } = render(<MessagingProvider api={makeApi()} active={false}><Composer conversationId={1} replyTarget={replyTarget} onReplyTargetChange={onReplyTargetChange} /></MessagingProvider>);
    onReplyTargetChange.mockClear();
    rerender(<MessagingProvider api={makeApi()} active={false}><Composer conversationId={1} replyTarget={{ ...replyTarget, deleted_at: '2026-07-31T10:00:00Z' }} onReplyTargetChange={onReplyTargetChange} /></MessagingProvider>);
    await waitFor(() => expect(onReplyTargetChange).toHaveBeenCalledWith(null));

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderBubble({ id: 8, body: 'Copy exactly this', sender: { id: 1 } });
    openActions();
    fireEvent.click(screen.getByRole('menuitem', { name: 'MessagingActions.COPY' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Copy exactly this'));
  });
});
