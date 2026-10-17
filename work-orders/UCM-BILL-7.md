# UCM-BILL-7 — Extra account tabs can join a navigation group

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`), account page.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version.
**Precondition:** none (independent of UCM-BILL-6).

### Goal and expected outcome

The operator-approved prototype `maana/work-orders/assets/MAANA-APP-8-subscription.html` (2026-10-17) shows the
account navigation as „Profil, Sicherheit, Abo" in one group. `AccountPage` builds its navigation groups itself
and puts every app-provided extra tab into the group „Weitere" (`Account.GROUP_MORE`), so Maana's „Abo" lands
there. Expected outcome: an app can place an extra tab into one of the kit's groups.

### Settled decisions (operator, 2026-10-17)

1. An entry of `extraTabs` accepts an optional `group` naming one of the kit's existing navigation groups
   (the account group that holds Profil and Sicherheit, and the others the kit defines); with it the tab
   appears in that group after the kit's own tabs; without it, or with an unknown group, it stays in
   „Weitere" as today.
2. Additive only: no change to the kit's own tabs, their order or labels.

### Scope and acceptance

The optional `group` on extra tabs, documented in the README/CHANGELOG; desktop sidebar and phone navigation
of the account page.

### Non-goals and do-not-touch

The tabs' content, the billing components, new groups, reordering the kit's tabs.

### Risks

An app passing a misspelled group would silently land in „Weitere"; that is the intended safe fallback.

### Required tests to write or update

An extra tab with `group` set to the account group renders in that group after Profil and Sicherheit; without
`group` or with an unknown one it renders under „Weitere"; phone navigation follows the same placement.

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes names, shapes and invariants. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only `src/pages/AccountPage.jsx` and tests (extend `tests/AccountPage.test.jsx`, which already mocks `react-i18next` and the tab content components and has `renderAccount({ user, route, extraTabs })`; add a new file `tests/AccountPageGroups.test.jsx` if clearer). The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not change the kit's own tabs, their order or labels, the group labels, the content of any tab, or any prop other than the new optional field on `extraTabs` entries.

### Current code (read `src/pages/AccountPage.jsx`, `tabs` memo around lines 128-167 and `groups` memo around lines 169-212)

`tabs` is the list `[profile, security, users?, invite?, support?, ...extraTabs]`; an extra tab is `{ value, label (string or function of the extension context), visible?(context), ... }` and only enters `tabs` when `value` and `label` are set, it is visible and its `value` is not already taken. `groups` has three fixed group definitions with keys `my-account` ("Account.GROUP_MY_ACCOUNT": values profile, security), `management` ("Account.GROUP_MANAGEMENT": users, invite) and `help` ("Account.GROUP_HELP": support); every tab whose value is in none of them is collected into a fourth group `more` ("Account.GROUP_MORE"). The group list feeds both the desktop sidebar and the phone navigation (look at how `groups` is consumed further down; both must follow the same placement automatically).

### Change

1. An `extraTabs` entry accepts an optional `group` string naming one of the kit's group KEYS: `my-account`, `management` or `help` (these three only; `more` and anything else, also a non-string, an unknown or misspelled key, counts as "no group"). Carry the accepted group on the tab object that `tabs` builds for an extra tab (for example `group: tab.group` only when it is one of the three keys; the kit's own tabs never carry one).
2. In `groups`: for each of the three definitions the items are the kit's own tabs of that group in their existing order, FOLLOWED by the extra tabs whose `group` equals the group key, in the order of `extraTabs`. Extra tabs without an accepted group stay in the `more` group exactly as today (same order, same label). A group that has no kit tab visible but receives an extra tab is shown (the existing `filter` on non-empty groups already handles this); a group with no items stays hidden.
3. Everything else stays: `assignedValues` logic for the `more` group must treat a grouped extra tab as assigned, so it never also appears under "More"; `builtInTabValues`, the active-tab security check, `safeTab` and the rendering of the active extra tab are untouched; an extra tab whose `value` collides with a kit tab is still ignored as today.
4. No new translation keys (the group labels exist). Add a short comment next to the new field naming the three valid keys.

### Tests to write (extend `tests/AccountPage.test.jsx` or the new file; same mocks)

Wide and phone placement, reading the navigation the way the existing tests do (look at how `tests/AccountPage.test.jsx` finds the group labels and tab buttons for the sidebar and for the phone navigation; reuse its helpers and its `matchMedia`/viewport handling): an extra tab with `group: 'my-account'` appears in the "My account" group AFTER Profile and Security and not under "More"; with `group: 'management'` for a user who can view users it follows Users and Invite, and for a user who cannot it still shows in a "Management" group by itself; with `group: 'help'` it follows Support; two grouped tabs keep the `extraTabs` order; without `group`, with `group: 'more'`, with `group: 'nonsense'` and with a non-string group (`42`, `{}`) it appears under "More" exactly as before; a mix of one grouped and one ungrouped tab places each correctly; the phone navigation follows the same placement; the kit's own tabs, their order and labels are unchanged with and without extra tabs (a regression assertion on the full ordered label list); selecting a grouped extra tab renders its content (`content` prop as in the existing extra tab test); a hidden tab (`visible` returns false) and a duplicate `value` are still skipped. Run `tests/AccountPage*.test.jsx`, `tests/themeCompleteness.test.js` and `tests/i18nAggregate.test.js` and nothing else; read the whole vitest summary including a possible `Errors` line.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of the prototype on 2026-10-17 (account navigation „Profil, Sicherheit, Abo"); registered by the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce) from the MAANA-APP-8 post-landing comparison. Seam: `pages/AccountPage.jsx` (`groups` memo, `Account.GROUP_MORE`). Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` on the final combined diff, repeated after fixes to code; evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-7`; README and CHANGELOG (Orchestrator) document the `group` field. No prototype comparison images (placement only; the dev harness is not needed). Minor release 4.11.0 by push to main after UCM-BILL-6 (4.10.0); the register row is filled in the same push chain after the landing commit. Consumer: MAANA-APP-9 passes `group: 'my-account'` for "Abo". Report to the Maana Expertenchat session `local_cbfc9d51-5217-42a4-99ba-27a315c854ce`.
