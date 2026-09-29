# UCM-PRIM-2 — A shared empty-state primitive

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: every "nothing here yet" in a consuming app looks and reads the same.
- Expected outcome: `EmptyState` in the kit — an optional icon, one line of text, an optional secondary
  line and an optional action — built from theme tokens, accessible (text reachable by screen
  readers, action a real button).

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- jg-ferien's 15 event sections show "empty" in **seven** ways (plain text, card, blue info alert,
  card with title, filled green card, alert inside a green card, nothing at all). No shared component
  exists in jg or ucm; jg has only a song-search special case.
- **Operator decision 2026-09-29: generic goes to ucm.** jg adopts it in `JG-UX-9`.
- `PRIM-1` promoted `StatTile`/`SoftChip` along the same lines.

## Scope + non-goals

- In scope: the component, its export, a story or docs entry, tests.
- Explicit non-goals / do-not-touch: no adoption in consumers here; no change to `Alert` styling.

## Tier · gates

- **Tier 3** — new public export in shared-core (additive).
- Reviewer: `reviewer` (all lenses) · `ui_reviewer`.
- **Done means released; jg adoption is `JG-UX-9`.**

## Risks

- A too-flexible API reintroduces the seven variants; keep the props minimal.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. Renders text only; with secondary line; with action (button with accessible name).
2. Uses theme tokens (no literal colours; the kit's literal guard passes).

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

*(placeholder — no context package yet, no progress contract yet; the Orchestrator fills this
part on `git pull` and appends the preamble below to the invocation. Do not dispatch on this
placeholder.)*

## Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`)

## Preamble — a REQUIRED block IN this file, not something appended at invocation

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register
> row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source
> and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies,
> touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state
> blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT
> `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.**

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer`; release; register row here and cross-reference in jg (`JG-UX-9`).)*
