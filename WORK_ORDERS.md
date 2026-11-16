# Work-Order Register - WORK_ORDERS.md — ui-core-micha

Repository token: `UCM`. New IDs use `UCM-<STREAM>-<n>`; existing IDs remain unchanged.

## Workstream prefixes

| Prefix | Workstream |
|---|---|
| `ONB-*` | Onboarding wizard (steps, conditions, persistence) |
| `PERF-*` | Performance improvements |
| `NOTIF-*` | Shared notifications platform (dcm register is canonical; this repo's rows are its ucm-side WOs) |
| `CHART-*` | Shared chart / data-viz kit (`ChartFrame` + MUI X-Charts presets + neutral palette/formatters) |
| `THEME-*` | Shared MUI theme baseline (`createAppTheme` factory, token surfaces, completeness assertion) |
| `MSG-*` | Shared messaging platform, Phase B (dcm register is canonical; this repo's rows are its ucm-side WOs) |
| `RCPT-*` | Shared receipt capture and review components. The django-core-micha register is canonical for the module (`DCM-RCPT-*`) |
| `CHAT-*` | Shared AI chat surface (chat list, streaming thread, sources, model picker). The django-core-micha register is canonical for the core (`DCM-CHAT-*`); this repo's rows are its ucm-side WOs |
| `DX-*` | Developer experience / repo tooling (ucm-local prefix; unrelated to `django-core-micha`'s own `DX-*`) |
| `AUTH-*` | Auth components UX (login/password/MFA/profile forms, auth error i18n, and the account screen's own surfaces) |
| `I18N-*` | The shared kit's i18n **contract** — how a consumer registers ucm's strings, and what happens when it forgets. Distinct from `AUTH-*`, which owns the auth strings themselves |
| `PRIM-*` | Shared dashboard/data primitives — small presentational components that are neither chart (`CHART-*`) nor app chrome (`SHELL-*`) |
| `BILL-*` | Shared subscription and token surfaces (dcm register is canonical: `DCM-BILL-*`; this repo's rows are its ucm-side WOs) |
| `SHELL-*` | Shared app chrome and navigation shells (`UserMenu`, mobile bottom nav, secondary-navigation shell) — used since `SHELL-1`, documented here 2026-08-11 |
| `TEST-*` | Consumer integration checks the kit ships for apps to run in their own suites |
| `CI-*` | This repository's own CI workflows (dispatch-only verification runs; `publish.yml` stays the publish path) |

Introduce a new prefix when none fits and add it here. New WOs always get a
prefixed ID; never reuse a bare flat number across workstreams.

The register is `work-orders/register.jsonl` (one JSON object per work order); read and write it only
through `python -I .claude/scripts/wo.py` (`AGENTS.md` -> "Work-Order Register"). Completion details
live in the "Completion" section of each `work-orders/<ID>.md`. The register as it stood before the
migration is archived whole in `work-orders/archive/WORK_ORDERS-until-2026-11-16.md`.

**Repo token:** see the declaration above
