# UCM-AUTH-11 — `UserListComponent` offers an admin the delete action on their own row

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: the user list never offers anyone the deletion of their own account.
- Expected outcome:
  - In `UserListComponent`, the row of the signed-in user renders **no** delete button — not a
    disabled one, none at all. Every other row behaves exactly as today (enabled or disabled per
    `canDeleteUser` / the default).
  - This holds for every consumer, **including one that passes its own `canDeleteUser`**
    (`AccountPage` forwards it as `userListCanDeleteUser`): a prop that returns true for the own row
    does not bring the button back.
  - Released; the Envelope's done-state is the release (consumer bumps are separate, see Risks).

## Context — measured 2026-09-30 against `main` at 3.9.0

- **Operator decision 2026-09-30 (from django-core-micha `DCM-AUTH-4`, dropped there): UI-only.**
  The backend keeps allowing an admin's generic self-delete (`BaseUserViewSet.destroy()` refuses
  only a non-admin's self-delete since dcm 2.44.1); the list simply stops offering it.
- `src/components/UserListComponent.jsx`:
  - `defaultCanEdit` (~l.128) returns true for `currentUser.is_superuser` and for role `admin` on
    every row, the own row included (only the `teacher` branch excludes self).
  - `canDelete` (~l.151) returns `canDeleteUser(...)` when that prop is a function, otherwise
    `canEdit(targetUser)`.
  - The delete button (~l.438-452) renders whenever `showDeleteAction` is true and is only
    `disabled={!canDelete(row)}` — so a row that may not be deleted still shows a disabled button.
- `src/pages/AccountPage.jsx` forwards `userListShowDeleteAction` (default true) and
  `userListCanDeleteUser` (default null).
- Consumers measured: kerzenziehen and reimbursements render `AccountPage` without these props, so
  an admin there sees an enabled delete button on their own row today. jg-ferien passes its own
  `userListCanDeleteUser`, which already returns false for the own row (the button shows disabled).

## Scope + non-goals

- In scope: the own-row rule in `UserListComponent` (identity by `id` of the row vs. the current
  user), tests, CHANGELOG entry, release.
- Explicit non-goals / do-not-touch:
  - No backend change (dcm untouched).
  - Rows other than the own row keep today's disabled-vs-enabled behaviour; no change to
    `defaultCanEdit`.
  - No other action on the own row changes (edit, extra row actions).
  - Consumer pin bumps are not part of this WO.

## Tier · gates

- **Tier 3** — change inside shared-core, permission-adjacent UI.
- Precondition: none.

## Risks

- **Reaching the two affected apps needs a major bump:** kerzenziehen and reimbursements pin
  `@micha.bigler/ui-core-micha` **2.41.3**; 3.0.0 removed chart layout props (`UCM-CHART-12`). The
  fix only reaches them with that bump, which is its own work per app and is classified there by
  the dependency-bump rule.
- The current user may be unknown while loading; with no current user the own-row rule must not
  hide buttons on other rows or throw.
- `id` types: compare the row id and the current user id so that `3` and `"3"` match.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

In `tests/UserListComponent.test.jsx`:

1. Superuser, no `canDeleteUser`: own row has no delete button; another row has an enabled one.
2. Role `admin`, no `canDeleteUser`: same as 1.
3. `canDeleteUser` returning true for every row: own row still has no delete button.
4. Current user not yet loaded: other rows unaffected, no error.
5. **Mutation proof:** remove the own-row rule → tests 1 and 3 fail.

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

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer` + `sec_reviewer`; release (patch: behaviour fix of an existing component); register row stays `released` until consumers bump; register the kerzenziehen and reimbursements bumps in their own registers; commit.)*
