# APP_FINDINGS.md — ui-core-micha

Generated 2026-05-24 from a deep-security audit (sec_reviewer agent pass).
Cross-reference: `webapp-management/SECURITY_FINDINGS.md` for central tracking.
Cross-reference: `django-core-micha/APP_FINDINGS.md` for the auth-library scan that ran alongside this one.

Already addressed:
- S50 caller fix (token-in-body for recovery-login)
- S62 same-origin validation for `startSocialLogin.callbackUrl`
- TS6 build-fix (tsconfig rootDir + ignoreDeprecations) — published as 2.4.3

---

## P2 — Major

### UICORE-NEW-passwordinvite-open-redirect — `nextPath` not origin-validated at composition
**Severity:** P2
**File:** `src/pages/PasswordInvitePage.jsx:74`
**Confidence:** high
**Issue:** `nextPath` read from `location.search` is composed into `/login?next=${encodeURIComponent(nextPath)}` without validating that it starts with `/` (and is not a protocol-relative `//host`). An attacker crafts `/invite/<uid>/<token>?next=https://evil.example/`; after password-set the user lands on `/login?next=https%3A%2F%2Fevil.example%2F`. The `LoginPage` does validate `requestedNext.startsWith('/')` (line 54), so today the attack is blocked at consumption — but defense-in-depth requires sanitization at composition.
**Repro:** Send a victim a `/invite/<uid>/<token>?next=https://attacker.example/` URL; the URL composition step silently encodes the attacker URL into the redirect chain.
**Fix:** Before encoding at line 73:
```js
if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
  nextPath = '/';
}
```

---

## Residual risks / lower-confidence

- Token / session handling client-side — confirm localStorage is not used for security-critical tokens; cookies should remain HttpOnly + Secure.
- i18next interpolation — verify no user-controlled translation key with HTML substitution is rendered without sanitization.
- DOMPurify usage — confirm all `dangerouslySetInnerHTML` paths in pages/ go through DOMPurify or equivalent (the survey-side findings in jg-ferien showed SVG paths bypassing this — verify ui-core analogues).
