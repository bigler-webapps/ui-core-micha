export const CHAT_CLOSE_CODES = { 4401: 'session_ended', 4403: 'access_lost', 4429: 'rate_limited' };
export const CHAT_ERROR_CODES = ['quota_exceeded', 'provider_error', 'timeout', 'prompt_too_long', 'invalid_output', 'security_violation', 'not_configured', 'rate_limited', 'invalid_selection', 'archived', 'turn_active', 'invalid_frame'];
export const chatApiUrls = (base = '/api/assistant/') => {
  const root = base.replace(/\/$/, '') + '/';
  return { catalogue: root + 'catalogue/', chats: root + 'chats/', chat: (id) => root + 'chats/' + encodeURIComponent(id) + '/', turns: (id) => root + 'chats/' + encodeURIComponent(id) + '/turns/', status: root + 'status/' };
};
export const defaultChatWsUrl = (chatId) => (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws/assistant/chats/' + encodeURIComponent(chatId) + '/';
