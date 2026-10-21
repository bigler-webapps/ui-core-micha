import apiClient from '../auth/apiClient';
import { billingApiUrls } from './wire';

/**
 * Billing HTTP client. `startCheckout(planKey)` keeps the legacy request shape.
 * Contextual checkout and `resolveCheckoutAttempt` require django-core-micha >= 3.16.0;
 * contextual calls require `{ context, idempotencyKey }` and never accept redirect URLs.
 */
export function createBillingApi(overrides = {}, { apiBase = '/api/billing/' } = {}) {
  const urls = billingApiUrls(apiBase);
  const data = (request) => request.then((response) => response.data);
  const validToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value);
  const defaults = {
    getMe: () => data(apiClient.get(urls.me)),
    startCheckout: (planKey, options) => {
      if (options?.context === undefined || options?.context === null) return data(apiClient.post(urls.checkout, { plan_key: planKey }));
      if (!validToken(options?.idempotencyKey)) return Promise.reject(new TypeError('A valid idempotencyKey is required for contextual checkout.'));
      return data(apiClient.post(urls.checkout, { plan_key: planKey, context: options.context, idempotency_key: options.idempotencyKey }));
    },
    resolveCheckoutAttempt: (reference) => {
      if (!validToken(reference)) return Promise.reject(new TypeError('A valid checkout attempt reference is required.'));
      return data(apiClient.get(urls.checkoutAttempt(reference)));
    },
    openPortal: () => data(apiClient.post(urls.portal)),
    listSeats: () => data(apiClient.get(urls.seats)),
    addSeat: ({ userId, email } = {}) => data(apiClient.post(urls.seats, userId !== undefined ? { user_id: userId } : { email })),
    removeSeat: ({ userId, email } = {}) => data(apiClient.delete(urls.seats, { data: userId !== undefined ? { user_id: userId } : { email } })),
    listWithdrawals: () => data(apiClient.get(urls.withdrawals)),
    previewWithdrawal: (id) => data(apiClient.get(urls.withdrawalPreview(id))),
    confirmWithdrawal: (id) => data(apiClient.post(urls.withdrawalConfirm(id), { confirm: true })),
    getOperatorOverview: ({ month } = {}) => data(month === undefined ? apiClient.get(urls.operatorOverview) : apiClient.get(urls.operatorOverview, { params: { month } })),
    listOperatorAccounts: ({ q, page, pageSize } = {}) => {
      const params = {};
      if (q !== undefined) params.q = q;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      return data(apiClient.get(urls.operatorAccounts, { params }));
    },
    grantFreeAccess: (userId, reason) => data(apiClient.post(urls.operatorFreeAccess(userId), { reason })),
    revokeFreeAccess: (userId) => data(apiClient.delete(urls.operatorFreeAccess(userId))),
  };
  return { ...defaults, ...overrides };
}

export function createCheckoutIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID().replace(/-/g, '_');
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(24);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('A cryptographic random source is required to create a checkout key.');
}

export const defaultBillingApi = createBillingApi();
