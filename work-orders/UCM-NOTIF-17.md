# UCM-NOTIF-17 — Isolate notification state on identity changes

## A. Envelope

Tier 3. Target: `ui-core-micha`, `main`.

### Goal and expected outcome

On a direct change of authenticated identity, previously held notification
feed entries, unread counts, pagination and account-specific operational state
are neutral at the first render and commit until data for the new identity is
available. A synthetic consumer observed the preceding account's feed in the
first committed render in 4.40.2. Delayed requests, realtime activity and
mutations from an earlier identity must not restore its state or affect the
new identity. Logout followed by a separate login remains isolated. Preserve
children, existing consumer APIs and notification behavior for one account.
An interrupted or abandoned React render must not mutate live account refs,
request guards or pagination state, and an identity change must not remount
the application subtree or discard unrelated child state.

### Scope and exclusions

In scope: notification provider account-scoped state and focused lifecycle
regression tests. No auth or permission changes, no external API contract or
endpoint changes, no unrelated shared components or dependency changes.

### Existing capabilities and risk

The shared UI core supplies `NotificationsProvider` and generation guards;
Django core supplies account-scoped feeds. Existing lifecycle tests cover
late pages and marks and logout/login. Account transition changes can break
paging, live delivery, optimistic updates or consumer component lifecycle.

### Required tests to write

- Observe first render and layout-effect commit during direct A-to-B and
  A-to-logged-out transitions; verify old feed, count and pagination-related
  state are not exposed. Verify B receives only B data.
- Test logout followed by login separately, preserve child state, and test
  delayed old-account feed, pages and marks including rejection and realtime
  events. Verify new-account refresh, paging and operations remain functional.
- Use synthetic identities and marker contents only.
- Cover an abandoned or suspended account-change render followed by continued
  use of the original account, including in-flight operations and pagination.

## B. Implementation map

- `src/notifications/NotificationsProvider.jsx` owns context state and identity generation.
- `src/notifications/realtime.jsx` owns realtime subscription and connection lifecycle.
- `tests/notificationInboxLifecycle.test.jsx` covers paging, marks and account transitions.
- `tests/notificationsBootstrap.test.jsx` covers bootstrap notification behavior.
- Cockpit characterization is `frontend/src/NotificationAccountIsolation.test.jsx` in its checkout.

## Preamble

> **You are the dispatched implementer, not its Orchestrator. Never run
> `codex` or `codex exec`, delegate, review, write to git, or edit the
> register or `.claude/codex-status.md`. Your first tool action is the
> exact command `codex-hook-canary-ws-gov-60`. The expected denial is
> `WS-GOV-60 canary: workspace hooks are active`; otherwise report
> unverified hook coverage once and continue.**
>
> This WO is the complete scoped specification. Read the nearest
> instructions and relevant role skill for conventions. Work only within
> the dispatched paths and preserve others' changes. Do not install
> dependencies, edit lockfiles, start stacks, update memory, run reviews or
> commit. Write the required tests and run only your own new tests once;
> the Orchestrator runs the authoritative evidence. Report a test environment
> failure without inventing a substitute. Use cohesive files under about
> 400 lines and inspect large files by relevant ranges. Narrate a short
> PLAN and PROGRESS lines, then end with exactly one RESULT: DONE or
> RESULT: BLOCKED line.

## C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> The implementer stops at this line. Review, evidence, register and landing
> belong to the Orchestrator.

Full declared frontend suite under reduced Vitest worker concurrency, package
build, independent Tier-3 review, verified next patch release via normal push,
and actual published package verification precede Cockpit's separately
approved pin, local regression and four-cell capture. No Actions dispatch.

## Gate record

Gate #1 approved by the operator 2026-11-23 (targeted notification account
isolation fix, focused regressions and reviewed patch release, with no auth,
permission or external API changes; delegated instruction in this session).

## Completion

Implementation is incomplete. Configured implementer `codex/gpt-6.1-terra`
left an unreviewed, untested provider diff. Its attempt to create
`tests/notificationIdentityIsolation.test.jsx` was denied by the workspace
PreToolUse hook: the test's relative import was resolved outside the allowed
workspace path. No test was written or run. The write denial was not bypassed.
No release or push occurred. The required first-commit, logout/login and
in-flight security regressions, independent review, exact clean full-scope
run, package build and publication remain blocked pending a permitted way to
complete the test write. Preserve unrelated concurrent changes and the
uncommitted provider diff.

## Resumed candidate

The operator authorized native single-file edits and required abandoned-render
safety and preservation of the mounted application subtree. Implementation
and fixes used the configured `codex/gpt-6.1-terra` route. Review round 1
identified stale continuation requests and missing stale-callback coverage;
both were fixed. Round 2 found a missing mark-error assertion, added after the
closing review. Other round-2 lenses found no issues. Round 3 covered the
newly added 4.40.3 release metadata; its envelope finding that source and
tests were absent from that metadata-only payload is rejected because those
files were reviewed in rounds 1 and 2. Round 3's other lenses found no issues.
Part B: accurate. Exact full-scope tests, package build and release remain
pending; the test assertion added after round 2 has no separate review.

2026-11-23: Candidate `7f4ab567da242f920d649b88181684c22d8d7689` was
installed from the frozen lockfile offline in the separate direct clone
`ui-core-micha-notif17-check`. Package build passed. The declared frontend
scope with `VITEST_MAX_WORKERS=2` failed: 1444/1445 passed, with the existing
optional-peer cold-import test timing out at its unchanged 30-second limit.
Log: `.claude/scratch/tests-ui-core-micha-notif17-check-20261123-112632/`.
A selected diagnostic rerun of `tests/packageEntries.test.js` on the same
snapshot also timed out in that test (4/5 passed); log
`.claude/scratch/tests-ui-core-micha-notif17-check-20261123-114222/`.
The same selected file passed 5/5 in the earlier 4.40.2-source check clone
in 28.4 seconds, close to the per-test limit; that diagnostic does not prove
whether the candidate change or differing runtime conditions caused the
candidate timeout. Its log is
`.claude/scratch/tests-ui-core-micha-shell10-check-20261123-114350/`.
Selection is not scope evidence. The cause of the timeout is not established;
the full-scope gate remains red. No patch release, push or Actions dispatch
occurred, and the Cockpit pin remains blocked.

After the concurrent HRAM test ended, the unchanged optional-peer package
test passed on the old check clone (5/5, 21.9 s) and on the exact candidate
(5/5, 25.0 s), both under Node 25.9.0 and `VITEST_MAX_WORKERS=2`; selection
runs are diagnostic only. A host interruption invalidated an earlier baseline
comparison. The single authorized full rerun on `7f4ab56` then passed all
1445 tests in 509.2 s, with unchanged assertions and timeouts. Log:
`.claude/scratch/tests-ui-core-micha-notif17-check-20261123-130625/`.
The candidate package build passed before this run. Publication and consumer
verification remain to be recorded after the regular push.

The regular main push to `1c89b98` triggered publish run `45172742672`,
which passed its build, tests and npm publish. The registry now serves 4.40.3
with SHA-512 integrity
`sha512-XnWZm+b4C8m87jp09/FCKcwlWhA1NFwDnqd19xddlv/Ez8cfwN7TI3JOdi3PnlAJYIcm2meqiIOL57E295KWLA==`.
The downloaded tarball matches that integrity. Its NotificationsProvider,
NotificationBell and UserMenu modules match the build of exact tested
candidate `7f4ab56` by SHA-256. Consumer validation remains open.
