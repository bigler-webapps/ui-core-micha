# UCM-SHELL-7 — User-menu avatar initials fail contrast

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: the initials in the header avatar are readable.
- Expected outcome: initials reach at least 4.5:1 against the avatar background, using the consuming
  app's theme tokens rather than MUI's default grey.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- `UserMenu` (imported in jg-ferien's `Header.jsx`) renders the MUI default avatar: white initials on
  light grey, **1.83:1**, on every page of the app.

## Scope + non-goals

- In scope: avatar colours in `UserMenu` from theme tokens (e.g. primary surface with its
  contrastText), with a fallback that passes when a consumer defines nothing.
- Explicit non-goals / do-not-touch: no layout change of the user menu.

## Tier · gates

- **Tier 3** — shared-core component (small).
- Reviewer: `ui_reviewer` (no new logic beyond the colour choice).
- **Done means released and jg-ferien's pin bumped.**

## Risks

- `createAppTheme` baseline: if the chosen token is optional, `assertThemeComplete` must require it or
  the fallback must pass on its own.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. With jg-ferien's theme values the avatar pair is at least 4.5:1.
2. With a theme defining nothing extra the fallback pair is at least 4.5:1.

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

*(to be filled by the Orchestrator: execution directive; `ui_reviewer`; release; jg-ferien pin bump; register rows here and in jg (`JG-DL-12`).)*
