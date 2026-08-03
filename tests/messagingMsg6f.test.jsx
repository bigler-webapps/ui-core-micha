// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Thread.jsx (scope C) subscribes to the messaging envelope independently of
// MessagingProvider's own subscription -- a Set of handlers per envelope, not
// one, so a dispatched frame reaches every current subscriber.
let frameHandlers;
function dispatchFrame(frame) { frameHandlers.forEach((handler) => handler(frame)); }
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options && Object.keys(options).length ? `${key}:${JSON.stringify(options)}` : key, i18n: { language: 'en' } }) }));
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (_envelope, handler) => { frameHandlers.add(handler); return () => frameHandlers.delete(handler); },
    onReconnect: () => () => {},
  }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';
import { Thread } from '../src/messaging/Thread';

const theme = createTheme();
function withTheme(children) { return <ThemeProvider theme={theme}>{children}</ThemeProvider>; }

function makeApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }),
    listMessages: vi.fn().mockResolvedValue({ results: [] }),
    listThread: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    markConversationRead: vi.fn().mockResolvedValue({}),
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false }),
    ...overrides,
  };
}

beforeEach(() => { frameHandlers = new Set(); });
afterEach(cleanup);

describe('MSG-6f scope B: read ratio vs two-state tick', () => {
  it('4a: a direct conversation renders a two-state tick, and the two states resolve to visibly different colours', async () => {
    const api = makeApi({ getReadStatus: vi.fn().mockResolvedValue({ all_read: false }) });
    const { rerender } = render(withTheme(
      <MessagingProvider api={api} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'direct' }} /></MessagingProvider>
    ));
    const sentIcon = await screen.findByLabelText('MessagingReadTicks.SENT');
    const sentColor = getComputedStyle(sentIcon).color;

    api.getReadStatus.mockResolvedValue({ all_read: true });
    cleanup();
    render(withTheme(
      <MessagingProvider api={api} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'direct' }} /></MessagingProvider>
    ));
    const readIcon = await screen.findByLabelText('MessagingReadTicks.ALL_READ');
    const readColor = getComputedStyle(readIcon).color;

    expect(sentColor).toBeTruthy();
    expect(readColor).toBeTruthy();
    expect(sentColor).not.toBe(readColor);
  });

  it('4b: a group WITH counts renders dcm\'s own read_count/recipient_count verbatim, never recomputed from recipientDetail (must fail if recomputed -- recipientDetail is not thresholded against this message\'s created_at, only dcm\'s own counts are)', async () => {
    // Deliberately inconsistent with read_count/recipient_count: every
    // participant has SOME last_read_at (e.g. from reading the conversation
    // long before this message existed), which is exactly the shape that
    // would make a naive "count non-null last_read_at" recomputation report
    // 40/40 -- the bug caught in review. dcm's own read_count (18) is the
    // only correct source; recipientDetail must not be trusted for the ratio.
    const allEverRead = Array.from({ length: 40 }, (_, i) => ({ user_id: `u-${i}`, last_read_at: '2020-01-01T00:00:00Z' }));
    const api = makeApi({ getReadStatus: vi.fn().mockResolvedValue({ all_read: false, read_count: 18, recipient_count: 40, recipient_detail: allEverRead }) });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'group' }} /></MessagingProvider>);
    const ratio = await screen.findByLabelText(/READ_RATIO/);
    expect(ratio.textContent).toBe('18/40');
    expect(document.body.querySelector('[data-testid="DoneOutlinedIcon"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="DoneAllOutlinedIcon"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Zugestellt/);
  });

  it('4c: a group WITHOUT counts (an ordinary participant) renders no indicator at all', async () => {
    const api = makeApi({ getReadStatus: vi.fn().mockResolvedValue({ all_read: false }) });
    const { container } = render(<MessagingProvider api={api} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'group' }} /></MessagingProvider>);
    await waitFor(() => expect(api.getReadStatus).toHaveBeenCalled());
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('5: all_read still renders the double check with its own unchanged label', async () => {
    const api = makeApi({ getReadStatus: vi.fn().mockResolvedValue({ all_read: true }) });
    render(<MessagingProvider api={api} active={false}><ReadTicks messageId="m1" conversation={{ id: 'c1', kind: 'direct' }} /></MessagingProvider>);
    const icon = await screen.findByLabelText('MessagingReadTicks.ALL_READ');
    expect(icon.getAttribute('data-testid')).toBe('DoneAllOutlinedIcon');
  });
});

describe('MSG-6f scope C: re-mark read on a live message frame for the open conversation', () => {
  function renderThread(api, { userId = 1 } = {}) {
    return render(
      <AuthContext.Provider value={{ user: { id: userId } }}>
        <MessagingProvider api={api}><Thread conversationId="c1" /></MessagingProvider>
      </AuthContext.Provider>
    );
  }

  it('marks read again when a message frame arrives for the currently-open conversation', async () => {
    const api = makeApi();
    renderThread(api);
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledTimes(1));
    api.markConversationRead.mockClear();

    act(() => dispatchFrame({ type: 'message', conversation_id: 'c1', message: { id: 'm2', conversation_id: 'c1', sender: { id: 2 } } }));

    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalled());
    expect(api.markConversationRead.mock.calls[0][0]).toBe('c1');
  });

  it('does not re-mark for a message frame belonging to a different conversation', async () => {
    const api = makeApi();
    renderThread(api);
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledTimes(1));
    api.markConversationRead.mockClear();

    act(() => dispatchFrame({ type: 'message', conversation_id: 'other-conversation', message: { id: 'm2' } }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.markConversationRead).not.toHaveBeenCalled();
  });

  it('does not re-mark while the document is hidden', async () => {
    const api = makeApi();
    renderThread(api);
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledTimes(1));
    api.markConversationRead.mockClear();

    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => dispatchFrame({ type: 'message', conversation_id: 'c1', message: { id: 'm2' } }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.markConversationRead).not.toHaveBeenCalled();
    visibilitySpy.mockRestore();
  });

  it('does not re-mark for a non-message frame type (e.g. reaction) for the same conversation', async () => {
    const api = makeApi();
    renderThread(api);
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledTimes(1));
    api.markConversationRead.mockClear();

    act(() => dispatchFrame({ type: 'reaction', conversation_id: 'c1', message_id: 'm2' }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.markConversationRead).not.toHaveBeenCalled();
  });
});
