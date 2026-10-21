export const BILLING_STATUSES = { ACTIVE: 'active', READ_ONLY: 'read_only' };
export const BILLING_SOURCES = { SUBSCRIPTION: 'subscription', TEAM: 'team', FREE: 'free', NONE: null };
export const BILLING_KINDS = { SUBSCRIPTION: 'subscription', TEAM_PACKAGE: 'team_package', TOKEN_PACKAGE: 'token_package' };
export const BILLING_TOKEN_ORIGINS = ['plan', 'package', 'trial', 'credit'];
export const BILLING_ERROR_CODES = ['unknown_plan', 'checkout_unavailable', 'no_customer', 'portal_unavailable', 'no_active_team', 'invalid_user', 'seat_limit'];
export const BILLING_OPERATOR_ERROR_CODES = ['authentication_required', 'forbidden', 'invalid_month', 'invalid_page', 'invalid_query', 'reason_required', 'user_not_found'];

export const billingApiUrls = (base = '/api/billing/') => {
  const root = base.replace(/\/$/, '') + '/';
  return {
    me: root + 'me/',
    checkout: root + 'checkout/',
    checkoutAttempt: (reference) => root + `checkout/attempts/${encodeURIComponent(reference)}/`,
    portal: root + 'portal/',
    seats: root + 'team/seats/',
    withdrawals: root + 'withdrawal/',
    withdrawalPreview: (id) => root + `withdrawal/${encodeURIComponent(id)}/preview/`,
    withdrawalConfirm: (id) => root + `withdrawal/${encodeURIComponent(id)}/`,
    operatorOverview: root + 'operator/overview/',
    operatorAccounts: root + 'operator/accounts/',
    operatorFreeAccess: (id) => root + `operator/accounts/${encodeURIComponent(id)}/free-access/`,
  };
};
