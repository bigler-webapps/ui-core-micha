# UCM-BILL-5 — Informal German and seat assignment from a list in the billing surfaces

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`), billing surfaces.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version.
**Precondition:** UCM-BILL-1 to UCM-BILL-3 released (4.8.0).

### Goal and expected outcome

The billing surfaces of the kit (account section „Abo", seats, banners, withdrawal, package purchase,
operator surfaces) were written in formal German only and assign team seats by typing an e-mail address or
user id. Maana addresses its users with „du" and assigns seats to members of its own teams. The prototype
`maana/work-orders/assets/MAANA-APP-8-subscription.html` (operator-approved 2026-10-17) shows both.

Expected outcome: an app that runs the kit in informal German sees every billing text in the „du" form; an
app that passes the candidates for a seat gets a list to choose from instead of a free text field; the word
for a seat is „Platz" everywhere.

### Settled decisions (operator, 2026-10-17)

1. **Informal German for every `Billing.*` key.** Each key gets a `de_informal` value next to `de`, following
   the existing kit mechanism (as in `authTranslations.ts`). The formal `de` values stay unchanged except for
   decision 3. Keys without a personal address keep the same text in both.
2. **Seats from a list.** The seat assignment in `SubscriptionSection` accepts an optional list of candidates
   from the app (id and display name). With candidates it shows a select „Teammitglied wählen" and the button
   „Platz vergeben"; people who already hold a seat are not offered. Without candidates the current free text
   field stays, for apps that have no team concept.
3. **„Platz" instead of „Sitzplatz"** in every German value (`Billing.SEATS_ADD` „Platz vergeben",
   `Billing.TEAM_SEATS` „Plätze im Team-Paket", `Billing.ERROR_SEAT_LIMIT` „Alle Plätze sind belegt.", and any
   other key that says „Sitzplatz").

### Scope and acceptance

The `de_informal` values, the candidates option of the seat assignment, the wording change, the CHANGELOG entry
naming the new option. English and the other languages unchanged.

### Non-goals and do-not-touch

The deletion date in `AccessEndedBanner` (it already shows only when the app passes `deletionDate`; Maana does
not pass it), the server contract of seats (dcm), the layout of the account section, all other kit surfaces.

### Risks

A missing `de_informal` value falls back to the formal text, so an informal app shows a mix; the parity test
below catches it. A candidate list that includes people outside the payer's team would let the payer hand out
seats wrongly; the list comes from the app, which owns that rule; the kit only displays it.

### Required tests to write or update

Every `Billing.*` key has a non-empty `de_informal` value, and no informal value contains „Sie", „Ihr" or
„Ihnen" as an address; „Sitzplatz" appears in no German value. `SubscriptionSection` with candidates renders
the select, excludes current seat holders, and calls the existing seat API with the chosen id; without
candidates it renders the text field as before.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-17 („Ja, mach den Nachzug", in the Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all lenses plus `ui_reviewer`. Consumer: MAANA-APP-8
chunk 6 bumps to the released version and passes its team candidates (APP-8 chunk 5 provides the Maana
endpoint that lists them).
