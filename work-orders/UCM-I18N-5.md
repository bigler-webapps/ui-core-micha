# UCM-I18N-5 — User-list pagination range text is hard-coded English

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: the user list's pagination reads in the user's language.
- Expected outcome: `UserListComponent`'s `TablePagination` renders its "1–4 of 4" text through a
  translation key (de/en/fr and every locale the bundles carry), the way `labelRowsPerPage`
  already does.

## Context — measured 2026-10-01 in jg-ferien's local browser (ucm 3.7.0 installed there)

- `/account?tab=users` in German: "Zeilen pro Seite: 25 ▾ · **1–4 of 4**". `UserListComponent.jsx`
  (~l.589-600) sets `labelRowsPerPage={t('UserList.ROWS_PER_PAGE', …)}` but no
  `labelDisplayedRows`, so MUI's English default renders. It is the only `TablePagination` in ucm.
- Follows `UCM-I18N-4` (hard-coded English in the user list).

## Scope + non-goals

- In scope: `labelDisplayedRows` via a key with count interpolation; tests; release.
- Explicit non-goals / do-not-touch: no other change to the user list.

## Tier · gates

- **Tier 3** — change inside shared-core (small).
- Done means released AND jg-ferien's pin bumped.

## Risks

- The "more than" form (`count === -1`) must have a wording too, or it renders "of -1".

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. In `de`, the pagination shows the German range text; in `en` the English one.
2. Key-parity: every locale bundle has the new key.

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

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer`; release; jg-ferien pin bump; register rows here and in jg.)*
