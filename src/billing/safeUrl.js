// Hosts a checkout or portal link may point to. The server (Stripe) returns the link; the surface still checks it, so a
// malformed or tampered response can never send people to another site. An app can pass `allowedHosts` to add or replace.
export const DEFAULT_PAYMENT_HOSTS = ['*.stripe.com'];

const hostMatches = (hostname, pattern) => (pattern.startsWith('*.')
  ? hostname.endsWith(pattern.slice(1)) && hostname.length > pattern.length - 1
  : hostname === pattern);

/** True only for an `https://` URL without credentials whose host is one of `allowedHosts` (exact or `*.suffix`). */
export function isTrustedPaymentUrl(value, allowedHosts = DEFAULT_PAYMENT_HOSTS) {
  if (typeof value !== 'string') return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  return allowedHosts.some((pattern) => hostMatches(url.hostname.toLowerCase(), String(pattern).toLowerCase()));
}
