// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

import { RealtimeContext } from '../src/notifications/realtime';
import { MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';

function Harness() { const { cache } = useMessaging(); return <output data-testid="cache">{JSON.stringify(cache)}</output>; }
function makeTransport() {
  const handlers = new Set(); const reconnectHandlers = new Set();
  return { subscribe: vi.fn((_envelope, handler) => { handlers.add(handler); return () => handlers.delete(handler); }), onReconnect: vi.fn((handler) => { reconnectHandlers.add(handler); return () => reconnectHandlers.delete(handler); }), frame: (frame) => handlers.forEach((handler) => handler(frame)), reconnect: () => reconnectHandlers.forEach((handler) => handler()) };
}
function renderProvider({ transport = makeTransport(), api, activeConversationId = 1, active } = {}) {
  const props = { api, activeConversationId, ...(active === undefined ? {} : { active }) };
  render(<RealtimeContext.Provider value={transport}><MessagingProvider {...props}><Harness /></MessagingProvider></RealtimeContext.Provider>);
  return transport;
}
const cache = () => JSON.parse(screen.getByTestId('cache').textContent);

describe('MessagingProvider', () => {
  it('deduplicates repeated event IDs and only changes the affected message slice', async () => {
    const api = { listConversations: vi.fn().mockResolvedValue({ results: [{ id: 1 }, { id: 2 }] }), listMessages: vi.fn().mockResolvedValue({ results: [{ id: 10, conversation_id: 2, body: 'unchanged' }] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }) };
    const transport = renderProvider({ api }); await waitFor(() => expect(api.listConversations).toHaveBeenCalled());
    const frame = { envelope: 'messaging', type: 'message', event_id: 'once', conversation_id: 1, message: { id: 11, body: 'new' } };
    act(() => { transport.frame(frame); transport.frame(frame); });
    expect(Object.keys(cache().messages)).toEqual(['10', '11']);
    expect(cache().messages['10'].body).toBe('unchanged');
  });

  it('refetches list, active thread and unread state when Layer 1 reconnects', async () => {
    const api = { listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }) };
    const transport = renderProvider({ api }); await waitFor(() => expect(api.listMessages).toHaveBeenCalledTimes(1));
    await act(async () => transport.reconnect());
    await waitFor(() => { expect(api.listConversations).toHaveBeenCalledTimes(2); expect(api.listMessages).toHaveBeenLastCalledWith(1); expect(api.getUnreadCount).toHaveBeenCalledTimes(2); });
  });

  it('does not call the authenticated-only REST surface while active=false, and starts fetching once it flips true', async () => {
    const api = { listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }) };
    const transport = makeTransport();
    const { rerender } = render(<RealtimeContext.Provider value={transport}><MessagingProvider api={api} activeConversationId={1} active={false}><Harness /></MessagingProvider></RealtimeContext.Provider>);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.listConversations).not.toHaveBeenCalled();
    expect(api.listMessages).not.toHaveBeenCalled();
    expect(api.getUnreadCount).not.toHaveBeenCalled();

    rerender(<RealtimeContext.Provider value={transport}><MessagingProvider api={api} activeConversationId={1} active><Harness /></MessagingProvider></RealtimeContext.Provider>);
    await waitFor(() => expect(api.listConversations).toHaveBeenCalledTimes(1));
  });
});
