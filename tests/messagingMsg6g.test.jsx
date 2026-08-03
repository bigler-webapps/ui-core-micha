// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options && Object.keys(options).length ? `${key}:${JSON.stringify(options)}` : key }) }));

const realtimeSubscribers = new Map();
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (envelope, handler) => { realtimeSubscribers.set(envelope, handler); return () => realtimeSubscribers.delete(envelope); },
    onReconnect: () => () => {},
  }),
}));
function dispatchMessagingFrame(frame) { realtimeSubscribers.get('messaging')?.(frame); }

import { PollCard } from '../src/messaging/PollCard';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';

function baseApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    votePoll: vi.fn(), closePoll: vi.fn(),
    ...overrides,
  };
}
function serverPoll(overrides = {}) {
  return {
    id: 'poll-1', question: 'Q', allow_multiple: false, closed_at: null, created_by_id: 'user-9',
    options: [
      { id: 'opt-a', text: 'A', order: 0, vote_count: 0, voters: [] },
      { id: 'opt-b', text: 'B', order: 1, vote_count: 0, voters: [] },
    ],
    ...overrides,
  };
}
function ConnectedPollCard({ messageId }) {
  const { cache } = useMessaging();
  return <PollCard message={cache.messages[messageId]} />;
}
function CachePollState({ messageId }) {
  const { cache } = useMessaging();
  return <output data-testid="cache-poll">{JSON.stringify(cache.messages[messageId]?.poll)}</output>;
}

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('MSG-6g: tap-to-vote poll UI with result bars', () => {
  it('1. single-choice: tapping an option votes without further interaction; tapping a second option moves the vote', async () => {
    const api = baseApi();
    api.votePoll.mockResolvedValueOnce({ poll: { ...serverPoll(), voted_option_ids: ['opt-a'], options: [{ id: 'opt-a', text: 'A', order: 0, vote_count: 1, voters: ['me'] }, { id: 'opt-b', text: 'B', order: 1, vote_count: 0, voters: [] }] } });
    api.votePoll.mockResolvedValueOnce({ poll: { ...serverPoll(), voted_option_ids: ['opt-b'], options: [{ id: 'opt-a', text: 'A', order: 0, vote_count: 0, voters: [] }, { id: 'opt-b', text: 'B', order: 1, vote_count: 1, voters: ['me'] }] } });
    render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll() }} /></MessagingProvider>);
    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[0]);
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith('poll-1', ['opt-a']));
    expect(radios[0].checked).toBe(true);

    fireEvent.click(radios[1]);
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith('poll-1', ['opt-b']));
    await waitFor(() => expect(radios[1].checked).toBe(true));
    expect(radios[0].checked).toBe(false);
  });

  it('2. multi-select: tapping toggles one option on and off, and each tap sends the complete option-id set', async () => {
    const api = baseApi();
    api.votePoll.mockResolvedValue({ poll: serverPoll({ allow_multiple: true }) });
    render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll({ allow_multiple: true }) }} /></MessagingProvider>);
    const checkboxes = screen.getAllByRole('checkbox');

    fireEvent.click(checkboxes[0]);
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith('poll-1', ['opt-a']));
    fireEvent.click(checkboxes[1]);
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith('poll-1', ['opt-a', 'opt-b']));
    fireEvent.click(checkboxes[0]);
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith('poll-1', ['opt-b']));
    expect(api.votePoll).toHaveBeenCalledTimes(3);
  });

  it('3. a rejected vote reverts the optimistic state and surfaces an error -- the reverted value, not merely an error message', async () => {
    const api = baseApi();
    api.votePoll.mockRejectedValue({ response: { data: { detail: 'Voting disabled' } } });
    render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll() }} /></MessagingProvider>);
    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[0]);
    // Optimistic: briefly checked before the rejection resolves.
    await waitFor(() => expect(radios[0].checked).toBe(true));
    await screen.findByRole('alert');
    await waitFor(() => expect(radios[0].checked).toBe(false));
    expect(radios[1].checked).toBe(false);
  });

  it('4. bars render proportionally, including the zero-vote case, with no NaN and no division error', () => {
    render(<MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll() }} /></MessagingProvider>);
    // vote_count 0/0 for both options -> 0%, never NaN%.
    const results = screen.getAllByText(/MessagingPoll\.OPTION_RESULT/);
    expect(results).toHaveLength(2);
    results.forEach((node) => {
      expect(node.textContent).toMatch(/"count":0/);
      expect(node.textContent).toMatch(/"percent":0/);
      expect(node.textContent).not.toMatch(/NaN/);
    });
  });

  it('5. the viewer\'s own selection survives a poll_updated frame that does not carry voted_option_ids (merge-trap guard)', async () => {
    const api = baseApi();
    render(<MessagingProvider api={api} active={false}><ConnectedPollCard messageId="msg-1" /></MessagingProvider>);
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'seed', conversation_id: 'conv-1', message: { id: 'msg-1', conversation_id: 'conv-1', kind: 'poll', poll: serverPoll({ voted_option_ids: ['opt-a'], options: [{ id: 'opt-a', text: 'A', order: 0, vote_count: 1, voters: ['me'] }, { id: 'opt-b', text: 'B', order: 1, vote_count: 0, voters: [] }] }) } });
    await waitFor(() => expect(screen.getAllByRole('radio')[0].checked).toBe(true));

    // A poll_updated frame never carries voted_option_ids (dcm's serialize_poll
    // is viewer-independent) -- must not wipe the REST-known selection.
    dispatchMessagingFrame({
      envelope: 'messaging', type: 'poll_updated', event_id: 'evt-1', conversation_id: 'conv-1', message_id: 'msg-1', poll_id: 'poll-1',
      poll: serverPoll({ options: [{ id: 'opt-a', text: 'A', order: 0, vote_count: 2, voters: ['me', 'other'] }, { id: 'opt-b', text: 'B', order: 1, vote_count: 0, voters: [] }] }),
    });
    await waitFor(() => expect(screen.getByText(/MessagingPoll\.OPTION_RESULT.*"count":2/)).toBeTruthy());
    expect(screen.getAllByRole('radio')[0].checked).toBe(true);
  });

  it('6. a closed poll is non-interactive: tapping an option does nothing and issues no request', () => {
    const api = baseApi();
    render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll({ closed_at: '2026-08-01T00:00:00Z' }) }} /></MessagingProvider>);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);
    expect(api.votePoll).not.toHaveBeenCalled();
    expect(radios[0].checked).toBe(false);
  });

  it('a rapid switch (A then B, before the first vote confirms) projects counts from the freshest cache state, not a stale prop (regression)', async () => {
    // MessagingProvider.castPollVote must build its optimistic count delta from
    // `previousPoll` (freshly read from the shared cache at call time), never
    // from the caller-supplied `poll` argument. PollCard is deliberately given
    // a STATIC message prop here (never re-rendered with a fresh one between
    // taps, exactly like PollCard's own documented "dumb, prop-driven"
    // contract, and exactly how a host that doesn't re-connect it to live
    // cache updates would behave) -- a separate, genuinely cache-connected
    // reader (CachePollState) is what must show the correct number. Starting
    // counts are non-zero so a wrong baseline isn't masked by the
    // Math.max(0, ...) clamp.
    const api = baseApi();
    api.votePoll.mockReturnValue(new Promise(() => {})); // never resolves -- isolate the optimistic phase
    const seedPoll = serverPoll({
      voted_option_ids: [],
      options: [
        { id: 'opt-a', text: 'A', order: 0, vote_count: 5, voters: ['u1', 'u2', 'u3', 'u4', 'u5'] },
        { id: 'opt-b', text: 'B', order: 1, vote_count: 2, voters: ['u6', 'u7'] },
      ],
    });
    render(<MessagingProvider api={api} active={false}><PollCard message={{ id: 'msg-1', poll: seedPoll }} /><CachePollState messageId="msg-1" /></MessagingProvider>);
    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[0]); // vote A: 5 -> 6
    await waitFor(() => expect(JSON.parse(screen.getByTestId('cache-poll').textContent).options.find((option) => option.id === 'opt-a').vote_count).toBe(6));

    fireEvent.click(radios[1]); // switch to B: A must go 6 -> 5 in the shared cache (a stale-prop baseline of 5 would wrongly compute 4)
    await waitFor(() => {
      const poll = JSON.parse(screen.getByTestId('cache-poll').textContent);
      expect(poll.options.find((option) => option.id === 'opt-a').vote_count).toBe(5);
      expect(poll.options.find((option) => option.id === 'opt-b').vote_count).toBe(3);
    });
  });
});
