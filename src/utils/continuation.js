// Shared continuation validation for LoginPage, LoginContent and the embedded
// provider entries (UCM-AUTH-14). One implementation, so the page and the
// embedded variants can never disagree about which destinations are safe.

export const WEAK_LOGIN_SECURITY_TARGET = '/account?tab=security&from=weak_login';
export const RECOVERY_SECURITY_TARGET = '/account?tab=security&from=recovery';

function currentOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Returns the same-origin path (pathname + search + hash) for a continuation, or
 * null when it is not safe.
 *
 * Requires a leading-slash absolute path on the raw input: that rejects relative
 * inputs like `account/settings` and protocol-relative `//host` before they reach
 * the URL parser, which would normalise both into a same-origin pathname. A
 * backslash anywhere is rejected too (`/\evil.com` WHATWG-parses to
 * `https://evil.com/` for special schemes). The parsed origin must still match,
 * which catches stripped tab/newline tricks such as `/\t/evil.com`.
 */
export function sanitizeContinuation(value, origin = currentOrigin()) {
  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
  ) {
    return null;
  }
  try {
    const parsed = new URL(value, origin);
    return parsed.origin === origin ? parsed.pathname + parsed.search + parsed.hash : null;
  } catch {
    return null;
  }
}

/**
 * Where a person goes after signing in. Precedence: a forced target (recovery)
 * > required additional security > the validated continuation > `/`.
 */
export function resolveContinuationTarget(value, user, forcedTarget) {
  if (forcedTarget) return forcedTarget;
  if (user?.security_state?.requires_additional_security === true) {
    return WEAK_LOGIN_SECURITY_TARGET;
  }
  return sanitizeContinuation(value) ?? '/';
}
