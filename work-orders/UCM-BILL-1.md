# UCM-BILL-1 — Shared subscription and token surfaces

## Part A — Envelope (everyone)

**Tier:** 3 — screens that start payments and show what people have paid for. **Repository:** `bigler-webapps/ui-core-micha`. **Canonical:** DCM-BILL-1 (django-core-micha); this WO is its UI side and starts after the DCM-BILL-1 API contract is fixed.

### Goal and expected outcome

Apps that sell plans need the same screens: choose a plan, pay, see the subscription and the token balance, buy a package, understand what an action costs, and see clearly when access has ended.

Expected outcome: reusable components an app places in its onboarding, account page and work screens.

### Settled decisions (operator, 2026-10-16)

1. **Plan picker:** plans from the app's catalogue (DCM-BILL-1), monthly/yearly switch where both exist, team packages with seats and term, what is included in plain words (for tokens also in hours of transcription where the app provides the conversion); continues to Stripe Checkout.
2. **Account section „Abo":** current plan, term end, seats (team payer: who holds a seat), token balance with grant and expiry, „Paket kaufen", link to the Stripe customer portal (cancel, payment method, receipts).
3. **Token display:** a balance badge, and a cost preview for an action („47 Token, mit Übersetzung 71 · Guthaben 1'153") the app fills in.
4. **Access ended:** a persistent banner „Abo beendet – Projekte sind schreibgeschützt. Export und Download bleiben möglich." and „Abo erneuern" (no deletion date: nothing is deleted automatically).
5. **Operator:** a read-only overview per app (subscribers, plans, tokens used, AI cost) and the switch „Ohne Abo freigeschaltet" per account in the shared Users tab.
6. DE, EN and FR strings registered through the i18n contract.

### Scope and acceptance

The components and their API wiring against DCM-BILL-1, catalogue entries, tests.

### Visual specification

The steps „Plan" and „Bezahlung" of [MAANA-APP-1-projects.html](../../maana/work-orders/assets/MAANA-APP-1-projects.html) (button „Neues Konto"); other surfaces follow existing account-page patterns.

### Non-goals and do-not-touch

App-specific gating, prices, own API keys.

### Risks

A screen that shows access or balance wrongly undermines trust in payment; states come only from the server.

### Required tests to write or update

Plan picker variants, checkout redirect, account section states (active, team payer, team member, free, ended), balance and cost preview, banner, operator overview and free-access switch, i18n completeness.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-16 (in the Maana Expertenchat, session local_cbfc9d51-5217-42a4-99ba-27a315c854ce); no own prototype (operator chose a prototype for bigler-consult instead; surfaces follow the plan steps of the MAANA-APP-1 prototype and existing account-page patterns). After the DCM-BILL-1 contract. Tier 3: all lenses, `sec_reviewer`, `ui_reviewer`. Release and consumer pin bumps per the ucm publish flow.
