# UCM-BILL-8 — The account section can hand plan choice to the app's plan page

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`), billing surfaces.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version.
**Precondition:** UCM-BILL-6/7 released (4.11.0).

### Goal and expected outcome

For an account without access `SubscriptionSection` always renders its own inline plan picker (Monatlich /
Jährlich switch and plan radios) under the „ended" banner. Maana has a dedicated plan page with four cards and a
payment summary (MAANA-APP-9, operator-approved prototype), so the inline picker in the account section shows an
outdated second way to choose a plan. Expected outcome: an app can replace the inline picker by a single button
that leads to its own plan page.

### Settled decisions (operator, 2026-10-17)

1. `SubscriptionSection` accepts an optional `onChoosePlan` callback. When it is given, the read-only state shows
   the banner and, instead of the inline plan picker, one button „Abo wählen" that calls `onChoosePlan`; the
   banner's „Abo erneuern" action calls it as well. Without the prop the section behaves exactly as today.
2. Additive only; the plan picker component itself is unchanged.

### Scope and acceptance

The optional prop, the button text in all languages (`de`, `de_informal`, `en`, `fr`, `sw`), README/CHANGELOG.

### Non-goals and do-not-touch

The plan picker, the active-subscription view, seats, withdrawal, the operator surfaces.

### Risks

None beyond the additive prop; apps without it are unchanged.

### Required tests to write or update

With `onChoosePlan`: read-only state shows the button and no plan picker, the button and the banner's renew
action call the callback. Without it: today's inline picker (regression).

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes names, shapes and invariants. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only `src/billing/SubscriptionSection.jsx`, `src/i18n/billingTranslations.ts`, `src/theme/kitSxRegistry.js` (only if a new exported sx object is needed) and tests (new file `tests/billingChoosePlan.test.jsx`; existing tests only if they pin something this change legitimately alters, which it should not). The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not touch `PlanPicker.jsx`, `AccessEndedBanner.jsx`, the active-subscription view, the seat block, the withdrawal section or the operator surfaces.

### Current code (`src/billing/SubscriptionSection.jsx`, the `access.status === 'read_only'` branch, around lines 93-99)

In the read-only state the section renders `AccessEndedBanner` with `onRenew={onRenew || (() => { scroll to the picker and focus its first radio })}` and below it `<div ref={renewalPickerRef}><PlanPicker plans={me.plans || []} api={api} redirect={redirect} allowedHosts={allowedHosts} describePlan={describePlan} /></div>`. The existing prop `onRenew` (host override of the banner action) stays as it is.

### Change

New optional prop `onChoosePlan` (a function, default `undefined`) on `SubscriptionSection`.
- When `typeof onChoosePlan === 'function'`: in the read-only state show the banner and, INSTEAD of the `PlanPicker` block, ONE button with the text `t('Billing.CHOOSE_PLAN')` ("Abo wählen"; MUI `Button variant="contained"`) that calls `onChoosePlan()` with no arguments; the banner's renew action (`AccessEndedBanner` `onRenew`) calls `onChoosePlan()` too (if the host passes both `onRenew` and `onChoosePlan`, `onChoosePlan` wins for the banner action; note this in a code comment). No `PlanPicker` is rendered and no ref/scroll logic is used in that case. The rest of the section below (balance, packages, purchases and the like) is untouched.
- When `onChoosePlan` is not a function (absent, `null`, any other type): the section behaves exactly as today (inline `PlanPicker`, existing `onRenew`/scroll-and-focus behaviour).
- The active state never shows the button and never calls the callback.
- No new request, no change to `useBilling`, no change to what is shown in any other state.
- Add a short comment next to the prop in the signature or its first use describing it.

### New key (`billingTranslations.ts`, all five languages)

`Billing.CHOOSE_PLAN`: de "Abo wählen", de_informal "Abo wählen", en "Choose a plan", fr "Choisir un abonnement", sw "Chagua usajili".

### Kit sx convention (enforced by `tests/themeCompleteness.test.js`)

No inline `sx` object on a baseline-styled MUI component (`Button`, `Alert`, ...). The button needs no sx; if you need spacing put it on a `Box` or `Stack`. Run `tests/themeCompleteness.test.js`.

### Tests to write (`tests/billingChoosePlan.test.jsx`; mocked `react-i18next` returning keys with interpolated values, `// @vitest-environment jsdom`, like `tests/billingOperatorReview2.test.jsx`; the `me` of a read-only account as in `tests/billingAbo.test.jsx`)

With `onChoosePlan`: the read-only state shows the banner (`Billing.ENDED_TITLE`) and one button `Billing.CHOOSE_PLAN`, and no plan picker (no `Billing.PLANS` radiogroup, no interval switch buttons `Billing.MONTHLY`/`Billing.YEARLY`, no `Billing.CONTINUE_TO_PAYMENT`); clicking the button calls `onChoosePlan` exactly once with no arguments; clicking the banner's `Billing.RENEW` calls it too (exactly once more); with both `onRenew` and `onChoosePlan` the banner action calls only `onChoosePlan`; `startCheckout` is never called by either; the `me.plans` list does not matter. Without `onChoosePlan` (absent, `null`, a string): today's inline picker is shown (radiogroup `Billing.PLANS` with the plans, `Billing.CONTINUE_TO_PAYMENT`), no `Billing.CHOOSE_PLAN` button, the banner action still scrolls/focuses (assert `scrollIntoView` is called when mocked) and with `onRenew` given the banner calls `onRenew`. An active account with `onChoosePlan` shows no `Billing.CHOOSE_PLAN` button and never calls the callback. Translation: `Billing.CHOOSE_PLAN` exists in `de`, `de_informal`, `en`, `fr`, `sw` and de equals de_informal. Existing billing tests stay green. Run `tests/billing*`, `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and nothing else; read the whole vitest summary including a possible `Errors` line.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of the MAANA-APP-9 prototype and its "Replaces / removes" list (the plan cards move from the account section to the plan page), raised by the operator on 2026-10-17 („Warum gibt es noch monatlich/jährlich?"); registered by the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Seam: `src/billing/SubscriptionSection.jsx` (read-only branch with `AccessEndedBanner` and `PlanPicker`). Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` on the final combined diff, repeated after fixes to code; evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-8`; README and CHANGELOG (Orchestrator). Minor release 4.12.0 by push to main; the register row is filled after the landing commit in the same push chain. Consumer: MAANA-APP-14 (App session). Report to the Maana Expertenchat session `local_cbfc9d51-5217-42a4-99ba-27a315c854ce`; mention the precedence decision (`onChoosePlan` over `onRenew` for the banner action when both are passed).
