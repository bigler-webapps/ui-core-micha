import apiClient from '../auth/apiClient';
import { chatApiUrls } from './wire';

export function createChatApi(overrides = {}, { apiBase = '/api/assistant/' } = {}) {
  const urls = chatApiUrls(apiBase);
  const data = (request) => request.then((response) => response.data);
  const defaults = {
    getCatalogue: () => data(apiClient.get(urls.catalogue)),
    listChats: ({ archived = false, cursor } = {}) => data(apiClient.get(urls.chats, { params: { archived, ...(cursor ? { cursor } : {}) } })),
    createChat: (payload = {}) => data(apiClient.post(urls.chats, payload)),
    updateChat: (id, patch) => data(apiClient.patch(urls.chat(id), patch)),
    deleteChat: (id) => data(apiClient.delete(urls.chat(id))),
    listTurns: (id, { cursor } = {}) => data(apiClient.get(urls.turns(id), { params: cursor ? { cursor } : {} })),
    getStatus: () => data(apiClient.get(urls.status)),
  };
  return { ...defaults, ...overrides };
}
export const defaultChatApi = createChatApi();
