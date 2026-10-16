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

export const defaultBillingApi = createBillingApi();
