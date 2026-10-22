# UCM-AUTH-15 — Signup: preferred first mode and a mode-specific submit label

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (signup content of the auth flow); additive, existing callers unchanged.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumer:** MAANA-APP-22 decision 5 (Maana's setup wizard), adopted by a later Maana pin bump.

### Goal and expected outcome

The operator decided on 2026-10-22 (MAANA-APP-22) that Maana's public free-trial entry opens with direct registration
and its button reads "Konto anlegen", with the access-code path as the second option. Measured against the pinned
releases (django-core-micha 3.17.0, ui-core-micha 4.19.0): dcm's `RegistrationPolicyState.signup_modes` lists the modes
in a fixed order (access code, open, e-mail domain, QR); `SignUpContent` starts with `signupModes[0]` and has no prop
for a preferred mode; one key `Auth.SIGNUP_SUBMIT` ("Einladung anfordern" / "Request invitation") labels the submit
button in every mode, and an app cannot override it because ucm's translations are merged after the app's. Expected
outcome: an app can choose which available signup mode is shown first, and open self-signup has its own submit label.

### Settled decisions (operator, 2026-10-22)

1. **Preferred mode:** `SignUpContent` (and the full-page `SignUpPage` wrapper) accept an optional preferred mode (or
   order); if that mode is among the server's available modes it is shown first and preselected, otherwise the server
   order applies. The server's policy remains the authority over which modes exist.
2. **Submit label per mode:** open self-signup uses "Konto anlegen" / "Create account"; the access-code, e-mail-domain
   and QR modes keep "Einladung anfordern" / "Request invitation" unless the existing semantics of a mode say
   otherwise.
3. **Compatibility:** without the new prop, the order and labels of today stay for every other app, except that the
   open self-signup button reads "Konto anlegen" everywhere (it creates an account, not an invitation request). This is
   the one visible change and goes into the changelog.

### Scope and acceptance

`SignUpContent`, `SignUpPage`, the auth translations; DE and EN. Accepted when Maana can render direct registration
first with "Konto anlegen" and an app without the prop sees today's order.

### Non-goals and do-not-touch

dcm's signup policy and its mode order, the confirmation and login flows, MFA, the access-code-grants-subscription idea
(MAANA-APP-23), Maana's own wiring (MAANA-APP-22 after the release).

### Risks

A preferred mode that the server does not offer must be ignored, never shown.

### Required tests to write

Preferred mode shown first when available, ignored when not; server order without the prop; "Konto anlegen" on open
self-signup, "Einladung anfordern" on the access-code mode; DE and EN keys resolve through the shared i18n.

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/components/SignUpContent.jsx`, `src/pages/SignUpPage.jsx`, `src/i18n/authTranslations.ts` (one new key) and new
`tests/signUpPreferredMode.test.jsx`. No other file (no README, CHANGELOG, package files, lockfile, register, existing
tests).

### Seams (verified against `main` at 97528a6)

- `src/components/SignUpContent.jsx:44-52` `resolveSignupModes(authMethods)` returns the server's `signup_modes` in
  server order (fallback `['self_signup_access_code']` when only `signup` is set). Keep it unchanged — it is exported
  and used by `SignUpPage`.
- `SignUpContent.jsx:83-88` `initialMode`: the QR mode wins when a registration token is present and QR is offered,
  otherwise `signupModes[0]`. `:109-111` resets `mode` when `initialMode` changes; `:113-115` reports it through
  `onModeChange`.
- `SignUpContent.jsx` around `:227-238` renders one button per entry of `signupModes` (only when more than one) in
  that order; around `:283-285` the submit button shows `Auth.SIGNUP_SUBMITTING` / `Auth.SIGNUP_SUBMIT` for every mode.
- `src/pages/SignUpPage.jsx:30-39` computes its own initial `mode` (same rule as above) for the subtitle and passes
  only `registrationContextToken` and `onModeChange` to `SignUpContent` (`:65`).
- `src/i18n/authTranslations.ts:483-488` `Auth.SIGNUP_SUBMIT` carries `de`, `fr`, `en`, `sw`; `tests/authTranslations.test.js`
  checks the key set of this file.

### What to build

- **Preferred mode.** New optional prop **`preferredSignupMode`** (one mode string, e.g. `'self_signup_open'`) on
  `SignUpContent` and on `SignUpPage`, which passes it through. Derive the displayed order inside the component: when
  the preferred mode is in `signupModes` it moves to the front and the rest keep server order; when it is not offered
  it is ignored (never shown). The derived order drives both the mode buttons and the initial selection. The QR rule
  stays first: a present registration token with QR offered still selects QR. `SignUpPage`'s own initial `mode` (for
  its subtitle) follows the same rule, so the subtitle matches from the first render. Do not change
  `resolveSignupModes`. Document the prop in the JSDoc prop list of `SignUpContent`.
- **Submit label per mode.** New key **`Auth.SIGNUP_SUBMIT_OPEN`**: de "Konto anlegen", en "Create account",
  fr "Créer un compte", sw "Fungua akaunti" (placed next to `Auth.SIGNUP_SUBMIT`). The submit button uses it when
  `mode === 'self_signup_open'`; every other mode keeps `Auth.SIGNUP_SUBMIT`. `Auth.SIGNUP_SUBMIT` itself is unchanged.
  The submitting label is unchanged.

### Required tests (maps Part A)

`tests/signUpPreferredMode.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/SignUpContent.test.jsx` and
`tests/SignUpPage.test.jsx`, which already render with an `AuthContext` carrying `authMethods`): server modes
`['self_signup_access_code', 'self_signup_open']` with `preferredSignupMode="self_signup_open"` → the open mode is the
first button, selected, and the submit reads the open label; the same with a preferred mode the server does not offer
(e.g. `'self_signup_qr'`) → server order, access code selected, no QR button; no prop → server order; access-code mode →
`Auth.SIGNUP_SUBMIT`; `SignUpPage` passes the prop through (first button / subtitle of the open mode). One case
resolves the real texts through the shared i18n (DE "Konto anlegen", EN "Create account") using the same i18n setup an
existing test in `tests/` already uses for real translations.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/signUpPreferredMode.test.jsx` from the target directory, once — your ONLY test run;
the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of MAANA-APP-22 on 2026-10-22, whose decision 5 provides for this ucm work
order when the signup content is not configurable (Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release and
report the version.

Mapped by the Orchestrator (Claude) on 2026-10-22 against `main` at 97528a6 (4.19.0); prop name `preferredSignupMode`
(one mode, not an order: the Envelope allows either and the consumer needs one) and key `Auth.SIGNUP_SUBMIT_OPEN`
chosen by the Orchestrator. Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Review: lenses envelope,
regression, duplication, tests plus `ui_review`, codex/gpt-6-luna read-only; no `sec_review` (no auth decision changes:
the server policy still decides which modes exist and the request is unchanged). Verification: the new test,
`SignUpContent`, `SignUpPage`, `authTranslations`, `i18nAggregate`, `i18nGermanVariant`, `pageTitles`, tsc; full suite
in `ci.yml` on `ci-test/UCM-AUTH-15`. README + CHANGELOG + minor version by the Orchestrator.
