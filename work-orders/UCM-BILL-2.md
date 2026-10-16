# UCM-BILL-2 — Operator surfaces for billing and a richer „Abo" section

## Part A — Envelope (everyone)

**Tier:** 3 — screens showing billing data of all accounts to the operator and a switch that grants
access. **Repository:** `bigler-webapps/ui-core-micha`. **Canonical:** DCM-BILL-5 (django-core-micha);
starts after its API is fixed. Builds on UCM-BILL-1 (`SubscriptionSection`) and the shared Users tab.

### Goal and expected outcome

The operator wants to see per app how the subscriptions and AI costs develop and to grant or revoke
free access without a command line; people want to see in „Abo" what they have: plan, term, token
grants with expiry and, as team payer, who holds a seat.

Expected outcome: an operator overview, an access column with switch in the shared Users tab, and a
more complete „Abo" section — all from DCM-BILL-5, nothing computed in the browser.

### Settled decisions (operator, 2026-10-16/17)

1. **Operator overview** (a component the app places in its operator area): month selector; cards
   for active accounts by source (Abo per plan, Team-Platz, Ohne Abo freigeschaltet), new and ended
   subscriptions, packages sold, tokens granted / used / expired, AI cost in USD with cost per used
   token; a small table AI cost by provider and model. Read-only.
2. **Shared Users tab:** a column „Zugang" (Abo {Plan} bis {Datum} · Team-Platz · Ohne Abo
   freigeschaltet · Schreibgeschützt) and per account the switch „Ohne Abo freigeschaltet"; switching
   on asks for a mandatory reason („Grund"), switching off asks for confirmation and states that the
   data stays and becomes read-only if no other access exists. Only shown to operators and only when
   the app has billing.
3. **„Abo" section** (extends `SubscriptionSection`): plan name and billing period, term end and
   whether it renews or ends; token grants as a list (Kontingent / Paket, Betrag, verbleibend, gültig
   bis); for a team payer the seats („{n} von {m} Plätzen belegt") with the holders' names and the
   existing seat assignment; a seat holder sees „Team-Platz bis {Datum}".
4. Plain words, no Stripe terminology; DE, EN, FR (and the existing de_informal/sw where the kit
   carries them).
5. No own prototype; the surfaces follow the account-page and Users-tab patterns of the kit.

### Scope and acceptance

Components and wiring against DCM-BILL-5, catalogue entries, i18n, tests; existing tests of
UCM-BILL-1 stay green.

### Non-goals and do-not-touch

Changing subscriptions or refunds (Stripe), cross-app finance (bigler-consult), deletion.

### Copy list (DE source; EN and FR required)

„Übersicht Abos" · „Aktive Konten" · „Abo {Plan}" · „Team-Platz" · „Ohne Abo freigeschaltet" ·
„Schreibgeschützt" · „Neue Abos" · „Beendete Abos" · „Verkaufte Pakete" · „Token gewährt" ·
„Token verbraucht" · „Token verfallen" · „KI-Kosten" · „Kosten pro Token" · „Zugang" · „Grund" ·
„Freischaltung aufheben?" · „Die Daten bleiben erhalten; ohne anderen Zugang sind sie danach
schreibgeschützt." · „bis {Datum}" · „verlängert sich" · „endet" · „Kontingent" · „Paket" ·
„verbleibend" · „gültig bis {Datum}" · „{n} von {m} Plätzen belegt".

### Risks

Showing operator data to a non-operator would expose all customers; the components render only on
explicit operator data from the server, and a 403 shows nothing.

### Required tests to write or update

Overview with seeded data and empty month; Users-tab column and switch (grant needs reason, revoke
confirmation, error states); hidden without operator permission or without billing; „Abo" section
for personal subscription, team payer with holders, seat holder, free access, read-only; i18n
completeness.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 pending. After DCM-BILL-5. Seams: `src/billing/*` (SubscriptionSection, api, wire, useBilling),
the shared Users tab components. Tier 3: all lenses, `sec_reviewer`, `ui_reviewer`.
