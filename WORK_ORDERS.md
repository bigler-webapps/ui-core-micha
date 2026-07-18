# WORK_ORDERS.md — ui-core-micha

Work-order register for this repo. Lightweight directory (not the full orders):
one row per WO with its implementation status. Convention, schema, and maintenance
rules are defined centrally in `webapps/AGENTS.md` → "Work-Order Register".

## Workstream prefixes

| Prefix | Workstream |
|---|---|
| `ONB-*` | Onboarding wizard (steps, conditions, persistence) |

Introduce a new prefix when none fits and add it here. New WOs always get a
prefixed ID; never reuse a bare flat number across workstreams.

## Register

| ID | Titel | Beschreibung | Datum | Status | Commit(s) | Notiz |
|---|---|---|---|---|---|---|
| ONB-1 | Per-app configurable notifications onboarding step | New `browserPush` prop `{nagUntil, showOnce}` on `OnboardingProvider`; parameterizes the `browser_push` descriptor's condition (default changes from implicit "all-channels" to "any-channel", stopping the over-nag); `showOnce` via a persisted `onboarding_seen` set (frozen-at-mount ref, no mid-session flicker) | 2026-07-17 | done | 1ae7c20 | Default behavior change affects cockpit and all consumers on their next ucm bump. jg-ferien companion WO pins the new version with `browserPush={{nagUntil: 'any-channel'}}` explicit (matches new default, but pinned explicitly per the WO). |
