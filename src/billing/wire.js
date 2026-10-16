export const BILLING_STATUSES = { ACTIVE: 'active', READ_ONLY: 'read_only' };
export const BILLING_SOURCES = { SUBSCRIPTION: 'subscription', TEAM: 'team', FREE: 'free', NONE: null };
export const BILLING_KINDS = { SUBSCRIPTION: 'subscription', TEAM_PACKAGE: 'team_package', TOKEN_PACKAGE: 'token_package' };
export const BILLING_ERROR_CODES = ['unknown_plan', 'checkout_unavailable', 'no_customer', 'portal_unavailable', 'no_active_team', 'invalid_user', 'seat_limit'];

export const billingApiUrls = (base = '/api/billing/') => {
  const root = base.replace(/\/$/, '') + '/';
  return {
    me: root + 'me/',
    checkout: root + 'checkout/',
    portal: root + 'portal/',
    seats: root + 'team/seats/',
  };
};
