// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => (values?.model !== undefined ? `${key}:${values.model}` : key) }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  push(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

const catalogue = {
  entries: [
    { id: 'cli-sonnet', driver: 'claude_cli', model: 'sonnet', label: 'Sonnet', efforts: ['low', 'high'], billing: 'subscription' },
    { id: 'oa', driver: 'openai_api', model: 'gpt', label: 'GPT', efforts: ['medium'], billing: 'pay_per_use' },
  ],
  default: { entry: 'cli-sonnet', effort: 'high' },
};
const baseChat = { id: 7, title: 'Budget', archived_at: null, selection: { entry: 'cli-sonnet', effort: 'high' } };
const managedEntries = [
  { id: 'openai:sol', provider: 'openai', family: 'sol', label: 'Sol', source_id: 'acct-a', source_label: 'Account A', efforts: ['low'], billing: 'subscription' },
  { id: 'claude:sonnet', provider: 'claude', family: 'sonnet', label: 'Sonnet', source_id: 'acct-b', source_label: 'Account B', efforts: ['low'], billing: 'subscription' },
];
const managedCatalogue = (entries = managedEntries, standard = entries[0] ? { entry: entries[0].id, effort: 'low' } : null, revision = 1) => ({ entries, default: standard, policy: { revision } });

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue(catalogue),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [baseChat], next: null })),
    createChat: vi.fn().mockResolvedValue({ ...baseChat, id: 8, title: '' }),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...baseChat, id, ...patch })),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
    ...extra,
  };
}

async function openChat(api) {
  render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
  fireEvent.click(await screen.findByText('Budget'));
  await waitFor(() => expect(FakeSocket.instances.length).toBe(1));
  const socket = FakeSocket.instances[0];
  act(() => socket.open());
  return socket;
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace streaming', () => {
  it('streams deltas into the answer and replaces them with the final turn and its sources', async () => {
    const socket = await openChat(makeApi());
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    expect(socket.sent).toEqual([{ type: 'send', message: 'Hello' }]);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chat.stop' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chat.send' }).disabled).toBe(true);

    act(() => socket.push({ type: 'tool', phase: 'start', name: 'kb', label: 'Searching the knowledge base' }));
    expect(screen.getByText('Searching the knowledge base')).toBeTruthy();
    act(() => { socket.push({ type: 'delta', text: 'Par' }); socket.push({ type: 'delta', text: 'tial' }); });
    expect(screen.getByText('Partial')).toBeTruthy();

    act(() => socket.push({ type: 'turn', turn: { id: 40, seq: 1, user_text: 'Hello', assistant_text: 'Final text', state: 'completed', sources: [{ label: 'KB-1', reference: 'kb://1' }], driver: 'claude_cli', model: 'Sonnet', effort: 'high' } }));
    expect(screen.queryByText('Partial')).toBeNull();
    expect(screen.getByText('Final text')).toBeTruthy();
    expect(screen.getByText('KB-1')).toBeTruthy();
    expect(screen.queryByText('Searching the knowledge base')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chat.send' })).toBeTruthy();
  });

  it('sends stop over the socket while a turn runs', async () => {
    const socket = await openChat(makeApi());
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat.stop' }));
    expect(socket.sent.at(-1)).toEqual({ type: 'stop' });
  });

  it('does not resend anything after a reconnect', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const socket = await openChat(makeApi());
      fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'Hello' } });
      fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
      act(() => socket.close(1006));
      act(() => { vi.advanceTimersByTime(1000); });
      expect(FakeSocket.instances).toHaveLength(2);
      act(() => FakeSocket.instances[1].open());
      expect(FakeSocket.instances[1].sent).toEqual([]);
    } finally { vi.useRealTimers(); }
  });
});

describe('ChatWorkspace edge states', () => {
  it('shows the usage-limit state with Change model, which opens the picker', async () => {
    const socket = await openChat(makeApi());
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    act(() => socket.push({ type: 'error', code: 'quota_exceeded' }));
    expect(screen.getByText('Chat.usageLimit:Sonnet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.changeModel' }));
    expect(screen.getByRole('radio', { name: /GPT/ })).toBeTruthy();
  });

  it('shows an interrupted turn from history with Retry, which sends its text again only on click', async () => {
    const api = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [{ id: 5, seq: 1, user_text: 'Again please', assistant_text: 'Half', state: 'interrupted', sources: [], driver: 'claude_cli', model: 'Sonnet', effort: 'high' }], next: null }) });
    const socket = await openChat(api);
    await screen.findByText('Chat.interrupted');
    expect(socket.sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Chat.retry' }));
    expect(socket.sent).toEqual([{ type: 'send', message: 'Again please' }]);
  });

  it('shows Reconnecting while the connection is being re-established and blocks Send', async () => {
    const socket = await openChat(makeApi());
    act(() => socket.close(1006));
    expect(screen.getByText('Chat.reconnecting')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'x' } });
    expect(screen.getByRole('button', { name: 'Chat.send' }).disabled).toBe(true);
  });

  it.each([[4401, 'Chat.sessionEnded'], [4403, 'Chat.accessLost'], [4429, 'Chat.rateLimited']])('stops reconnecting on close code %s and shows its state', async (code, text) => {
    const socket = await openChat(makeApi());
    act(() => socket.close(code));
    expect(screen.getByText(text)).toBeTruthy();
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('shows the not-configured state and loads no chat list', async () => {
    const api = makeApi({ getStatus: vi.fn().mockResolvedValue({ status: 'not_configured' }) });
    render(<ChatWorkspace api={api} />);
    expect(await screen.findByText('Chat.unavailable')).toBeTruthy();
    expect(screen.getByText('Chat.noModel')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chat.newChat' })).toBeNull();
  });

  it('opens an archived chat read-only: Send is disabled and Restore is offered', async () => {
    const archivedChat = { ...baseChat, archived_at: '2026-10-01T00:00:00Z' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [archivedChat] : [], next: null })) });
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByRole('button', { name: /Chat.archived/ }));
    fireEvent.click(screen.getByText('Budget'));
    expect(await screen.findByText('Chat.archivedReadOnly')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Chat.send' }).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Chat.restore' })[0]);
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(7, { archived: false }));
  });

  it('shows an empty new chat', async () => {
    const api = makeApi();
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Chat.newChat' }))[0]);
    expect(await screen.findByText('Chat.emptyTitle')).toBeTruthy();
    expect(api.createChat).toHaveBeenCalled();
  });
});

describe('ChatWorkspace load order', () => {
  it('shows no Reconnecting chip on the first connect', async () => {
    render(<ChatWorkspace api={makeApi()} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    await waitFor(() => expect(FakeSocket.instances.length).toBe(1));
    expect(screen.queryByText('Chat.reconnecting')).toBeNull();
  });

  it('shows the unavailable state and no chats when no model is configured', async () => {
    // UCM-CHAT-8: catalogue and lists start with the status; their answers are discarded when it is not available.
    const api = makeApi({ getStatus: vi.fn().mockResolvedValue({ status: 'not_configured' }) });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Chat.unavailable');
    expect(screen.queryByText('Budget')).toBeNull();
  });
});

describe('ChatWorkspace wiring', () => {
  it('calls the update endpoint when the picker selection changes', async () => {
    const api = makeApi();
    await openChat(api);
    fireEvent.click(screen.getByRole('button', { name: 'Sonnet · Chat.effort.high ▾' }));
    fireEvent.click(screen.getByRole('button', { name: 'Low' }));
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(7, { selection: { entry: 'cli-sonnet', effort: 'low' } }));
  });
  it('wires rename, archive and delete of a chat to the endpoints', async () => {
    const api = makeApi();
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    await screen.findByText('Budget');
    const menu = () => fireEvent.click(screen.getAllByRole('button', { name: 'Chat.actions' })[0]);
    menu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.rename' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.renameLabel' }), { target: { value: 'Plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.save' }));
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(7, { title: 'Plan' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    menu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.archive' }));
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(7, { archived: true }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    menu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat.delete' }));
    await waitFor(() => expect(api.deleteChat).toHaveBeenCalledWith(7));
  });

  it('offers no Retry on an archived chat', async () => {
    const archivedChat = { ...baseChat, archived_at: '2026-10-01T00:00:00Z' };
    const api = makeApi({
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [archivedChat] : [], next: null })),
      listTurns: vi.fn().mockResolvedValue({ results: [{ id: 5, seq: 1, user_text: 'q', assistant_text: 'half', state: 'interrupted', sources: [] }], next: null }),
    });
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByRole('button', { name: /Chat.archived/ }));
    fireEvent.click(screen.getByText('Budget'));
    await screen.findByText('Chat.interrupted');
    expect(screen.queryByRole('button', { name: 'Chat.retry' })).toBeNull();
  });

  it('keeps an interrupted turn visible when Retry is clicked without a connection', async () => {
    const api = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [{ id: 5, seq: 1, user_text: 'Again', assistant_text: 'half', state: 'interrupted', sources: [] }], next: null }) });
    const socket = await openChat(api);
    await screen.findByText('Chat.interrupted');
    act(() => socket.close(4403));
    fireEvent.click(screen.getByRole('button', { name: 'Chat.retry' }));
    expect(screen.getByText('Again')).toBeTruthy();
    expect(socket.sent).toEqual([]);
  });

  it('keeps a valid managed family without exposing source labels or persisting a fallback', async () => {
    const chat = { ...baseChat, selection: { entry: 'claude:sonnet', effort: 'low' } };
    let current = managedCatalogue();
    const api = makeApi({
      getCatalogue: vi.fn().mockImplementation(async () => current),
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })),
    });
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    fireEvent.click(await screen.findByRole('button', { name: /Claude · Sonnet/ }));
    expect(screen.getByRole('radio', { name: 'OpenAI Sol' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Claude Sonnet' })).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/Account A|Account B|acct-a|acct-b|subscription/);
    expect(api.updateChat).not.toHaveBeenCalled();
    await act(async () => { await Promise.resolve(); });
    const before = api.getCatalogue.mock.calls.length;
    current = managedCatalogue([managedEntries[0], { ...managedEntries[1], source_id: 'new-private-route', source_label: 'New account' }, { id: 'openai:terra', provider: 'openai', family: 'terra', efforts: ['low'] }], undefined, 2);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(api.getCatalogue.mock.calls.length).toBeGreaterThan(before));
    await screen.findByRole('radio', { name: 'OpenAI Terra' });
    expect(screen.getByRole('radio', { name: 'Claude Sonnet' }).getAttribute('aria-checked')).toBe('true');
    expect(document.body.innerHTML).not.toMatch(/new-private-route|New account/);
    expect(api.updateChat).not.toHaveBeenCalled();
  });

  it('shows the managed standard after repeated revocations without choosing the first entry', async () => {
    let current = managedCatalogue();
    const api = makeApi({
      getCatalogue: vi.fn().mockImplementation(() => Promise.resolve(current)),
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [{ ...baseChat, selection: { entry: 'claude:sonnet', effort: 'low' } }], next: null })),
    });
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    await screen.findByRole('button', { name: /Claude · Sonnet/ });

    current = managedCatalogue([managedEntries[0]], { entry: managedEntries[0].id, effort: 'low' }, 2);
    fireEvent.click(screen.getByRole('button', { name: /Claude · Sonnet/ }));
    await waitFor(() => expect(screen.getByRole('radio').dataset.modelEntry).toBe('openai:sol'));
    expect(screen.getByRole('radio').getAttribute('aria-checked')).toBe('true');
    expect(api.updateChat).not.toHaveBeenCalled();

    current = managedCatalogue([managedEntries[1]], { entry: managedEntries[1].id, effort: 'low' }, 3);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(screen.getByRole('radio').dataset.modelEntry).toBe('claude:sonnet'));
    expect(screen.getByRole('radio').getAttribute('aria-checked')).toBe('true');
    expect(api.updateChat).not.toHaveBeenCalled();
  });

  it('keeps eligible explicit entries reachable when the managed standard is absent', async () => {
    const api = makeApi({
      getCatalogue: vi.fn().mockResolvedValue(managedCatalogue(managedEntries, null, 4)),
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [{ ...baseChat, selection: { entry: 'revoked', effort: 'low' } }], next: null })),
    });
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    const trigger = await screen.findByRole('button', { name: 'Chat.unavailable' });
    fireEvent.click(trigger);
    expect(screen.getByRole('radio', { name: 'OpenAI Sol' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Claude Sonnet' })).toBeTruthy();
    expect(api.updateChat).not.toHaveBeenCalled();
  });

  it('polls a managed catalogue even when the first policy is unavailable', async () => {
    const timer = vi.spyOn(window, 'setInterval');
    const api = makeApi({
      getStatus: vi.fn().mockResolvedValue({ status: 'unavailable', reason: 'policy_unavailable', policy: { revision: null } }),
      getCatalogue: vi.fn()
        .mockResolvedValueOnce(managedCatalogue([], null, null))
        .mockResolvedValue(managedCatalogue()),
    });
    try {
      render(<ChatWorkspace api={api} />);
      await screen.findByText('Budget');
      await waitFor(() => expect(timer.mock.calls.some(([, delay]) => delay === 10000)).toBe(true));
      const [tick] = timer.mock.calls.find(([, delay]) => delay === 10000);
      const previousCalls = api.getCatalogue.mock.calls.length;
      act(() => tick());
      await waitFor(() => expect(api.getCatalogue.mock.calls.length).toBeGreaterThan(previousCalls));
    } finally {
      timer.mockRestore();
    }
  });

  it('drops an older catalogue response after switching chats', async () => {
    const pending = new Map();
    const chat8 = { ...baseChat, id: 8, title: 'Other', selection: { entry: 'model-8', effort: 'low' } };
    const api = makeApi({
      getCatalogue: vi.fn(({ chat } = {}) => new Promise((resolve) => pending.set(chat, resolve))),
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [baseChat, chat8], next: null })),
    });
    const view = render(<ChatWorkspace api={api} activeChatId={7} wsUrl={(id) => `ws://test/${id}`} />);
    await waitFor(() => expect(pending.has(7)).toBe(true));
    view.rerender(<ChatWorkspace api={api} activeChatId={8} wsUrl={(id) => `ws://test/${id}`} />);
    await waitFor(() => expect(pending.has(8)).toBe(true));
    pending.get(7)({ entries: [{ id: 'model-7', label: 'Model Seven', model: 'model-7', efforts: ['low'] }], default: { entry: 'model-7', effort: 'low' } });
    pending.get(8)({ entries: [{ id: 'model-8', label: 'Model Eight', model: 'model-8', efforts: ['low'] }], default: { entry: 'model-8', effort: 'low' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Model Eight/ })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Model Seven/ })).toBeNull();
  });

  it('refreshes on foreground return without interrupting a running request', async () => {
    let resolveRefresh;
    const api = makeApi({ getCatalogue: vi.fn().mockResolvedValueOnce(catalogue).mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; })) });
    const socket = await openChat(api);
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.message' }), { target: { value: 'keep running' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));
    expect(screen.getByRole('button', { name: 'Chat.stop' })).toBeTruthy();
    expect(socket.sent).toEqual([{ type: 'send', message: 'keep running' }]);
    resolveRefresh(catalogue);
  });
});
