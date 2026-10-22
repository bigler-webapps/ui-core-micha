# UCM-BILL-9 — Compact access column and icon delete in the user list

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/billing`, `src/components/UserListComponent.jsx`), visible in every app
that uses the user list.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Prototype:** [UCM-BILL-9-access-column.html](assets/UCM-BILL-9-access-column.html) (approved by the operator
2026-10-22).

### Goal and expected outcome

The operator found the access column of the user list far too wordy (2026-10-22): each row shows a sentence such as
"Subscription personal_monthly · until November 19, 2026" plus a switch carrying its own label "Access enabled without
a subscription", and the delete action is an outlined text button. Expected outcome: a short coloured status, a
separate narrow switch column without a visible label, and an icon delete button — as in the prototype, and as the
MAANA-APP-8 prototype already intended.

### Settled decisions (operator, 2026-10-22)

1. **Access** is a short status badge, one line: "Freigeschaltet" (free access), "{Planname} · bis {Datum}"
   (subscription), "Team · bis {Datum}" (team seat), "Schreibgeschützt" (no access or read-only), "Betreiber" where the
   account is an operator. The plan is shown by its display name as the app names it, never by its key; dates use the
   short numeric locale format. Colours as the prototype (existing tokens: success for subscription, primary for free
   and team, warning for read-only, neutral for operator).
2. **"Ohne Abo"** is its own narrow column holding only the free-access switch; the switch has no visible label (the
   accessible name and a tooltip keep "Ohne Abo freigeschaltet – {Name}"). Rows with a subscription, a team seat or
   operator status show "–" instead of the switch. The grant dialog with its required reason and the revoke dialog are
   unchanged.
3. **Delete** is an icon button (trash) with the tooltip and accessible name "Löschen – {Name}", in every app using the
   user list; the confirmation and the rules for who may delete stay unchanged; the own row stays disabled.

### Scope and acceptance

`BillingAccessCell`/`accountAccessText`, `FreeAccessSwitch` presentation, the access and switch columns as offered to
the user list, and the delete action of `UserListComponent`; DE and EN; desktop and phone (the table keeps scrolling
horizontally on a phone). Accepted when the prototype renders equivalently at 375 and 1280 px.

### Non-goals and do-not-touch

Grant and revoke logic and API, permissions for deleting or granting, other row actions, the other columns, the
operator overview page.

### Risks

Apps that pass their own row actions keep their buttons; only the built-in delete changes. A missing plan display
name must fall back to a neutral label, never to the raw key.

### Required tests to write

Status text per access source (free, subscription with plan name and date, team, read-only, operator); switch column
shows the switch only for free and read-only rows, "–" otherwise, with its accessible name; the grant dialog still
requires a reason; delete is an icon button with its accessible name, disabled on the own row, confirmation unchanged.

### Visual specification

Prototype above. **Token delta:** none. **Copy:** "Freigeschaltet", "Team", "Betreiber", "bis {date}", column header
"Ohne Abo", "Löschen – {name}"; English equivalents ("Free access", "Team", "Operator", "until {date}", "No
subscription", "Delete – {name}").

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. A library: you are
the single implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory.

You own exactly: `src/billing/BillingAccessCell.jsx`, `src/billing/FreeAccessSwitch.jsx`,
`src/billing/useBillingUsersColumn.js`, `src/billing/format.js` (one new function), `src/components/UserListComponent.jsx`
(built-in delete action only), `src/theme/kitSxRegistry.js` (new sx entries), `src/i18n/billingTranslations.ts`,
`src/i18n/*` file that holds `UserList.*` / `Common.*` keys if a new key is needed there, `dev/entries.jsx` (one new
entry), and new `tests/billingAccessColumn.test.jsx`. No other file, no export changes, no README, CHANGELOG, package
files, lockfile, register or existing tests.

### Seams (verified against `main` at d5b3ef3)

- **Access text today.** `src/billing/BillingAccessCell.jsx:7-21` `accountAccessText(account, t, language)` builds a
  sentence from `account.access.source` (`subscription` with `plan_key` and `term_ends_at`/`access.ends_at`, `team`,
  `free`, otherwise read-only) and a long date (`formatDate`, `src/billing/format.js:36-41`). `BillingAccessCell`
  (:23-26) shows that text and a labelled `FreeAccessSwitch` below it. No app outside ucm imports either directly;
  `AccountPage` uses them through `useBillingUsersColumn` (`src/pages/AccountPage.jsx:68,284`).
- **Column hook today.** `src/billing/useBillingUsersColumn.js:7-20`: one extra column `billing-access` (minWidth 260;
  error state: one column with `BillingAccessError`), sort and search on `accountAccessText`.
- **Switch today.** `src/billing/FreeAccessSwitch.jsx:8-43`: `FormControlLabel` with visible label and an aria-label
  `Billing.OP_FREE_ACCESS – {name}`; grant dialog requires a reason (1–1000 chars), revoke dialog; API and dialogs stay.
- **Account rows.** DCM `GET operator/accounts/` rows carry `access` (`status`, `source`, `ends_at`), `plan_key`,
  `term_ends_at`, `free_access` — no plan display name and no operator flag. Plan display names come from the app's own
  catalogue: `api.getMe()` answers `plans: [{ key, name, ... }]` (as `PlanPicker` uses, `src/billing/PlanPicker.jsx:53`).
- **Delete today.** `src/components/UserListComponent.jsx:454-469`: outlined error `Button` with `DeleteIcon` and text,
  inside a `Tooltip`, hidden on the own row (`!isOwnRow(row)`), `handleDelete` with `window.confirm` (:104-120),
  enabled by `canDelete(row)` (:162-172). App-supplied `rowActions` buttons (:425-452) stay as they are.
- **Kit sx convention.** Every `sx` on an MUI component that `tests/themeCompleteness.test.js` checks must be a
  top-level exported object registered in `src/theme/kitSxRegistry.js` (import it, add it to `SX_EXPORTS`, add an
  `entry(...)`); inline objects fail "kit sx disjointness". Do not set properties the theme already styles.

### What to build

- **Short status.** `accountAccessText` returns the one-line status of decision 1 — `Billing.OP_FREE_ACCESS_SHORT`
  "Freigeschaltet", "{plan name} · bis {date}", "Team · bis {date}", `Billing.OP_READ_ONLY` "Schreibgeschützt",
  `Billing.OP_OPERATOR` "Betreiber" — with a new `formatShortDate(iso, language)` in `format.js` (numeric day, month,
  year, `timeZone: 'UTC'`, like `formatDate`). Plan name: from a `planNames` map (key → name) passed by the caller;
  when the key has no name, a neutral `Billing.OP_SUBSCRIPTION` label ("Abo"/"Subscription"), never the key. A
  read-only status of a subscription or team row shows "Schreibgeschützt". Keep the signature compatible: extra
  options as an optional fourth argument.
- **Status badge.** `BillingAccessCell` renders the status as a small coloured badge (theme tokens only: success for
  subscription, primary for free access and team, warning for read-only, neutral/grey for operator), one line, no
  switch. A missing account keeps today's "–".
- **Switch column.** `FreeAccessSwitch` gains an option to hide its visible label (default unchanged); hidden, it is a
  bare `Switch` with a `Tooltip` and accessible name `Billing.OP_FREE_ACCESS_FOR` "Ohne Abo freigeschaltet – {name}".
  Dialogs and API unchanged.
- **Hook.** `useBillingUsersColumn({ api, enabled, isOperator })` returns two columns when ready: `billing-access`
  (the badge; sort/search on the short text) and `billing-free-access` (header `Billing.OP_NO_SUBSCRIPTION` "Ohne Abo",
  narrow, centred; the label-less switch for free and read-only rows, "–" for subscription, team and operator rows).
  It loads plan names once from `api.getMe()` while enabled (a failure only means the neutral label). `isOperator`
  (`({ user, account }) => boolean`) marks operator rows; default `({ user }) => user?.is_superuser === true`. The error
  state stays one column as today.
- **Delete.** The built-in delete becomes an `IconButton` with `DeleteIcon` (error colour), `Tooltip` and accessible
  name `Common.DELETE_FOR` "Löschen – {name}" (name: full name, else email, else username). On the own row it is shown
  disabled (prototype) instead of hidden. Confirmation, `canDelete`, `onDeleteUser` and `rowActions` are unchanged.
- **Copy** (`de`, `en`, `fr`, `sw`, plus `de_informal` where the bundle uses it): the keys above with the Envelope's
  texts and English equivalents ("Free access", "Team", "Operator", "until {date}", "No subscription",
  "Delete – {name}", "Subscription"). Existing keys stay.
- **Dev harness:** an entry `billing-access-column` in `dev/entries.jsx` with `UserListComponent` and the two columns
  over fixture rows (free, subscription with plan name, subscription without name, team, read-only, operator, own row),
  German, `fullViewport: true` (opens alone at `#billing-access-column`).

### Required tests (maps Part A)

`tests/billingAccessColumn.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/billingOperator.test.jsx`
and `tests/UserListComponent.test.jsx`): status text per source (free, subscription with plan name and short date,
subscription without a name → neutral label and never the key, team, read-only, operator); the switch column shows
the switch only for free and read-only rows and "–" otherwise, with its accessible name; the grant dialog still needs a
reason; delete is an icon button with its accessible name, disabled on the own row, and still asks for confirmation.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/billingAccessColumn.test.jsx` from the target directory, once — your ONLY test
run; the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

> If you are the implementer reading this work order as your own specification: STOP at this line. You do none of
> what follows — no reviewers, no verification, no register edit, no commit, no further dispatch.

Mapped by the Orchestrator (Claude) on 2026-10-22 against `main` at d5b3ef3 (4.16.0 = UCM-CHAT-7). Mapping decisions
to report: plan display names come from `api.getMe().plans` (DCM operator rows carry only `plan_key`); operator rows
default to `user.is_superuser` with an `isOperator` override, because DCM rows have no operator flag; the own row's
delete becomes disabled instead of hidden, as the prototype shows. Execution: codex/gpt-6-luna, one CLI dispatch,
banner read back; launch evidence (filled at dispatch). Verification: the new test, `UserListComponent`,
`billingOperator*`, `billingComponents`, `billingExports`, `billingPublicExports`, `AccountPage*`,
`billingTranslations`, `userScreenTranslations`, `i18nAggregate`, `themeCompleteness`, `packageEntries`, tsc; full suite
in `ci.yml` on `ci-test/UCM-BILL-9`; 375/1280 comparison of the harness entry against the prototype (at most four app
screenshots).

Gate #1 approved by the operator on 2026-10-22 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; 375/1280 comparison
against the prototype. Runs after UCM-CHAT-7 in the same session; publish a minor release and report the version
(Maana adopts it with MAANA-CHAT-15 or the next pin bump).
