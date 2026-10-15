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
  constructor(url) { this.url = url; this.readyState = 0; FakeSocket.instances.push(this); }
  close() { this.readyState = 3; }
}

const catalogue = { entries: [], default: null };
const chat = { id: 7, title: 'Budget', archived_at: null, selection: null };

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue(catalogue),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })),
    createChat: vi.fn().mockResolvedValue({ ...chat, id: 8, title: 'New conversation' }),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chat, id, ...patch })),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
    ...extra,
  };
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace activeChatId', () => {
  it('opens a chat that is already in the loaded list', async () => {
    const other = { ...chat, id: 9, title: 'Other' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat, other], next: null })) });
    render(<ChatWorkspace api={api} activeChatId="9" />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    // The requested chat, not the first one of the list, was opened.
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(9));
    expect(api.listTurns).not.toHaveBeenCalledWith(7);
  });

  it('retries an id that was missing once the host went through null and asks for it again', async () => {
    let available = false;
    const late = { ...chat, id: 12, title: 'Late chat' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : (available ? [chat, late] : [chat]), next: null })) });
    const view = render(<ChatWorkspace api={api} activeChatId={12} />);
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(4));
    expect(screen.getByText('Chat.selectChat')).toBeTruthy();
    available = true;
    view.rerender(<ChatWorkspace api={api} activeChatId={null} />);
    view.rerender(<ChatWorkspace api={api} activeChatId={12} />);
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(12));
  });

  it('reloads the lists once to find and open a newly created chat', async () => {
    const newChat = { ...chat, id: 8, title: 'Created elsewhere' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => {
      const results = archived ? [] : (api.listChats.mock.calls.length > 2 ? [chat, newChat] : [chat]);
      return { results, next: null };
    }) });
    render(<ChatWorkspace api={api} activeChatId={8} />);
    await waitFor(() => expect(screen.getAllByText('Created elsewhere').length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(8));
    expect(api.listTurns).not.toHaveBeenCalledWith(7);
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(4));
  });

  it('leaves the no-chat state for an unloadable id after one reload', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue({ results: [], next: null }) });
    render(<ChatWorkspace api={api} activeChatId={404} />);
    expect(await screen.findByText('Chat.selectChat')).toBeTruthy();
    // Two initial list loads plus exactly one reload for the unknown id (active and archived list each).
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(4));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(api.listChats).toHaveBeenCalledTimes(4);
    expect(screen.getByText('Chat.selectChat')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports user selection, creation and deletion once each, but not mount or archive', async () => {
    const onActiveChatChange = vi.fn();
    let created = false;
    const api = makeApi({
      createChat: vi.fn().mockImplementation(async () => { created = true; return { ...chat, id: 8, title: 'New conversation' }; }),
      listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : (created ? [{ ...chat, id: 8, title: 'New conversation' }, chat] : [chat]), next: null })),
    });
    render(<ChatWorkspace api={api} onActiveChatChange={onActiveChatChange} />);
    await screen.findByText('Budget');
    expect(onActiveChatChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Budget'));
    await waitFor(() => expect(onActiveChatChange).toHaveBeenLastCalledWith(7));
    fireEvent.click(screen.getAllByRole('button', { name: 'Chat.newChat' })[0]);
    await waitFor(() => expect(onActiveChatChange).toHaveBeenLastCalledWith(8));
    const menu = () => fireEvent.click(screen.getAllByRole('button', { name: 'Chat.actions' })[0]);
    menu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.archive' }));
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(8, { archived: true }));
    // Chat 8 stays shown, now read-only, and nothing was reported for the archive.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(true));
    expect(onActiveChatChange.mock.calls).toEqual([[7], [8]]);
    menu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat.delete' }));
    await waitFor(() => expect(onActiveChatChange).toHaveBeenLastCalledWith(null));
    expect(onActiveChatChange.mock.calls).toEqual([[7], [8], [null]]);
  });

  it('reports a switch that the host drives through activeChatId', async () => {
    const other = { ...chat, id: 9, title: 'Other' };
    const api = makeApi({ listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat, other], next: null })) });
    const onActiveChatChange = vi.fn();
    const view = render(<ChatWorkspace api={api} activeChatId={7} onActiveChatChange={onActiveChatChange} />);
    await waitFor(() => expect(onActiveChatChange).toHaveBeenLastCalledWith(7));
    view.rerender(<ChatWorkspace api={api} activeChatId={9} onActiveChatChange={onActiveChatChange} />);
    await waitFor(() => expect(onActiveChatChange).toHaveBeenLastCalledWith(9));
    expect(onActiveChatChange.mock.calls).toEqual([[7], [9]]);
  });

  it('causes no extra requests when the host echoes a real user selection into the prop', async () => {
    const api = makeApi();
    function Host() {
      const [activeChatId, setActiveChatId] = useState(null);
      return <ChatWorkspace api={api} activeChatId={activeChatId} onActiveChatChange={setActiveChatId} />;
    }
    render(<Host />);
    fireEvent.click(await screen.findByText('Budget'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Chat.message' })).toBeTruthy());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(api.listChats).toHaveBeenCalledTimes(2);
    expect(api.listTurns).toHaveBeenCalledTimes(1);
  });

  it('does not reload when a host echoes the reported id into the prop', async () => {
    const api = makeApi();
    function Host() {
      const [activeChatId, setActiveChatId] = useState(7);
      return <ChatWorkspace api={api} activeChatId={activeChatId} onActiveChatChange={setActiveChatId} />;
    }
    render(<Host />);
    await screen.findAllByText('Budget');
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(2));
    // Give an echo loop time to show itself before asserting that nothing more was requested.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(api.listChats).toHaveBeenCalledTimes(2);
    expect(api.listTurns).toHaveBeenCalledTimes(1);
  });

  it('clears the shown chat when activeChatId becomes null', async () => {
    const api = makeApi();
    const { rerender } = render(<ChatWorkspace api={api} activeChatId={7} />);
    await screen.findAllByText('Budget');
    rerender(<ChatWorkspace api={api} activeChatId={null} />);
    expect(await screen.findByText('Chat.selectChat')).toBeTruthy();
  });
});
