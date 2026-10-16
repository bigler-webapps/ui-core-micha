# UCM-BILL-3 — Withdrawal button in the account section

## Part A — Envelope (everyone)

**Tier:** 3 — a screen that triggers a refund and ends access. **Repository:**
`bigler-webapps/ui-core-micha`. **Canonical:** DCM-BILL-3 (django-core-micha); starts after its API is
fixed. Builds on UCM-BILL-1 (`SubscriptionSection`).

### Goal and expected outcome

Eligible people (EU consumers within 14 days) must find and use the withdrawal function easily and
understand what they get back.

Expected outcome: in the account section „Abo", an eligible purchase shows „Vertrag hier widerrufen";
a confirmation step shows the refund amount and its calculation; afterwards a receipt message.

### Settled decisions (operator, 2026-10-16)

1. The button „Vertrag hier widerrufen" appears per eligible purchase (subscription, team package,
   token package) in `SubscriptionSection` during the whole period, with the last day shown („bis
   {Datum}").
2. Confirmation dialog: what ends (access from this purchase, renewal), the refund amount with its
   calculation (time share or token share, from the server), „Widerruf bestätigen" and „Abbrechen".
3. After confirming: a success message „Widerruf eingegangen" with date and time, and the note that a
   confirmation e-mail was sent and the refund follows within 14 days.
4. Not shown for ineligible purchases; no hint to Swiss or business customers.
5. DE, EN, FR.

### Scope and acceptance

Button, dialog, success state, wiring to DCM-BILL-3, catalogue entry, tests.

### Visual specification

Follows `SubscriptionSection` (UCM-BILL-1) and the kit's dialog patterns; no own prototype.

### Non-goals and do-not-touch

Refund rules (server), other account surfaces.

### Copy list (DE source; EN and FR required)

„Vertrag hier widerrufen" · „bis {Datum}" · „Vertrag widerrufen?" · „Mit dem Widerruf endet der
Zugang aus diesem Kauf sofort, und das Abo verlängert sich nicht." · „Du erhältst {Betrag} zurück." ·
„Berechnung: {Erklärung}" · „Widerruf bestätigen" · „Abbrechen" · „Widerruf eingegangen" ·
„Eingegangen am {Datum, Uhrzeit}. Eine Bestätigung ist per E-Mail unterwegs; die Rückzahlung folgt
innert 14 Tagen."

### Risks

A button that triggers the refund without the confirmation step, or that is hidden, breaks the legal
requirement or loses money.

### Required tests to write or update

Shown only for eligible purchases with the deadline; dialog with amount and calculation; confirm
calls the server once; success state; cancel does nothing; i18n completeness.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-16 (in the Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). After DCM-BILL-3. Tier 3: all lenses, `sec_reviewer`,
`ui_reviewer`.
