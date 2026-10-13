# UCM-AUTH-12: Optional profile statement text on the account page

# A. Envelope — operator-approved scope

## Goal and expected outcome

Expose `AccountPage.showProfileStatements` so an app without privacy/cookie statement
endpoints can suppress the explanatory statement panels and their requests. The default
is `true`, preserving every existing consumer's behavior. With `false`, the account profile
still renders and submits both existing consent fields.

The operator explicitly approved this switch, its release and the innoservice pin bump on
2026-10-13. innoservice CI38387014900 records privacy/cookie 404s; auth policy returns 200.

## Scope and non-goals

- Add the optional prop and pass it to the existing ProfileComponent statement switch.
- Publish a minor release 3.13.0; innoservice consumes it under INNO-FIX-13.
- Do not change consent defaults, payloads, validation, permissions, authentication,
  account navigation, statement fetching implementation, theme tokens or other consumers.
- Do not fix UCM-SHELL-8 or invent statement endpoints/content.
- No new visual design or prototype; this config uses the existing ProfileComponent surface.

## Tier, risk and required tests

Tier 3: source inside shared-core on an account surface. Compatibility rests on default true.
Tests to write: render the real AccountPage and ProfileComponent; omission of the new prop
fetches both statements and presents the existing panels; false performs neither request and
hides the panels, while both consent controls remain editable and their values reach the
existing updateUserProfile submission. Keep the existing account-navigation tests.

# B. Implementation map — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.
Native bootstrap retains workspace-root cwd; use explicit absolute paths and workdirs.
You are not alone in the workspace. Own only:
- `src/pages/AccountPage.jsx`
- new `tests/AccountPage.profileStatements.test.jsx`

## Context package

`src/pages/AccountPage.jsx:39` exports named AccountPage with destructured optional props.
Its profile branch near line228 renders ProfileComponent with showName/showPrivacy/showCookies.
Its existing handleProfileSubmit calls updateUserProfile(payload), then AuthContext.login(updated).
`src/components/ProfileComponent.jsx:23` exports named ProfileComponent; showStatements defaults
true, independently of showPrivacy/showCookies. Its statement-loading effect at83 returns before
either fetch when showStatements is false. Panels at255 are also controlled by showStatements.
Consent controls at230/242 and payload at130/133 depend only on showPrivacy/showCookies.
Use that established switch; leave this component untouched.

Read only these targets plus `tests/AccountPage.test.jsx` for theme/router/AuthContext setup,
and `src/auth/authApi.jsx` for the four API export names if necessary. Do not explore broadly.
The existing navigation test mocks ProfileComponent, so it cannot prove the no-request and
consent invariant: write a separate test file rendering both real components. Stub network API
functions and unrelated account children only. Relevant real accessible labels are translation
keys Profile.ACCEPT_PRIVACY_LABEL, Profile.ACCEPT_COOKIES_LABEL, Profile.PRIVACY_STATEMENT_TITLE,
Profile.COOKIES_STATEMENT_TITLE and Profile.SAVE_BUTTON.
Use the suite's established translation seam; never mock AccountPage/ProfileComponent under test.

## Preamble

> This committed WO is the COMPLETE spec. You are the initial implementer, not the reviewer.
> Preserve other edits. Edit only the two owned source/test paths using explicit UTF-8 I/O.
> Do not edit dependencies, lockfiles, package/version/changelog/register/README/governance,
> settings, environment, other repos or memory. Never read .env or dump settings/environment.
> No installs, package-manager commands, containers, git operations, self-review or subagents.
> Write the required tests and run your own new file ONCE with the existing Node/Vitest runtime,
> maxWorkers=2; no affected/full suite, build or app startup. If unavailable, report the obstacle.
> The orchestrator's tests and separate reviews are the acceptance gate. Leave uncommitted.
> Start PLAN, emit PROGRESS before relevant actions without silence over two minutes, then
> exactly one final RESULT: DONE or RESULT: BLOCKED.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> IMPLEMENTER STOP HERE. You ARE the initial implementation instance. No steps below belong to you.

Gate #1: operator explicitly approved the exact API/default, retained consents, release and pin
bump in the innoservice orchestration chat on 2026-10-13. Native plain worker requested
codex/gpt-6-luna, fresh context, full committed WO inline. Record accepted ID and actual metadata;
effective provider/model stays unverified when the API does not expose it. No protection-parity claim.

Parent owns version/changelog/README/register and pnpm state. Independent four lenses plus UI
and security concurrently, full scoped context, CLI read-only without bypass. Parent fixes findings.
Scoped gate: new real-component tests, existing AccountPage navigation and affected auth tests.
Publish workflow on main already runs build/full tests; shared-core ripple justifies that existing
release suite. Do not dispatch publish manually; normal reviewed main push triggers it. Check
publish job success before app pin. Minor 3.13.0 is additive; read exact release diff before app bump.
Final core row includes deduplicated review totals and test results; second register commit before
one main push. innoservice AccountPage/WelcomePage statements false and capture evidence remain
INNO-FIX-13; keep existing consents, request diagnostics and capture checks intact.

Accepted native implementer: `/root/kit_account_statements`, explicit requested gpt-6-luna,
high reasoning, fresh context, complete WO inline. Effective native provider/model metadata
was not exposed and remains unverified. Source/test edits only; the one permitted author test
attempt failed before collection with temporary-file EPERM (zero tests). Parent runs the
authoritative scoped gate through the normal runtime approval path. No author review or git.
