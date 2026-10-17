# UCM-BILL-6 — Balance by origin, seat payer and all purchases in the account section

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`), billing surfaces.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version.
**Precondition:** UCM-BILL-5 released (4.9.0) and DCM-BILL-6 released (`me/` carries `tokens.grants[].origin`,
`tokens.pool`, `seat.payer_name`).

### Goal and expected outcome

Three places of the shared account section still differ from the operator-approved prototype
`maana/work-orders/assets/MAANA-APP-8-subscription.html` (2026-10-17; found by MAANA-APP-8's comparison):
the token balance is not broken down by origin, a seat holder does not see whose team package the seat
belongs to, and purchases that can no longer be withdrawn are hidden. Expected outcome: the section shows all
three as in the prototype, in every app that uses it.

### Settled decisions (operator, 2026-10-17)

1. **Balance by origin:** under the balance a small table with the columns „Herkunft", „verbleibend",
   „gültig" and one row per origin: „Kontingent" (plan), „Paket", „Gutschrift" (credit), „Test-Guthaben"
   (trial), „Team-Pool" (from `tokens.pool`); each row shows „{Name} · {Betrag} Token", the remaining amount and
   „verfällt am {Datum}" or „verfällt nicht", with a thin bar for the remaining share. On a phone the validity
   moves under the row.
2. **Seat payer:** a seat holder sees „Team-Platz bis {Datum}" with the line „Platz im Team-Paket von {Name}"
   (from `seat.payer_name`).
3. **All purchases:** the section „Käufe" lists every purchase of the withdrawal list: eligible ones with
   „Vertrag hier widerrufen" and „bis {Datum}" (as today), withdrawn ones with „Widerrufen am {Datum}", and
   those whose withdrawal period has passed with „Widerrufsfrist abgelaufen"; other ineligibility reasons show
   the purchase without an action.
4. Every new text in `de`, `de_informal` (the „du" form where it addresses the person), `en`, `fr`, `sw`.

### Scope and acceptance

The three changes in `SubscriptionSection` (and the withdrawal list it renders), the new keys, CHANGELOG.

### Non-goals and do-not-touch

How tokens are spent, the operator surfaces, the plan picker, the withdrawal dialog and its calculation, the
seat assignment from UCM-BILL-5.

### Risks

An app on an older dcm sends no `origin`, `pool` or `payer_name`: the section must then fall back to today's
display, never show empty rows or „undefined".

### Required tests to write or update

Rows per origin with remaining and validity (with and without expiry) including the team pool; fallback without
`origin`/`pool`; seat holder line with and without `payer_name`; purchases: eligible, withdrawn, expired period,
other reason; the new keys present in all languages and `de_informal`.

**Copy list:** „Herkunft" · „verbleibend" · „gültig" · „Kontingent" · „Paket" · „Gutschrift" · „Test-Guthaben" ·
„Team-Pool" · „verfällt am {Datum}" · „verfällt nicht" · „Platz im Team-Paket von {Name}" · „Käufe" ·
„Widerrufen am {Datum}" · „Widerrufsfrist abgelaufen" (as in the prototype; operator-approved with it).

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-17 („UCM-BILL-6 machen wir noch", in the Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Start after DCM-BILL-6 is released. Tier 3: all lenses plus
`ui_reviewer`; prototype in scope (the rendered comparison against the prototype's account section at 375/1280).
Consumer: Maana bumps with MAANA-APP-9 (or a small follow-up if APP-9 has landed).
