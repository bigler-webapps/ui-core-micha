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

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". Do not
dispatch while this placeholder stands.*

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
