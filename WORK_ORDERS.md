# WORK_ORDERS.md — ui-core-micha

Work-order register for this repo. Lightweight directory (not the full orders):
one row per WO with its implementation status. Convention, schema, and maintenance
rules are defined centrally in `webapps/AGENTS.md` → "Work-Order Register".

## Workstream prefixes

| Prefix | Workstream |
|---|---|
| `ONB-*` | Onboarding wizard (steps, conditions, persistence) |
| `PERF-*` | Performance improvements |
| `NOTIF-*` | Shared notifications platform (dcm register is canonical; this repo's rows are its ucm-side WOs) |

Introduce a new prefix when none fits and add it here. New WOs always get a
prefixed ID; never reuse a bare flat number across workstreams.

## Register

| ID | Titel | Beschreibung | Datum | Status | Commit(s) | Notiz |
|---|---|---|---|---|---|---|
| ONB-1 | Per-app configurable notifications onboarding step | New `browserPush` prop `{nagUntil, showOnce}` on `OnboardingProvider`; parameterizes the `browser_push` descriptor's condition (default changes from implicit "all-channels" to "any-channel", stopping the over-nag); `showOnce` via a persisted `onboarding_seen` set (frozen-at-mount ref, no mid-session flicker) | 2026-07-17 | done | 1ae7c20 | Default behavior change affects cockpit and all consumers on their next ucm bump. jg-ferien companion WO pins the new version with `browserPush={{nagUntil: 'any-channel'}}` explicit (matches new default, but pinned explicitly per the WO). |
| PERF-3B1 | Parallel auth bootstrap after CSRF | Starts auth-methods and current-user concurrently once CSRF is available, while preserving error handling and loading semantics. | 2026-07-19 | done | ee89329 | Independent `reviewer` + `sec_reviewer` passes both clean (no findings); one P3 test-coverage gap from the reviewer (missing mirror case: auth-methods rejects, current-user succeeds) closed with an added regression test — 45/45 tests green. Published as 2.10.1 (patch, no interface change) and pinned in jg-ferien alongside its PERF-3A companion WO. |
| NOTIF-6 | NotificationsProvider + bell on canonical dcm feed/* API | Single-WS-owner `NotificationsProvider`/`useNotifications` (initial REST seed via `feedApi.js` + one `/ws/notifications/` socket, reconnect w/ backoff) + generic MUI `NotificationBell`; additive exports only | 2026-07-27 | done | 6c63fb9 | Codex-built direct (no nesting), independent `reviewer`: single-WS-owner invariant traced clean (no way to break it — `authenticated`/`replaceNotifications`/`refresh` all referentially stable across unrelated re-renders, re-render test is genuine not a no-op). R1 (P2, real bug): the `notification.status` WS handler patched item flags but never adjusted `unreadCount`, so the badge went stale after a cross-tab/cross-device mark — the test had locked in the stale count as expected behavior. Fixed: delta computed from before/after unread state on the WS patch path, mirroring `mark()`'s own logic; test corrected + a new cross-tab regression test added. 57 passing, build clean. No new npm dependency. Full history + backend contract: dcm's `WORK_ORDERS.md`/`docs/design/notifications-platform.md`. Publishes ucm 2.11.0 |
