// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.message ? `${key}:${options.message}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { Composer } from '../src/messaging/Composer';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';
import { PollCard } from '../src/messaging/PollCard';
import { ReactionBar } from '../src/messaging/ReactionBar';
import { MessagingScopeConfig } from '../src/messaging/MessagingScopeConfig';

function CacheState() { const { cache } = useMessaging(); return <output data-testid="cache">{JSON.stringify(cache)}</output>; }

const baseApi = () => ({ listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }), addReaction: vi.fn(), removeReaction: vi.fn(), votePoll: vi.fn(), closePoll: vi.fn(), createPoll: vi.fn() });
afterEach(cleanup);

describe('messaging reactions and polls', () => {
  it('round-trips add and remove reactions through the cache-backed API', async () => {
    const api = baseApi(); api.addReaction.mockResolvedValue({ reactions: [{ emoji: '👍', count: 1, reacted: true }] }); api.removeReaction.mockResolvedValue({ reactions: [] });
    const { rerender } = render(<MessagingProvider api={api} active={false}><ReactionBar message={{ id: 7, reactions: [{ emoji: '👍', count: 1, reacted: false }] }} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE' })); await waitFor(() => expect(api.addReaction).toHaveBeenCalledWith(7, '👍'));
    rerender(<MessagingProvider api={api} active={false}><ReactionBar message={{ id: 7, reactions: [{ emoji: '👍', count: 1, reacted: true }] }} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingReactions.TOGGLE' })); await waitFor(() => expect(api.removeReaction).toHaveBeenCalledWith(7, '👍'));
  });

  it('uses single selection for a single poll and preserves selections for a multi poll', async () => {
    const single = baseApi(); single.votePoll.mockResolvedValue({ poll: { id: 1, options: [] } });
    const { unmount } = render(<MessagingProvider api={single} active={false}><PollCard message={{ id: 7, poll: { id: 1, question: 'One', options: [{ id: 1, text: 'A' }, { id: 2, text: 'B' }], allow_multiple: false }}} /></MessagingProvider>);
    const choices = screen.getAllByRole('checkbox'); fireEvent.click(choices[0]); fireEvent.click(choices[1]); fireEvent.click(screen.getByRole('button', { name: 'MessagingPoll.VOTE' })); await waitFor(() => expect(single.votePoll).toHaveBeenCalledWith(1, [2])); unmount();
    const multiple = baseApi(); multiple.votePoll.mockResolvedValue({ poll: { id: 2, options: [] } }); render(<MessagingProvider api={multiple} active={false}><PollCard message={{ id: 8, poll: { id: 2, question: 'Many', options: [{ id: 1, text: 'A' }, { id: 2, text: 'B' }], allow_multiple: true }}} /></MessagingProvider>);
    const multiChoices = screen.getAllByRole('checkbox'); fireEvent.click(multiChoices[0]); fireEvent.click(multiChoices[1]); fireEvent.click(screen.getByRole('button', { name: 'MessagingPoll.VOTE' })); await waitFor(() => expect(multiple.votePoll).toHaveBeenCalledWith(2, [1, 2]));
  });

  it('only exposes close to the creator/capability and surfaces a forbidden close', async () => {
    const api = baseApi(); api.closePoll.mockRejectedValue({ response: { data: { detail: 'Not permitted' } } });
    const { rerender } = render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 7, poll: { id: 1, question: 'Q', options: [], created_by: 2 }}} /></MessagingProvider>);
    expect(screen.queryByRole('button', { name: 'MessagingPoll.CLOSE' })).toBeNull();
    rerender(<MessagingProvider api={api} active={false}><PollCard canClose message={{ id: 7, poll: { id: 1, question: 'Q', options: [] }}} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingPoll.CLOSE' })); await screen.findByRole('alert');
  });

  it('creates polls with an idempotency key', async () => {
    const api = baseApi(); api.createPoll.mockResolvedValue({ id: 70, conversation_id: 4, poll: { id: 1 } });
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingPoll.CREATE' })); fireEvent.change(screen.getByLabelText('MessagingPoll.QUESTION'), { target: { value: 'Where?' } });
    const options = screen.getAllByLabelText(/MessagingPoll.OPTION/); fireEvent.change(options[0], { target: { value: 'Here' } }); fireEvent.change(options[1], { target: { value: 'There' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'MessagingPoll.CREATE' })[0]); await waitFor(() => expect(api.createPoll).toHaveBeenCalled());
    expect(api.createPoll.mock.calls[0][2].idempotencyKey).toBeTruthy();
  });

  it('mounts the scope config as an independent provider collaborator', async () => {
    const api = baseApi(); api.getConversationConfig = vi.fn().mockResolvedValue({ dm_policy: 'all', group_chat_enabled: true, everyone_can_post: false });
    render(<MessagingProvider api={api} active={false}><MessagingScopeConfig conversationId={4} /></MessagingProvider>);
    await screen.findByLabelText('MessagingConfig.LABEL');
    expect(api.getConversationConfig).toHaveBeenCalledWith(4);
  });

  it('creates an announcement with a title, body and host-supplied link target', async () => {
    const api = baseApi(); api.createMessage = vi.fn().mockResolvedValue({ id: 90, conversation_id: 4, kind: 'announcement', title: 'Heads up' });
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} allowAnnouncement linkTarget="/events/4/info" /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingAnnouncement.CREATE' }));
    fireEvent.change(screen.getByLabelText('MessagingAnnouncement.TITLE'), { target: { value: 'Heads up' } });
    fireEvent.change(screen.getByLabelText('MessagingAnnouncement.BODY'), { target: { value: 'Schedule changed.' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'MessagingAnnouncement.SEND' })[0]);
    await waitFor(() => expect(api.createMessage).toHaveBeenCalled());
    const [, payload] = api.createMessage.mock.calls[0];
    expect(payload).toMatchObject({ kind: 'announcement', title: 'Heads up', body: 'Schedule changed.', link_target: '/events/4/info' });
  });

  it('carries title and link_target into the optimistic row, not just the final REST payload', async () => {
    const api = baseApi(); api.createMessage = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} allowAnnouncement linkTarget="/events/4/info" /><CacheState /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingAnnouncement.CREATE' }));
    fireEvent.change(screen.getByLabelText('MessagingAnnouncement.TITLE'), { target: { value: 'Heads up' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'MessagingAnnouncement.SEND' })[0]);
    await waitFor(() => {
      const [optimistic] = Object.values(JSON.parse(screen.getByTestId('cache').textContent).messages);
      expect(optimistic.status).toBe('pending');
      expect(optimistic.title).toBe('Heads up');
      expect(optimistic.link_target).toBe('/events/4/info');
    });
  });

  it('does not offer announcement composing unless the host opts in', () => {
    const api = baseApi();
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} /></MessagingProvider>);
    expect(screen.queryByRole('button', { name: 'MessagingAnnouncement.CREATE' })).toBeNull();
  });

  it('disables the chip while pending, then rolls back and re-enables it on API failure', async () => {
    let rejectAdd; const api = baseApi(); api.addReaction.mockReturnValue(new Promise((_, reject) => { rejectAdd = reject; }));
    render(<MessagingProvider api={api} active={false}><ReactionBar message={{ id: 7, reactions: [{ emoji: '👍', count: 1, reacted: false }] }} /></MessagingProvider>);
    const chip = screen.getByRole('button', { name: 'MessagingReactions.TOGGLE' });
    fireEvent.click(chip);
    await waitFor(() => expect(chip.className.includes('Mui-disabled')).toBe(true));
    rejectAdd({ response: { data: { detail: 'Reactions disabled' } } });
    await screen.findByRole('alert');
    expect(chip.className.includes('Mui-disabled')).toBe(false);
  });

  it('ignores a second click on the same reaction while the first toggle is still in flight', async () => {
    let resolveAdd; const api = baseApi(); api.addReaction.mockReturnValue(new Promise((resolve) => { resolveAdd = resolve; }));
    render(<MessagingProvider api={api} active={false}><ReactionBar message={{ id: 7, reactions: [{ emoji: '👍', count: 1, reacted: false }] }} /></MessagingProvider>);
    const chip = screen.getByRole('button', { name: 'MessagingReactions.TOGGLE' });
    fireEvent.click(chip); fireEvent.click(chip);
    resolveAdd({ reactions: [{ emoji: '👍', count: 2, reacted: true }] });
    await waitFor(() => expect(api.addReaction).toHaveBeenCalledTimes(1));
  });
});
