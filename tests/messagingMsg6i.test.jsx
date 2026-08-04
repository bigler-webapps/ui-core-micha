// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options && Object.keys(options).length ? `${key}:${JSON.stringify(options)}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AttachmentList } from '../src/messaging/AttachmentList';
import { AuthContext } from '../src/auth/AuthContext';
import { Composer } from '../src/messaging/Composer';
import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { PollCard } from '../src/messaging/PollCard';
import { QUICK_EMOJIS } from '../src/messaging/ReactionBar';
import { Thread } from '../src/messaging/Thread';

function makeApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    getAttachment: vi.fn().mockResolvedValue(new Blob(['bytes'], { type: 'image/jpeg' })),
    getAttachmentThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' })),
    createMessage: vi.fn(), uploadAttachments: vi.fn(),
    ...overrides,
  };
}

afterEach(cleanup);

describe('MSG-6i: attachment tile size, poll spacing/denominator, Composer emoji picker', () => {
  it('1. an attachment tile renders at 120x120 (image and non-image)', async () => {
    const image = { id: 'a1', filename: 'photo.jpg', content_type: 'image/jpeg' };
    const file = { id: 'a2', filename: 'doc.pdf', content_type: 'application/pdf' };
    render(<MessagingProvider api={makeApi()} active={false}><AttachmentList attachments={[image, file]} /></MessagingProvider>);
    const tiles = await screen.findAllByRole('button');
    const gallery = tiles.filter((tile) => tile.getAttribute('title') === 'photo.jpg' || tile.getAttribute('title') === 'doc.pdf');
    expect(gallery).toHaveLength(2);
    gallery.forEach((tile) => {
      // MUI applies `sx={{ width, height }}` via a generated CSS class, not
      // an inline style attribute -- read the resolved value instead.
      expect(getComputedStyle(tile).width).toBe('120px');
      expect(getComputedStyle(tile).height).toBe('120px');
    });
  });

  it('2. poll percentage denominator is the count of distinct respondents, not sum(vote_count) -- must fail against the old sum(vote_count) code for a multi-select poll where one voter picked two options', () => {
    // One respondent (voter-1) voted for both options. sum(vote_count) = 2,
    // respondent count = 1. Old code: 1/2 = 50% each. New code: 1/1 = 100% each.
    const poll = {
      id: 'poll-1', question: 'Q', allow_multiple: true, closed_at: null,
      options: [
        { id: 'opt-a', text: 'A', order: 0, vote_count: 1, voters: ['voter-1'] },
        { id: 'opt-b', text: 'B', order: 1, vote_count: 1, voters: ['voter-1'] },
      ],
    };
    render(<MessagingProvider api={makeApi()} active={false}><PollCard message={{ id: 'msg-1', poll }} /></MessagingProvider>);
    const results = screen.getAllByText(/MessagingPoll\.OPTION_RESULT/);
    expect(results).toHaveLength(2);
    results.forEach((node) => {
      expect(node.textContent).toMatch(/"count":1/);
      expect(node.textContent).toMatch(/"percent":100/);
    });
  });

  it('3. poll percentage denominator: zero respondents still renders 0%, never NaN (no regression)', () => {
    const poll = {
      id: 'poll-2', question: 'Q', allow_multiple: false, closed_at: null,
      options: [
        { id: 'opt-a', text: 'A', order: 0, vote_count: 0, voters: [] },
        { id: 'opt-b', text: 'B', order: 1, vote_count: 0, voters: [] },
      ],
    };
    render(<MessagingProvider api={makeApi()} active={false}><PollCard message={{ id: 'msg-2', poll }} /></MessagingProvider>);
    const results = screen.getAllByText(/MessagingPoll\.OPTION_RESULT/);
    results.forEach((node) => {
      expect(node.textContent).toMatch(/"count":0/);
      expect(node.textContent).toMatch(/"percent":0/);
      expect(node.textContent).not.toMatch(/NaN/);
    });
  });

  it('4. the Composer emoji picker shows more than 5 options (the wider curated grid, not ReactionBar\'s QUICK_EMOJIS)', async () => {
    const api = makeApi();
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.ADD_EMOJI' }));
    const grid = await screen.findByRole('group', { name: 'MessagingComposer.EMOJI_PICKER' });
    const emojiButtons = grid.querySelectorAll('button');
    expect(emojiButtons.length).toBeGreaterThan(5);
  });

  it('4b. selecting an emoji from the Composer grid inserts it at the cursor position, not appended', async () => {
    const api = makeApi();
    render(<MessagingProvider api={api} active={false}><Composer conversationId={4} /></MessagingProvider>);
    const input = screen.getByLabelText('MessagingComposer.MESSAGE');
    fireEvent.change(input, { target: { value: 'abCD' } });
    input.setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.ADD_EMOJI' }));
    const grid = await screen.findByRole('group', { name: 'MessagingComposer.EMOJI_PICKER' });
    fireEvent.click(within(grid).getByRole('button', { name: '😀' }));
    await waitFor(() => expect(input.value).toBe('ab😀CD'));
  });

  it('5. ReactionBar\'s own QUICK_EMOJIS stays exactly 5, unaffected by the wider Composer picker', () => {
    expect(QUICK_EMOJIS).toHaveLength(5);
  });

  it('6. Thread\'s root Stack and scroll Box carry flex:1/minHeight:0 (MSG-18 companion fix), so it can shrink inside a host\'s flex-column layout', async () => {
    const api = makeApi({
      listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, kind: 'group' }] }),
      listMessages: vi.fn().mockResolvedValue({ results: [{ id: 2, conversation_id: 1, body: 'hi' }], next_cursor: null }),
      listThread: vi.fn().mockResolvedValue({ results: [] }),
      getReadStatus: vi.fn().mockResolvedValue({ all_read: true }),
    });
    render(
      <AuthContext.Provider value={{ user: { id: 9 } }}>
        <MessagingProvider api={api}><Thread conversationId={1} /></MessagingProvider>
      </AuthContext.Provider>,
    );
    const timeline = await screen.findByLabelText('MessagingThread.TIMELINE');
    // The scroll Box is a direct child of Thread's root Stack.
    const rootStack = timeline.parentElement;
    [timeline, rootStack].forEach((el) => {
      expect(getComputedStyle(el).flexGrow).toBe('1');
      expect(getComputedStyle(el).minHeight).toBe('0px');
    });
    // maxHeight stays as the fallback cap for a host that doesn't flex-wrap Thread.
    expect(getComputedStyle(timeline).maxHeight).toBe('560px');
  });
});
