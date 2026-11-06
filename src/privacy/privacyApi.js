import apiClient from '../auth/apiClient';
import { CSRF_URL } from '../auth/authConfig';

/** Create the DCM-PRIV-1 transport (requires django-core-micha >= 3.22.0). */
export function createPrivacyApi(overrides = {}, { apiBase = '/api/privacy/', csrfUrl = CSRF_URL } = {}) {
  const root = `${String(apiBase).replace(/\/$/, '')}/`;
  const data = (request) => request.then((response) => response.data);
  let csrfRequest = null;
  let csrfPrimed = false;

  const defaults = {
    getManifest: () => data(apiClient.get(`${root}manifest/`)),
    getChoices: () => data(apiClient.get(`${root}choices/`)),
    saveChoices: (body) => data(apiClient.post(`${root}choices/`, body)),
    primeCsrf: async () => {
      if (csrfPrimed) return;
      if (!csrfRequest) {
        csrfRequest = Promise.resolve()
          .then(() => apiClient.get(csrfUrl))
          .then(() => { csrfPrimed = true; })
          .finally(() => { csrfRequest = null; });
      }
      await csrfRequest;
    },
  };

  return { ...defaults, ...overrides };
}

export const defaultPrivacyApi = createPrivacyApi();
