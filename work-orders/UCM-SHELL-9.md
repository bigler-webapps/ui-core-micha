# UCM-SHELL-9 — AccountPage: app-defined groups, labels, order and visibility

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (account hub of every app); additive, default unchanged.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumer:** MAANA-APP-28 decision 2 (prototype `maana/work-orders/assets/MAANA-APP-28-collaboration.html`).

### Goal and expected outcome

MAANA-APP-28 (operator, 2026-10-25) needs Maana's account hub grouped as **Persönlich** (Profil, Sicherheit, Abo und
Token), **Zusammenarbeit** (Teams, Einladen), **Hilfe** (Support) and an operator-only **Betrieb** group. Measured
against ui-core-micha 4.20.0 (`dist/pages/AccountPage.js`): the group definitions are hard-coded in the order
my-account, management, help; extra tabs may join only those keys, anything else falls into a trailing "more" group;
the labels come from fixed `Account.GROUP_*` keys that an app cannot override because ucm's translations are merged
after the app's; built-in tabs (profile, security, users, invite, support) are bound to their groups. Expected outcome:
an app can declare its own groups and place built-in and extra tabs in them; apps that declare nothing see today's hub.

### Settled decisions (operator, 2026-10-25)

1. An optional `groups` declaration on `AccountPage`: each group has a key, a label supplied by the app, an order and
   an optional visibility rule (for example operators only); a group without visible tabs stays hidden as today.
2. Built-in tabs (profile, security, users, invite, support) can be assigned to any declared group; `extraTabs` can
   join any declared key. Their own permission checks (for example the invite right) stay unchanged.
3. Without the declaration, groups, labels, order and placement are exactly today's for every app.
4. Maana's use (for orientation, not built here): Persönlich (profile, security, Abo und Token), Zusammenarbeit (Teams,
   invite — invite stays visible to everyone with the invite right, operator decision 2026-10-25), Hilfe (support),
   Betrieb visible to operators only (users, Abo-Übersicht, Alle Projekte, Alle Teams, Assistent, Transkription).

### Scope and acceptance

`AccountPage` (and its tab/group rendering on desktop and phone); DE and EN; documented with an example. Accepted when
Maana can render the four groups in that order with its own labels and an app without the prop is unchanged.

### Non-goals and do-not-touch

Tab contents, permissions and roles, the user list, Maana's wiring (MAANA-APP-28), the translation merge order.

### Risks

Deep links by tab value (`?tab=`) must keep working whatever group a tab is in.

### Required tests to write

Declared groups render in the given order with app labels; built-in tabs move into declared groups; an extra tab joins
a declared group; an operator-only group hides for a non-operator; an empty group hides; `?tab=` selects a moved tab;
no declaration renders today's groups and labels.

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/pages/AccountPage.jsx` (tab list, group building, the new prop and its doc comment) and new
`tests/accountPageGroups.test.jsx`. No other file (no README, CHANGELOG, package files, lockfile, register, existing
tests, no change to `SectionNav` or translations).

### Seams (verified against `main` at f12fe8d)

- `src/pages/AccountPage.jsx:47-65` props (`extraTabs = []`, …); `:41-45` the doc comment above the component.
- `:81-84` `currentTab` from `?tab=` (`invite`, `bulk-invite-csv`, `access` map to `invite`).
- `:143-180` `tabs` memo: built-in `profile`, `security`, then `users` (`canViewUsers`), `invite` (`canViewInvite`),
  `support` (`isSuperUser || perms.can_view_support`); then `extraTabs` with `visible(extensionContext)` and a `group`
  restricted to `my-account | management | help` (`:170`). `extensionContext = { user, perms, isSuperUser, t }`.
- `:182-226` `groups` memo: hard-coded definitions my-account (profile, security), management (users, invite), help
  (support) with `Account.GROUP_*` labels; extra tabs join by `tab.group`; anything unassigned goes into a trailing
  `more` group (`Account.GROUP_MORE`); empty groups are dropped. The result `{ key, label, items: [{ key, label }] }`
  goes to `SectionNav` (`:258-263`), which renders desktop and phone from it.
- `:243-255` `safeTab`: a tab not in `tabs` falls back to `profile`; content renders by `safeTab`.

### What to build

- **New optional prop `groups`**: an array of `{ key, label, order?, tabs?, visible? }`.
  - `label`: string or `(context) => string` (same context as `extraTabs`).
  - `order`: optional number; groups render in a stable ascending sort by `order ?? <array index>`, so without any
    `order` the array order applies.
  - `tabs`: built-in tab values (`profile`, `security`, `users`, `invite`, `support`) placed in this group, in that
    order. A built-in value listed in more than one group belongs to the first group (in rendered order). A built-in
    tab still appears only when its own permission check passes today — the declaration never adds a tab.
  - `visible(context) => boolean` (optional): when it returns false the group is hidden **and its tabs are removed
    from the reachable tabs** (so `?tab=` of such a tab falls back to `profile` like any tab the person cannot see).
  - `extraTabs[].group` may name any declared key; with a declaration, an extra tab whose `group` is not a declared
    (visible or hidden) key, and a built-in tab placed in no declared group, go into the trailing `more` group
    (`Account.GROUP_MORE`) as today; an extra tab naming a hidden group is hidden with it.
  - Groups without visible items are dropped as today.
- **Without `groups`** (prop absent or not an array): the current code path, results identical — the current
  definitions, labels, extra-tab group restriction and `more` group stay exactly as they are.
- `?tab=` keeps selecting a tab whatever group it is in (tab values are unchanged; only grouping changes).
- Document `groups` in the doc comment above the component, next to `billingOperator`.

### Required tests (maps Part A)

`tests/accountPageGroups.test.jsx` (`// @vitest-environment jsdom`, conventions of an existing `AccountPage` test such as
`tests/accountPageBillingOperator.test.jsx` / `tests/billingOperatorAccountPage.test.jsx`; mock heavy children as they
do). With a declaration like Maana's (Persönlich: profile, security; Zusammenarbeit: invite + an extra tab; Hilfe:
support; Betrieb: users + an extra tab, `visible` operators only): groups render in the given order with the app's labels;
built-in tabs sit in their declared groups; the extra tab joins its declared group; Betrieb is hidden for a non-operator
and its tabs are not reachable via `?tab=`; a declared group with no visible tabs is hidden; `?tab=invite` selects the
moved invite tab; without `groups` the groups and labels are today's (`Account.GROUP_MY_ACCOUNT`, `…MANAGEMENT`,
`…HELP`, `…MORE`) and an extra tab with an unknown group still lands in `more`.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/accountPageGroups.test.jsx` from the target directory, once — your ONLY test run;
the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of MAANA-APP-28 on 2026-10-25 (its decision 2 needs it; the operator
decided the placement of "Einladen" the same day in the Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release and
report the version.

Mapped by the Orchestrator (Claude) on 2026-10-25 against `main` at f12fe8d (4.20.0). Shape chosen by the Orchestrator
within the Envelope: `groups: [{ key, label, order?, tabs?, visible? }]`; a hidden group also removes its tabs from the
reachable set (otherwise "operators only" would be cosmetic for a deep link); unplaced tabs keep today's `more` group
rather than disappearing. Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Review: lenses envelope,
regression, duplication, tests plus `ui_review`, codex/gpt-6-luna read-only; no `sec_review` (no permission check
changes: a declaration can only hide or regroup tabs, never add one). Verification: the new test, all `AccountPage*` /
`accountPage*` / `billingOperatorAccountPage`, `sectionNav*`, `pageTitles`, `checkKitIntegration`, tsc; full suite in
`ci.yml` on `ci-test/UCM-SHELL-9`. README (with Maana's four groups as the example) + CHANGELOG + minor version by the
Orchestrator.
