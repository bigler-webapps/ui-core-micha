# UCM-PERF-5 — Recover once from a JS chunk that no longer exists after a deploy

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: a user who still has an old page open when a new build is deployed does not get stuck on
  a failed lazy-loaded chunk ("Failed to fetch dynamically imported module"); the page reloads
  once and continues on the new build.
- Expected outcome: ucm exports a small helper an app installs once at startup. When a dynamic
  import or Vite module preload fails, the helper reloads the page once. If the same failure
  happens again shortly after that reload, it does not reload again; the error surfaces the way it
  does today.

## Background

hram already lazy-loads its pages (`React.lazy` in `App.jsx`) without any recovery; the estate's
experience is that stale chunks after deploys were a long-running problem there. Two page-load WOs
from the 2026-10-21 Tanzania measurement split bundles further (`HRAM-WEBPERF-3` in hram,
`SVA-WEBPERF-1` in survey_app); operator decision 2026-10-21: both rely on this shared helper
instead of each carrying its own.

## Scope + non-goals

- In scope: the helper, its export, a short usage note in ucm's own documentation, and its tests.
- Non-goals / do not touch:
  - installing it in any app (each app WO does that);
  - keeping old build files on the server across deploys (rejected in the requirements round);
  - retrying ordinary API requests or handling any error that is not a failed chunk load;
  - any change to existing ucm components' loading behaviour.

## Tier · precondition / gate

- Tier 3: shared-core change.
- Precondition: none.

## Risks

- A reload loop when the chunk is genuinely missing (broken deploy): the guard against a second
  reload is the protection; its window must survive the reload itself.
- Unsaved user input is lost by a reload. That is acceptable only because a stale chunk leaves the
  page unusable anyway; apps decide where they lazy-load (survey_app must not lazy-load anything
  after a respondent has started a survey — stated in its own WO).
- Private browsing or blocked storage: if the guard's state cannot be stored, the helper must not
  reload at all rather than risk a loop.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- A chunk-load failure triggers exactly one reload.
- A second chunk-load failure within the guard window after that reload does not reload.
- A failure after the guard window has passed reloads again (a later deploy is a new event).
- Errors that are not chunk-load failures never reload.
- Storage unavailable: no reload, no exception.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. A
library, not a joined app: you are the single implementer. Shared checkout: preserve all foreign
edits, including the untracked `scratchpad/` directory.

You own exactly: new `src/utils/chunkLoadRecovery.js`, new `tests/chunkLoadRecovery.test.js`, and
one export line in `src/index.js`. Do not edit any other file (no README, CHANGELOG, package files,
lockfile, register, existing components or tests).

## Context package

- **How the failure reaches the page.** A Vite production build wraps every dynamic import
  (including `React.lazy(() => import(...))`) in its preload helper. When a preloaded dependency or the
  imported chunk itself fails, the helper dispatches a cancelable `Event('vite:preloadError')` on
  `window` with the error in `event.payload`; if no listener calls `event.preventDefault()`, it
  rethrows the error, which then reaches the app as today (for `React.lazy`, the nearest error
  boundary). Verify this against the installed Vite (`node_modules/vite`, 8.3.4; search the client
  preload helper for `vite:preloadError`) before relying on it. A dynamic import outside Vite's
  helper whose rejection nobody handles reaches `window` as an `unhandledrejection` event with
  `event.reason`.
- **What counts as a chunk-load failure.** Only errors that mean "this module/chunk could not be
  fetched": the browser messages for a failed dynamic import (Chromium "Failed to fetch dynamically
  imported module", Firefox "error loading dynamically imported module", Safari "Importing a module
  script failed"), Vite's CSS preload failure ("Unable to preload CSS"), and an error named
  `ChunkLoadError`. A `vite:preloadError` payload is checked with the same predicate: Vite also
  dispatches it when an imported module throws while evaluating, which is a code error, not a stale
  chunk, and must never reload. Every other error, and every ordinary API/network failure, is left
  alone.
- **The once-guard.** The time of the last automatic reload is stored in `window.sessionStorage`
  (per tab, survives `location.reload()`), under one fixed, namespaced key. On a chunk-load failure:
  if storage cannot be read or written (private mode, blocked storage, quota), do nothing; if the
  stored time is within the guard window, do nothing (the error surfaces as today); otherwise store
  the current time, confirm it was stored, then — and only then — call `preventDefault()` on the event
  and reload once. A failure after the window has passed is a new event and reloads again. Default
  guard window: 60 seconds, overridable by an option.
- **Shape of the helper.** `installChunkLoadRecovery(options)` attaches the two `window` listeners
  and returns a function that removes them. Options: the guard window in milliseconds and a reload
  function (default `() => window.location.reload()`; jsdom cannot replace `location.reload`, so
  tests pass their own). Calling it again while installed must not register a second pair of
  listeners. Without `window` (server rendering, tests without jsdom) it is a no-op that returns a
  no-op. Also export the predicate `isChunkLoadError(error)` so an app's error boundary can tell the
  cases apart. No module-level side effects at import time (the package marks only listed files as
  side-effectful; this one must stay tree-shakable).
- **Export.** Add `export { installChunkLoadRecovery, isChunkLoadError } from './utils/chunkLoadRecovery';`
  to `src/index.js` next to the existing utility/consumer exports near the top (after the
  `checkKitIntegration` export, `src/index.js:24`).
- **Conventions.** Plain ES module JavaScript like `src/billing/api.js`; short JSDoc on both exports
  (what counts, the guard, the options, the return value); explicit UTF-8 file I/O.

## Required tests (maps Part A)

`tests/chunkLoadRecovery.test.js`, `// @vitest-environment jsdom`, dispatching real `Event` /
`PromiseRejectionEvent`-like events on `window` (use `new Event('unhandledrejection')` with a
`reason` property if the constructor is unavailable in jsdom) and an injected reload spy; control time
with `vi.useFakeTimers()` / `vi.setSystemTime()`; clear `sessionStorage` and uninstall between tests.

- A chunk-load failure (`vite:preloadError` with a failed-import payload, and an unhandled rejection
  with one) triggers exactly one reload and prevents the default on the Vite event.
- A second chunk-load failure within the guard window after that reload does not reload and does not
  prevent the default (simulate the reload by uninstalling and installing again with the stored key
  left in place).
- A failure after the guard window has passed reloads again.
- Errors that are not chunk-load failures (a `TypeError` from module evaluation as a Vite payload, an
  API error, a plain rejection) never reload.
- Storage unavailable (`sessionStorage.getItem`/`setItem` throwing): no reload, no exception.
- Installing twice registers one listener pair; the returned function removes them.

Work from this package; do not explore broadly.

## Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is
no separate plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md`
(both under `C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not
update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the
Orchestrator's alone.** Your tools are for editing the three assigned files and for running the test
you wrote — nothing else. Do NOT install dependencies, touch a lockfile, run a package manager or tidy
stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/
`push`; leave every change uncommitted for the Orchestrator's independent review. WRITE the required
tests AND run only `tests/chunkLoadRecovery.test.js`, once, with
`node_modules/.bin/vitest run tests/chunkLoadRecovery.test.js` from the target directory — that is
your ONLY test run, not the suite and not a review. The Orchestrator's run and the independent review
are the gate.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `... done` after),
with no gap above ~2 minutes, unbuffered, and finish with exactly one `RESULT: DONE` or
`RESULT: BLOCKED <reason>`.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit. You ARE the implementation instance
> described below; do NOT launch or dispatch another implementer.

Gate #1: approved by the operator 2026-10-21 (register, a42ea7d). Mapped by the Orchestrator (Claude)
on 2026-10-22 after UCM-AUTH-14 (4.13.0) landed; this WO releases the next minor.

## Execution directive

Configured `implementation`: codex/gpt-6-luna, CLI route, cwd ui-core-micha:
`codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox -m gpt-6-luna -C <ucm> - < work-orders/UCM-PERF-5.md`,
backgrounded, banner read back. One dispatch; findings are fixed by the Orchestrator.

Launch evidence: (filled at dispatch).

## Review routing (Tier 3)

One concurrent batch on the same diff: `review` lenses envelope, regression, duplication, tests, plus
`ui_review` (frontend runtime behaviour across browsers; no visual surface) — codex/gpt-6-luna,
`--sandbox read-only`, static-only clause; fallback claude/sonnet. No `sec_review`: no auth, security
or data-exposure surface (availability risk only, covered by the envelope and regression lenses).

## Verification

`tests/chunkLoadRecovery.test.js`, `packageEntries`, `packageTreeShaking` (CI, Windows symlink
limitation locally), `billingPublicExports`-style export checks if touched, `tsc` build. No rendered
comparison: no UI and no prototype.

## Register, docs, release

Orchestrator writes the README usage note and the CHANGELOG entry, bumps the minor version, commits
with explicit pathspecs, proves the candidate with `ci.yml` on `ci-test/UCM-PERF-5`, pushes, confirms
`npm view`, records the register row, and reports back to local_91284713-05f5-4f86-858e-7dd7a5902149.
