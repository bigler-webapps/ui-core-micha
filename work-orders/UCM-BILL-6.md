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

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes names, shapes and invariants. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only `src/billing/SubscriptionSection.jsx`, `src/billing/WithdrawalSection.jsx`, one new component file `src/billing/TokenOriginTable.jsx`, `src/billing/wire.js` (additive), `src/i18n/billingTranslations.ts`, `src/theme/kitSxRegistry.js` (additive, only for new exported sx objects) and tests (new files `tests/billingOrigins.test.jsx`, `tests/billingPurchases.test.jsx`, `tests/billingOriginsTranslations.test.js`; existing tests only where they pin the old purchases behaviour, see section 3). The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not touch `WithdrawalDialog.jsx` (its calculation and flow are a non-goal), the plan picker, the operator surfaces, the seat assignment (UCM-BILL-5) or how tokens are spent.

### Backend contract (django-core-micha DCM-BILL-6, additive to `me/`; isolate names in `src/billing/wire.js`)

Existing keys stay as they are. New, all optional (an older dcm sends none of them): `tokens.grants[].origin` in `plan | package | trial | credit` (next to the unchanged `source`, `amount`, `remaining`, `expires_at`); `tokens.pool` = absent or `null`, else `{ plan_name, amount, remaining, expires_at }` (`amount` the granted amount, `remaining` the unspent amount, `expires_at` ISO or `null`; present for a team payer and for a seat holder; it is NOT also listed in `tokens.grants`); `seat.payer_name` = a non-empty string (the package owner's name, or the e-mail address when no name is set). Withdrawal list (`GET withdrawal/`, already used by `WithdrawalSection`): `{ purchases: [ { id, kind, plan_key, purchased_at, amount_paid_cents, currency, eligible, reason, withdrawn_at } ] }` with `reason` codes `withdrawal_disabled`, `not_active`, `country_not_eligible`, `business_purchase`, `period_over`, `payment_reference_missing` (empty for an eligible one). (The Orchestrator confirms the exact `tokens.pool` key names with the dcm session before dispatch; if this section differs from the dcm contract, the dcm contract wins and this file is corrected before you start.)

### 1. Balance by origin (new `TokenOriginTable.jsx`, used by `SubscriptionSection`)

Visual spec: `maana/work-orders/assets/MAANA-APP-8-subscription.html`, function `balanceBlock()` and the CSS classes `.grants`, `.meter`, `.exp` (read them). Under the balance a small table: header row "Herkunft" / "verbleibend" / "gültig" (the validity header is hidden on phones), then one block per origin: first line `{Name} · {Betrag} Token` (left), the remaining amount (right, tabular numbers), the validity (secondary text) and a thin bar of the remaining share under the row (remaining divided by the granted amount, clamped to 0..1; no bar when the amount is 0). Wide (from `sm`): three columns `minmax(0, 1fr) auto auto`, the bar spans all columns under the row. Phone (below `sm`): two columns, the validity moves under the row (spanning both columns) and the "gültig" header is not shown. Use the theme only (no literal colours): bar track `action.hover`/divider tone, bar fill `primary.main`, height about 6 px, rounded.
Rows: one per valid grant of `tokens.grants` (in the order the server sends), name by `origin`: `plan` "Kontingent" (reuse key `Billing.OP_GRANT_PLAN`), `package` "Paket" (reuse `Billing.OP_GRANT_PACKAGE`), `credit` "Gutschrift" (new), `trial` "Test-Guthaben" (new); then one row for `tokens.pool` "Team-Pool" (new) when it has the shape above. Validity per row: `expires_at` set -> "verfällt am {Datum}" (`formatDate`), `null` -> "verfällt nicht". Amounts through `formatTokens`; amount and remaining must be non-negative integers, a row with an invalid number or an unknown `origin` is skipped (never "undefined", never an empty row).
Fallback (an older dcm): when ANY grant has no valid `origin`, render exactly today's grants list (read the current block under `Billing.BALANCE`) for all grants and show no pool row; the table appears only when every grant has a valid origin (a list of zero grants with a valid pool shows the table with the pool row alone; zero grants and no pool shows nothing, as today). The balance badge and text above stay unchanged. The table is also shown to a seat holder (pool row) and a team payer.

### 2. Seat payer line

For a seat holder (`me.seat`), under the existing line "Team-Platz bis {Datum}" (`Billing.OP_SEAT_UNTIL`) show "Platz im Team-Paket von {Name}" (new key `Billing.SEAT_PAYER`, secondary text) when `me.seat.payer_name` is a non-empty string; without it (older dcm) nothing extra, today's display.

### 3. All purchases (`WithdrawalSection.jsx`)

Today the section lists only eligible purchases (plus a session receipt after a withdrawal). Now: a section titled "Käufe" (new key `Billing.PURCHASES`) listing EVERY purchase of the withdrawal list, newest first as sent, one row each (visual spec: `purchasesBlock()` of the prototype, rows with a divider): left the plan name (`plans` lookup by `plan_key` as today, else the key) and under it, secondary, "{Kaufdatum} · {Preis}" (`formatDate(purchased_at)` and `formatPrice(amount_paid_cents, language, currency)`); right per state, first matching rule wins: (a) `withdrawn_at` set -> "Widerrufen am {Datum}" (new `Billing.WITHDRAWN_ON`, `formatDate`), no action; (b) `eligible === true` -> the existing button "Vertrag hier widerrufen" (`Billing.WITHDRAWAL_BUTTON`) and "bis {Datum}" (`Billing.WITHDRAWAL_UNTIL`, deadline = purchase date plus 14 days as today), opening the existing `WithdrawalDialog` unchanged; (c) `reason === 'period_over'` -> "Widerrufsfrist abgelaufen" (new `Billing.WITHDRAWAL_PERIOD_OVER`), no action; (d) any other reason or none -> the purchase row without any action and without text. The section renders nothing when the list has no purchases or the list request answers 404 (as today); a failed load keeps today's error alert with retry. The session receipt after a withdrawal in this view (the existing success lines) stays; after a successful withdrawal the list reloads (as today) and the purchase then shows (a). Update the existing tests that pinned "ineligible purchases are not shown" (search `tests/billingWithdrawal*.test.jsx`, `tests/billingAbo*.test.jsx`) to the new rule; keep every other expectation.

### 4. Keys (`billingTranslations.ts`; every new key with `de`, `de_informal`, `en`, `fr`, `sw`; `de_informal` equals `de` unless the German addresses the person; placeholders identical in all languages)

German from the released copy list verbatim: `Billing.ORIGIN_HEADER` "Herkunft", `Billing.VALID_HEADER` "gültig", `Billing.ORIGIN_credit` "Gutschrift", `Billing.ORIGIN_trial` "Test-Guthaben", `Billing.ORIGIN_pool` "Team-Pool", `Billing.EXPIRES_ON` "verfällt am {{date}}", `Billing.NEVER_EXPIRES` "verfällt nicht", `Billing.ORIGIN_LINE` "{{name}} · {{amount}} Token" (en "{{name}} · {{amount}} tokens", fr "{{name}} · {{amount}} jetons", sw "{{name}} · tokeni {{amount}}"), `Billing.SEAT_PAYER` "Platz im Team-Paket von {{name}}", `Billing.PURCHASES` "Käufe", `Billing.WITHDRAWN_ON` "Widerrufen am {{date}}", `Billing.WITHDRAWAL_PERIOD_OVER` "Widerrufsfrist abgelaufen". Reuse the existing `Billing.OP_REMAINING` ("verbleibend"), `Billing.OP_GRANT_PLAN` ("Kontingent"), `Billing.OP_GRANT_PACKAGE` ("Paket"). Natural English, French and Swahili; Swiss spelling ("ss") in German.

### 5. Kit sx convention (enforced by `tests/themeCompleteness.test.js`)

Never an inline `sx` object on a baseline-styled MUI component (`Button`, `Alert`, `Card`, `Paper`, `Chip`, `LinearProgress`, `Divider`, `List*`, `Table*`, ...). Put styles on `Box`, `Stack` or `Typography` (unchecked), or in a top-level `export const NAME_SX = {...}` registered in `src/theme/kitSxRegistry.js` (both the `entry(...)` and the exported-objects list, as the existing billing entries show). Use plain `Box` elements for the grid and the bar so no baseline component is involved.

### Tests to write

`tests/billingOrigins.test.jsx` (mocked `react-i18next` returning keys with interpolated values, `// @vitest-environment jsdom`, like `tests/billingOperatorReview2.test.jsx`): one row per origin with name, amount, remaining and validity text, with and without `expires_at` (both the date text and "verfällt nicht"), the bar width equals the remaining share (assert the style width, and no bar for amount 0), the pool row for a payer and for a seat holder, the rows in server order, an invalid number or an unknown origin is skipped, a list that mixes a grant without `origin` falls back to today's list (assert today's texts and no table, no pool row), no grants with a valid pool shows the pool row alone, no grants and no pool shows nothing, nothing ever contains "undefined" or "NaN", server strings (pool plan name) rendered as text; the seat holder line with and without `payer_name` (blank string counts as absent) and without any new field the display is exactly today's. `tests/billingPurchases.test.jsx`: all purchases listed in server order with plan name, date and price; eligible shows the button and "bis {Datum}" and opens the dialog; withdrawn shows "Widerrufen am {Datum}" and no button; `period_over` shows "Widerrufsfrist abgelaufen" and no button; every other reason (`not_active`, `country_not_eligible`, `business_purchase`, `withdrawal_disabled`, `payment_reference_missing`) shows the row without button and without text; an eligible purchase that has `withdrawn_at` is shown as withdrawn (rule a first); an empty list and a 404 render nothing; a failed load shows the alert and retry; after a successful withdrawal the list reloads and the row shows "Widerrufen am". `tests/billingOriginsTranslations.test.js`: every new key in all five languages with identical placeholders and the released German copy verbatim, no "Sitz" in any German value. Existing billing tests stay green (update only those named in section 3). Run `tests/billing*`, `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and nothing else; read the whole vitest summary including a possible `Errors` line, not only the failures.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-17 („UCM-BILL-6 machen wir noch", in the Maana Expertenchat, session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Dispatch only after DCM-BILL-6 is released and the `tokens.pool` shape is confirmed (asked of the dcm session `local_42cb2f9f-6612-4a4e-9e6a-f1594f9468fa`; correct section "Backend contract" first if it differs). Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` (with the prototype's `balanceBlock()`, `purchasesBlock()`, the CSS of `.grants`/`.meter`/`.exp`/`.item` and the seat line of `status()` inline, point-by-point comparison) and `sec_reviewer`, on the final combined diff, repeated after fixes to code; the prototype is in scope: the rendered comparison against the prototype's account section at 375 px and 1280 px (dev harness entry for the account section with and without the new fields, headless Chrome, a bounded set of images as agreed in the plan). Evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-6`. Minor release 4.10.0 by push to main; the register row is filled in the same push chain after the landing commit. Consumer: Maana bumps with MAANA-APP-9 (or a small follow-up). Report to the Maana Expertenchat session `local_cbfc9d51-5217-42a4-99ba-27a315c854ce` naming one deviation from the Envelope text to confirm: the team-pool row says "verfällt am"/"verfällt nicht" like the other rows (Envelope), where the prototype says "gültig bis" for the pool.
