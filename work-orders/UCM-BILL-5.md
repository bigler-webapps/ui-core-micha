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

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes names, shapes and invariants. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only `src/billing/SubscriptionSection.jsx`, `src/i18n/billingTranslations.ts`, `src/theme/kitSxRegistry.js` (additive, only for new exported sx objects) and tests (new files `tests/billingInformal.test.js`, `tests/billingSeats.test.jsx`; existing tests only where they pin the old wording "Sitzplatz" or the old seat form). The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not touch any other billing component, `src/billing/api.js`, `wire.js`, `src/i18n/uiCoreTranslations.js` (the mechanism that selects `de_informal` already exists: read lines 20-35 of that file to see how a `de_informal` value replaces `de` for informal apps; the value rows look like `'Billing.X': { de: '...', de_informal: '...', en: '...', fr: '...', sw: '...' }`, as in the withdrawal keys of `billingTranslations.ts`).

### 1. Informal German for every `Billing.*` key (`src/i18n/billingTranslations.ts`)

The file has 101 `Billing.*` keys; only the withdrawal keys (21) carry `de_informal` today. Give EVERY key a non-empty `de_informal` value, placed right after its `de` value:
- A key whose German text has no personal address gets `de_informal` identical to `de`.
- A key that addresses the person formally (the words "Sie", "Ihr", "Ihre", "Ihren", "Ihnen", imperative forms such as "Wählen Sie", "Geben Sie ein", formal possessives) gets the "du" form: "Du", "dein", "deine", "dir", "Wähle", "Gib ... ein", and so on. Style of the existing informal values (Swiss spelling, "ss" instead of "ß", natural and short); keep every `{{placeholder}}` identical to the formal text and keep the same sentence structure.
- Do not change `en`, `fr`, `sw`, and do not change any `de` value except for decision 3 below.
- Existing `de_informal` values stay as they are, except where decision 3 applies to them.

### 2. "Platz" instead of "Sitzplatz" in every German value (`de` and `de_informal`)

Exact new German values: `Billing.SEATS_one` `{{count}} Platz`, `Billing.SEATS_other` `{{count}} Plätze`, `Billing.SEATS_ADD` `Platz vergeben`, `Billing.ERROR_SEAT_LIMIT` `Alle Plätze sind belegt.`, `Billing.TEAM_SEATS` `Plätze im Team-Paket`. No German value of any key may contain "Sitz" afterwards (search the whole file).

### 3. Seat assignment from a list (`SubscriptionSection.jsx`)

New optional prop `seatCandidates` (default `undefined`): an array of `{ id, name }` (`id` a user id as number or string, `name` the display text; an optional `email` is shown as secondary text when present). Seat block today (read the file, the block that starts with `access.source === 'team' && seats &&`): list of current seats with "Entfernen", then a text field `Billing.SEAT_USER` and the button `Billing.SEATS_ADD`.
- When `Array.isArray(seatCandidates)` (an empty array counts: the app has a team concept): replace the free text field by a select. Use MUI `TextField select` (so the label and accessible name come from `t('Billing.SEAT_PICK')`) with `displayEmpty`, a first empty option `Teammitglied wählen` (the same `Billing.SEAT_PICK` text) and one option per eligible candidate (`name`, with the email as secondary text when given). The button is `t('Billing.SEATS_ADD')` ("Platz vergeben") and stays disabled while nothing is chosen or a request runs. Choosing and pressing the button calls the EXISTING seat API once: `updateSeat(() => api.addSeat({ userId: chosenId }))` (keep the id type as the app passed it; after success the existing code reloads the seats, clears the choice and the candidate list excludes the new holder).
- Eligible = candidates whose id does not match any current seat holder: exclude every `String(candidate.id)` that equals `String(seat.user_id)` of the loaded `seats` and every `String(holder.user_id)` of `me.team.seat_holders` (compare as strings). Also exclude candidates with a missing id.
- When no seat is free (`me.team` has integer `seats_used` and `seats_total` with `seats_used >= seats_total`), show no form (neither select nor text field) but the text `Billing.ERROR_SEAT_LIMIT` ("Alle Plätze sind belegt.") in quiet secondary text, as the prototype does; this applies with and without candidates.
- When `seatCandidates` is not an array (undefined or null): the free text field and button stay exactly as they are today (apps without a team concept); the "no seat free" text rule above applies there too only when `me.team` provides the numbers.
- Visual reference: `maana/work-orders/assets/MAANA-APP-8-subscription.html`, function `seatsBlock()` (person "Team-Zahlerin", section "Plätze"): a heading row with the title and "n von m Plätzen belegt" (the kit already shows `Billing.OP_SEATS_USED` in the block above; do not duplicate it), the seat rows with name and the action "Entfernen", and below one row `[select (grows)] [Platz vergeben]` on a single line (no wrap at 375 px: the select shrinks, the button keeps its width). Layout stays as the account section's existing one (non-goal: no layout redesign), use theme tokens only.
- New German key (add all five languages, `de_informal` identical): `Billing.SEAT_PICK` de "Teammitglied wählen", en "Choose a team member", fr "Choisir un membre de l’équipe", sw "Chagua mwanatimu".
- Kit sx convention (enforced by `tests/themeCompleteness.test.js`): never an inline `sx` object on a baseline-styled MUI component (`TextField`, `MenuItem`, `Button`, `Alert`, ...); put it in a top-level `export const NAME_SX = {...}` and register it in `src/theme/kitSxRegistry.js` with `entry(...)` following the existing billing entries; `sx` on `Box`, `Stack`, `Typography` is not checked. Run `tests/themeCompleteness.test.js`.

### Tests to write

`tests/billingInformal.test.js`: every `Billing.*` key has a non-empty `de_informal` string; no `de_informal` value contains the whole words "Sie", "Ihr", "Ihre", "Ihren", "Ihnen" (word-boundary regex, case-sensitive for "Sie" at a word start; note "sie" lower case is not an address); placeholders of `de_informal` equal those of `de` for every key; no German value (`de` and `de_informal`) of any key contains "Sitz"; the five exact new values above; `Billing.SEAT_PICK` exists in all five languages; for the keys whose `de` has an address word the `de_informal` differs from `de`; the aggregate with `germanVariant` informal (look at `tests/i18nAggregate.test.js` or `tests/authTranslations*.test.*` for how the variant is resolved) returns the informal text for a sample of keys and the formal text otherwise.
`tests/billingSeats.test.jsx` (mocked `react-i18next` returning keys with interpolated values, `// @vitest-environment jsdom`, like `tests/billingOperatorReview2.test.jsx`): with `seatCandidates` the select renders (accessible name `Billing.SEAT_PICK`) with one option per eligible person and the placeholder; people who hold a seat (from `listSeats` AND from `me.team.seat_holders`, id compared as strings, number versus string) are not offered; choosing a person and pressing `Billing.SEATS_ADD` calls `api.addSeat` exactly once with `{ userId: <that id> }` and a double click does not call twice; the list is reloaded and the new holder disappears from the options; the button is disabled with no choice; an empty candidate array renders the select with only the placeholder; without `seatCandidates` (undefined) the text field `Billing.SEAT_USER` renders as before and an e-mail still calls `addSeat({ email })`; with no free seat (`seats_used >= seats_total`) neither form appears and `Billing.ERROR_SEAT_LIMIT` is shown, with and without candidates; a 409 from `addSeat` shows `Billing.ERROR_SEAT_LIMIT`, a 400 `Billing.ERROR_SEAT_USER`; names with HTML characters render as text. Existing billing tests stay green (update only the ones that pinned "Sitzplatz"). Run `tests/billing*`, `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and nothing else; read the whole vitest summary including a possible `Errors` line, not only the failures.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-17 („Ja, mach den Nachzug", in the Maana Expertenchat, session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` (against the seats block of `maana/work-orders/assets/MAANA-APP-8-subscription.html`, `seatsBlock()`, with its markup inline) and `sec_reviewer`, on the final combined diff, repeated after fixes to code; evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-5`; dev-harness check of the seat block with and without candidates at 375 px and 1280 px. Minor release 4.9.0 by push to main; the register row is filled in the same push chain after the landing commit. Consumer: MAANA-APP-8 chunk 6 (App session); report the released version to the Maana Expertenchat session `local_cbfc9d51-5217-42a4-99ba-27a315c854ce`.
