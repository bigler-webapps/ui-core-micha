// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count !== undefined ? `${key}:${options.count}` : key, i18n: { language: 'en' } }) }));

const realtimeSubscribers = new Map();
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (envelope, handler) => { realtimeSubscribers.set(envelope, handler); return () => realtimeSubscribers.delete(envelope); },
    onReconnect: () => () => {},
  }),
}));
function dispatchMessagingFrame(frame) { realtimeSubscribers.get('messaging')?.(frame); }

import { ConversationList } from '../src/messaging/ConversationList';
import { Thread } from '../src/messaging/Thread';
import { applyFrame, MessagingProvider } from '../src/messaging/MessagingProvider';

// Server-shaped serialize_message output (django_core_micha/messaging/
// serializers.py:80-95): reply_count/last_reply_at always present;
// thread_last_read_at is REST-only and never on a frame — copied from the
// real _message_response/_message_page_response wiring in views.py, not
// hand-invented.
function serverRoot(overrides = {}) {
  return { id: 'root-1', conversation_id: 'conv-1', body: 'Root', sender_id: 'user-1', kind: 'chat', reply_count: 1, last_reply_at: '2026-08-01T09:00:00Z', thread_last_read_at: null, ...overrides };
}
function serverReply(overrides = {}) {
  return { id: 'reply-1', conversation_id: 'conv-1', body: 'Reply', sender_id: 'user-2', kind: 'chat', reply_to_id: 'root-1', reply_count: 0, last_reply_at: null, created_at: '2026-08-01T10:00:00Z', ...overrides };
}
function baseApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    markConversationRead: vi.fn().mockResolvedValue({}), markThreadRead: vi.fn(),
    ...overrides,
  };
}

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('the merge trap — thread_last_read_at must survive frames that never carry it', () => {
  function cache() { return { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } }; }

  it('a server-shaped message frame does not wipe a previously-fetched thread_last_read_at on an unrelated root', () => {
    const state = { ...cache(), messages: { 'root-1': serverRoot({ thread_last_read_at: '2026-08-01T08:00:00Z' }) } };
    // A brand-new, unrelated root message frame — server-shaped, no
    // thread_last_read_at key, exactly as serialize_message emits it.
    const next = applyFrame(state, { envelope: 'messaging', type: 'message', event_id: 'evt-1', conversation_id: 'conv-1', message: serverRoot({ id: 'root-2', thread_last_read_at: undefined, reply_to_id: undefined }) }, 'conv-1');
    expect(next.messages['root-1'].thread_last_read_at).toBe('2026-08-01T08:00:00Z');
  });

  it('a server-shaped message_edited frame does not wipe the edited root\'s own thread_last_read_at', () => {
    const state = { ...cache(), messages: { 'root-1': serverRoot({ thread_last_read_at: '2026-08-01T08:00:00Z', body: 'Before' }) } };
    const edited = serverRoot({ body: 'After', thread_last_read_at: undefined });
    delete edited.thread_last_read_at;
    const next = applyFrame(state, { envelope: 'messaging', type: 'message_edited', event_id: 'evt-2', conversation_id: 'conv-1', message_id: 'root-1', message: edited }, null);
    expect(next.messages['root-1'].thread_last_read_at).toBe('2026-08-01T08:00:00Z');
    expect(next.messages['root-1'].body).toBe('After');
  });

  it('a reply frame bumping a cached root\'s reply_count/last_reply_at does not wipe that root\'s thread_last_read_at — the WO\'s highest-risk path', () => {
    // The receipt is deliberately NEWER than the incoming reply, so
    // hasUnreadReplies-style logic would already read "read" before this
    // frame — if the bump wiped thread_last_read_at to null/undefined instead
    // of preserving it, that derived read-state would flip, which this
    // assertion catches directly (unlike a marker-visibility assertion,
    // which can't distinguish "correctly still read" from "field wiped to
    // null" — both render no marker).
    const state = { ...cache(), messages: { 'root-1': serverRoot({ reply_count: 1, last_reply_at: '2026-08-01T08:00:00Z', thread_last_read_at: '2026-08-01T09:00:00Z' }) } };
    const next = applyFrame(state, { envelope: 'messaging', type: 'message', event_id: 'evt-4', conversation_id: 'conv-1', message: serverReply({ id: 'reply-2', created_at: '2026-08-01T10:00:00Z' }) }, 'conv-1');
    expect(next.messages['root-1'].reply_count).toBe(2);
    expect(next.messages['root-1'].last_reply_at).toBe('2026-08-01T10:00:00Z');
    expect(next.messages['root-1'].thread_last_read_at).toBe('2026-08-01T09:00:00Z');
  });
});

describe('unread-reply marker logic', () => {
  it('shows when last_reply_at is newer than the receipt', async () => {
    const api = baseApi({ listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ last_reply_at: '2026-08-01T10:00:00Z', thread_last_read_at: '2026-08-01T09:00:00Z' })] }) });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.getByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeTruthy();
  });

  it('hides when the receipt is equal to or newer than last_reply_at', async () => {
    const api = baseApi({ listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ last_reply_at: '2026-08-01T09:00:00Z', thread_last_read_at: '2026-08-01T10:00:00Z' })] }) });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.queryByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeNull();
  });

  it('shows when the receipt is null and reply_count > 0', async () => {
    const api = baseApi({ listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ thread_last_read_at: null, reply_count: 2, last_reply_at: '2026-08-01T09:00:00Z' })] }) });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.getByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeTruthy();
  });

  it('renders no toggle and no marker at all when reply_count is 0', async () => {
    const api = baseApi({ listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ reply_count: 0, last_reply_at: null, thread_last_read_at: null })] }) });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.queryByText(/MessagingThread\.SHOW_REPLIES/)).toBeNull();
    expect(screen.queryByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeNull();
  });
});

describe('opening a thread marks it read from the REST response', () => {
  it('issues the REST read call and updates the cached receipt from last_read_at', async () => {
    const api = baseApi({
      listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ thread_last_read_at: null, reply_count: 1, last_reply_at: '2026-08-01T09:00:00Z' })] }),
      listThread: vi.fn().mockResolvedValue({ results: [] }),
      markThreadRead: vi.fn().mockResolvedValue({ last_read_at: '2026-08-01T12:00:00Z' }),
    });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText('Root');
    expect(screen.getByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeTruthy();
    fireEvent.click(screen.getByText(/MessagingThread\.SHOW_REPLIES/));
    await waitFor(() => expect(api.markThreadRead).toHaveBeenCalledWith('root-1', undefined));
    await waitFor(() => expect(screen.queryByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeNull());
  });
});

describe('live root update on an incoming reply', () => {
  it('raises reply_count/last_reply_at on the cached root and the marker appears without a refetch when the sender is not the viewer', async () => {
    const api = baseApi({ listMessages: vi.fn().mockResolvedValue({ results: [serverRoot({ reply_count: 1, last_reply_at: '2026-08-01T08:00:00Z', thread_last_read_at: '2026-08-01T08:30:00Z' })] }) });
    render(<MessagingProvider api={api} activeConversationId="conv-1"><Thread conversationId="conv-1" /></MessagingProvider>);
    await screen.findByText(/MessagingThread\.SHOW_REPLIES:1/);
    expect(screen.queryByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeNull();
    // A new reply from someone else — server-shaped message frame with
    // reply_to_id naming the cached root.
    dispatchMessagingFrame({ envelope: 'messaging', type: 'message', event_id: 'evt-3', conversation_id: 'conv-1', message: serverReply() });
    await waitFor(() => expect(screen.getByText(/MessagingThread\.SHOW_REPLIES:2/)).toBeTruthy());
    expect(screen.getByLabelText(/MessagingThread.UNREAD_REPLIES/)).toBeTruthy();
  });
});

describe('managed-conversation identity (row 42)', () => {
  it('renders two managed conversations with different external_key as distinguishable via a host resolver', async () => {
    const api = baseApi({
      listConversations: vi.fn().mockResolvedValue({ results: [
        { id: 'c1', kind: 'managed', external_key: 'all' },
        { id: 'c2', kind: 'managed', external_key: 'team' },
      ] }),
    });
    render(<MessagingProvider api={api}><ConversationList resolveManagedLabel={(conversation) => conversation.external_key === 'all' ? 'Everyone' : 'My team'} /></MessagingProvider>);
    await screen.findByText('Everyone');
    expect(screen.getByText('My team')).toBeTruthy();
  });

  it('falls back to the existing title behavior when no resolver is supplied', async () => {
    const api = baseApi({ listConversations: vi.fn().mockResolvedValue({ results: [{ id: 'c1', kind: 'managed', external_key: 'all', title: 'Fallback title' }] }) });
    render(<MessagingProvider api={api}><ConversationList /></MessagingProvider>);
    await screen.findByText('Fallback title');
  });

  it('no jg-specific vocabulary (event_all, event_team) appears anywhere in src/', () => {
    const root = path.resolve(import.meta.dirname, '..', 'src');
    const files = fs.readdirSync(root, { recursive: true }).filter((file) => typeof file === 'string' && /\.(jsx?|tsx?)$/.test(file));
    const offenders = files.filter((file) => {
      const contents = fs.readFileSync(path.join(root, file), 'utf8');
      return /event_all|event_team/.test(contents);
    });
    expect(offenders).toEqual([]);
  });
});
