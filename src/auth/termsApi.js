import apiClient from './apiClient';

/** Create the opt-in DCM-AUTH-12 terms acceptance client (requires DCM >= 3.16.0). */
export function createTermsApi(overrides = {}, { apiBase = '/api/terms/' } = {}) {
  const root = `${String(apiBase).replace(/\/$/, '')}/`;
  const data = (request) => request.then((response) => response.data);
  const defaults = {
    getAcceptance: () => data(apiClient.get(root)),
    accept: (version) => data(apiClient.post(root, { version, accept: true })),
  };
  return { ...defaults, ...overrides };
}

export const defaultTermsApi = createTermsApi();
