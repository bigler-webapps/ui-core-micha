// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatComposer from '../src/chat/ChatComposer';
import ChatWorkspace from '../src/chat/ChatWorkspace';

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  push(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  send(data) { if (this.readyState !== FakeSocket.OPEN) throw new Error('socket closed'); this.sent.push(JSON.parse(data)); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

const catalogue = {
  entries: [{ id: 'cli-sonnet', driver: 'claude_cli', model: 'sonnet', label: 'Sonnet', efforts: ['high'], billing: 'subscription' }],
  default: { entry: 'cli-sonnet', effort: 'high' },
};
const chats = [
  { id: 7, title: 'Budget', archived_at: null, selection: { entry: 'cli-sonnet', effort: 'high' } },
  { id: 8, title: 'Roadmap', archived_at: null, selection: { entry: 'cli-sonnet', effort: 'high' } },
];
const history = [{ id: 40, seq: 1, user_text: 'Earlier question', assistant_text: 'Earlier answer', state: 'completed', sources: [] }];

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue(catalogue),
    listChats: vi.fn().mockResolvedValue({ results: chats, next: null }),
    createChat: vi.fn().mockResolvedValue({ ...chats[0], id: 9, title: '' }),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chats.find((item) => item.id === id), ...patch })),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue({ results: history, next: null }),
    ...extra,
  };
}

async function selectChat(title = 'Budget') {
  fireEvent.click((await screen.findAllByText(title))[0]);
  await waitFor(() => expect(FakeSocket.instances.some((socket) => socket.readyState === 0)).toBe(true));
  const socket = FakeSocket.instances.at(-1);
  act(() => socket.open());
  await screen.findByText('Earlier answer');
  return socket;
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatComposer draft ownership', () => {
  it('keeps host render slots and the thread quiet while typing, then sends the exact text and clears it', async () => {
    const sidePanel = vi.fn(() => <div>Side controls</div>);
    const renderAnswerExtra = vi.fn(() => <span>Answer extra</span>);
    const renderComposerContext = vi.fn(() => <span>Composer context</span>);
    const renderComposerExtra = vi.fn(() => <div>Composer extra</div>);
    const api = makeApi();
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} sidePanel={sidePanel} renderAnswerExtra={renderAnswerExtra}
      renderComposerContext={renderComposerContext} renderComposerExtra={renderComposerExtra} composerLayout="compact" />);
    const socket = await selectChat();
    const baseline = {
      sidePanel: sidePanel.mock.calls.length,
      answerExtra: renderAnswerExtra.mock.calls.length,
      context: renderComposerContext.mock.calls.length,
      composerExtra: renderComposerExtra.mock.calls.length,
    };
    const threadRenders = renderAnswerExtra.mock.calls.length;
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    let text = '';
    for (const character of 'abcdefghijklmnopqrst') {
      text += character;
      fireEvent.change(input, { target: { value: text } });
    }
    expect(sidePanel).toHaveBeenCalledTimes(baseline.sidePanel);
    expect(renderAnswerExtra).toHaveBeenCalledTimes(baseline.answerExtra);
    expect(renderComposerContext).toHaveBeenCalledTimes(baseline.context);
    expect(renderComposerExtra).toHaveBeenCalledTimes(baseline.composerExtra);
    expect(renderAnswerExtra.mock.calls.length).toBe(threadRenders);
    expect(input.value).toBe('abcdefghijklmnopqrst');
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent).toEqual([{ type: 'send', message: 'abcdefghijklmnopqrst' }]);
    expect(input.value).toBe('');
  });

  it('keeps the draft when a send is refused by a closed socket', async () => {
    render(<ChatWorkspace api={makeApi()} wsUrl={(id) => `ws://test/${id}`} />);
    const socket = await selectChat();
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    // The socket stops accepting frames before its close event arrives: Send is still enabled, the send is refused.
    socket.readyState = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent).toEqual([]);
    expect(input.value).toBe('Keep this draft');
  });

  it('applies the same prefill text twice and focuses for each request', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const api = makeApi();
    const first = { id: 'prefill-1', text: 'Use this context' };
    // A prefill that arrives while no chat is open is dropped (unchanged behaviour), so it comes after the chat opens.
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    await selectChat();
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} composerPrefill={first} />);
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(input.value).toBe(first.text));
    const firstFocusCount = focus.mock.calls.length;
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} composerPrefill={{ id: 'prefill-2', text: first.text }} />);
    await waitFor(() => expect(focus.mock.calls.length).toBe(firstFocusCount + 1));
    expect(input.value).toBe(first.text);
  });

  it('waits for a requested chat before applying its prefill, and chat switches clear the draft', async () => {
    const api = makeApi();
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={7} />);
    await selectChat();
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    fireEvent.change(input, { target: { value: 'Old chat draft' } });
    fireEvent.click(screen.getByText('Roadmap'));
    await screen.findByText('Earlier answer');
    // The composer is keyed by chat, so read the input of the new chat.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' }).value).toBe(''));
    const prefill = { id: 'for-roadmap', text: 'New chat context' };
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} activeChatId={8} composerPrefill={prefill} />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' }).value).toBe(prefill.text));
  });

  it('continues to support direct controlled use', () => {
    const onChange = vi.fn();
    const onSend = vi.fn();
    render(<ChatComposer value="Controlled text" onChange={onChange} onSend={onSend} />);
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    expect(input.value).toBe('Controlled text');
    fireEvent.change(input, { target: { value: 'Updated controlled text' } });
    expect(onChange).toHaveBeenCalledWith('Updated controlled text');
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('Controlled text');
  });
});