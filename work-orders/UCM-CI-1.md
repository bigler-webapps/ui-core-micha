# UCM-CI-1 — A dispatch-only CI workflow for ui-core-micha

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`).

# A. Envelope — addressed to everyone

## Goal and expected outcome

ui-core-micha has one workflow, `publish.yml`, which tests and then publishes on a push to `main`. A change cannot be proven on a candidate ref without publishing, so work such as `UCM-DEP-1` has no safe CI run. This order adds `.github/workflows/ci.yml`: install, build and test on Linux, started only by hand (`workflow_dispatch`), with no publish step and no secrets.

Expected outcome: `gh workflow run ci.yml -R <owner>/ui-core-micha --ref ci-test/<ID>` runs the same install, build and test steps as `publish.yml` against that ref, and nothing else.

## Operator decision this Envelope records (2026-10-15)

The operator asked for this workflow in session, as the way to verify `UCM-DEP-1`: "Lege für ui-core-micha einen kleinen ci.yml (nur install, build, test, workflow_dispatch) als eigenes Register-Item an und nutze ihn für UCM-DEP-1."

## Scope

- One new file `.github/workflows/ci.yml`:
  - trigger: `workflow_dispatch` only;
  - `permissions: contents: read`;
  - one job on `ubuntu-latest` with the steps of `publish.yml` that precede publishing, using the same action versions and the same Node and pnpm versions as `publish.yml`: checkout, setup-node, setup-pnpm, `pnpm install --frozen-lockfile`, `pnpm run build`, `pnpm run test`;
  - no `npm publish`, no `id-token` permission, no secrets, no `registry-url`.
- A register row and the `CI-*` prefix in `WORK_ORDERS.md` (Orchestrator).

## Non-goals

- No change to `publish.yml`, to any test, or to the package.
- No push or pull-request trigger: the workflow runs only when dispatched.
- No matrix, cache tuning or extra jobs.

## Tier

Tier 3: CI. Small in effect.

## Risks

- A `workflow_dispatch` workflow must exist on the default branch before it can be dispatched at a ref; it lands on `main` first and is then used from `ci-test/<ID>` refs.
- The Node and pnpm pins duplicate those of `publish.yml`; `UCM-DEP-1` bumps both.

## Required tests to write

None: the evidence is one dispatched run of the new workflow on a `ci-test/UCM-CI-1` ref.

# B. Implementation map — addressed to the implementer

## Context package

Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.

- Read `.github/workflows/publish.yml` once. Copy, verbatim, the `uses:` pins and versions of its checkout, setup-node (`node-version`) and pnpm/action-setup (`version`) steps. Do not copy the version-check script, the `if:` conditions, the npm update or the publish step.
- Create `.github/workflows/ci.yml`: `name: CI`; `on: workflow_dispatch`; top-level `permissions: contents: read`; one job `test` on `ubuntu-latest` with steps: Check out code, Set up Node, Set up pnpm, Install dependencies (`pnpm install --frozen-lockfile`), Build (`pnpm run build`), Run tests (`pnpm run test`). Same indentation and step-name style as `publish.yml`.
- Do not edit anything else.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. This order needs no tests; run none. The orchestrator does the independent review and the dispatched run after you finish.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1: the operator's instruction of 2026-10-15 in the UCM-CHAT-1/2 Orchestrator session (quoted in Part A). Review lenses per Tier 3 for a workflow file (envelope, regression, duplication, tests do not apply: no tests; sec_reviewer on the permissions block). Evidence: a dispatched run on `ci-test/UCM-CI-1` after the file is on `main`.
