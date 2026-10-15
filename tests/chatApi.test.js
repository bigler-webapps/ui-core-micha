import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import apiClient from '../src/auth/apiClient';
import { createChatApi } from '../src/chat/api';

beforeEach(() => {
  for (const method of ['get', 'post', 'patch', 'delete']) apiClient[method].mockReset().mockResolvedValue({ data: { ok: method } });
});

describe('chat api client', () => {
  it('calls the contract endpoints and unwraps the response data', async () => {
    const api = createChatApi();
    expect(await api.getCatalogue()).toEqual({ ok: 'get' });
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/assistant/catalogue/');
    await api.listChats({ archived: true, cursor: 'c1' });
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/assistant/chats/', { params: { archived: true, cursor: 'c1' } });
    await api.createChat({ scope: 'x' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/assistant/chats/', { scope: 'x' });
    await api.updateChat(4, { selection: { entry: 'a', effort: 'low' } });
    expect(apiClient.patch).toHaveBeenLastCalledWith('/api/assistant/chats/4/', { selection: { entry: 'a', effort: 'low' } });
    await api.deleteChat(4);
    expect(apiClient.delete).toHaveBeenLastCalledWith('/api/assistant/chats/4/');
    await api.listTurns(4, { cursor: 'older' });
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/assistant/chats/4/turns/', { params: { cursor: 'older' } });
    await api.getStatus();
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/assistant/status/');
  });

  it('keeps the defaults of every other function when one is overridden', async () => {
    const names = ['getCatalogue', 'listChats', 'createChat', 'updateChat', 'deleteChat', 'listTurns', 'getStatus'];
    const defaults = createChatApi({}, { apiBase: '/v2/chat' });
    for (const name of names) {
      const override = vi.fn();
      const api = createChatApi({ [name]: override }, { apiBase: '/v2/chat' });
      expect(api[name]).toBe(override);
      for (const other of names.filter((n) => n !== name)) expect(String(api[other])).toBe(String(defaults[other]));
    }
    const api = createChatApi({ getStatus: vi.fn() }, { apiBase: '/v2/chat' });
    await api.getCatalogue();
    expect(apiClient.get).toHaveBeenLastCalledWith('/v2/chat/catalogue/');
    await api.deleteChat(9);
    expect(apiClient.delete).toHaveBeenLastCalledWith('/v2/chat/chats/9/');
  });
});
