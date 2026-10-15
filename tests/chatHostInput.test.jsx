// @vitest-environment jsdom
import React, { useState } from 'react';
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
const finishedTurn = { id: 21, seq: 1, user_text: 'Earlier', assistant_text: 'Answer', state: 'completed', sources: [] };

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })),
    createChat: vi.fn().mockResolvedValue({ ...chat, id: 8 }),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chat, id, ...patch })),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue({ results: [finishedTurn], next: null }),
    ...extra,
  };
}

async function showChat(api, props = {}) {
  render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} {...props} />);
  await screen.findAllByText('Budget');
  await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
  const socket = FakeSocket.instances.at(-1);
  act(() => socket.open());
  return socket;
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace host input controls', () => {
  it('prefills and focuses the composer, and applies the same text again for a new request id', async () => {
    const api = makeApi();
    const first = { id: 1, text: 'Edit this question' };
    const view = render(<ChatWorkspace api={api} activeChatId={7} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    act(() => FakeSocket.instances.at(-1).open());
    view.rerender(<ChatWorkspace api={api} activeChatId={7} composerPrefill={first} />);
    await waitFor(() => expect(input.value).toBe('Edit this question'));
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'User changed it' } });
    view.rerender(<ChatWorkspace api={api} activeChatId={7} composerPrefill={{ id: 2, text: 'Edit this question' }} />);
    await waitFor(() => expect(input.value).toBe('Edit this question'));
    expect(document.activeElement).toBe(input);
  });

  it('keeps the focus request pending while the connection is down and focuses once the input is enabled', async () => {
    const api = makeApi();
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    expect(input.disabled).toBe(true);
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} composerPrefill={{ id: 1, text: 'While offline' }} />);
    await waitFor(() => expect(input.value).toBe('While offline'));
    expect(document.activeElement).not.toBe(input);
    act(() => FakeSocket.instances.at(-1).open());
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('applies a prefill sent together with a switch to the requested chat, not to the one being left', async () => {
    const other = { ...chat, id: 9, title: 'Other' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat, other], next: null })) });
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} />);
    await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={9} composerPrefill={{ id: 1, text: 'For the other chat' }} />);
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(9));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' }).value).toBe('For the other chat'));
  });

  it('ignores a prefill that comes with activeChatId null and does not leave it in the chat being left', async () => {
    const api = makeApi();
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} />);
    await screen.findByRole('textbox', { name: 'Chat.message' });
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={null} composerPrefill={{ id: 1, text: 'No chat wanted' }} />);
    await screen.findByText('Chat.selectChat');
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} composerPrefill={{ id: 1, text: 'No chat wanted' }} />);
    expect((await screen.findByRole('textbox', { name: 'Chat.message' })).value).toBe('');
  });

  it('does not let a slot reuse an old send after a turn started', async () => {
    let slotSend;
    const socket = await showChat(makeApi(), { renderAnswerExtra: ({ send }) => { slotSend = send; return null; } });
    act(() => socket.open());
    await waitFor(() => expect(typeof slotSend).toBe('function'));
    const staleSend = slotSend;
    expect(staleSend('First')).toBe(true);
    expect(staleSend('Second, from the same stale callback')).toBe(false);
    expect(socket.sent).toEqual([{ type: 'send', message: 'First' }]);
  });

  it('drops a prefill that waits for a chat which cannot be found', async () => {
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })) });
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={404} composerPrefill={{ id: 1, text: 'Never shown' }} />);
    await screen.findByText('Chat.selectChat');
    // The request stays on the prop: it was dropped when 404 proved unloadable, so going back must not apply it.
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} composerPrefill={{ id: 1, text: 'Never shown' }} />);
    expect((await screen.findByRole('textbox', { name: 'Chat.message' })).value).toBe('');
    expect(input).toBeTruthy();
  });

  it('marks answer-slot sending unavailable while the connection is down', async () => {
    let slotSend;
    render(<ChatWorkspace api={makeApi()} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} renderAnswerExtra={({ canSend, send, turn }) => { slotSend = send; return <span data-testid={`offline-${turn.id}`}>{String(canSend)}</span>; }} />);
    expect((await screen.findByTestId('offline-21')).textContent).toBe('false');
    expect(slotSend('While offline')).toBe(false);
    expect(FakeSocket.instances.at(-1).sent).toEqual([]);
    act(() => FakeSocket.instances.at(-1).open());
    await waitFor(() => expect(screen.getByTestId('offline-21').textContent).toBe('true'));
  });

  it('does not reapply a request with the same id when the host rerenders it', async () => {
    const api = makeApi();
    const request = { id: 'same', text: 'Initial' };
    const view = render(<ChatWorkspace api={api} activeChatId={7} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    view.rerender(<ChatWorkspace api={api} activeChatId={7} composerPrefill={request} />);
    await waitFor(() => expect(input.value).toBe('Initial'));
    fireEvent.change(input, { target: { value: 'Typed after prefill' } });
    view.rerender(<ChatWorkspace api={api} activeChatId={7} composerPrefill={request} />);
    expect(input.value).toBe('Typed after prefill');
  });

  it('consumes a prefill with no chat and ignores a prefill on an archived chat', async () => {
    const api = makeApi();
    const request = { id: 1, text: 'Must not appear' };
    const view = render(<ChatWorkspace api={api} activeChatId={null} composerPrefill={request} />);
    expect(await screen.findByText('Chat.selectChat')).toBeTruthy();
    view.rerender(<ChatWorkspace api={api} activeChatId={7} composerPrefill={request} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    expect(input.value).toBe('');

    cleanup();
    const archivedApi = makeApi({
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [{ ...chat, archived_at: '2026-01-01' }] : [], next: null })),
    });
    await showChat(archivedApi, { activeChatId: 7, composerPrefill: { id: 2, text: 'Archived request' } });
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).value).toBe('');
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(true);
  });

  it('sends once from the answer slot, exposes running availability and rejects blank text', async () => {
    const sendCalls = [];
    function Slot({ send, canSend, turn }) {
      const [result, setResult] = useState('');
      return <div>
        <span data-testid={`can-send-${turn.id}`}>{String(canSend)}</span>
        {turn.state !== 'generating' ? <button onClick={() => { sendCalls.push('Try this'); setResult(String(send('Try this'))); }}>Send suggestion</button> : null}
        <span data-testid="send-result">{result}</span>
      </div>;
    }
    const socket = await showChat(makeApi(), { renderAnswerExtra: (args) => <Slot {...args} /> });
    fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
    // The frame was produced by the slot's call of send, exactly once.
    expect(sendCalls).toEqual(['Try this']);
    expect(socket.sent).toEqual([{ type: 'send', message: 'Try this' }]);
    expect(screen.getByText('Try this')).toBeTruthy();
    expect(screen.getAllByTestId('send-result')[0].textContent).toBe('true');
    expect((await screen.findByTestId('can-send-pending')).textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(socket.sent).toHaveLength(1);
    expect(screen.getAllByTestId('send-result')[0].textContent).toBe('false');

    act(() => socket.push({ type: 'turn', turn: { ...finishedTurn, id: 22, seq: 2, user_text: 'Try this', assistant_text: 'Done' } }));
    await screen.findByText('Done');

    // The most recent answer slot can reject blank text without writing a frame.
    const blankApi = makeApi();
    cleanup();
    const blankSocket = await showChat(blankApi, {
      renderAnswerExtra: ({ send, canSend, turn }) => turn.id === 21
        ? <button data-can-send={canSend} onClick={() => { window.sendResult = send('  '); }}>Blank</button>
        : null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Blank' }));
    expect(window.sendResult).toBe(false);
    expect(blankSocket.sent).toEqual([]);
  });

  it('marks answer-slot sending unavailable for an archived chat', async () => {
    const api = makeApi({
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [{ ...chat, archived_at: '2026-01-01' }] : [], next: null })),
    });
    let slotSend;
    const socket = await showChat(api, { renderAnswerExtra: ({ canSend, send, turn }) => { slotSend = send; return <span data-testid={`availability-${turn.id}`}>{String(canSend)}</span>; } });
    expect(screen.getByTestId('availability-21').textContent).toBe('false');
    expect(slotSend('Hello')).toBe(false);
    expect(socket.sent).toEqual([]);
  });
});
