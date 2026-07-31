// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.message ? `${key}:${options.message}` : (options?.sender ? `${key}:${options.sender}` : key) }) }));

const realtimeSubscribers = new Map();
vi.mock('../src/notifications/realtime', () => ({
  useRealtime: () => ({
    subscribe: (envelope, handler) => { realtimeSubscribers.set(envelope, handler); return () => realtimeSubscribers.delete(envelope); },
    onReconnect: () => () => {},
  }),
}));
function dispatchMessagingFrame(frame) { realtimeSubscribers.get('messaging')?.(frame); }

import { AuthContext } from '../src/auth/AuthContext';
import { AttachmentList } from '../src/messaging/AttachmentList';
import { Composer } from '../src/messaging/Composer';
import { messagingReducer, MessagingProvider, useMessaging } from '../src/messaging/MessagingProvider';

function State() { const { cache } = useMessaging(); return <output data-testid="cache">{JSON.stringify(cache)}</output>; }
function makeApi() {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    createMessage: vi.fn(), uploadAttachments: vi.fn(), getAttachment: vi.fn().mockResolvedValue(new Blob(['file'])), getAttachmentThumbnail: vi.fn().mockResolvedValue(new Blob(['image'], { type: 'image/png' })),
  };
}
function renderComposer(api, { userId } = {}) {
  const tree = <MessagingProvider api={api} active={false}><Composer conversationId={7} /><State /></MessagingProvider>;
  return render(userId ? <AuthContext.Provider value={{ user: { id: userId, username: 'me' } }}>{tree}</AuthContext.Provider> : tree);
}
function typeAndSend(text = 'hello') { fireEvent.change(screen.getByLabelText('MessagingComposer.MESSAGE'), { target: { value: text } }); fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' })); }
const state = () => JSON.parse(screen.getByTestId('cache').textContent);

afterEach(() => { cleanup(); realtimeSubscribers.clear(); });

describe('Composer optimistic send and attachments', () => {
  it('reconciles REST then websocket confirmation into exactly one row', () => {
    const pending = { id: 'local-r1', conversation_id: 7, client_request_id: 'r1', status: 'pending' };
    const rest = { id: 88, conversation_id: 7, body: 'hello', client_request_id: 'r1' };
    let next = messagingReducer({ conversations: {}, messages: {}, cursors: { conversations: null, messages: {}, threads: {} } }, { type: 'messageOptimistic', message: pending });
    next = messagingReducer(next, { type: 'messageReconciled', message: rest });
    next = messagingReducer(next, { type: 'frame', frame: { type: 'message', conversation_id: 7, message: rest } });
    expect(Object.values(next.messages)).toHaveLength(1);
    expect(next.messages[88].client_request_id).toBe('r1');
  });

  it('reconciles websocket then REST confirmation into exactly one row', () => {
    const pending = { id: 'local-r2', conversation_id: 7, client_request_id: 'r2', status: 'pending' };
    const websocket = { id: 89, conversation_id: 7, body: 'hello', client_request_id: 'r2' };
    let next = messagingReducer({ conversations: {}, messages: {}, cursors: { conversations: null, messages: {}, threads: {} } }, { type: 'messageOptimistic', message: pending });
    next = messagingReducer(next, { type: 'frame', frame: { type: 'message', conversation_id: 7, message: websocket } });
    next = messagingReducer(next, { type: 'messageReconciled', message: websocket });
    expect(Object.values(next.messages)).toHaveLength(1);
    expect(next.messages[89].client_request_id).toBe('r2');
  });

  it('retries a failed send with the same idempotency key and optimistic row', async () => {
    const api = makeApi(); api.createMessage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 90, conversation_id: 7, body: 'hello' });
    renderComposer(api); typeAndSend(); await screen.findByRole('alert'); const first = api.createMessage.mock.calls[0][1].client_request_id;
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.RETRY' }));
    await waitFor(() => expect(api.createMessage).toHaveBeenCalledTimes(2));
    expect(api.createMessage.mock.calls[1][1].client_request_id).toBe(first);
    await waitFor(() => expect(Object.keys(state().messages)).toEqual(['90']));
  });

  it('shows the server validation message for a rejected attachment upload', async () => {
    // dcm's ConversationAttachmentView translates a rejected upload into a
    // field-keyed {"files": [...]} body (the MSG-2 chunk-4 fix), not {detail}.
    const api = makeApi(); api.uploadAttachments.mockRejectedValue({ response: { data: { files: ['File type application/octet-stream is not allowed.'] } } });
    renderComposer(api); const input = document.querySelector('input[type=file]'); const file = new File(['x'], 'bad.exe', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [file] } }); fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' }));
    await screen.findByText('MessagingComposer.UPLOAD_ERROR:File type application/octet-stream is not allowed.');
  });

  it('shows the server validation message when it arrives as {detail} (the text-message error shape)', async () => {
    const api = makeApi(); api.createMessage.mockRejectedValue({ response: { data: { detail: 'Posting is not permitted.' } } });
    renderComposer(api); typeAndSend('hello');
    await screen.findByText('MessagingComposer.SEND_ERROR:Posting is not permitted.');
  });

  it('populates the optimistic row with the current user as sender, not "unknown sender"', async () => {
    let resolveCreate; const api = makeApi(); api.createMessage.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    renderComposer(api, { userId: 9 }); typeAndSend('hello');
    await waitFor(() => expect(Object.keys(state().messages)).toHaveLength(1));
    const [optimistic] = Object.values(state().messages);
    expect(optimistic.status).toBe('pending');
    expect(optimistic.sender).toEqual({ id: 9, display_name: 'me' });
    resolveCreate({ id: 91, conversation_id: 7, body: 'hello' });
  });

  it('end-to-end: a real in-flight send reconciled by a WS frame arriving before the REST response settles produces exactly one row', async () => {
    let resolveCreate; const api = makeApi(); api.createMessage.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    renderComposer(api); typeAndSend('hello');
    await waitFor(() => expect(Object.keys(state().messages)).toHaveLength(1));
    const requestId = api.createMessage.mock.calls[0][1].client_request_id;
    // The WS frame for this message's creation arrives while the REST POST is still in flight.
    act(() => dispatchMessagingFrame({ envelope: 'messaging', type: 'message', conversation_id: 7, message: { id: 91, conversation_id: 7, body: 'hello', client_request_id: requestId } }));
    expect(Object.keys(state().messages)).toEqual(['91']);
    // The REST response for the same send resolves afterward and must not create a second row.
    await act(async () => resolveCreate({ id: 91, conversation_id: 7, body: 'hello', client_request_id: requestId }));
    expect(Object.keys(state().messages)).toEqual(['91']);
  });

  it('mounts Composer and AttachmentList independently', async () => {
    const api = makeApi(); const { unmount } = renderComposer(api); expect(screen.getByLabelText('MessagingComposer.LABEL')).toBeTruthy(); unmount();
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[{ id: 1, filename: 'note.pdf', content_type: 'application/pdf' }]} /></MessagingProvider>);
    expect(screen.getByLabelText('MessagingAttachments.LABEL')).toBeTruthy();
  });
});
