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
      listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, title: 'First', unread_count: 2, last_message: { body: 'Hello' } }], next_cursor: 'opaque-cursor' }),
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
