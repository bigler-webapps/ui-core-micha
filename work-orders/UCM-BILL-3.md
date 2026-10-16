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

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Builds on UCM-BILL-1 (released as 4.4.0): read `src/billing/SubscriptionSection.jsx`, `src/billing/api.js`, `src/billing/wire.js`, `src/billing/format.js`, `src/billing/useBilling.js`, `src/billing/safeUrl.js` and `tests/billingSubscriptionSection.test.jsx` first, and follow their style. The Orchestrator owns `package.json`, the version, the lockfile, `CHANGELOG.md`, `README.md` and the register; do not touch them. Do not edit existing tests except where a change to `SubscriptionSection` makes an existing assertion obsolete (say so); put new tests in new files. Another order (UCM-CHAT-6) works in `src/chat/**` at the same time: do not touch `src/chat/**`, `src/i18n/chatTranslations.ts` or any `tests/chat*`.

**Money and legal rules (binding):** a withdrawal ends access and triggers a refund. The confirmation step is mandatory: nothing is sent to the server before the person confirms in the dialog; the confirm action is sent exactly once (busy guard, double click, Enter key). The button must be visible for every purchase the server marks eligible and for no other; never decide eligibility, the amount or the calculation locally (the one local computation allowed is the last day, below). A failed call must never look like a success.

**DCM-BILL-3 API (django-core-micha 3.5.0, `docs/design/billing.md`, section "EU/EEA consumer withdrawal"; isolate the shapes in `src/billing/wire.js`). Base path `apiBase`, default `/api/billing/`; HTTP through `src/auth/apiClient` like the existing calls:**
- `GET withdrawal/` -> `{ purchases: [ { id, kind: 'subscription'|'team_package'|'token_package', plan_key, purchased_at (ISO), amount_paid_cents, currency (e.g. 'usd'), eligible (bool), reason (code or empty), withdrawn_at (ISO|null) } ] }`, newest first. `reason` codes: `withdrawal_disabled`, `not_active`, `country_not_eligible`, `business_purchase`, `period_over`.
- `GET withdrawal/<id>/preview/` -> `{ eligible, reason, amount_paid_cents, currency, time_share_cents, token_share_cents, used_cents, refund_cents, calculation }`. `calculation` is an English debug-style line: do NOT display it; build the localized explanation from the numbers.
- `POST withdrawal/<id>/` body `{ confirm: true }` -> `{ already_withdrawn: bool, refund_cents, currency, withdrawn_at (ISO), calculation }`; errors `400 {detail:'confirmation_required'}`, `404` (not the user's purchase), `409 {code}` with an ineligibility reason, `502 {code:'withdrawal_unavailable'}`; `401` unauthenticated. A repeated confirmation returns the stored result with `already_withdrawn: true` (show the same success state).
- The server does not send the deadline: the last day is `purchased_at` plus 14 days, shown as a date (use the existing UTC `formatDate`); the server decides eligibility, the date is only shown text.

**What to build:**
1. `src/billing/wire.js` + `src/billing/api.js`: URL builders and `listWithdrawals()`, `previewWithdrawal(id)`, `confirmWithdrawal(id)` (the last sends `{ confirm: true }`), same override pattern as the existing api (`{ ...defaults, ...overrides }`).
2. `src/billing/format.js`: `formatPrice(amountCents, language, currency = 'USD')` gets an optional currency argument (uppercased; unknown or invalid code falls back to `USD`; existing callers keep working), and a new `formatDateTime(iso, language)` (long date and short time in the viewer's time zone; empty string for an invalid value).
3. `src/billing/WithdrawalDialog.jsx`: a MUI `Dialog` (`aria-labelledby` title) for one purchase. On open it calls `previewWithdrawal(purchase.id)` once. States: loading (progress), error (`Billing.WITHDRAWAL_PREVIEW_ERROR`, a retry button), not possible (preview `eligible: false`: `Billing.WITHDRAWAL_NOT_POSSIBLE`, only a close button, no confirm), ready, submitting, success. Ready shows the title "Vertrag widerrufen?" (`Billing.WITHDRAWAL_TITLE`), "Mit dem Widerruf endet der Zugang aus diesem Kauf sofort, und das Abo verlängert sich nicht." (`Billing.WITHDRAWAL_EFFECT`), "Du erhältst {Betrag} zurück." (`Billing.WITHDRAWAL_REFUND`, amount via `formatPrice(refund_cents, language, currency)`), and "Berechnung: {Erklärung}" (`Billing.WITHDRAWAL_CALCULATION`) with the explanation composed from the numbers by a pure helper `describeCalculation(preview, t, language)` exported from the module: paid amount, the time share, the token share, the larger of the two as the used amount, and the refund (token packages have only a token share: omit a zero time share; a refund of zero shows "Du erhältst keine Rückzahlung" via `Billing.WITHDRAWAL_REFUND_NONE`). Buttons "Widerruf bestätigen" (`Billing.WITHDRAWAL_CONFIRM`) and "Abbrechen" (`Billing.WITHDRAWAL_CANCEL`). Confirm calls `confirmWithdrawal(id)` exactly once (disabled and busy while the request runs; a guard ref also blocks a second call in the same tick); on success it shows "Widerruf eingegangen" (`Billing.WITHDRAWAL_DONE`) and "Eingegangen am {Datum, Uhrzeit}. Eine Bestätigung ist per E-Mail unterwegs; die Rückzahlung folgt innert 14 Tagen." (`Billing.WITHDRAWAL_DONE_DETAIL`, the date from the response's `withdrawn_at`), calls `onWithdrawn(result)` once, and offers only a close button. A `409` shows `Billing.WITHDRAWAL_NOT_POSSIBLE`, any other failure `Billing.WITHDRAWAL_ERROR` with the confirm button usable again (the server makes a retry safe). Cancel and closing the dialog before confirming send nothing. While submitting the dialog cannot be dismissed by backdrop or Escape.
4. `src/billing/WithdrawalSection.jsx`: props `api`, `plans` (the `me.plans` array, to show a plan's name by `plan_key`; fall back to the key), `onWithdrawn`, `sx`. It loads `listWithdrawals()` once on mount (and reloads after a successful withdrawal). It renders ONLY the purchases with `eligible: true` and `withdrawn_at` null, one row each: the plan name, the purchase date, "bis {Datum}" (`Billing.WITHDRAWAL_UNTIL`) and the button "Vertrag hier widerrufen" (`Billing.WITHDRAWAL_BUTTON`) opening the dialog for that purchase. A purchase the person just withdrew shows the success message in place of its row for the rest of the session (kept in component state). Ineligible purchases are not shown and no reason is explained. A `404` from the list (an older server without the feature) renders nothing, without an error; any other failure renders a small notice `Billing.WITHDRAWAL_LOAD_ERROR` with a retry button. With no eligible purchase the section renders nothing at all (no heading).
5. `src/billing/SubscriptionSection.jsx`: render `<WithdrawalSection api={api} plans={me.plans} onWithdrawn={reload} />` inside the loaded states (active and read_only) after the token/package area, behind a new optional prop `withdrawal` (default `true`; `false` turns the section off and keeps the request away for hosts on an older dcm). `reload` is the `useBilling` reload, so the access state refreshes after a withdrawal. Nothing else in the section changes; its existing tests must stay green (they inject an `api` without the new functions: treat a missing `listWithdrawals` as "feature unavailable" and render nothing, so those tests need no change).
6. `src/i18n/billingTranslations.ts`: add every `Billing.WITHDRAWAL_*` key used above (UPPER_SNAKE like the existing keys), `{ de, en, fr, sw }`, `{{placeholders}}` identical in all four. German: the kit has a formal `de` and an optional `de_informal` (see how `src/i18n/authTranslations.ts` or `userMenuTranslations.ts` use `de_informal`, and `createUiCoreTranslations`). The Envelope's copy list is the informal "du" text: put it verbatim into `de_informal`, and write the formal "Sie" version into `de` ("Sie erhalten {Betrag} zurück." and the same for the other lines that address the person). Export the new components in `src/index.js`: `WithdrawalSection`, `WithdrawalDialog`.
7. sx convention: `tests/themeCompleteness.test.js` fails on an inline `sx` on a baseline-styled MUI component (Dialog parts, Button, Alert, Paper, Card, IconButton...). Export a top-level `NAME_SX` constant per use, register it in `src/theme/kitSxRegistry.js` (import it, add it to `SX_EXPORTS`, add an `entry('Billing.xxx','MuiAlert',NAME_SX)` line), and do not repeat theme values. `sx` on `Box`, `Stack`, `Typography` is not checked.

**Tests to write (new files `tests/billingWithdrawal*.test.jsx`; imitate `tests/billingSubscriptionSection.test.jsx` and `tests/billingHardening.test.jsx`):**
- Section: shown only for `eligible` purchases that are not withdrawn, with plan name, date and the "bis {Datum}" deadline (assert the exact date computed from `purchased_at` + 14 days), one button per purchase; ineligible and already withdrawn purchases are absent; nothing at all (no heading) when none is eligible; `404` from the list renders nothing and no error; another failure shows the notice and retry works; a missing `listWithdrawals` renders nothing.
- Dialog: opening calls `previewWithdrawal` once; the refund amount and the composed calculation (time share, token share, larger of both, refund; token package without time share; refund zero) are shown; nothing is sent to the confirm endpoint before confirming; confirm calls `confirmWithdrawal` exactly once even on a double click and while pending; cancel and closing send nothing; success state shows the done text with the date and calls `onWithdrawn` once; `already_withdrawn: true` shows the same success state; `409` and preview `eligible:false` show the not-possible text and no confirm button; a failed confirm (502) shows the error and the confirm button works again; a failed preview shows the error and retry.
- Integration in `SubscriptionSection`: with eligible purchases the button appears in active and read_only states; `withdrawal={false}` makes no `listWithdrawals` call; after a successful withdrawal `getMe` is called again.
- Helpers: `formatPrice` with a currency argument and its fallback, `formatDateTime`, `describeCalculation`.
- i18n: every key in all four languages with identical placeholders (extend the existing translation test pattern), aggregate test still passes, export check for the two new components.
Run `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and the billing tests; nothing else.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-16 (in the Maana Expertenchat, session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). After DCM-BILL-3 (landed in django-core-micha 3.5.0, `8bffe06`). Tier 3: all lenses, `sec_reviewer`, `ui_reviewer`; one review on the final combined diff, repeated after any fix to code. Evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-3`. Minor release 4.5.0 by push to main, register row, `SHARED_CAPABILITIES.md` note, report to the Expertenchat (the server's `calculation` line is English and not display-ready; no deadline field; the purchase list has no plan name).
