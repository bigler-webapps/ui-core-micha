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
and focused tests, including an additive axe-core development dependency.
Preserve existing consumer-facing props and behavior.
No redesign, permission or authentication logic changes, other dependency changes,
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

## Completion

The configured Codex Terra implementer updated the two component names and
notification translations. The first worker attempt was rejected by a
server-access hook due to its command form and changed no files; the retry
used file edits. The operator separately approved adding axe-core 4.14.1 as a
development dependency. A Codex Terra fix worker added targeted axe and real
translation tests and updated the two affected existing legal-menu tests.
Part B: accurate.

Independent review used Terra for envelope, regression, tests, security and
UI, and Luna for duplication. Round 1 raised two accepted defects, targeted
axe coverage and real translation interpolation, both addressed. Closing
round 2 raised one accepted, carried defect: tests open both menus with a
mouse and do not verify keyboard activation. No blocker was raised.

The declared full frontend scope ran 1,446 tests with three failures. The
package-entry tests timed out / failed under load; a subsequent selection of
that file passed five tests. The package tree-shaking test could not create a
Windows symlink (EPERM). Selections of NotificationBell, UserMenu and
UserMenuLegal passed 8, 12 and 2 tests respectively, including the axe and
translation assertions. These selections are diagnostic, not scope evidence.
No CI dispatch occurred.

Cockpit CP-CI-3 remains dependent on a local run against an explicitly
identified build of this Core change, followed by the separately gated
consumer dependency and release path. No release or pin change is authorized
by this WO alone.

The reviewed implementation is local commit `8c029c8`. An isolated
`git archive` snapshot of that commit built successfully using the Core's
existing Node dependencies. Cockpit was temporarily linked to that snapshot
with `pnpm link`; the link changed Cockpit's tracked workspace override and
lockfile, so the existing capture runner's clean-frontend guard would refuse
the run. No capture result was claimed. `pnpm unlink` restored Cockpit's
declared 4.39.0 package and removed those temporary tracked changes. A
traceable consumer reference compatible with the capture gate, or a separately
authorized release and pin, remains required for the Cockpit dependency.

On 2026-11-23 the operator approved one test-only attempt on the package
fixture. The earlier EPERM log identifies the `cp` call for
`node_modules/@fontsource/dm-sans`; local filesystem metadata identifies
that source as a junction. The configured Codex Terra fix worker changed
only the copy option to `dereference: true`, preserving the bundling and
tree-shaking assertions. Round 3 used Terra for envelope, regression, tests
and security and Luna for duplication. The sole raised scope finding was
rejected because the operator explicitly authorized this exact test-only
correction on 2026-11-23.

The declared `tests.py --repo ui-core-micha --scope frontend --wo
UCM-SHELL-10` run returned FAIL: 1,444 passed and 2 failed in 108.0 s.
`packageTreeShaking.test.js` timed out after 15 seconds, and its concurrent
cleanup reported ENOTEMPTY; `packageEntries.test.js` timed out at 30
seconds. The earlier symlink EPERM did not recur in this run. The log is
`.claude/scratch/tests-ui-core-micha-20261123-003629/frontend.log`.
An isolated `--select tests/packageTreeShaking.test.js` run passed its one
test in 2.1 s; it is diagnostic selection evidence, not a passing scope.
The test correction and this evidence remain uncommitted.

On 2026-11-23 the declared frontend scope was run again without starting a
parallel build in this repository. It returned FAIL after 125.8 s: 1,444
passed, with two timeouts in `tests/packageEntries.test.js` (30 s and 5 s).
The reviewed font-fixture test passed as part of this run; neither the
earlier EPERM nor ENOTEMPTY recurred. Global host load was not measured
comparably, so the run does not establish a lower-load condition. Log:
`.claude/scratch/tests-ui-core-micha-20261123-094418/frontend.log`.

Release inspection on 2026-11-23: Core `package.json` and npm both report
4.40.1; `8c029c8` is the local implementation commit, following WO commit
`6d49fdc`. The font-fixture fix remains uncommitted. A push of those
commits to `main` matches `publish.yml` paths and starts its workflow.
The workflow skips publishing if the local version is not greater than npm,
but enables publishing if the registry query fails. A corrected patch
release requires a deliberate version and changelog, the required checks and
reviews, and successful workflow build/tests and trusted npm publishing.
Version 4.40.2 was absent from npm when checked; this is not a reservation.

Cockpit and HRAM both currently pin 4.39.0. The 4.40.0 changelog introduces
notification paging, mark-all-read, account-scoped state and channel settings;
it requires django-core-micha 3.41.0 or later for the new capabilities, with
fallback behavior for older backends. Their declared backend requirements
are 3.41.2 and 3.41.3 respectively. Version 4.40.1 changes password message
translations. The future patch's complete diff must also be checked before
either consumer pin is changed.
The repository diff from the 4.39.0 commit `947ea9c` to local `8c029c8`
also includes development dependency updates to user-event, the React Vite
plugin, i18next, react-i18next and Vite, plus the approved axe-core addition.
The shared package's declared runtime and peer dependency ranges and export
map did not change in that package.json diff. The changes span notification
provider, feed, realtime and settings code in addition to the two header
controls; consumer validation must cover the affected notification behavior.

An independent direct workspace clone `ui-core-micha-shell10-check` was
created without a worktree. Its HEAD is
`8c029c8bc6417f51adf87ab8f38dc05af5e6a497`; the only source diff is the
reviewed font-copy option, whose SHA-256 matches the source checkout
(`5b111df82442e953b7db40735593227bcd1f9c81e236dDE6AF1142D81AE69FC1`,
case-insensitive). An untracked project.yaml declares the same frontend
command as the source checkout. Dependencies were installed with
`pnpm install --frozen-lockfile --offline`, and `pnpm run build` passed.
No other source changes were present.

On 2026-11-23, `tests.py --repo ui-core-micha-shell10-check --scope frontend
--wo UCM-SHELL-10` returned FAIL after 313.5 s: 1,434 of 1,438 passed.
Both package-entry timeouts (30 and 5 seconds), the 15-second tree-shaking
timeout and its ENOTEMPTY cleanup error recurred; a chat render-count test
also failed. Host-wide lower load could not be established. Subsequent
sequential selections passed package entries (5), tree shaking (1) and the
chat file (8). Those are diagnostic, not scope evidence. Full log:
`.claude/scratch/tests-ui-core-micha-shell10-check-20261123-095241/frontend.log`.
The operator conditioned publication on a green exact Core candidate. That
condition remains unmet; no publication, consumer pin or Actions dispatch
was attempted.

At the operator's request, the same snapshot was run once more after two CPU
sample groups measured 20.8–36.3% and 25.0–35.3% total CPU. The declared
frontend scope returned FAIL in 114.8 s: 1,437 of 1,438 tests passed.
Only `packageEntries.test.js`'s “imports the main entry when optional peers
are unavailable” timed out at its existing 30-second limit. The other
package-entry test, tree-shaking test and chat render-count test passed;
EPERM and ENOTEMPTY did not recur. The file had passed its earlier five-test
selection on the same snapshot, but that selection is not scope evidence.
Log: `.claude/scratch/tests-ui-core-micha-shell10-check-20261123-100043/frontend.log`.
No test timeout or assertion was changed. Publication remains gated on the
operator-requested green exact candidate.

The operator authorized one full run of the same isolated source candidate
with `VITEST_MAX_WORKERS=2`, without changing the scope, timeouts or
assertions. No matching test process was active before launch. On 2026-11-23,
`tests.py --repo ui-core-micha-shell10-check --scope frontend --wo
UCM-SHELL-10` returned PASS: 1,438 tests, zero failures or skips, in 538.2 s.
Log: `.claude/scratch/tests-ui-core-micha-shell10-check-20261123-101044/frontend.log`.
This tested `8c029c8` plus the reviewed one-line font fixture correction,
with the 4.40.1 package metadata. The 4.40.2 version and changelog lines are
release metadata added after that run; the component source and tests did
not change. The conditional local release approval does not authorize a
manual Actions dispatch.

Round 4 reviewed the new changelog text with Terra for envelope, regression,
tests and security and Luna for duplication. Its one scope finding stated
that component changes were missing from the changelog-only diff. It was
rejected because those changes and tests are in previously reviewed commit
`8c029c8`, outside this late-file review payload. The one-line version
change is in a previously reviewed file and was not reviewed again under
the round limit. Release publication and downstream captures remain open.

## Gate record

Gate #1 approved by the operator 2026-11-22 (NotificationBell and UserMenu
accessible names and the described regressions, with local Cockpit follow-up).

The operator approved adding axe-core as a development dependency for the
targeted regression tests on 2026-11-22.

On 2026-11-23 the operator approved one test-only correction to
`tests/packageTreeShaking.test.js` if the recorded font-package copy is
confirmed as the EPERM source, followed by the declared frontend scope.
Core publication, consumer dependency bumps and Actions dispatch are excluded.

The operator subsequently approved targeted ui-core-micha pins for Cockpit
and HRAM only after a corrected patch release has been published and
verified. No manual Actions dispatch was approved.
