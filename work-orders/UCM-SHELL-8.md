# UCM-SHELL-8: Valid SectionNav list items

# A. Envelope — operator-approved scope

## Goal and expected outcome

SectionNav navigation entries are genuine list items containing the existing buttons.
The account capture in innoservice reports three serious axe list violations at 1280 px;
these remain in ui-core-micha 3.13.0. The correction removes their structural cause.

## Scope and non-goals

- Correct grouped and optional overview entries in SectionNav's shared list renderer.
- Keep selection, aria-current, labels, remembered entry, keyboard operation, callbacks,
  controlled/uncontrolled drawer behavior and appearance unchanged.
- Release the correction as patch 3.13.1 and update innoservice's exact package pin.
- No navigation redesign, new text, token delta, authentication, permissions, data contract,
  other component, CI configuration or dependency changes beyond that release/pin.
- No new visual design or prototype: retain the existing presentation.

## Tier, risk and required tests to write

Tier 3: shared-core source with a rendered DOM correction used by consumers.
Risk: wrapper defaults could alter spacing or interrupt existing button interaction.
Write focused assertions that every grouped and overview list has li children containing
the existing button controls, on desktop and inside the mobile drawer. Preserve existing
selection and drawer tests; prove overview selection still passes null and closes the drawer.

# B. Implementation map — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.
Native bootstrap retains workspace-root cwd; use absolute paths and explicit workdirs.
You are not alone in the codebase; preserve other agents' changes. Own only:
- `src/layout/SectionNav.jsx`
- `tests/SectionNav.test.jsx`

## Context package

`src/layout/SectionNav.jsx:120`, SectionNavList, is shared by the desktop nav and mobile
drawer. The overview List currently directly contains ListItemButton; grouped Lists at
159 map item keys to direct ListItemButton children. MUI List defaults to ul and the
button defaults to div. Correct list containment while preserving the interactive button.
The overview handler passes null; grouped handlers pass item.key. Selected buttons carry
aria-current=page; remembered secondary text is shown only on its unselected entry.
Keep exported sx constants, drawer state handlers, prop defaults and group label IDs.
Use existing MUI primitives; prevent wrapper padding from changing the presentation.

`tests/SectionNav.test.jsx` renders the real named SectionNav with ThemeProvider and a
translation mock. Existing labels: Profile, Security, Users, Invite, Support, Notifications;
optional Overview; trigger accessible name matches /Section Profile/i; drawer title
Switch section. Existing tests cover selection, remembered text, controlled/uncontrolled
drawer, theme tokens and grid. Extend this file without mocking SectionNav or changing
existing tests to accept weaker behavior. Work from these two files, no broad exploration.

## Preamble and progress contract

> This committed WO is the COMPLETE spec. You are the initial implementer, not the reviewer.
> Edit only the owned source/test paths using explicit UTF-8 I/O. Preserve other changes.
> Do not edit dependencies, lockfiles, package/version/changelog/register/README/governance,
> settings, environment, other repos or memory. Never read .env or dump environment/settings.
> Your tools are for editing source/test files and running the tests you wrote, nothing else.
> No installs, package-manager commands, containers, git operations, self-review or subagents.
> Run your newly written SectionNav cases ONCE with the existing Node/Vitest runtime,
> maxWorkers=2, selected by test names; no affected/full suite, build or app startup.
> If blocked, report it rather than changing repo state. Leave all changes uncommitted.
> The orchestrator's tests and independent reviews are the acceptance gate, not your run.
> Start PLAN, emit PROGRESS before relevant actions with no silence over two minutes,
> then exactly one final RESULT: DONE or RESULT: BLOCKED.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> IMPLEMENTER STOP HERE. You ARE the initial implementation instance. No steps below belong to you.

Gate #1: operator explicitly approved this exact structural correction, preserved behavior
and appearance, tests/review, release and innoservice pin bump on 2026-10-13.
No source approval was inferred from the earlier registration or clarification question.

Dispatch: fresh native plain worker, requested codex/gpt-6-luna, full WO inline; inherited
cwd is workspace root, target is the absolute core repo above. Record accepted identity
and only exposed effective metadata. Assigned ownership is not technical containment.
Parent owns repo state, package version, changelog, README/register and release/pin.

Independent envelope/regression/duplication/tests lenses plus UI run concurrently on the
same frozen diff via fresh read-only codex/gpt-6-luna processes. Security reviewer is not
required: no auth/security behavior changes. Parent also checks exposure/permission parity.
Parent runs SectionNav and both existing AccountPage test files, then build. Existing main
publish workflow supplies the full shared-core regression suite and publishing evidence;
normal reviewed main push, no manual publish dispatch. Confirm successful publication of
3.13.1 before innoservice exact pin and lockfile update. Keep all app capture/axe checks.
Fresh app capture at 375/1280 must verify navigation and absence of the three list violations.
Finalize register with named reviews, deduplicated dispositions and actual test/release proof.

Accepted native implementer: `/root/kit_sectionnav`, explicit requested gpt-6-luna, high
reasoning, fresh context. Effective native provider/model metadata was not exposed and
remains unverified. Only the two assigned files changed; no author git/review/repo-state
operations. Author's single permitted test run failed before collection with temporary-file
EPERM (zero tests). Parent runs the authoritative gate through the normal runtime path.

Core acceptance: five fresh concurrent CLI reviews (envelope, regression, duplication,
tests, UI), all exit 0, banners confirm codex/gpt-6-luna, provider openai, read-only.
Deduplicated disposition: 1 raised, 0 accepted, worst accepted none. Tests lens R1 proposed
proving the MUI implementation identity against a fabricated class-bearing stub. Rejected:
the structural assertion fails against the actual pre-change direct div children, existing
selection/theme/drawer tests retain their behavior checks, and the source still directly
imports and renders the real MUI ListItemButton. No behavior or identity abstraction is added.
Other lenses report no findings. Parent targeted pass confirms callbacks/permission filtering,
labels and selected/remembered state unchanged; wrappers use disablePadding.
Parent gate: 21 tests in SectionNav.test.jsx, AccountPage.test.jsx and
AccountPage.profileStatements.test.jsx passed with maxWorkers=2; TypeScript build exit 0.
Publish workflow's full suite is justified by shared-core consumer ripple. App pin and fresh
consumer capture remain pending after the reviewed core source/release lands.

Closing consumer proof: published3.13.1 verified by workflow38435441867,
744tests89files plus build and npm Trusted Publishing successful. Innoservice
exact pin3.13.1 is in sourcec527918, CI38444366349. Both source-matching account
captures375/1280 have no axe failures, no console/network failures, and all11
rubric items yes (22answers). Parent inspected both actual account images: same
profile/security/admin/help navigation and consent controls, readable at both
widths. Three previous kit list violations are gone. This completes the scoped
consumer gate; unrelated Organisation-policy axe failures in that app candidate
remain owned by INNO-FIX-11 and do not reopen the kit list correction.
Review remains the named five independent readonly Luna source passes above,
1deduplicated raised0accepted,worst accepted none; no source changes afterward.
