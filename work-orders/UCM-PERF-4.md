# UCM-PERF-4 — Opt-in: start the app shell from one bootstrap request

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: an app that opts in starts its auth and notification state from dcm's bootstrap endpoint
  (`DCM-PERF-4`) in one request, instead of a CSRF request, then `users/current` +
  `auth-methods`, then the notification feed + unread count.
- Expected outcome:
  - With the opt-in enabled on the auth provider, page start issues one bootstrap request (no
    separate CSRF request before it, no `users/current`, no `auth-methods`, no initial feed or
    unread-count request). User, auth methods and notification state end up exactly as they would
    have from the separate requests.
  - `NotificationsProvider` starts from the bootstrap's feed and count; the notification WebSocket
    still connects only after that initial state is in place.
  - The app can read each extension payload from the bootstrap by its provider name (for hram: its
    application-access data), without its own request.
  - If the bootstrap request fails for any reason (a non-200 answer such as dcm's
    `bootstrap_part_failed`, `bootstrap_unavailable` or a 404 from a backend without the endpoint,
    or a network error), ucm falls back to today's separate start requests once, so every part
    succeeds or fails exactly as it does today (operator decision 2026-10-22).
  - With the opt-in off (the default), behaviour is exactly today's.

## Background (measured 2026-10-21 from Tanzania)

From Tanzania each serial request level costs at least about 400 ms (Cloudflare edge in
Johannesburg plus origin in Germany). Today's start sequence in `AuthContext` and
`NotificationsProvider` takes two levels, three on a first visit without a CSRF cookie.

## Scope + non-goals

- In scope: the opt-in on the auth provider, the bootstrap call, seeding the auth and notification
  state from it, and a way for the app to read extension payloads.
- Decided in the requirements round (2026-10-21): adoption is opt-in per app, so a pin bump alone
  changes nothing for apps that do not enable it.
- Non-goals / do not touch:
  - later refreshes keep using the existing endpoints: login, logout, MFA steps, profile updates,
    notification refresh and mark actions;
  - WebSocket protocol and reconnect behaviour;
  - no change for apps without the opt-in, including their request sequence;
  - no backend change (that is `DCM-PERF-4`).

## Tier · precondition / gate

- Tier 3: shared-core change on the auth bootstrap path.
- Precondition: `DCM-PERF-4` has landed, so the endpoint's path and response contract are fixed.
  Met 2026-10-22: released in django-core-micha 3.17.0; contract in django-core-micha
  `docs/design/bootstrap.md`.
- Release ordering: the dcm release carrying `DCM-PERF-4` is published before any app enables the
  opt-in.

## Risks

- dcm's bootstrap fails as a whole when any one part fails (for example a feed error or a throttled
  part). Treating that as "signed out" would show a signed-in user as signed out when only the feed
  failed; the fallback to the separate start requests prevents it. The fallback runs at most once
  per start, never loops, and never runs when the bootstrap succeeded.
- Loading-state timing: today `loading` stays true until both start requests settle; the opt-in
  path must not render protected routes earlier or later than that.
- Notification seeding: the WebSocket must not connect before the seeded state is in place (the
  existing comment in `NotificationsProvider` explains the race this prevents).
- An app that enables the opt-in against a backend without the endpoint gets a failed bootstrap; the
  adoption WO pins dcm first, and the fallback keeps such an app working as today.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- Opt-in on: start issues exactly one bootstrap request and none of `users/current`,
  `auth-methods`, the CSRF endpoint, the initial feed or the unread count; the resulting user,
  auth methods, notifications and unread count equal the bootstrap payload.
- Opt-in off: the start request set is unchanged from today.
- Bootstrap failure (a part-failure status such as 500 or 429, a 501, a 404, a network error): ucm
  falls back to the separate start requests exactly once, and the resulting state equals today's for
  the same per-part outcomes — for example user request succeeds and feed fails: signed in, no
  notifications, as today; user request refused: signed out, as today. Loading ends.
- Successful bootstrap: no fallback request is made.
- WebSocket connects only after the seeded notification state, in the opt-in path too.
- An extension payload is readable by provider name; an absent or `null` provider key reads as
  absent without throwing.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. A
library: you are the single implementer. Shared checkout: preserve foreign edits, including the
untracked `scratchpad/` directory.

You own exactly: `src/auth/AuthContext.jsx`, `src/auth/authApi.jsx` (one new function),
`src/notifications/NotificationsProvider.jsx`, one export line in `src/index.js`, and new
`tests/authBootstrap.test.jsx` and `tests/notificationsBootstrap.test.jsx`. Do not edit other files,
existing tests, README, CHANGELOG, package files, lockfile or the register.

## Upstream contract (pinned)

django-core-micha **3.17.0** (PyPI), `docs/design/bootstrap.md`: `GET /api/bootstrap/`.

- `200` anonymous (or `users/current` refused with 401/403): `{"user": null, "auth_methods": {...},
  "notifications": null, "extensions": {}}`.
- `200` authenticated: `{"user": {... as /api/users/current/}, "auth_methods": {... as
  /api/auth-methods/}, "notifications": {"feed": {... whole first-page body, "results": [...]},
  "unread_count": {"count": n}}, "extensions": {"<provider>": payload | null}}`.
- Every response sets the CSRF cookie, so no separate CSRF request is needed before it.
- Anything else fails the whole bootstrap: a part's status with `{"detail": "bootstrap_part_failed",
  "part": "<key>"}` (for example 500 or 429 with `Retry-After`), `501 {"detail":
  "bootstrap_unavailable"}`, `404` from a backend without the endpoint, or a network error. Each of
  these means: fall back to today's separate start requests, once.

## Seams (verified against `main` at 3efda01)

- **Auth start today.** `src/auth/AuthContext.jsx:75-118`: `ensureCsrfToken()` (`apiClient.jsx:221-230`,
  skips the request when the cookie exists), then `Promise.allSettled([fetchAuthMethods(),
  fetchCurrentUser()])`; auth methods merge into `DEFAULT_AUTH_METHODS` (:17-34) only when fulfilled;
  a rejected user request means signed out; `loading` becomes false only in `finally`. User objects go
  through `mapUserFromApi` (:41-73).
- **Notification start today.** `src/notifications/NotificationsProvider.jsx:149-169`: when
  `authenticated`, `refresh()` (:69-82) fetches feed and unread count in parallel, normalises
  (`normalizeNotification`, :9-17) and only then sets `seeded`; the socket is `active` only when
  `authenticated && seeded` (:84-95; keep that comment's guarantee). Logout resets state and `seeded`.
- **Opt-in.** Add an optional `bootstrap` prop to `AuthProvider` (default `false`; `true` uses
  `/api/bootstrap/`, a string is a same-origin path to use instead). Without it the start path,
  request set and timing are byte-for-byte today's.
- **Bootstrap call.** Add `fetchBootstrap(url)` to `src/auth/authApi.jsx` in the style of
  `fetchCurrentUser` (:16-24): `apiClient.get(url, { skipAuthRedirect: true })`, resolve `res.data`,
  let any failure reject. `skipAuthRedirect` matters: the response interceptor (`apiClient.jsx`
  around :170-210) would otherwise redirect to login on a 401/403 `not_authenticated` body.
- **Opt-in start.** One bootstrap request and nothing else. On success set auth methods (same merge
  over the defaults), user (`mapUserFromApi(data.user)` or `null`), the notification seed and the
  extensions in the same update as `loading = false`, so protected routes render at the same moment
  they do today (after the start settles, never earlier). On any failure run today's start path
  exactly once (`ensureCsrfToken` included) and end `loading` as today; never retry the bootstrap and
  never loop.
- **Notification seed.** Expose the seed to `NotificationsProvider` through `AuthContext` so that it
  is used once, for the person it came with: when the provider becomes `authenticated` and a seed for
  that same user identity is available, normalise `feed.results` and `unread_count.count` exactly as
  `refresh()` does, set them, mark `seeded`, and make no feed or count request; consume the seed so a
  later logout/login or another user fetches as today. Without a seed (opt-in off, fallback path,
  anonymous) behaviour is today's.
- **Extensions.** Export a hook `useBootstrapExtension(name)` (from `src/auth/AuthContext.jsx`,
  re-exported in `src/index.js` next to `AuthContext, AuthProvider`) returning the payload stored
  under that provider name, or `undefined` when the opt-in is off, the bootstrap failed, the key is
  absent or its value is `null`. It never throws and makes no request.
- **Untouched.** `login`, `logout`, `refreshUser`, MFA, profile updates, `refresh()`, mark actions,
  realtime/WebSocket code, `apiClient` and every other endpoint call.

## Required tests (maps Part A)

`tests/authBootstrap.test.jsx` and `tests/notificationsBootstrap.test.jsx` (`// @vitest-environment
jsdom`; mock `../src/auth/apiClient` or the API modules in the style of `tests/AuthContext.test.jsx`
and `tests/NotificationsProvider.test.jsx`; mock the realtime socket as those tests do):

- Opt-in on, authenticated payload: exactly one bootstrap GET; no CSRF, `users/current`,
  `auth-methods`, feed or unread-count request; user, auth methods, notifications and unread count
  equal the payload; `loading` false only after it settled.
- Opt-in on, anonymous payload: signed out, auth methods set, no notification requests.
- Opt-in off: the request set equals today's (CSRF when no cookie, `users/current`, `auth-methods`,
  then feed and count once authenticated) and no bootstrap request.
- Failure: 500 `bootstrap_part_failed`, 429, 501, 404 and a network error each trigger today's
  start requests exactly once; with user OK and feed failing the result is signed in with no
  notifications; with the user request refused it is signed out; `loading` ends; the bootstrap is
  not retried.
- Success makes no fallback request.
- The socket becomes active only after the seeded state is in place (assert on the mocked realtime
  hook's `active` argument).
- `useBootstrapExtension('application_access')` returns the payload; an absent key and a `null`
  value return `undefined`; with the opt-in off it returns `undefined`.

Work from this package; do not explore broadly.

## Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is
no separate plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md`
(both under `C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not
update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the
Orchestrator's alone.** Your tools are for editing the assigned files and for running the tests you
wrote — nothing else. Do NOT install dependencies, touch a lockfile, run a package manager or tidy
stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/
`push`; leave every change uncommitted. WRITE the required tests AND run only your two new test files,
once, with `node_modules/.bin/vitest run tests/authBootstrap.test.jsx tests/notificationsBootstrap.test.jsx`
from the target directory — your ONLY test run; the Orchestrator's run and the independent review are
the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `... done` after),
with no gap above ~2 minutes, unbuffered, and finish with exactly one `RESULT: DONE` or
`RESULT: BLOCKED <reason>`.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit. You ARE the implementation instance
> described below; do NOT launch or dispatch another implementer.

Gate #1: a42ea7d; envelope amendment (fallback) 3efda01. Upstream: django-core-micha 3.17.0 on PyPI,
contract `docs/design/bootstrap.md` read from DCM `origin/main` on 2026-10-22. Mapped by the
Orchestrator (Claude) on 2026-10-22.

Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Launch evidence: 2026-10-22, model
gpt-6-luna, reasoning high, workdir ui-core-micha, session 01a16259-ba62-7b83-843b-e25dcea1c8ba; `RESULT:
DONE`, assigned files only, no commit (its single test run had two probe failures it then corrected).
Orchestrator fixes: `bootstrapExtensions` was not in the context value (hook always undefined); a new
`user.id` effect dependency would have refetched notifications on a user switch for apps without the
opt-in (removed); review fixes: extensions and seed cleared on logout and on a person change via
`login()`; integration tests for the AuthProvider→NotificationsProvider handoff, socket ordering, the
notification fallback and the seeded feed content. Not fixed here (pre-existing, today's behaviour in
every app): notifications are not refetched when `login()` switches to another person without logout —
registered as UCM-NOTIF-15.
Review (Tier 3, auth path): lenses envelope, regression, duplication, tests + `sec_review` (auth
start, session handling, redirect suppression) + `ui_review` (loading timing, socket gating),
codex/gpt-6-luna read-only, one batch; fixes by the Orchestrator, re-review on the corrected diff.
Verification: the new tests plus `AuthContext`, `NotificationsProvider`, `NotificationBell`,
`NotificationSettings`, `realtime`, `apiClientPublicPaths`, `pageTitles`, `checkKitIntegration`,
`packageEntries`, `themeCompleteness`, tsc; full suite in `ci.yml` on `ci-test/UCM-PERF-4`. Docs,
CHANGELOG, minor version, register and report back by the Orchestrator. Recorded from the requirements round (2026-10-21): acceptance is
measured before/after once hram has adopted it in `HRAM-WEBPERF-4`, recorded in the register Notiz;
no fixed budget.
