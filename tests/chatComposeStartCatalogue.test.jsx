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
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
}

const catalogue = { entries: [{ id: 'model', label: 'Model', model: 'model', efforts: ['high'] }], default: { entry: 'model', effort: 'high' } };
const chats = [7, 8].map((id) => ({ id, title: `Chat ${id}`, archived_at: null, selection: { entry: 'model', effort: 'high' } }));
const makeApi = (extra = {}) => ({
  getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
  getCatalogue: vi.fn().mockResolvedValue(catalogue),
  listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : chats, next: null })),
  createChat: vi.fn().mockResolvedValue({ ...chats[0], id: 9, title: 'Chat 9' }),
  updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chats.find((item) => item.id === id), ...patch })),
  deleteChat: vi.fn().mockResolvedValue(null),
  listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
  ...extra,
});

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('composer start signal', () => {
  it('signals the first focus and first character once each, then re-arms after clearing', async () => {
    const onComposeStart = vi.fn();
    const api = makeApi();
    render(<ChatWorkspace api={api} activeChatId={7} onComposeStart={onComposeStart} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    act(() => FakeSocket.instances.at(-1).open());
    fireEvent.focus(input);
    fireEvent.focus(input);
    expect(onComposeStart.mock.calls).toEqual([[{ chatId: 7 }]]);
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(onComposeStart.mock.calls).toEqual([[{ chatId: 7 }], [{ chatId: 7 }]]);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'again' } });
    expect(onComposeStart.mock.calls).toEqual([[{ chatId: 7 }], [{ chatId: 7 }], [{ chatId: 7 }]]);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.focus(input);
    expect(onComposeStart).toHaveBeenCalledTimes(4);
  });

  it('clears and re-arms after a successful send, and is optional', async () => {
    const onComposeStart = vi.fn();
    const api = makeApi();
    render(<ChatWorkspace api={api} activeChatId={7} onComposeStart={onComposeStart} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    act(() => FakeSocket.instances.at(-1).open());
    fireEvent.change(input, { target: { value: 'send me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: 'again' } });
    expect(onComposeStart.mock.calls).toEqual([[{ chatId: 7 }], [{ chatId: 7 }]]);

    const callsBeforeOptionalWorkspace = onComposeStart.mock.calls.length;
    const withoutProp = makeApi();
    render(<ChatWorkspace api={withoutProp} activeChatId={8} />);
    // Wait for the second workspace's own composer; findAll resolves as soon as the first one is there.
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Chat.message' })).toHaveLength(2));
    const secondInput = screen.getAllByRole('textbox', { name: 'Chat.message' })[1];
    fireEvent.focus(secondInput);
    fireEvent.change(secondInput, { target: { value: 'text' } });
    expect(secondInput.value).toBe('text');
    expect(onComposeStart).toHaveBeenCalledTimes(callsBeforeOptionalWorkspace);
  });

  it('keeps workspace render slots quiet while typing', async () => {
    const sidePanel = vi.fn(() => <div>Side</div>);
    const renderAnswerExtra = vi.fn(() => <span>Answer extra</span>);
    const onComposeStart = vi.fn();
    const api = makeApi();
    render(<ChatWorkspace api={api} activeChatId={7} sidePanel={sidePanel} renderAnswerExtra={renderAnswerExtra} onComposeStart={onComposeStart} />);
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    const baseline = [sidePanel.mock.calls.length, renderAnswerExtra.mock.calls.length];
    for (const value of ['a', 'ab', 'abc', 'abcd']) fireEvent.change(input, { target: { value } });
    expect([sidePanel.mock.calls.length, renderAnswerExtra.mock.calls.length]).toEqual(baseline);
    expect(onComposeStart).toHaveBeenCalledTimes(1);
  });
});

describe('catalogue request scope', () => {
  it('requests only the shown chat catalogue at startup', async () => {
    const api = makeApi();
    render(<ChatWorkspace api={api} activeChatId={7} />);
    await screen.findByRole('textbox', { name: 'Chat.message' });
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledTimes(1));
    expect(api.getCatalogue).toHaveBeenCalledWith({ chat: 7 });
  });

  it('requests one general catalogue when no chat is shown', async () => {
    const api = makeApi();
    render(<ChatWorkspace api={api} activeChatId={null} />);
    await screen.findByText('Chat.selectChat');
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledTimes(1));
    expect(api.getCatalogue).toHaveBeenCalledWith({});
  });

  it('requests the new chat catalogue on a switch and refreshes when the picker opens', async () => {
    const api = makeApi();
    const view = render(<ChatWorkspace api={api} activeChatId={7} />);
    await screen.findByRole('textbox', { name: 'Chat.message' });
    view.rerender(<ChatWorkspace api={api} activeChatId={8} />);
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledTimes(2));
    expect(api.getCatalogue.mock.calls).toEqual([[{ chat: 7 }], [{ chat: 8 }]]);
    fireEvent.click(screen.getByRole('button', { name: /Model/ }));
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledTimes(3));
    expect(api.getCatalogue).toHaveBeenLastCalledWith({ chat: 8 });
  });

  it('requests the general catalogue after closing a chat whose own catalogue request failed', async () => {
    const getCatalogue = vi.fn(({ chat } = {}) => (chat !== undefined ? Promise.reject(new Error('down')) : Promise.resolve(catalogue)));
    const api = makeApi({ getCatalogue });
    const view = render(<ChatWorkspace api={api} activeChatId={7} />);
    await waitFor(() => expect(getCatalogue).toHaveBeenCalledWith({ chat: 7 }));
    view.rerender(<ChatWorkspace api={api} activeChatId={null} />);
    await waitFor(() => expect(getCatalogue).toHaveBeenCalledWith({}));
    expect(getCatalogue.mock.calls.filter(([args]) => args && args.chat === undefined)).toHaveLength(1);
  });

  it('falls back to one general catalogue when the requested chat cannot be loaded', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [], next: null }) });
    render(<ChatWorkspace api={api} activeChatId={404} />);
    await screen.findByText('Chat.selectChat');
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledTimes(1));
    expect(api.getCatalogue).toHaveBeenCalledWith({});
  });
});
