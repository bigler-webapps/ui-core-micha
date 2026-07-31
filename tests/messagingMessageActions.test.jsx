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
function renderBubble(message, { userId = 1, canModerateMessages = false, api = makeApi() } = {}) {
  const result = render(<AuthContext.Provider value={{ user: { id: userId } }}><MessagingProvider api={api} active={false}><MessageBubble message={message} canModerateMessages={canModerateMessages} /></MessagingProvider></AuthContext.Provider>);
  return { ...result, api };
}
function openActions() { fireEvent.click(screen.getByRole('button', { name: 'MessagingActions.MENU' })); }

afterEach(cleanup);

describe('message actions', () => {
  it('gates the menu to the author or host-supplied moderator capability, never deleted or poll messages', () => {
    const mine = { id: 1, body: 'Mine', sender: { id: 1 } };
    const theirs = { id: 2, body: 'Theirs', sender: { id: 2 } };
    const { rerender } = renderBubble(mine);
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={makeApi()} active={false}><MessageBubble message={theirs} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: 'MessagingActions.MENU' })).toBeNull();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={makeApi()} active={false}><MessageBubble message={theirs} canModerateMessages /></MessagingProvider></AuthContext.Provider>);
    expect(screen.getByRole('button', { name: 'MessagingActions.MENU' })).toBeTruthy();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={makeApi()} active={false}><MessageBubble message={{ ...mine, deleted_at: '2026-07-31T10:00:00Z' }} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: 'MessagingActions.MENU' })).toBeNull();
    rerender(<AuthContext.Provider value={{ user: { id: 1 } }}><MessagingProvider api={makeApi()} active={false}><MessageBubble message={{ ...mine, kind: 'poll' }} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: 'MessagingActions.MENU' })).toBeNull();
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
