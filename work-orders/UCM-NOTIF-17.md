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
