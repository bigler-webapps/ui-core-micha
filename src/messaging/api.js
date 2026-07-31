import apiClient from '../auth/apiClient';

const BASE_URL = '/api/messaging/';
const conversationsUrl = `${BASE_URL}conversations/`;

function data(response) {
  return response.data;
}

function requestConfig({ cursor, params, headers } = {}) {
  return {
    ...(params ? { params } : {}),
    ...(cursor ? { params: { ...(params || {}), cursor } } : {}),
    ...(headers ? { headers } : {}),
  };
}

export function listConversations({ cursor, ...filters } = {}) {
  return apiClient.get(conversationsUrl, requestConfig({ cursor, params: filters })).then(data);
}
export function createDirectConversation(payload) { return apiClient.post(`${conversationsUrl}direct/`, payload).then(data); }
export function createGroupConversation(payload) { return apiClient.post(`${conversationsUrl}group/`, payload).then(data); }
export function createBroadcastConversation(payload) { return apiClient.post(`${conversationsUrl}broadcast/`, payload).then(data); }
export function createManagedConversation(payload) { return apiClient.post(`${conversationsUrl}managed/`, payload).then(data); }
export function createObjectThreadConversation(payload) { return apiClient.post(`${conversationsUrl}object-thread/`, payload).then(data); }
export function getConversationConfig(conversationId) { return apiClient.get(`${conversationsUrl}${conversationId}/config/`).then(data); }
export function patchConversationConfig(conversationId, patch) { return apiClient.patch(`${conversationsUrl}${conversationId}/config/`, patch).then(data); }
export function archiveConversation(conversationId, archived) { return apiClient.post(`${conversationsUrl}${conversationId}/archive/`, { archived }).then(data); }
export function patchConversationPreferences(conversationId, patch) { return apiClient.post(`${conversationsUrl}${conversationId}/preferences/`, patch).then(data); }
export function listMessages(conversationId, { cursor } = {}) { return apiClient.get(`${conversationsUrl}${conversationId}/messages/`, requestConfig({ cursor })).then(data); }
export function createMessage(conversationId, payload, { idempotencyKey } = {}) { return apiClient.post(`${conversationsUrl}${conversationId}/messages/`, payload, requestConfig({ headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined })).then(data); }
export function uploadAttachments(conversationId, formData, { idempotencyKey } = {}) { return apiClient.post(`${conversationsUrl}${conversationId}/attachments/`, formData, requestConfig({ headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined })).then(data); }
export function createPoll(conversationId, payload, { idempotencyKey } = {}) { return apiClient.post(`${conversationsUrl}${conversationId}/polls/`, payload, requestConfig({ headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined })).then(data); }
export function getMessage(messageId) { return apiClient.get(`${BASE_URL}messages/${messageId}/`).then(data); }
export function patchMessage(messageId, patch) { return apiClient.patch(`${BASE_URL}messages/${messageId}/`, patch).then(data); }
export function deleteMessage(messageId) { return apiClient.delete(`${BASE_URL}messages/${messageId}/`).then(data); }
export function addReaction(messageId, emoji) { return apiClient.post(`${BASE_URL}messages/${messageId}/reactions/`, { emoji }).then(data); }
export function removeReaction(messageId, emoji) { return apiClient.delete(`${BASE_URL}messages/${messageId}/reactions/${encodeURIComponent(emoji)}/`).then(data); }
export function listThread(rootId, { cursor } = {}) { return apiClient.get(`${BASE_URL}messages/${rootId}/thread/`, requestConfig({ cursor })).then(data); }
export function markThreadRead(rootId, readAt) { return apiClient.post(`${BASE_URL}messages/${rootId}/thread/read/`, readAt ? { read_at: readAt } : {}).then(data); }
export function markConversationRead(conversationId, readAt) { return apiClient.post(`${conversationsUrl}${conversationId}/read/`, readAt ? { read_at: readAt } : {}).then(data); }
export function getReadStatus(messageId) { return apiClient.get(`${BASE_URL}messages/${messageId}/read-status/`).then(data); }
export function votePoll(pollId, optionIds) { return apiClient.post(`${BASE_URL}polls/${pollId}/vote/`, { option_ids: optionIds }).then(data); }
export function closePoll(pollId) { return apiClient.post(`${BASE_URL}polls/${pollId}/close/`).then(data); }
export function getAttachment(attachmentId) { return apiClient.get(`${BASE_URL}attachments/${attachmentId}/`, { responseType: 'blob' }).then(data); }
export function getAttachmentThumbnail(attachmentId) { return apiClient.get(`${BASE_URL}attachments/${attachmentId}/thumbnail/`, { responseType: 'blob' }).then(data); }
export function getUnreadCount() { return apiClient.get(`${BASE_URL}unread-count/`).then(data); }
