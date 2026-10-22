// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; FakeSocket.instances.push(this); }
  close() { this.readyState = 3; }
}

const chat = { id: 27, title: 'Preloaded chat', archived_at: null, selection: null };
const catalogue = { entries: [], default: null };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const page = (results = [], next = null) => ({ results, next });

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue(catalogue),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => page(archived ? [] : [chat])),
    createChat: vi.fn().mockResolvedValue(chat),
    updateChat: vi.fn().mockResolvedValue(chat),
    deleteChat: vi.fn().mockResolvedValue(null),
    listTurns: vi.fn().mockResolvedValue(page()),
    ...extra,
  };
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace parallel start', () => {
  it('starts status, catalogue and both chat lists before any answer resolves', async () => {
    const status = deferred();
    const entries = deferred();
    const active = deferred();
    const archived = deferred();
    const api = makeApi({
      getStatus: vi.fn(() => status.promise),
      getCatalogue: vi.fn(() => entries.promise),
      listChats: vi.fn(({ archived: isArchived } = {}) => (isArchived ? archived : active).promise),
    });
    render(<ChatWorkspace api={api} scope="alpha" />);

    await waitFor(() => {
      expect(api.getStatus).toHaveBeenCalledWith({ scope: 'alpha' });
      expect(api.getCatalogue).toHaveBeenCalledTimes(1);
      expect(api.listChats).toHaveBeenCalledTimes(2);
    });
    expect(api.listChats).toHaveBeenCalledWith({ scope: 'alpha' });
    expect(api.listChats).toHaveBeenCalledWith({ scope: 'alpha', archived: true });

    await act(async () => {
      status.resolve({ status: 'available' });
      entries.resolve(catalogue);
      active.resolve(page([chat]));
      archived.resolve(page());
    });
    expect((await screen.findAllByText('Preloaded chat')).length).toBeGreaterThan(0);
  });

  it.each([
    ['not_configured', { status: 'not_configured' }, 'Chat.unavailable', 'reject'],
    ['not_configured', { status: 'not_configured' }, 'Chat.unavailable', 'resolve'],
    ['status error', new Error('status failed'), 'Chat.loadError', 'reject'],
    ['status error', new Error('status failed'), 'Chat.loadError', 'resolve'],
  ])('keeps the %s state when catalogue and lists %s later', async (_label, statusAnswer, expectedText, settle) => {
    const status = deferred();
    const entries = deferred();
    const active = deferred();
    const archived = deferred();
    const api = makeApi({
      getStatus: vi.fn(() => status.promise),
      getCatalogue: vi.fn(() => entries.promise),
      listChats: vi.fn(({ archived: isArchived } = {}) => (isArchived ? archived : active).promise),
    });
    render(<ChatWorkspace api={api} />);
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(2));

    await act(async () => {
      if (statusAnswer instanceof Error) status.reject(statusAnswer);
      else status.resolve(statusAnswer);
    });
    expect(await screen.findByText(expectedText)).toBeTruthy();
    await act(async () => {
      if (settle === 'resolve') {
        entries.resolve(catalogue);
        active.resolve(page([chat]));
        archived.resolve(page());
      } else {
        entries.reject(new Error('catalogue failed'));
        active.reject(new Error('active list failed'));
        archived.reject(new Error('archived list failed'));
      }
      await Promise.resolve();
    });
    expect(screen.queryByText('Preloaded chat')).toBeNull();
    expect(screen.getByText(expectedText)).toBeTruthy();
    if (statusAnswer instanceof Error) expect(screen.getByRole('alert').textContent).toBe(expectedText);
    else expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses a same-scope preloaded active list, requests archived chats and activates the host choice', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue(page()) });
    render(<ChatWorkspace api={api} scope="alpha" preloadedChats={{ scope: 'alpha', results: [chat], next: null }} activeChatId={27} />);

    await waitFor(() => expect(api.listTurns).toHaveBeenCalledWith(27));
    expect(api.listChats).toHaveBeenCalledTimes(1);
    expect(api.listChats).toHaveBeenCalledWith({ scope: 'alpha', archived: true });
    expect((await screen.findAllByText('Preloaded chat')).length).toBeGreaterThan(1);
  });

  it('ignores a preloaded active list belonging to a different scope', async () => {
    const api = makeApi({ listChats: vi.fn().mockResolvedValue(page([chat])) });
    render(<ChatWorkspace api={api} scope="alpha" preloadedChats={{ scope: 'beta', results: [], next: null }} />);
    await screen.findByText('Preloaded chat');
    expect(api.listChats).toHaveBeenCalledTimes(2);
    expect(api.listChats).toHaveBeenCalledWith({ scope: 'alpha' });
    expect(api.listChats).toHaveBeenCalledWith({ scope: 'alpha', archived: true });
  });

  it('drops old-scope status, catalogue and list answers after a scope change', async () => {
    const oldStatus = deferred();
    const oldCatalogue = deferred();
    const oldActive = deferred();
    const oldArchived = deferred();
    const newChat = { ...chat, id: 28, title: 'New scope chat' };
    const api = makeApi({
      getStatus: vi.fn(({ scope } = {}) => (scope === 'old' ? oldStatus.promise : Promise.resolve({ status: 'available' }))),
      getCatalogue: vi.fn()
        .mockImplementationOnce(() => oldCatalogue.promise)
        .mockResolvedValue({
          entries: [{ id: 'new-model', label: 'New model', efforts: ['high'] }],
          default: { entry: 'new-model', effort: 'high' },
        }),
      listChats: vi.fn(({ scope, archived: isArchived } = {}) => {
        if (scope === 'old') return (isArchived ? oldArchived : oldActive).promise;
        return Promise.resolve(page(isArchived ? [] : [newChat]));
      }),
    });
    const view = render(<ChatWorkspace api={api} scope="old" />);
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(2));
    view.rerender(<ChatWorkspace api={api} scope="new" activeChatId={28} />);
    expect(await screen.findByText('New scope chat')).toBeTruthy();

    await act(async () => {
      oldStatus.resolve({ status: 'available' });
      oldCatalogue.resolve({
        entries: [{ id: 'old-model', label: 'Old model', efforts: ['high'] }],
        default: { entry: 'old-model', effort: 'high' },
      });
      oldActive.resolve(page([{ ...chat, title: 'Old scope chat' }]));
      oldArchived.resolve(page());
    });
    expect(screen.queryByText('Old scope chat')).toBeNull();
    expect(screen.getByText('New scope chat')).toBeTruthy();
    expect(screen.queryByText(/Old model/)).toBeNull();
    expect(screen.getAllByText(/New model/).length).toBeGreaterThan(0);
  });
});
