// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';

class TestSocket {
  static OPEN = 1;
  static instances = [];
  constructor() { this.readyState = 0; this.sent = []; TestSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; }
}

const base = { archived_at: null, selection: null, title_source: 'automatic' };
const talk = { ...base, id: 1, title: 'Budget talk' };
const empty = { ...base, id: 2, title: 'New chat' };
const started = { ...base, id: 3, title: 'New chat' };            // still carries the default title but holds a conversation
const unreadable = { ...base, id: 4, title: 'New chat' };         // its turns cannot be read
const renamed = { ...base, id: 5, title: 'New chat', title_source: 'user' };

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [talk, empty, started, unreadable, renamed], next: null })),
    createChat: vi.fn().mockImplementation(async () => ({ ...base, id: 99, title: 'New chat' })),
    updateChat: vi.fn(),
    deleteChat: vi.fn(),
    listTurns: vi.fn().mockImplementation(async (id) => {
      if (id === 3) return { results: [{ id: 30, seq: 1, user_text: 'Hello', assistant_text: 'Hi', state: 'completed', sources: [] }], next: null };
      if (id === 4) throw new Error('unreadable');
      return { results: [], next: null };
    }),
    ...extra,
  };
}

beforeEach(() => { globalThis.WebSocket = TestSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; TestSocket.instances = []; });

const nav = () => within(screen.getByRole('navigation', { name: 'Chat.chats' }));
const rowsOf = () => nav().getAllByRole('button').map((node) => node.textContent).filter((text) => text.includes('Budget') || text.includes('New chat'));
// the listed chats by their title, in list order (ids stand for the rows: 1 Budget talk, 2 empty, 3 started, 4 unreadable, 5 renamed)
const titlesOf = () => rowsOf();

describe('chats without a message', () => {
  it('does not list a chat that has no turns, but lists the others, including one whose turns cannot be read', async () => {
    const api = makeApi();
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(2));
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(4));
    // ids 2 is empty; 3 has a conversation, 4 could not be read (stays listed), 5 was named by the person (never read)
    await waitFor(() => expect(rowsOf()).toHaveLength(4));
    expect(titlesOf()[0]).toBe('Budget talk');                                    // the titled chat stays, in its place
    expect(titlesOf().slice(1)).toEqual(['New chat', 'New chat', 'New chat']);        // three of the four default-titled ones; the empty one (id 2) is gone
    expect(api.listTurns).not.toHaveBeenCalledWith(1);
    expect(api.listTurns).not.toHaveBeenCalledWith(5);
  });

  it('creates one chat for two presses of New chat and does not list it before its first message', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [talk], next: null }) });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    expect(rowsOf()).toHaveLength(1);                                                // only "Budget talk"
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await act(async () => { await Promise.resolve(); });
    expect(api.createChat).toHaveBeenCalledTimes(1);                                 // the open empty chat is reused
  });

  it('lists the new chat once its first message is sent, and a following New chat creates another', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [talk], next: null }) });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(TestSocket.instances.length).toBeGreaterThan(0));
    expect(rowsOf()).toEqual(['Budget talk']);                                       // not listed before the first message
    act(() => TestSocket.instances[TestSocket.instances.length - 1].open());
    const input = await screen.findByRole('textbox', { name: 'Chat.message' });
    fireEvent.change(input, { target: { value: 'First question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.send' }));
    await waitFor(() => expect(rowsOf()).toHaveLength(2));                           // the chat is listed from its first message on
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(2));
  });

  it('does not list an archived chat that has no turns either', async () => {
    const archivedEmpty = { ...base, id: 6, title: 'New chat', archived_at: '2026-11-01T10:00:00Z' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [archivedEmpty] : [talk], next: null })) });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(6));
    await act(async () => { await Promise.resolve(); });
    expect(nav().queryByRole('button', { name: /Chat\.archived/ })).toBeNull();      // nothing left to expand
  });

  it('without the host hook an existing empty chat is hidden and reused by New chat (4.29.0 behaviour)', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [talk, empty], next: null }) });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(rowsOf()).toEqual(['Budget talk']));
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    expect(api.createChat).not.toHaveBeenCalled();                                   // the empty chat is shown instead
  });

  it('keeps a chat the host marks in use listed, does not read it as empty and does not reuse it', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [talk, empty], next: null }) });
    render(<ChatWorkspace api={api} isChatInUse={(item) => item.id === 2} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(rowsOf()).toEqual(['Budget talk', 'New chat']));       // listed although it has no turn
    expect(api.listTurns).not.toHaveBeenCalledWith(2);                                // never read as empty
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(1));             // a fresh chat, not the marked one
  });

  it('does not reuse an open empty chat once the host marks it in use', async () => {
    const used = new Set();
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [talk], next: null }) });     // one stable api object across the host's renders
    function Host() {
      const [, setTick] = React.useState(0);
      return <>
        <button onClick={() => { used.add(99); setTick((n) => n + 1); }}>mark</button>
        <ChatWorkspace api={api} isChatInUse={(item) => used.has(item.id)} />
      </>;
    }
    render(<Host />);
    await screen.findByText('Budget talk');
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    expect(rowsOf()).toEqual(['Budget talk']);                                       // the new empty chat is open, not listed yet
    fireEvent.click(screen.getByText('mark'));                                        // a release puts excerpts into the open chat
    await waitFor(() => expect(rowsOf()).toEqual(['New chat', 'Budget talk']));       // it is listed now (a new chat is listed first)
    fireEvent.click(nav().getByRole('button', { name: 'Chat.newChat' }));
    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(2));             // and New chat creates a fresh one
  });

  it('keeps an archived chat the host marks in use listed', async () => {
    const archivedEmpty = { ...base, id: 6, title: 'New chat', archived_at: '2026-11-01T10:00:00Z' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [archivedEmpty] : [talk], next: null })) });
    render(<ChatWorkspace api={api} isChatInUse={(item) => item.id === 6} />);
    await screen.findByText('Budget talk');
    expect(await nav().findByRole('button', { name: /Chat\.archived/ })).toBeTruthy();   // the archive section stays
  });

  it('keeps a chat with a failed first turn listed', async () => {
    const api = makeApi({
      listChats: vi.fn().mockResolvedValue({ results: [talk, empty], next: null }),
      listTurns: vi.fn().mockImplementation(async (id) => (id === 2
        ? { results: [{ id: 20, seq: 1, user_text: 'Question', assistant_text: '', state: 'failed', error_code: 'unavailable', sources: [] }], next: null }
        : { results: [], next: null })),
    });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(2));
    await waitFor(() => expect(rowsOf()).toHaveLength(2));
  });

  it('hides a genuinely empty chat next to one with a failed first turn', async () => {
    const failed = { ...base, id: 7, title: 'New chat' };
    const api = makeApi({
      listChats: vi.fn().mockResolvedValue({ results: [talk, empty, failed], next: null }),
      listTurns: vi.fn().mockImplementation(async (id) => (id === 7
        ? { results: [{ id: 70, seq: 1, user_text: 'Question', assistant_text: '', state: 'failed', error_code: 'unavailable', sources: [] }], next: null }
        : { results: [], next: null })),
    });
    render(<ChatWorkspace api={api} />);
    await screen.findByText('Budget talk');
    await waitFor(() => expect(rowsOf()).toEqual(['Budget talk', 'New chat']));           // the empty one (2) is hidden, the failed one (7) stays
  });
});
