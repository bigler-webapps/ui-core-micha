import apiClient from '../auth/apiClient';
import { billingApiUrls } from './wire';

export function createBillingApi(overrides = {}, { apiBase = '/api/billing/' } = {}) {
  const urls = billingApiUrls(apiBase);
  const data = (request) => request.then((response) => response.data);
  const defaults = {
    getMe: () => data(apiClient.get(urls.me)),
    startCheckout: (planKey) => data(apiClient.post(urls.checkout, { plan_key: planKey })),
    openPortal: () => data(apiClient.post(urls.portal)),
    listSeats: () => data(apiClient.get(urls.seats)),
    addSeat: ({ userId, email } = {}) => data(apiClient.post(urls.seats, userId !== undefined ? { user_id: userId } : { email })),
    removeSeat: ({ userId, email } = {}) => data(apiClient.delete(urls.seats, { data: userId !== undefined ? { user_id: userId } : { email } })),
  };
  return { ...defaults, ...overrides };
}

export const defaultBillingApi = createBillingApi();
