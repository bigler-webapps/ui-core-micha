# UCM-BILL-10 — AccountPage passes an app's operator rule to its billing users column

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: an app whose operators are not only superusers can use `AccountPage`'s built-in billing users
  column with its own operator rule, instead of switching the built-in column off and rebuilding it.
- Expected outcome:
  - `AccountPage` accepts an optional operator rule and hands it unchanged to the billing users column
    it builds when `billingUsers` is set (`src/pages/AccountPage.jsx`, today
    `useBillingUsersColumn({ api, enabled })` without a rule).
  - With the rule, every place of that column that depends on "is this person an operator" — the
    access status text and badge and the free-access switch — follows the app's rule.
  - Without the rule, behaviour is exactly today's (superuser default).
  - The prop is documented in the README section of the account page and in the changelog; the
    release is a minor version.

## Background

maana treats superusers and users with profile role `admin` as operators (`is_operator` in
`maana/backend/projects/access.py`). With ucm 4.17.0 (UCM-BILL-9) its admins would appear as
read-only with a free-access switch. Today the only way around it is to turn `billingUsers` off and
rebuild the column through the exported `useBillingUsersColumn` with `userListExtraColumns`; operator
decision 2026-10-22: the clean fix belongs in ucm. MAANA-DEP-3 adopts it.

## Scope + non-goals

- In scope: the `AccountPage` prop, passing it to `useBillingUsersColumn`, documentation, tests.
- Non-goals / do not touch:
  - the default operator rule and everything else `useBillingUsersColumn` does;
  - the billing API, the operator accounts loading, the user list itself;
  - any app (MAANA-DEP-3 adopts this release).

## Tier · precondition / gate

- Tier 3: change inside shared-core; additive (default unchanged), so consumers take it with an
  additive bump.
- Precondition: none.

## Risks

- A rule that is a new function on every render must not cause the operator accounts to be fetched
  again; the column's memoisation must hold with a changing rule identity or the documentation must
  say how to pass it.
- An app that passes a rule while `billingUsers` is off must see no change.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- `AccountPage` with `billingUsers` and a rule (superuser or role `admin`): an admin row and a
  superuser row show the operator status and no free-access switch; a normal read-only row keeps its
  switch.
- `AccountPage` with `billingUsers` and no rule: unchanged (superuser-only default).
- A rule passed while `billingUsers` is off changes nothing.
- Re-rendering with a new rule function does not fetch the operator accounts again.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/pages/AccountPage.jsx` and new `tests/accountPageBillingOperator.test.jsx`. No other file (no README,
CHANGELOG, package files, lockfile, register, existing tests, no change to `useBillingUsersColumn`).

## Seams (verified against `main` at 642c7fa)

- `src/pages/AccountPage.jsx:58` declares `billingUsers = false`; `:67-68` builds
  `useBillingUsersColumn({ api: billingApi, enabled: Boolean(billingUsers) })`; `:284` passes
  `[...userListExtraColumns, ...billing.extraColumns]` to the user list.
- `src/billing/useBillingUsersColumn.js`: `isOperator` (default `({ user }) => user?.is_superuser === true`) drives
  the status text, the badge and whether the "Ohne Abo" column shows the switch or "–". The operator accounts are
  fetched by `useOperatorAccounts(api, { enabled })`, which depends on `api` and `enabled`, not on `isOperator`; a new
  rule function only recomputes the memoised columns.

## What to build

- New optional `AccountPage` prop **`billingOperator`** (`({ user, account }) => boolean`), passed as `isOperator` to
  `useBillingUsersColumn` only when given (omit the key otherwise, so the hook's default applies). Add it to the
  component's prop documentation comment if there is one near the props.
- Nothing else changes; with `billingUsers` off the hook stays disabled whatever the rule is.

## Required tests (maps Part A)

`tests/accountPageBillingOperator.test.jsx` (`// @vitest-environment jsdom`, conventions of
`tests/billingOperatorAccountPage.test.jsx`, which already renders `AccountPage` with `billingUsers`): with
`billingUsers` and `billingOperator={({ user }) => user.is_superuser || user.role === 'admin'}` an admin row and a
superuser row show the operator status and "–" instead of the switch, a normal read-only row keeps its switch; without
the prop only the superuser row is an operator; with the prop and `billingUsers` off no billing request is made and no
billing column appears; re-rendering with a new rule function does not call `listOperatorAccounts` again.

Work from this package; do not explore broadly.

## Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/accountPageBillingOperator.test.jsx` from the target directory, once — your ONLY
test run; the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit, no further dispatch.

Mapped by the Orchestrator (Claude) on 2026-10-22 against `main` at 642c7fa (4.17.0); prop name `billingOperator`
chosen by the Orchestrator (the Envelope names none). Execution: codex/gpt-6-luna, one CLI dispatch, banner read back.
Review: lenses envelope, regression, duplication, tests, codex/gpt-6-luna read-only (no UI surface change, no
`ui_review`; no auth/security change, no `sec_review`). Verification: the new test, `billingOperatorAccountPage`,
`AccountPage*`, `billingAccessColumn`, `pageTitles`, `checkKitIntegration`, tsc; full suite in `ci.yml` on
`ci-test/UCM-BILL-10`. README + CHANGELOG + minor version by the Orchestrator. Origin: the UCM Orchestrator's answer to the Maana Expertenchat
(2026-10-22) named this prop as the cleaner fix; operator decided 2026-10-22 to do it in ucm.
