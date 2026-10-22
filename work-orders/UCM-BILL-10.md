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

Placeholder. Not yet mapped: context package, target directory and preamble are missing, so this
WO must not be dispatched in its current state.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish.

To be filled by the Orchestrator. Origin: the UCM Orchestrator's answer to the Maana Expertenchat
(2026-10-22) named this prop as the cleaner fix; operator decided 2026-10-22 to do it in ucm.
