# UCM-AUTH-10: Error texts never show a raw backend code

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

A person who makes a mistake on a kit screen sees a sentence in the language the UI is set to. **Never
a raw backend code.** Today a login with a malformed e-mail shows the literal word `invalid`
(operator, `survey_app` staging, 2026-09-30), although the backend sent a translated sentence.

After this order every kit error display resolves its text through one shared chain, and the kit's API
client tells the backend which language the UI is in.

## Context the operator established

- **What the backend sends.** allauth headless: `{"status": 400, "errors": [{"message": "Gib eine
  gültige E-Mail Adresse an.", "code": "invalid", "param": "email"}]}`. django-core-micha's own
  endpoints, through `custom_exception_handler` / `_flatten` (`django_core_micha/auth/exception_handler.py:31-50,
  119`): `{"errors": [{"field": ..., "code": ..., "message"?: ..., "i18nKey"?: ..., "params"?: ...}]}`,
  and a few plain `{"code": "Auth.RECOVERY_TOKEN_INVALID"}` / `{"detail": ...}` responses. **The field is
  called `param` in allauth and `field` in dcm**, and dcm can already name an explicit `i18nKey`.
- **What the kit does with it.** `extractErrorInfo` (`src/utils/auth-errors.js:2-27`) keeps
  `errors[0].code` and `.message` and drops the field name. `normaliseApiError` (`:29-39`) sets
  `err.code`, and `err.message` to the backend message **or the code itself**, so the message alone
  cannot be told apart from a code. Then about 40 call sites in some 25 files render
  `t(err.code || '<default key>')` or `setErrorKey(err.code || ...)` followed by `t(errorKey)` (e.g.
  `src/pages/LoginPage.jsx:220` and `:290`). An unknown code has no catalogue entry, so i18next shows
  the key itself.
- **Why `AUTH-2` did not close this.** `AUTH-2` (done) keyed translations by the raw code and enumerated
  the login and password codes (`email_password_mismatch`, `password_too_short`, ...). The generic
  Django field codes (`invalid`, `required`, `max_length`, ...) were not in its list. **They cannot be
  translated by code alone**, because `invalid` means something different on each field.
- **Where texts live today** (measured 2026-09-30): kit texts in `src/i18n/*Translations.ts`, four
  languages (`de`/`en`/`fr`/`sw`), formal German, plus optional `de_informal` entries since
  `UCM-I18N-4`. Apps merge them into their own i18next instance at start-up, **kit keys last**, so kit
  texts win over an app's. Backend messages come from allauth's own gettext catalogue (dcm ships no
  `.po` files), in the language Django's `LocaleMiddleware` picks from `Accept-Language`, i.e. **the
  browser's language, not the UI's**. `apiClient` (`src/auth/apiClient.jsx:5-9`) sends no language
  header. allauth's German catalogue addresses the user informally ("Gib ...").
- `i18next` and `react-i18next` are **peer** dependencies. The kit does not import an `i18next`
  instance anywhere today. The apps initialise the default instance (`import i18n from "i18next"`).

## The chain (decided)

**Operator decision (2026-09-30): code-based in the UI, the backend message as the last specific
fallback, and the UI language sent to the backend.**

For each error, the text is the first of these that exists:

0. **An explicit `i18nKey` from the backend** (dcm already sends one on some errors).
1. **A field-specific key** `Auth.field.<field>.<code>`, e.g. `Auth.field.email.invalid`, where
   `<field>` is `param` (allauth) or `field` (dcm).
2. **The code as a key**, exactly as `AUTH-2` did, e.g. `email_password_mismatch`.
3. **The backend's own message**, which with rule 5 below arrives in the UI language.
4. **The caller's default key** (`Auth.LOGIN_FAILED`, ...), as today.

A raw code is never a result. "Exists" means that the key has an entry in the active language; i18next
returning the key unchanged does not count.

5. **`apiClient` sends `Accept-Language`** set to the current language of the default `i18next`
   instance. If no instance is initialised, it sends nothing (today's behaviour). This applies to every
   request through `apiClient`, not only errors, which is intended: backend texts then match the UI.

6. **Field keys to add, in every kit language** (`de`/`en`/`fr`/`sw`, formal German, plus `de_informal`
   where German differs): `invalid` and `required` for every field that a kit screen submits.
   Enumerate the fields from `src/auth/authApi.jsx` (measured so far: `email`, `password`,
   `new_password`, `current_password`, `key`, `code`, and the signup payload). No bare `invalid` or
   `required` key at step 2: it would shadow step 3 with a vaguer text.

## Scope + non-goals

In scope:
- `extractErrorInfo` / `normaliseApiError` carry the field name, the `i18nKey` and the backend message
  separately (the message field must not fall back to the code).
- One shared resolver implementing steps 0-4, used by **every** call site that renders
  `err.code` today, all ~40 of them (`grep -rnE "(setErrorKey|setError|setAgentErrorKey|alert)\(.*\.code|t\(\w+\??\.code"
  src`). A call site left on the old pattern is a finding.
- The `Accept-Language` header in `apiClient`.
- The new field keys.
- `CHANGELOG.md` with an entry for this release, and the missing `3.7.0` entry reconstructed from its
  commits (`UCM-AUTH-9`, `UCM-I18N-4`, `UCM-SHELL-7`, `UCM-MSG-20`, `UCM-PRIM-2`). A **minor** release.

Non-goals:
- No backend change (allauth, dcm). dcm's `_flatten` shape is taken as it is.
- No change to which errors the kit shows or where. Only the text changes.
- No new languages (`it`/`es` stay unsupported in the kit).
- No field-level display of errors. The text stays where each screen shows it today.
- No consumer bump. Apps pick this up through their own pins.

## Tier · precondition / gate

- **Tier 3 · tests: the resolver chain, the ~40 call sites, the header, the screenshot case end to end;
  the kit's existing auth tests.** A change inside shared-core, on auth screens, plus a header on every
  API request.
- Precondition: none.

## Risks

- **The header changes the language of every backend text** for a user whose browser language differs
  from the UI language. That is the point, but it also reaches non-error texts that the backend
  renders (e.g. option labels). `Accept-Language` is a CORS-safelisted header for these values, so no
  new preflight appears.
- **A duplicated `i18next` copy** in an app's bundle would give the kit a different instance than the
  app, and the header would then be missing or wrong. Read the language defensively and fall back to no
  header, never to a guess.
- **German step 3 can still address the user informally**, for codes without a key. Step 6 exists to
  keep that rare. Name any code that the kit screens are known to receive and that still lands on
  step 3.
- **Changing ~40 call sites touches every auth and admin screen.** The resolver must be a drop-in for
  what those sites render today, including their current default keys and the English fallbacks some
  pass as the second `t()` argument.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

Kit test suite:

1. **Resolver order.** One case per step 0-4, each showing that the step above it wins when present:
   explicit `i18nKey` > field key > code key > backend message > default key. Include the allauth
   (`param`) and the dcm (`field`) shape.
2. **Never a raw code.** An unknown code with no message resolves to the default key's text, not to
   the code.
3. **The screenshot case, end to end:** `LoginPage` receiving exactly the operator's 400 response shows
   the text of `Auth.field.email.invalid`, not `invalid`.
4. **Call-site guard.** A test that scans `src/` for the old pattern (`t(err.code ...)`,
   `setErrorKey(err.code ...)` and siblings) and fails if one remains. Show that it fails on a copy with
   one site restored.
5. **Header.** A request through `apiClient` carries `Accept-Language` equal to the active i18next
   language, follows a language change, and carries none when no instance is initialised.
6. **Catalogue completeness** for the new field keys: every field × `invalid`/`required` has all four
   languages.

Run, do not write: the kit's existing auth, `LoginPage`, `SignUpPage` and `PasswordInvitePage` tests.

## Parity guardrail

No change to control flow, redirects, what triggers an error, or which request is sent. Only the
displayed text and the new request header change.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

## Context package

### The two backend shapes, quoted directly (the sibling `django-core-micha` repo — read this, do
### not try to open that repo yourself, a sandboxed process cannot see it)

allauth headless (400, malformed email, the operator's exact screenshot case):
```json
{"status": 400, "errors": [{"message": "Gib eine gültige E-Mail Adresse an.", "code": "invalid", "param": "email"}]}
```

dcm's `django_core_micha/auth/exception_handler.py` (`_flatten`, quoted verbatim, lines 31-64):
```python
def _flatten(detail, field=None):
    out = []
    if isinstance(detail, dict):
        if _is_error_object(detail):  # any of code/i18nKey/message/params present
            out.append({
                "field": field,
                "code": str(detail.get("code", "error")),
                **({"message": str(detail.get("message"))} if detail.get("message") is not None else {}),
                **({"i18nKey": str(detail.get("i18nKey"))} if detail.get("i18nKey") is not None else {}),
                **({"params": detail.get("params")} if isinstance(detail.get("params"), dict) else {}),
            })
            return out
        for k, v in detail.items():
            out.extend(_flatten(v, f"{field}.{k}" if field else k))
        return out
    if isinstance(detail, list):
        for item in detail:
            out.extend(_flatten(item, field))
        return out
    code = getattr(detail, "code", "error")
    out.append({"field": field, "code": str(code), "message": str(detail)})
    return out
```
Wired as `Response({"errors": _flatten(resp.data)}, status=resp.status_code)` for every
`ValidationError` (400s). Separately, 401/403 responses get `resp.data.setdefault("code", ...)` /
`.setdefault("i18nKey", AUTH_CODE_MAP.get(...))` merged onto whatever `resp.data` already is — so a
plain `{"detail": "..."}` becomes `{"detail": "...", "code": "...", "i18nKey": "..." | None}`.

**Net shape your code must read, from `data.errors[0]` (validation) or top-level `data`
(401/403/plain)**: `code` (always present, `"error"` if truly unknown), `field` OR `param` (dcm vs
allauth — normalise to one name), optional `message`, optional `i18nKey`, optional `params` (unused
here — no interpolation into these texts is in scope).

### `src/utils/auth-errors.js` — carry field/i18nKey/message separately, no code-as-message fallback

Current (`extractErrorInfo` lines 2-27, `normaliseApiError` lines 29-39) already read almost this
shape but (a) drop the field name entirely, (b) fold `i18nKey` into nothing (never read), (c)
`normaliseApiError`'s `message` **falls back to the code** (`info.message || code || defaultCode`) —
this is the literal bug: after that line, nothing downstream can tell a real backend message from a
copy of the code.

Rewrite `extractErrorInfo` to also return `field` (read `first.field ?? first.param ?? null` for the
`errors[]` branch, `data.field ?? null` for the plain-code branch) and `i18nKey` (`first.i18nKey ??
null` / `data.i18nKey ?? null`), and to leave `message` as `null`/`undefined` whenever the backend
sent none — **never** substitute the code.

Rewrite `normaliseApiError` to set, on the thrown `Error`: `err.code` (unchanged), `err.field`,
`err.i18nKey`, **`err.backendMessage`** (exactly `info.message`, possibly `undefined` — this is the
new, unambiguous field the resolver reads; do not confuse it with the native `err.message`, which you
may leave with its existing fallback-to-code behaviour untouched — changing it is not required by
this WO and other incidental consumers of `.message` for logging should not regress), `err.status`,
`err.raw` (all unchanged in spirit).

### New resolver — `src/utils/resolveErrorText.js` (new file)

A plain function, not a hook (it is called imperatively inside `catch` blocks, where hooks cannot
run):
```js
export function resolveErrorText(i18n, err, defaultKey) {
  const exists = (key) => Boolean(key) && i18n.exists(key);

  if (!err) return i18n.t(defaultKey);
  if (exists(err.i18nKey)) return i18n.t(err.i18nKey);
  if (err.field && err.code) {
    const fieldKey = `Auth.field.${err.field}.${err.code}`;
    if (exists(fieldKey)) return i18n.t(fieldKey);
  }
  if (exists(err.code)) return i18n.t(err.code);
  if (err.backendMessage) return err.backendMessage;
  return i18n.t(defaultKey);
}
```
This implements steps 0-4 exactly, in order, each an early return. `i18n.exists(key)` (not
`t(key) !== key`) is what makes "exists" mean "has a real catalogue entry in the active language" —
the Envelope is explicit that a `t()` echo of the key does not count, and `i18n.exists` is the
correct, direct way to ask that question (`t()` alone cannot distinguish a real translation from its
own missing-key echo). Takes `i18n` (not just `t`) because `.exists` lives on `i18n`, not on `t`.

### Call sites — the exact mechanical transformation, worked on the named file

**Every call site now stores/returns FINAL DISPLAY TEXT, never a translation key** — this is the one
structural decision that makes the ~40-site sweep uniform: today some state variables hold a key
(rendered later via `t(errorKey)`), which is exactly the bug (an unresolved code has no catalogue
entry, so `t()` echoes it raw). After this WO, the *same* state variables hold resolved text, and
the render side drops its `t()` wrapper.

Per file:
1. Add `i18n` to the existing `const { t } = useTranslation();` destructure →
   `const { t, i18n } = useTranslation();` (skip if the file already has `i18n`).
2. Import `{ resolveErrorText }` from `'../utils/resolveErrorText'` (adjust relative path per file
   depth).
3. Every occurrence of the pattern `<expr>.code || 'Auth.SOME_DEFAULT'` (with or without an outer
   `t(...)` and/or optional-chaining `?.`) — where `<expr>` is the caught error variable — becomes
   `resolveErrorText(i18n, <expr>, 'Auth.SOME_DEFAULT')`, with any outer `t(...)` that directly
   wrapped it REMOVED (the resolver already returns final text; wrapping it in `t()` again would
   only be harmless by accident of i18next's missing-key echo — do not rely on that, remove the
   wrapper so the code says what it means).
4. Every OTHER existing setter of that same state variable that passes a **plain literal key** with
   no error object at all (a client-side/synthetic condition — a URL param, a null token, a resolved
   promise carrying no server error) — e.g. `setErrorKey('Auth.SOCIAL_LOGIN_FAILED')` — becomes
   `setErrorKey(t('Auth.SOCIAL_LOGIN_FAILED'))` (resolve immediately, so the state variable is
   *always* final text, uniformly, regardless of which branch set it — never leave some code paths
   storing keys and others storing text on the same variable).
5. The render site — `{t(errorKey)}` (or equivalent) — becomes `{errorKey}` (drop the wrapper; the
   variable is text now).

**Worked example — `src/pages/LoginPage.jsx`** (do this file first, verify it, then repeat the
identical pattern across the rest; this file alone exercises every shape you will meet elsewhere):
- Line 29: `const { t } = useTranslation();` → `const { t, i18n } = useTranslation();`.
- Line 99: `setErrorKey('Auth.SOCIAL_LOGIN_FAILED');` → `setErrorKey(t('Auth.SOCIAL_LOGIN_FAILED'));`
  (plain literal, no `err` — case 4 above).
- Lines 135, 142, 153: same treatment (`'Auth.RECOVERY_TOKEN_EXPIRED'`, `'Auth.RECOVERY_TOKEN_INVALID'`
  ×2) — plain literals, wrap in `t()` at the call site.
- Line 161: `setErrorKey(err?.code || 'Auth.RECOVERY_TOKEN_INVALID');` →
  `setErrorKey(resolveErrorText(i18n, err, 'Auth.RECOVERY_TOKEN_INVALID'));`
- Line 220: `setErrorKey(err.code || 'Auth.LOGIN_FAILED');` →
  `setErrorKey(resolveErrorText(i18n, err, 'Auth.LOGIN_FAILED'));`
- Line 236: `setErrorKey(err.code || 'Auth.PASSKEY_FAILED');` →
  `setErrorKey(resolveErrorText(i18n, err, 'Auth.PASSKEY_FAILED'));`
- Line 290: `{t(errorKey)}` → `{errorKey}`.
- Everything else in the file (the redirect logic, the recovery-token handoff, the MFA flow) is
  untouched — this WO changes displayed text only (Parity guardrail).

**The remaining ~21 files** (`src/components/AccessCodeSingleUseToggle.jsx`,
`AllowedEmailDomainsManager.jsx`, `AuthFactorRequirementCard.jsx`, `BulkInviteCsvTab.jsx`,
`MFAComponent.jsx`, `MfaLoginComponent.jsx`, `PasskeysComponent.jsx`, `ProfileComponent.jsx`,
`QrSignupManager.jsx`, `QrSignupValidityManager.jsx`, `RegistrationMethodsManager.jsx`,
`SecurityComponent.jsx`, `SupportRecoveryRequestsTab.jsx`, `UserInviteComponent.jsx`,
`UserListComponent.jsx`; `src/pages/AccountPage.jsx`, `PasswordChangePage.jsx`,
`PasswordInvitePage.jsx`, `PasswordResetRequestPage.jsx`, `SignupConfirmPage.jsx`,
`SignUpPage.jsx`) — apply the identical five-step transformation. Re-run the grep below after every
few files to track remaining count; it must reach zero:
```
grep -rnE "(setErrorKey|setError|setAgentErrorKey|alert)\(.*\.code|t\(\w+\??\.code" src
```
(one false-positive hit is a comment in `src/i18n/authTranslations.ts` mentioning the old pattern —
not a call site; leave that comment as-is, or update its wording if you touch that file for the new
keys, but it is not counted by the call-site-guard test, which is scoped to `.jsx` files only, see
below.)

`alert(...)`/`window.alert(...)` sites (several of the components above) follow the same rule:
`alert(t(err.code || 'Auth.X'))` → `alert(resolveErrorText(i18n, err, 'Auth.X'))`.

**A file that references `err.code` for a NON-display reason** (e.g. `LoginPage.jsx:235`'s
`if (err.code !== 'Auth.PASSKEY_CANCELLED')` control-flow check, not a display) is NOT in scope —
the Parity guardrail says only displayed text changes; a code comparison controlling behaviour stays
exactly as it is.

### `src/auth/apiClient.jsx` — `Accept-Language` request interceptor

Add a **request** interceptor (the file currently only has a response interceptor, `:161-201`) —
place it near the top-level `apiClient` setup:
```js
import i18next from 'i18next';
// ...
apiClient.interceptors.request.use((config) => {
  const language = i18next?.isInitialized ? i18next.language : null;
  if (language) {
    config.headers = { ...config.headers, 'Accept-Language': language };
  }
  return config;
});
```
`i18next` is already a peer dependency (never bundled) — importing it directly here, the same way
`resolveErrorText` reads `i18n.exists`/`i18n.t` off the instance handed to it by each component's own
`useTranslation()`, is how rule 5 is meant to work: **the same default i18next instance the app
itself initialised.** The defensive guard (Risk note) is exactly `i18next?.isInitialized` — if false
(no instance, or a duplicated/separate copy that never got `.init()` called on it), send nothing, do
not guess a language. Do not import `i18next` in a way that could throw if the peer dependency is
somehow entirely absent from a consumer's `node_modules` — a bare `import i18next from 'i18next'` is
fine (it's declared as a peer dep in `package.json`, so it is always resolvable), just do not add
extra defensiveness beyond the `isInitialized` check the Risk note asks for.

### New field keys — rule 6

Enumerate every distinct field name sent as a request body key from `src/auth/authApi.jsx`'s
`apiClient.post/patch/put` calls (grep `apiClient\.(post|patch|put)\(` in that file and read each
call's payload) — the operator's own partial list (`email`, `password`, `new_password`,
`current_password`, `key`, `code`) plus the signup payload's fields
(`mode`, `access_code`, `registration_context_token`, `registration_context`, `turnstile_token`) and
`register-confirm`'s `token` are the floor, not the ceiling; if you find another plausibly-user-facing
field a kit SCREEN submits (not an admin/internal endpoint like `update-role`), add it too and name
it in `PROGRESS`. For each field, two keys: `Auth.field.<field>.invalid` and
`Auth.field.<field>.required`, in `de` (formal — plus `de_informal` only where the wording actually
differs, same Sie/Ihr-form scan `UCM-I18N-4` used), `en`, `fr`, `sw`, added to
`src/i18n/authTranslations.ts` next to the existing `Auth.field.*`-shaped or nearest-related keys (if
none exist yet, add a new clearly-labelled section). Reasonable generic wording, e.g.
`Auth.field.email.invalid` → "Enter a valid email address." / `Auth.field.email.required` → "Enter an
email address."; adapt per field name. **No bare `invalid`/`required` key at step 2** (rule 6's own
explicit warning — those two codes are too generic to mean anything without a field, and adding them
as top-level keys would let step 2 win over step 3's more specific backend message for a field this
WO didn't enumerate).

### Test files

New, next to the existing auth tests:
1. `tests/resolveErrorText.test.js` — one case per step 0-4 (Required Test #1): construct a
   `{ i18n }` fixture (a real minimal i18next instance via `i18next.createInstance().init(...)`, or a
   hand-built stub exposing `.exists`/`.t` — check `tests/i18nGermanVariant.test.js`/
   `tests/authTranslations.test.js` for the repo's existing i18next-in-tests convention before
   inventing a new one) with a few real keys loaded (`Auth.field.email.invalid`, a code key like
   `Auth.LOGIN_FAILED`, and NOT `some_unknown_code`), and assert each step wins over the ones below it
   when present — include one case shaped like allauth's `param` and one shaped like dcm's `field`.
   Required Test #2 (never a raw code): an `err` with an unknown `code` and no `backendMessage` UB
   resolves to `i18n.t(defaultKey)`, not the code string.
2. `tests/loginPageErrorResolution.test.jsx` (or extend an existing `LoginPage` test if one covers
   error rendering) — Required Test #3, the screenshot case end to end: mock `loginWithPassword` to
   reject with exactly `{ response: { data: { errors: [{ message: "Gib eine gültige E-Mail Adresse
   an.", code: "invalid", param: "email" }] } } }` (the operator's literal shape), render `LoginPage`,
   submit, assert the visible text equals the resolved `Auth.field.email.invalid` translation (not
   the literal word `"invalid"`).
3. `tests/errorCallSiteGuard.test.js` — Required Test #4: recursively scan every `.jsx` file under
   `src/` for the pattern `/(setErrorKey|setError|setAgentErrorKey|alert)\(.*\.code|t\(\w+\??\.code/`
   per line, assert zero matches across the whole tree. Prove the scanner itself would catch a
   regression (not a permanent toggle in the committed suite): a second test asserts the SAME regex
   matches a hand-written fixture string shaped like the old pattern
   (e.g. `"setErrorKey(err.code || 'Auth.X');"`) — this is the "fails on a copy with one site
   restored" proof the Required Tests ask for, without mutating real source files in the suite.
4. Extend `src/auth/apiClient.jsx`'s existing test (grep `tests/` for `apiClient`) or add a focused
   new one — Required Test #5: a request through `apiClient` carries `Accept-Language` equal to
   `i18next.language` after `i18next.init(...)`/`.changeLanguage(...)`, and carries no such header
   when no instance is initialised (you likely need to exercise this against a fresh `i18next`
   instance per test case — check how the existing apiClient tests mock axios/interceptors first).
5. Required Test #6 (catalogue completeness): a test iterating the new `Auth.field.*` keys added in
   this WO, asserting each has all four locales non-empty — likely most naturally added as new
   assertions in `tests/i18nAggregate.test.js` (the existing four-locale shape test already does this
   generically for the WHOLE aggregate, so verify your new keys are automatically covered by it
   before writing a redundant second test — if they already are, say so in `PROGRESS` instead of
   duplicating).

Run, do not write: `tests/*` covering existing auth flows, `LoginPage`, `SignUpPage` and
`PasswordInvitePage` (the Envelope names these explicitly) — do not modify their existing assertions
beyond what the render-side `{errorKey}` vs `{t(errorKey)}` change mechanically requires (a test
asserting rendered text should see the SAME final text as before — if any existing test breaks for a
reason OTHER than this file's own mechanical transformation, stop and report it, do not paper over a
real regression).

### `CHANGELOG.md` — the missing `3.7.0` entry, reconstructed

`3.7.0` shipped, in this order, from commits `059e9f0`..`a70580a` (five WOs, one combined release):
- `UCM-PRIM-2`: new `EmptyState` primitive (icon/title/description/action, theme tokens).
- `UCM-SHELL-7`: `UserMenu` avatar initials now reach ≥4.5:1 contrast against `primary.main` on any
  theme (dynamic white/black pick via `calculateContrastRatio`), replacing MUI's default grey.
- `UCM-MSG-20`: `Composer` no longer collapses at 375px (actions/input split into two rows); message
  URLs (`http`/`https` only) render as safe links; the read-ratio marker gets a tooltip and hides
  when there are no recipients.
- `UCM-AUTH-9`: `PasswordInvitePage` keeps the form and shows the reason after a server-side password
  rejection (was: silently hid the form); success now waits for an explicit "go to login" click
  (was: navigated away instantly with no confirmation); `SignUpPage` explains when self-signup is off
  instead of rendering a permanently-disabled form; `UserListComponent` role changes now confirm
  success, not just failure.
- `UCM-I18N-4`: new `createUiCoreTranslations({ germanVariant })` export — an app can opt into
  informal ("du") German for the auth bundle, default stays formal; hard-coded English in
  `UserListComponent`/`UserInviteComponent`/`BulkInviteCsvTab` now has real translation keys in all
  four locales.

Add this as its own `## 3.7.0` section (matching the existing `CHANGELOG.md` heading style — read
the file first), placed correctly relative to the `3.6.0`/`3.8.0` entries already there, THEN add
this WO's own `## 3.9.0 — UCM-AUTH-10` entry above it: the resolver chain (never a raw backend code),
the `Accept-Language` header sent with every request, and the new field-level translation keys.

## Do-not-touch / invariants

- No backend change anywhere (this repo has no access to `django-core-micha`'s source to modify it,
  and the WO forbids it regardless).
- No change to which errors are shown, where, or what triggers one — only the text and the new
  request header.
- No new supported language.
- No field-level (inline, per-input) error display — the text stays wherever each screen already
  puts it.
- Do not touch `err.message` itself (the native `Error.message`) — only add the new
  `err.field`/`err.i18nKey`/`err.backendMessage` fields.

## Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`)

## Preamble — a REQUIRED block IN this file, not something appended at invocation

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register
> row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source
> and test files (and `CHANGELOG.md` as named above) and for running the tests you wrote — nothing
> else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray
> files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>`
> instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the
> working tree for the orchestrator's independent review. WRITE the tests the `Required tests`
> section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is
> the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator
> re-runs the authoritative set + does the independent review after you finish — those are the gate;
> your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

### Execution directive

Check `.claude/codex-status.md` first (newest-first; read it with `head`). No line for today means use
Codex. Before `git push`, run `git log origin/main..HEAD` and push only if every listed commit is this
order's (parallel sessions share this checkout).

### Review routing

Tier 3: independent `reviewer` (all configured lenses), `ui_reviewer` and **`sec_reviewer`**,
concurrent, one batch, before the commit. Ask `sec_reviewer` specifically whether step 3 can put
attacker-controlled or PII-bearing backend text on screen that the old code-only path hid. dcm
deliberately stores only codes in its audit log for that reason (`exception_handler.py:84`, S4). Quote
dcm's `_flatten` and the allauth response into the brief: Codex reviewers cannot see the sibling repo.

### Verification

Render `LoginPage` with the operator's exact 400 response, in `de` and in `en`, and name the two texts
in the register Notiz. No prototype is in scope.

### Register + commit + release

Row -> `done` with the review Notiz in the `AGENTS.md` shape and the published version. The publish
runs on push to `main` when `package.json`/`src/**` change. Consumer bumps are separate rows in each
app, classified by the dependency-bump test in `AGENTS.md` -> Tiering.

### Mini-handover

`Orchestrator: implement work-orders/UCM-AUTH-10.md in ui-core-micha (main). git pull first, read the
WO, then follow orchestrate-codex.`
