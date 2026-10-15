# UCM-DEP-3 — Remove the `./package.json` export added beyond UCM-DEP-2

Follow-up from the acceptance of `UCM-DEP-2` (2026-10-15): its Envelope named exactly four public
entries; the landed 4.0.0 also exports `./package.json`. The operator decided to remove it.

# A. Envelope

## Goal & expected outcome

- Ziel: the package's public surface is exactly what `UCM-DEP-2` decided.
- Expected outcome: a patch release of `@micha.bigler/ui-core-micha` whose `exports` map holds
  `.`, `./charts`, `./chat` and `./markdown` and nothing else; CHANGELOG entry says so.

## Scope

- Remove the `./package.json` entry from `exports` in `package.json`.
- Adjust any test that asserts the exports map so it pins exactly the four entries.
- Release as the next patch version (4.0.1) with a one-line CHANGELOG entry.

## Non-goals / do-not-touch

- No other change to the exports map, peers, `files` or source.
- No consumer repo changes.

## Tier · precondition / gate

- Tier 3: a change inside shared-core (its public surface), however small.
- Precondition: none (4.0.0 is published). Lands before the app orders bump, so they pin 4.0.1.

## Risks

- A consumer tool that reads `@micha.bigler/ui-core-micha/package.json` through the exports map
  (some bundler plugins and version checks do) would fail to resolve it. Checked at authoring
  (2026-10-15): no app source or config under `*/frontend` imports
  `ui-core-micha/package.json`; a third-party plugin doing so would show in the consuming app's
  build on its bump.

## Required tests to WRITE

- The exports-map test asserts the exact key set `{".", "./charts", "./chat", "./markdown"}`.

# B. Implementation map — addressed to the implementer

## Context package

Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Work from this package; do not explore.

- Your only edit is the test `tests/packageEntries.test.js`, the test named `maps every sub-path in package.json to an emitted entry and declares the peers accordingly` (near the end of the file). It currently asserts `Object.keys(exportsMap).sort()` equals `['.', './charts', './chat', './markdown', './package.json']`. Change that assertion to the exact set of the four public entries `['.', './charts', './chat', './markdown']` and nothing else in the test.
- Do NOT edit `package.json`: the Orchestrator removes the `./package.json` entry from the `exports` map itself (manifest changes are the Orchestrator's), so the test is red until that edit is in; that is expected. Do not edit the lockfile, `CHANGELOG.md`, the version or any source file.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. This change needs no new test run from you: the test is red until the Orchestrator edits `package.json`. The orchestrator re-runs the authoritative set + does the independent review after you finish.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded at ui-core-micha@44434ec. Orchestrator edits `package.json` (drop `./package.json` from `exports`, version 4.0.1) and the CHANGELOG, runs the affected tests, a dispatched `ci.yml` on `ci-test/UCM-DEP-3`, reviews, releases by push to main.
