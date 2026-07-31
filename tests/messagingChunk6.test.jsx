// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

let frameHandler;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.count != null ? `${key}:${options.count}` : key, i18n: { language: 'en' } }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: (_envelope, handler) => { frameHandler = handler; return () => {}; }, onReconnect: () => () => {} }) }));

import { Composer } from '../src/messaging/Composer';
import { ConversationList } from '../src/messaging/ConversationList';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Thread } from '../src/messaging/Thread';

function makeApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }),
    listMessages: vi.fn().mockResolvedValue({ results: [] }),
    listThread: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false, delivered_count: 2 }),
    markConversationRead: vi.fn().mockResolvedValue({}), markThreadRead: vi.fn().mockResolvedValue({}),
    createPoll: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); frameHandler = undefined; });

describe('MSG-3b chunk 6', () => {
  it('renders localized relative list timestamps for now, minutes, hours, and days', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-31T12:00:00Z').getTime());
    const api = makeApi({ listConversations: vi.fn().mockResolvedValue({ results: [
      { id: 1, title: 'Now', last_message_at: '2026-07-31T11:59:50Z' },
      { id: 2, title: 'Minutes', last_message_at: '2026-07-31T11:55:00Z' },
      { id: 3, title: 'Hours', last_message_at: '2026-07-31T09:00:00Z' },
      { id: 4, title: 'Days', last_message_at: '2026-07-29T12:00:00Z' },
    ] }) });
    render(<MessagingProvider api={api}><ConversationList /></MessagingProvider>);
    await screen.findByText('Now');
    expect(screen.getByText('now')).toBeTruthy();
    expect(screen.getByText(/5m/)).toBeTruthy();
    expect(screen.getByText(/3h/)).toBeTruthy();
    expect(screen.getByText(/2d/)).toBeTruthy();
  });

  it('auto-scrolls only for active-conversation messages when the reader was near the bottom', async () => {
    const api = makeApi({ listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1, kind: 'group' }] }), listMessages: vi.fn().mockResolvedValue({ results: [{ id: 1, conversation_id: 1, body: 'First' }] }) });
    render(<MessagingProvider api={api} activeConversationId={1}><Thread conversationId={1} /></MessagingProvider>);
    const timeline = await screen.findByLabelText('MessagingThread.TIMELINE');
    Object.defineProperties(timeline, { scrollHeight: { configurable: true, value: 1000 }, clientHeight: { configurable: true, value: 300 }, scrollTop: { configurable: true, writable: true, value: 690 } });
    timeline.scrollTo = vi.fn();
    fireEvent.scroll(timeline);
    frameHandler({ type: 'message', conversation_id: 1, message: { id: 2, body: 'Near bottom' } });
    await waitFor(() => expect(timeline.scrollTo).toHaveBeenCalledTimes(1));
    timeline.scrollTo.mockClear(); timeline.scrollTop = 100;
    fireEvent.scroll(timeline);
    frameHandler({ type: 'message', conversation_id: 1, message: { id: 3, body: 'Reading history' } });
    await screen.findByText('Reading history');
    expect(timeline.scrollTo).not.toHaveBeenCalled();
  });

  it('renders announcement deep links only with a host handler and supplies its exact target', () => {
    const onAnnouncementLink = vi.fn();
    const message = { id: 3, kind: 'announcement', title: 'Notice', body: 'Read this', link_target: '/events/7' };
    const bubble = (props) => <MessagingProvider api={makeApi()} active={false}><MessageBubble {...props} /></MessagingProvider>;
    const view = render(bubble({ message, onAnnouncementLink }));
    fireEvent.click(screen.getByRole('button', { name: 'MessagingAnnouncement.OPEN_LINK' }));
    expect(onAnnouncementLink).toHaveBeenCalledWith('/events/7');
    view.rerender(bubble({ message }));
    expect(screen.queryByRole('button', { name: 'MessagingAnnouncement.OPEN_LINK' })).toBeNull();
    view.rerender(bubble({ message: { ...message, link_target: null }, onAnnouncementLink }));
    expect(screen.queryByRole('button', { name: 'MessagingAnnouncement.OPEN_LINK' })).toBeNull();
  });

  it('shows senders for group messages and suppresses them for direct messages', () => {
    const message = { id: 4, body: 'Hi', sender: { display_name: 'Ava' } };
    const bubble = (conversation) => <MessagingProvider api={makeApi()} active={false}><MessageBubble message={message} conversation={conversation} /></MessagingProvider>;
    const view = render(bubble({ kind: 'group' }));
    expect(screen.getByText('Ava')).toBeTruthy();
    view.rerender(bubble({ kind: 'direct' }));
    expect(screen.queryByText('Ava')).toBeNull();
  });

  it('opens receipt recipients by click for non-direct conversations and never exposes direct details', async () => {
    const api = makeApi({ getReadStatus: vi.fn().mockResolvedValue({ all_read: false, delivered_count: 2, recipient_detail: [{ display_name: 'Ava' }] }) });
    const view = render(<MessagingProvider api={api} active={false}><ReadTicks messageId={7} conversation={{ kind: 'group' }} /></MessagingProvider>);
    const detail = await screen.findByRole('button', { name: 'MessagingReadTicks.DELIVERED:2' });
    fireEvent.click(detail);
    expect(await screen.findByText('Ava')).toBeTruthy();
    view.unmount();
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId={7} conversation={{ kind: 'direct' }} /></MessagingProvider>);
    await screen.findByLabelText('MessagingReadTicks.DELIVERED:2');
    expect(screen.queryByRole('button', { name: 'MessagingReadTicks.DELIVERED:2' })).toBeNull();
    expect(screen.queryByText('Ava')).toBeNull();
  });

  it('caps poll composer options at ten without changing the existing two-option start', () => {
    render(<MessagingProvider api={makeApi()} active={false}><Composer conversationId={1} /></MessagingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingPoll.CREATE' }));
    const addOption = screen.getByRole('button', { name: 'MessagingPoll.ADD_OPTION' });
    expect(screen.getAllByLabelText(/MessagingPoll.OPTION/)).toHaveLength(2);
    for (let count = 0; count < 8; count += 1) fireEvent.click(addOption);
    expect(screen.getAllByLabelText(/MessagingPoll.OPTION/)).toHaveLength(10);
    expect(addOption.disabled).toBe(true);
  });
});
