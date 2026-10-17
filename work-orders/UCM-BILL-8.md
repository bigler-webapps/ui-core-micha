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

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of the MAANA-APP-9 prototype and its "Replaces / removes" list (the
plan cards move from the account section to the plan page), raised by the operator on 2026-10-17 („Warum gibt es
noch monatlich/jährlich?"); registered by the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Seam: `src/billing/SubscriptionSection.jsx` (read-only branch with
`AccessEndedBanner` and `PlanPicker`). Tier 3: all lenses plus `ui_reviewer`. Consumer: MAANA-APP-14.
