# UCM-SHELL-10 — Accessible names for notification and account buttons

## A. Envelope

Tier 3. Target repository: `ui-core-micha`, branch `main`.

### Goal and expected outcome

The notification and account-menu buttons have accessible names that
appropriately cover their visible content and communicate their purpose.
Cockpit CP-CI-3 captures at 375 and 1280 CSS pixels reported axe
`label-content-name-mismatch` for
`button[aria-label="Notifications"]` and
`button[aria-label="User menu"]` in both the Markdown-only and
Markdown-plus-PDF settings states.

The notification button continues to show the unread badge where applicable
and communicates the count accessibly. The account button continues to show
the avatar image or initials and has an appropriate accessible name. Names
remain meaningful for screen readers and speech input in supported locales,
including changing counts, no unread items, image avatars, initials, and
fallback user identities. Visible content, focus, opening and closing menus,
navigation and notification operations remain functional. Avoid exposing
additional personal information through names.

### Scope and exclusions

In scope are the two shared components, their directly related translations
and focused tests. Preserve existing consumer-facing props and behavior.
No redesign, permission or authentication logic changes, dependency changes,
shared workflow changes, Cockpit product changes, or unrelated accessibility
cleanup. Release/version changes and consumer dependency updates follow
their own established gates.

### Existing capabilities and risk

`NotificationBell` already uses `NotificationsProvider`, a translated
button title and an MUI unread badge. `UserMenu` uses `AuthContext`, a
translated title and an MUI avatar with initials fallback.
`SHARED_CAPABILITIES.md` identifies these as shared UI surfaces; the Django
core supplies notification and identity data, not their button rendering.
Both components have many consumers. Changing names or badge semantics could
reduce discoverability, disclose identity data, or alter menu interaction.

### Required tests to write

- Test the accessible name and visible content of the notification button
  with no unread items, a nonzero count and an overflow count, and after the
  count changes. Assert the relevant visible text is covered by the computed
  name and that the count is conveyed without duplicate announcements.
- Test the account button with initials, username fallback and image avatar,
  including a user with missing name fields. Assert the computed name covers
  applicable visible text and preserves a meaningful menu purpose without
  exposing unrelated identity data.
- Exercise representative supported translations and existing keyboard,
  focus, menu open/close, navigation and notification actions. Add targeted
  axe regression coverage for the two reported nodes.
- As a downstream dependency, after the Core change is available to Cockpit
  through its separately approved consumer path, rerun CP-CI-3 C1 and C2 at
  375 and 1280 CSS pixels. Both named nodes must clear
  `label-content-name-mismatch`, and the source-format save/reload journey
  must continue to pass. Record the Core version and Cockpit build revision.
  This WO does not authorize a Cockpit pin change or CI dispatch.

## B. Implementation map

- `src/notifications/NotificationBell.jsx` renders the title and unread badge.
- `src/auth/UserMenu.jsx` renders the title, avatar and initials fallback.
- `tests/NotificationBell.test.jsx` and `tests/UserMenu.test.jsx` cover the components.
- `src/i18n/` holds shared translations; `webapp-management/SHARED_CAPABILITIES.md` maps the shared surfaces.
- Cockpit evidence is `work-orders/CP-CI-3.md` and its local capture report.

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

Keep Cockpit CP-CI-3 in review until its four capture cells have been
rechecked against a named build with the approved consumer dependency. Record
component tests, actual review lenses and the cross-repo dependency. Preserve
the user's explicit Gate #1 decision before dispatch.

## Gate record

Gate #1 approved by the operator 2026-11-22 (NotificationBell and UserMenu
accessible names and the described regressions, with local Cockpit follow-up).
