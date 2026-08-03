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

import { AuthContext } from '../src/auth/AuthContext';
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

// A genuinely server-shaped serialize_poll payload (django_core_micha
// serializers.py:52-64): id/question/allow_multiple/closed_at/created_by_id,
// options carry {id,text,order,vote_count,voters} — never selected/voted
// flags, never created_by as an object. voted_option_ids is added ONLY on
// the vote/create/close REST responses (views.py _poll_response), never here.
function serverPoll(overrides = {}) {
  return {
    id: 'poll-1', question: 'Where should we meet?', allow_multiple: false, closed_at: null, created_by_id: 'user-9',
    options: [
      { id: 'opt-a', text: 'Library', order: 0, vote_count: 2, voters: ['user-1', 'user-2'] },
      { id: 'opt-b', text: 'Cafe', order: 1, vote_count: 1, voters: ['user-3'] },
    ],
    ...overrides,
  };
}
function State() { const { cache } = useMessaging(); return <output data-testid="cache">{JSON.stringify(cache)}</output>; }
// PollCard is a "dumb" prop-driven component (matches Thread.jsx's usage,
// which passes down cache.messages[id] directly) — it does not subscribe to
// the cache itself. A live-frame test must read the message back out of the
// cache, not hold a static prop, or it can never observe a frame update.
function ConnectedPollCard({ messageId }) {
  const { cache } = useMessaging();
  return <PollCard message={cache.messages[messageId]} />;
}

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('poll rendering against the real server contract', () => {
  it('renders question, options and proportional vote counts from a server-shaped payload', () => {
    // totalVotes = 2 + 1 = 3 -> Library 67%, Cafe 33%.
    render(<MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll: serverPoll() }} /></MessagingProvider>);
    expect(screen.getByText('Where should we meet?')).toBeTruthy();
    expect(screen.getByText('Library')).toBeTruthy();
    expect(screen.getByText(/MessagingPoll\.OPTION_RESULT.*"count":2.*"percent":67/)).toBeTruthy();
    expect(screen.getByText('Cafe')).toBeTruthy();
    expect(screen.getByText(/MessagingPoll\.OPTION_RESULT.*"count":1.*"percent":33/)).toBeTruthy();
  });

  it('derives selection from voted_option_ids (REST-only) and marks the viewer\'s own vote', () => {
    // Single-choice (allow_multiple: false) renders radios, not checkboxes --
    // native radio semantics match the WO's "tapping a different option moves
    // the vote, tapping the same one is a no-op" design directly.
    const poll = serverPoll({ voted_option_ids: ['opt-a'] });
    render(<MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll }} /></MessagingProvider>);
    const radios = screen.getAllByRole('radio');
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
    // Count/percent and the viewer's own vote both live in the accessible
    // name, not conveyed by the bar's width alone (WO accessibility risk).
    expect(radios[0].getAttribute('aria-label')).toMatch(/Library.*MessagingPoll\.OPTION_RESULT.*MessagingPoll\.YOU_VOTED/);
    expect(radios[1].getAttribute('aria-label')).not.toMatch(/YOU_VOTED/);
  });

  it('does not clear or invert the viewer\'s own vote when a poll_updated frame carries no voted_option_ids', async () => {
    const api = baseApi();
    const votedPoll = serverPoll({ voted_option_ids: ['opt-a'] });
    render(<MessagingProvider api={api} active={false}><ConnectedPollCard messageId="msg-1" /><State /></MessagingProvider>);
    // Seed the cache the way a real poll message arrives: a `message` frame
    // (kind: 'poll') carrying the just-voted poll, exactly as this viewer's
    // own castPollVote reconciliation would leave it — not a static prop the
    // component can never observe a later frame update against.
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'seed', conversation_id: 'conv-1', message: { id: 'msg-1', conversation_id: 'conv-1', kind: 'poll', poll: votedPoll } });
    await waitFor(() => expect(screen.getAllByRole('radio')[0].checked).toBe(true));
    // The real poll_updated frame shape: payload.poll is a bare serialize_poll
    // result (verified against services.py's _poll_updated_payload) — never
    // carries voted_option_ids. A vote_count bump from another viewer must
    // not touch this viewer's own selection.
    dispatchMessagingFrame({
      envelope: 'messaging', type: 'poll_updated', event_id: 'evt-1', conversation_id: 'conv-1', message_id: 'msg-1', poll_id: 'poll-1',
      poll: { ...serverPoll(), options: [{ id: 'opt-a', text: 'Library', order: 0, vote_count: 3, voters: ['user-1', 'user-2', 'user-4'] }, { id: 'opt-b', text: 'Cafe', order: 1, vote_count: 1, voters: ['user-3'] }] },
    });
    await waitFor(() => expect(screen.getByText(/MessagingPoll\.OPTION_RESULT.*"count":3/)).toBeTruthy());
    // The frame carries no voted_option_ids at all — the viewer's REST-known
    // vote must be carried forward, not wiped, by this update.
    expect(screen.getAllByRole('radio')[0].checked).toBe(true);
  });

  it('grants close only to the poll creator (created_by_id) or a host override, never a guess from an object shape', () => {
    const poll = serverPoll({ created_by_id: 'user-9' });
    const { rerender } = render(<AuthContext.Provider value={{ user: { id: 'user-9' } }}><MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll }} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.getByRole('button', { name: 'MessagingPoll.CLOSE' })).toBeTruthy();
    rerender(<AuthContext.Provider value={{ user: { id: 'user-2' } }}><MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll }} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.queryByRole('button', { name: 'MessagingPoll.CLOSE' })).toBeNull();
    rerender(<AuthContext.Provider value={{ user: { id: 'user-2' } }}><MessagingProvider api={baseApi()} active={false}><PollCard canClose message={{ id: 'msg-1', poll }} /></MessagingProvider></AuthContext.Provider>);
    expect(screen.getByRole('button', { name: 'MessagingPoll.CLOSE' })).toBeTruthy();
  });

  it('disables voting once the poll is closed and shows a closed indicator, not merely a missing button', () => {
    // With no separate submit button (MSG-6g), "closed" can no longer be
    // inferred from its absence -- must be an explicit, visible indicator.
    const poll = serverPoll({ closed_at: '2026-07-31T10:00:00Z' });
    render(<MessagingProvider api={baseApi()} active={false}><PollCard message={{ id: 'msg-1', poll }} /></MessagingProvider>);
    screen.getAllByRole('radio').forEach((radio) => expect(radio.disabled).toBe(true));
    expect(screen.getByText('MessagingPoll.CLOSED')).toBeTruthy();
  });
});
