import apiClient from '../auth/apiClient';
import { receiptsApiUrls } from './wire';

export function createReceiptsApi(overrides = {}, { apiBase = '/api/receipts/' } = {}) {
  const urls = receiptsApiUrls(apiBase);
  const defaults = {
    getConsent: () => apiClient.get(urls.consent).then((r) => r.data),
    setConsent: (granted) => (granted ? apiClient.post(urls.consent) : apiClient.delete(urls.consent)).then((r) => r.data),
    readReceipts: (file, { context, onUploadProgress, signal } = {}) => {
      const body = new FormData(); body.append('file', file);
      if (context !== undefined) body.append('context', JSON.stringify(context));
      return apiClient.post(urls.read, body, { onUploadProgress, signal }).then((r) => Array.isArray(r.data?.receipts) ? r.data.receipts : []);
    },
  };
  return { ...defaults, ...overrides };
}
export const defaultReceiptsApi = createReceiptsApi();
