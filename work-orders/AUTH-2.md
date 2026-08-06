# WORK ORDER AUTH-2 — Translate backend auth error codes (stop leaking raw codes to users)

Tier 2 (touches `ui-core-micha` = shared-core). ucm-only, **zero per-app work** for the core (the
components already call `t(err.code)` — they just lack the translations). Found alongside the
AUTH-1 password report: ucm surfaces raw backend error **codes**, not human text.

## A. Envelope (authoritative WHAT / WHY)

### Problem (verified)
`src/auth/apiClient.jsx:107-124` extracts `err.code` (a machine code) from the backend/allauth
response. Components then render it as an i18n key: `setErrorKey(err.code || 'Auth.X_FAILED')` →
`t(errorKey)` (e.g. `SecurityComponent.jsx:60/71`, `ProfileComponent.jsx:143`,
`MfaLoginComponent.jsx:53`), or `t(err?.code || 'Auth.X_FAILED', 'fallback')`. **The i18n
catalogue has no entries for these codes** (grep for `email_password_mismatch` / `password_too_*`
= empty), so i18next returns the key unchanged and the user sees the literal
**`email_password_mismatch`** (or a generic fallback that hides the specific reason). This affects
**all** rendering auth screens — login, change-password, MFA, profile — not just passwords.

### Goal
Render translated, human text for the known backend auth error codes, so the specific reason
(including the password rules AUTH-1's frontend validator can't replicate — common-password,
similarity) shows wherever a ucm component already renders an auth error. Because the components
already `t(err.code)`, this is achieved by **adding the translations** — no component change, no
app change.

### Deliverable
1. **Enumerate the backend auth error codes** actually emitted — from allauth-headless + Django
   password-validator codes, confirmed against real responses (don't guess the full set). Known
   starters: `email_password_mismatch`, `password_too_short`, `password_too_common`,
   `password_entirely_numeric` (verify exact spelling), `password_too_similar`, and the current-
   password / incorrect-password codes surfaced by the change-password flow.
2. Add i18n entries for each, **de/fr/en**, in `src/i18n/authTranslations.ts`, **keyed by the raw
   code string** (so the existing `t(err.code)` resolves as a drop-in — no component edit).
3. Keep the generic `Auth.X_FAILED` fallback for unknown/unmapped codes (no regression).

### Design note — keying (decision to confirm in planning)
Raw-code keys (`"password_too_short": {...}`) are the **drop-in** fix matching the existing
`t(err.code)` calls — pure ucm, no backend change. Cleaner but two-repo alternative: have dcm's
exception handler set a namespaced `i18nKey` per error (apiClient already reads `data.i18nKey`,
`apiClient.jsx:107`) → ucm keys become `Auth.ERROR.*`. Prefer the drop-in unless the operator wants
the namespaced contract.

### Scope boundary (honest)
This fixes screens that **render** the error (login, change-password via `SecurityComponent`, MFA,
profile). It does **NOT** reach the invitation **`PasswordSetForm`** — that form **delegates**
`onSubmit` and renders no API error at all; its proactive coverage is AUTH-1 (helperText +
validator), and its full reactive display would need the deferred per-app error-prop.

### Non-goals
No component/contract change (translations only, unless the namespaced-`i18nKey` option is chosen →
then a small dcm touch). No new error surfaces. Don't remove the generic fallbacks.

### Tier / rollout
Tier 2 (shared-core). Publish-from-main → minor bump → consumers adopt on pin-bump. Zero per-app
for the core.

### Required tests
`t(<code>)` resolves to translated text for each mapped code (de/fr/en); an unmapped code still
falls back to the generic `Auth.*_FAILED`; a representative render path (e.g. `SecurityComponent`
change-password error) shows human text, not the raw code.

## B. Implementation map (seed)
- `src/i18n/authTranslations.ts` — add the enumerated code→text entries (de/fr/en).
- (verification only) `src/auth/apiClient.jsx:107-124` + the `setErrorKey(err.code…)` /
  `t(err.code…)` call sites — confirm they resolve against the new entries; no edit expected.
- `package.json` — minor bump at finalize.
- (optional, if namespaced-`i18nKey` chosen) `django-core-micha` auth exception handler — set
  `i18nKey` per error.

**Review:** Tier 2 → `reviewer` + **`ui_reviewer`** (i18n/translation coverage — the whole point).
**Directive:** implementer leaves the diff; Orchestrator reviews + bumps version + commits on
green. Codex out until 2026-08-06 → direct Claude.

**Companion:** AUTH-1 (the proactive helperText + inline validator — the other half).
