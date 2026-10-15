// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  push(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
}

const chat = { id: 7, title: 'Budget', archived_at: null, selection: null };
const other = { ...chat, id: 9, title: 'Other' };
const interrupted = { id: 21, seq: 1, user_text: 'Retry this', assistant_text: '', state: 'interrupted', sources: [] };

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat, other], next: null })),
    createChat: vi.fn().mockResolvedValue({ ...chat, id: 8 }),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chat, id, ...patch })),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
    ...extra,
  };
}

async function mount(api = makeApi(), props = {}) {
  const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} {...props} />);
  await screen.findByRole('textbox', { name: 'Chat.message' });
  await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
  const socket = FakeSocket.instances.at(-1);
  act(() => socket.open());
  return { view, socket, api };
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace send context and host requests', () => {
  it('preserves the 4.2.0 frame without a context prop, and omits nullish context values', async () => {
    const { socket, view, api } = await mount();
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    fireEvent.change(input, { target: { value: 'Plain send' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent).toEqual([{ type: 'send', message: 'Plain send' }]);

    cleanup();
    const result = await mount(makeApi(), { getSendContext: () => null });
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'No context' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(result.socket.sent).toEqual([{ type: 'send', message: 'No context' }]);
  });

  it('reads current context exactly once for composer and answer-slot sends, without displaying it', async () => {
    let hostState = { revision: 1 };
    const getSendContext = vi.fn(() => hostState);
    let slotSend;
    const { socket, view } = await mount(makeApi(), { getSendContext, renderAnswerExtra: ({ send }) => { slotSend = send; return null; } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'Composer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent[0]).toEqual({ type: 'send', message: 'Composer', context: { revision: 1 } });
    await screen.findByText('Composer');
    expect(screen.queryByText(/revision/)).toBeNull();
    act(() => socket.push({ type: 'turn', turn: { id: 22, seq: 2, user_text: 'Composer', assistant_text: 'Done', state: 'completed' } }));
    hostState = { revision: 2 };
    act(() => slotSend('Slot'));
    expect(socket.sent[1]).toEqual({ type: 'send', message: 'Slot', context: { revision: 2 } });
    expect(getSendContext).toHaveBeenCalledTimes(2);
  });

  it('adds current context to host requests and retry, and handles each request id once', async () => {
    const getSendContext = vi.fn().mockReturnValue({ source: 'host' });
    const onSendRequestHandled = vi.fn();
    const api = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [interrupted], next: null }) });
    const request1 = { id: 1, text: 'Host message' };
    const { view, socket } = await mount(api, { getSendContext, onSendRequestHandled });
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} getSendContext={getSendContext} sendRequest={request1} onSendRequestHandled={onSendRequestHandled} />);
    await waitFor(() => expect(socket.sent).toHaveLength(1));
    expect(socket.sent[0]).toEqual({ type: 'send', message: 'Host message', context: { source: 'host' } });
    expect(onSendRequestHandled.mock.calls).toEqual([[{ id: 1, sent: true }]]);
    act(() => socket.push({ type: 'turn', turn: { id: 30, seq: 3, user_text: 'Host message', assistant_text: 'Done', state: 'completed' } }));
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} getSendContext={getSendContext} sendRequest={request1} onSendRequestHandled={onSendRequestHandled} />);
    expect(socket.sent).toHaveLength(1);
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} getSendContext={getSendContext} sendRequest={{ id: 2, text: 'Host message' }} onSendRequestHandled={onSendRequestHandled} />);
    await waitFor(() => expect(socket.sent).toHaveLength(2));
    expect(socket.sent[1]).toEqual({ type: 'send', message: 'Host message', context: { source: 'host' } });
    expect(onSendRequestHandled.mock.calls).toEqual([[{ id: 1, sent: true }], [{ id: 2, sent: true }]]);

    cleanup();
    const retryApi = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [interrupted], next: null }) });
    const retryMount = await mount(retryApi, { getSendContext });
    fireEvent.click(await screen.findByRole('button', { name: 'Chat.retry' }));
    expect(retryMount.socket.sent).toEqual([{ type: 'send', message: 'Retry this', context: { source: 'host' } }]);
    expect(getSendContext).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['array', () => []], ['string', () => 'bad'], ['number', () => 4],
    ['circular', () => { const value = {}; value.self = value; return value; }],
    ['throw', () => { throw new Error('host failed'); }],
  ])('keeps the draft and shows the action error when context is invalid (%s)', async (_name, getSendContext) => {
    const { socket } = await mount(makeApi(), { getSendContext });
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    fireEvent.change(input, { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent).toEqual([]);
    expect(input.value).toBe('Keep me');
    expect(screen.getByRole('alert').textContent).toBe('Chat.actionError');
  });

  it('leaves an interrupted turn visible when retry context creation fails', async () => {
    const api = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [interrupted], next: null }) });
    const { socket } = await mount(api, { getSendContext: () => { throw new Error('no context'); } });
    fireEvent.click(await screen.findByRole('button', { name: 'Chat.retry' }));
    expect(socket.sent).toEqual([]);
    expect(screen.getByText('Retry this')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Chat.actionError');
  });

  it('waits for the requested active chat before sending', async () => {
    const api = makeApi();
    const onSendRequestHandled = vi.fn();
    const { view } = await mount(api);
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={9} sendRequest={{ id: 'switch', text: 'For other' }} onSendRequestHandled={onSendRequestHandled} />);
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(9));
    await waitFor(() => expect(FakeSocket.instances.some((item) => item.url === 'ws://test/9')).toBe(true));
    act(() => FakeSocket.instances.find((item) => item.url === 'ws://test/9').open());
    await waitFor(() => expect(onSendRequestHandled).toHaveBeenCalledWith({ id: 'switch', sent: true }));
    const socketForOther = FakeSocket.instances.find((item) => item.url === 'ws://test/9');
    expect(socketForOther.sent).toEqual([{ type: 'send', message: 'For other' }]);
  });

  it.each([
    ['no chat', { activeChatId: null }],
    ['blank text', { sendRequest: { id: 'x', text: '  ' } }],
  ])('reports false and sends nothing for %s', async (_name, props) => {
    const onSendRequestHandled = vi.fn();
    const request = props.sendRequest || { id: 'x', text: 'Do not send' };
    const activeChatId = Object.hasOwn(props, 'activeChatId') ? props.activeChatId : 7;
    const api = makeApi();
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={activeChatId} sendRequest={request} onSendRequestHandled={onSendRequestHandled} />);
    await waitFor(() => expect(onSendRequestHandled).toHaveBeenCalledTimes(1));
    expect(onSendRequestHandled).toHaveBeenCalledWith({ id: 'x', sent: false });
    expect(FakeSocket.instances.flatMap((socket) => socket.sent)).toEqual([]);
  });

  it('reports false for disconnected, archived, running, and invalid-context requests', async () => {
    const onSendRequestHandled = vi.fn();
    const api = makeApi();
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} sendRequest={{ id: 'offline', text: 'No' }} onSendRequestHandled={onSendRequestHandled} />);
    await waitFor(() => expect(onSendRequestHandled).toHaveBeenCalledWith({ id: 'offline', sent: false }));
    expect(FakeSocket.instances.flatMap((socket) => socket.sent)).toEqual([]);

    cleanup();
    const archivedApi = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [{ ...chat, archived_at: '2026-01-01' }] : [], next: null })) });
    const archivedHandled = vi.fn();
    render(<ChatWorkspace api={archivedApi} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} sendRequest={{ id: 'archived', text: 'No' }} onSendRequestHandled={archivedHandled} />);
    await waitFor(() => expect(archivedHandled).toHaveBeenCalledWith({ id: 'archived', sent: false }));

    cleanup();
    const runningApi = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [{ ...interrupted, state: 'generating' }], next: null }) });
    const runningHandled = vi.fn();
    render(<ChatWorkspace api={runningApi} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} sendRequest={{ id: 'running', text: 'No' }} onSendRequestHandled={runningHandled} />);
    await waitFor(() => expect(runningHandled).toHaveBeenCalledWith({ id: 'running', sent: false }));

    cleanup();
    const invalidHandled = vi.fn();
    const invalid = await mount(makeApi(), { getSendContext: () => [], sendRequest: { id: 'invalid', text: 'No' }, onSendRequestHandled: invalidHandled });
    await waitFor(() => expect(invalidHandled).toHaveBeenCalledWith({ id: 'invalid', sent: false }));
    expect(invalid.socket.sent).toEqual([]);
  });
});
