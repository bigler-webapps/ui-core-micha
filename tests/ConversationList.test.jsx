// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { ConversationList } from '../src/messaging/ConversationList';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

function renderList(api, props = {}) {
  return render(<MessagingProvider api={api}><ConversationList onOpen={props.onOpen} {...props} /></MessagingProvider>);
}

describe('ConversationList', () => {
  let api;
  beforeEach(() => {
    api = {
      listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, title: 'First', unread_count: 2, last_message: { excerpt: 'Hello' } }], next_cursor: 'opaque-cursor' }),
      getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 2, by_conversation: { 1: 2 } }),
      listMessages: vi.fn().mockResolvedValue({ results: [] }),
      archiveConversation: vi.fn().mockResolvedValue({ id: 1, archived: true }),
      patchConversationPreferences: vi.fn().mockResolvedValue({ id: 1, muted: true }),
      createGroupConversation: vi.fn().mockResolvedValue({ id: 4, title: 'Volunteers', kind: 'group' }),
      createBroadcastConversation: vi.fn().mockResolvedValue({ id: 5, title: 'Announcements', kind: 'broadcast' }),
    };
  });
  afterEach(cleanup);

  it('loads the next opaque cursor page without offset assumptions', async () => {
    api.listConversations.mockResolvedValueOnce({ results: [{ id: 1, title: 'First' }], next_cursor: 'opaque-cursor' }).mockResolvedValueOnce({ results: [{ id: 2, title: 'Second' }], next_cursor: null });
    renderList(api);
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingList.LOAD_MORE' }));
    await screen.findByText('Second');
    // Append, not replace: the first page's item must still be present.
    expect(screen.getByText('First')).toBeTruthy();
    expect(api.listConversations).toHaveBeenLastCalledWith({ cursor: 'opaque-cursor' });
  });

  it('opens host-provided group and broadcast launchers into normalized list state', async () => {
    const onOpen = vi.fn();
    renderList(api, { onOpen, groupLaunchers: [{ id: 'volunteers', label: 'Volunteers', payload: { title: 'Volunteers' } }], broadcastLauncher: { label: 'Announcements', payload: {} } });
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'Volunteers' }));
    await waitFor(() => expect(api.createGroupConversation).toHaveBeenCalledWith({ title: 'Volunteers' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
    fireEvent.click(screen.getByRole('button', { name: 'Announcements' }));
    await waitFor(() => expect(api.createBroadcastConversation).toHaveBeenCalled());
    // Once opened it becomes a normal (unread/preview-bearing) list row; the
    // static launcher button must not keep showing it a second time.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Announcements' })).toBeNull());
  });

  it('resolves a direct conversation\'s title via the host-supplied resolveDirectUserName, falling back to the generic label when absent', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [
        { id: 6, kind: 'direct', other_user_id: 42, last_message: { excerpt: 'Hi' } },
        { id: 7, kind: 'direct', other_user_id: 99, last_message: { excerpt: 'Hey' } },
      ],
      next_cursor: null,
    });
    const resolveDirectUserName = vi.fn((userId) => (userId === 42 ? 'Alex' : null));
    renderList(api, { resolveDirectUserName });
    await screen.findByText('Alex');
    expect(resolveDirectUserName).toHaveBeenCalledWith(42);
    expect(screen.getByText('MessagingList.UNTITLED')).toBeTruthy();
  });

  it('does not call resolveDirectUserName for non-direct conversations', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [{ id: 8, kind: 'group', title: 'Ops', other_user_id: 42, last_message: { excerpt: 'Hi' } }],
      next_cursor: null,
    });
    const resolveDirectUserName = vi.fn(() => 'Should not be used');
    renderList(api, { resolveDirectUserName });
    await screen.findByText('Ops');
    expect(resolveDirectUserName).not.toHaveBeenCalled();
  });

  it('calls resolveManagedLabel for a broadcast conversation, not just managed -- must fail against the kind-gated code (MSG-6f scope A)', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [{ id: 9, kind: 'broadcast', external_key: 'broadcast', title: null, last_message: { excerpt: 'Hi all' } }],
      next_cursor: null,
    });
    const resolveManagedLabel = vi.fn((conversation) => (conversation.kind === 'broadcast' ? 'Event-Ankündigungen' : null));
    renderList(api, { resolveManagedLabel });
    await screen.findByText('Event-Ankündigungen');
    expect(resolveManagedLabel).toHaveBeenCalledWith(expect.objectContaining({ id: 9, kind: 'broadcast' }));
  });

  it('falls through to the existing title chain unchanged when resolveManagedLabel returns null, for any kind', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [{ id: 10, kind: 'broadcast', title: null, last_message: { excerpt: 'Hi' } }],
      next_cursor: null,
    });
    const resolveManagedLabel = vi.fn(() => null);
    renderList(api, { resolveManagedLabel });
    await screen.findByText('MessagingList.UNTITLED');
    expect(resolveManagedLabel).toHaveBeenCalled();
  });

  it('a truthy resolveManagedLabel wins over resolveDirectUserName for a direct conversation -- documents the new precedence, not previously reachable when the gate excluded every kind but managed', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [{ id: 12, kind: 'direct', other_user_id: 42, title: null, last_message: { excerpt: 'Hi' } }],
      next_cursor: null,
    });
    const resolveManagedLabel = vi.fn(() => 'Host label wins');
    const resolveDirectUserName = vi.fn(() => 'Alex');
    renderList(api, { resolveManagedLabel, resolveDirectUserName });
    await screen.findByText('Host label wins');
    // resolveManagedLabel is checked first, unconditionally -- a host whose
    // resolver ever returns non-null for kind: 'direct' pre-empts the
    // id-based resolveDirectUserName lookup entirely. Deliberate per the
    // WO's delegation contract (a host is trusted to return null for kinds
    // it doesn't handle), but was structurally impossible before this WO
    // (the old kind === 'managed' gate excluded every other kind), so it is
    // now a real, if host-controlled, precedence a resolver author must know.
    expect(resolveDirectUserName).not.toHaveBeenCalled();
  });

  it('keeps managed event_all/event_team labelling unchanged (regression guard)', async () => {
    api.listConversations.mockResolvedValueOnce({
      results: [{ id: 11, kind: 'managed', external_key: 'event_all', title: null, last_message: { excerpt: 'Hi' } }],
      next_cursor: null,
    });
    const resolveManagedLabel = vi.fn((conversation) => (conversation.external_key === 'event_all' ? 'Alle - Sommerlager' : null));
    renderList(api, { resolveManagedLabel });
    await screen.findByText('Alle - Sommerlager');
    expect(resolveManagedLabel).toHaveBeenCalledWith(expect.objectContaining({ id: 11, kind: 'managed', external_key: 'event_all' }));
  });

  it('wires mute and archive through participant APIs', async () => {
    renderList(api);
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingList.ACTIONS' }));
    fireEvent.click(screen.getByText('MessagingList.MUTE'));
    await waitFor(() => expect(api.patchConversationPreferences).toHaveBeenCalledWith(1, { muted: true }));
    fireEvent.click(screen.getByRole('button', { name: 'MessagingList.ACTIONS' }));
    fireEvent.click(screen.getByText('MessagingList.ARCHIVE'));
    await waitFor(() => expect(api.archiveConversation).toHaveBeenCalledWith(1, true));
  });
});
