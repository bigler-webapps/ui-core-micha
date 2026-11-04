# UCM-BILL-11 — Contract status, cancellation and withdrawal declarations, full-refund withdrawal UI

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`) billing UI for money and legal declarations.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version (4.31.0).
**Feature Envelope:** this is the shared UI delivery of `maana` `work-orders/MAANA-APP-40.md` Part A (authoritative WHAT/WHY; Gate #1 by the operator 2026-11-04). The server side is `django-core-micha` `DCM-BILL-8`; its endpoint contract is quoted in Part B and is binding here.

### Goal and expected outcome

The shared billing UI shows a contract's phase and next charge, lets the owner cancel ("Verträge hier kündigen" / "Cancel contracts here", confirmation "Jetzt kündigen" / "Confirm cancellation"), offers a public declaration form for cancellation and withdrawal that works without login and ends in a saveable acknowledgement, and shows the full-refund withdrawal amounts and refund status without any deduction breakdown. Apps on the legacy (prorated) policy see exactly today's withdrawal UI.

### Settled decisions

1. New behaviour is driven by server data: `policy: "full"` on a withdrawal row/preview switches the dialog to the full-refund view; a `contract` object in `me` or `contracts/` switches on the contract block. No new app-level props are required for existing consumers; new components are opt-in exports.
2. Deadlines and eligibility always come from the server; the client-side "purchase + 14 days" calculation is used only for legacy rows without `deadline`.
3. Refund status is shown as the server reports it; `requested`/`pending`/`requires_action`/`failed` are never shown as paid.
4. Required labels (DE / EN): `Verträge hier kündigen` / `Cancel contracts here`; `Jetzt kündigen` / `Confirm cancellation`; `Vertrag widerrufen` / `Withdraw from contract`; `Widerruf bestätigen` / `Confirm withdrawal`. The existing legacy key `Billing.WITHDRAWAL_BUTTON` keeps its text for legacy rows.
5. Reuse existing MUI patterns of `SubscriptionSection`, `WithdrawalDialog` (state machine, double-submit guard) and `format.js`. No theme or token changes.

### Scope

`src/billing/api.js`, `wire.js`, `SubscriptionSection.jsx`, `WithdrawalSection.jsx`, `WithdrawalDialog.jsx`, `PlanPicker.jsx`; new `ContractSummary.jsx`, `CancellationDialog.jsx`, `DeclarationForm.jsx`, `DeclarationConfirm.jsx`; `src/i18n/billingTranslations.ts`; `src/index.js` exports; tests in `tests/`.

### Non-goals and do-not-touch

Operator billing components, seats, token packages purchase, checkout attempt flow, any consuming app, theme, `scratchpad/` (foreign, untracked). No routing: the public pages are components an app mounts.

### Risks

Changing shared copy for other consumers (Cinevia): only add keys, change no existing key text. Public form must not echo server data that reveals account existence (it only echoes what the user typed).

### Required tests to write

In `tests/` (new `billingContracts.test.jsx`, `billingDeclarations.test.jsx`; extend the withdrawal tests):

1. ContractSummary: initial phase shows paid-through date, next charge amount/date/allowance of the continuation; continuation phase; scheduled cancellation date; refund rows with each status, pending never rendered as paid.
2. CancellationDialog: opens from "Cancel contracts here", ordinary submit with no date sends no date, later date and extraordinary (reason required) send their fields, double click sends once, error and retry, success shows server effective date or "pending review" when none.
3. DeclarationForm (public): both kinds, required-field validation and length limits, submits once, shows the acknowledgement with reference and receipt time, the save action produces a text file containing the declaration; network failure keeps the typed data and allows retry; renders in DE and EN.
4. DeclarationConfirm: valid token → success; invalid token → generic error; no double post.
5. Withdrawal full policy: row uses the server deadline and the new label; preview shows paid, previously refunded, refund amount and no time/token breakdown; after confirm shows refund status from the response; legacy rows/previews render exactly as before (existing tests stay green unchanged).
6. PlanPicker: an annual plan with `continuation` shows both phases (first-year price/allowance, then monthly price/allowance, monthly cancellable).
7. Translations: every new key has `de`, `de_informal`, `en`, `fr`, `sw` with matching placeholders (the existing family tests enforce this for `WITHDRAWAL_*`; apply the same to the new families).

## Part B — Implementation map (implementer)

### Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate. Do not edit `CHANGELOG.md`, `package.json`, the version, `dist/` or `scratchpad/`.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

Work from this package; do not explore broadly from scratch; open only the named files to verify.

### Target working directory

`C:\Users\Micha Bigler\Documents\webapps\ui-core-micha`. Run your tests with `npx vitest run tests/<file>` (already installed; do not install anything).

### Server contract (DCM-BILL-8, binding; all paths under the app's billing base, default `/api/billing/`)

- `GET contracts/` → `{contracts: [{reference, kind, plan_key, plan_name, phase: "initial"|"continuation"|"none", status: "active"|"cancellation_scheduled"|"ended"|"withdrawn", started_at, initial_term_end, current_period_end, next_charge: {amount_cents, currency, date, token_allowance} | null, cancel_effective_at, withdrawal: {eligible, reason, deadline}, declarations: [{reference, kind, status, received_at, effective_at}], refunds: [{status: "pending"|"requested"|"succeeded"|"failed"|"requires_action"|"cancelled", amount_cents, currency, due_by}]}]}`. 404 when the app has no contract support → render nothing.
- `POST contracts/<reference>/cancel/` `{cancellation_type: "ordinary"|"extraordinary", requested_end_date?: "YYYY-MM-DD", reason?: string}` → `{declaration: {reference, kind, status, received_at, effective_at}}`. Errors `{code}`: 400 `invalid_request`, 404, 409 `already_cancelled`.
- `POST contracts/<reference>/withdraw/` `{confirm: true}` → `{status, declaration_reference, refund_status, refund_cents, withdrawn_at}`.
- `GET public/declarations/csrf/` → `{}` (sets the CSRF cookie); `POST public/declarations/` `{kind: "cancellation"|"withdrawal", name, email, contract_hint, cancellation_type?, requested_end_date?, reason?, message?}` → 201 `{reference, kind, received_at, submitted: {...}, status: "received"}`; 400 `{code: "invalid_request", fields: [names]}`; 429 throttled. Limits: name ≤200, email ≤254, contract_hint ≤200, reason ≤2000 (required for extraordinary), message ≤2000.
- `POST public/declarations/confirm/` `{token}` → `{declaration: {...}}`; 400 `{code: "invalid_token"}`.
- Existing withdrawal endpoints: for `policy: "full"` purchases, list rows add `deadline` and `policy`; preview returns `{policy: "full", eligible, reason, deadline, amount_paid_cents, refunded_cents, refund_cents, currency}`; POST returns `{status, declaration_reference, refund_status, refund_cents, withdrawn_at}`. Legacy rows unchanged.
- `me/` adds `contract` (one contract object as above, or null). Plan rows of an annual plan with continuation add `continuation: {amount_cents, interval: "month", token_allowance}`; continuation plans themselves are not listed.

### Seams (verified at `main@1000f5c`)

- `src/billing/api.js` 13-41: methods are thin `axios` calls built from `wire.js` `billingApiUrls`; add `listContracts`, `cancelContract(reference, body)`, `withdrawContract(reference)`, `primeDeclarationCsrf()`, `submitDeclaration(body)`, `confirmDeclaration(token)`; encode references with `encodeURIComponent` like `previewWithdrawal` does. Public calls use the same axios instance (it already sends the CSRF header from the cookie).
- `src/billing/SubscriptionSection.jsx` (active branch ~104-163): render `ContractSummary` when `me.contract` exists, with the "Cancel contracts here" button opening `CancellationDialog`; after success call `reload()`. Keep the portal button and every existing block.
- `src/billing/WithdrawalSection.jsx` 10-15 (client deadline), 59-77 (rows): use `purchase.deadline` when present; label `Billing.WITHDRAW_CONTRACT` for `policy === "full"` rows.
- `src/billing/WithdrawalDialog.jsx` 8-20 (`describeCalculation`), 81-87: for `preview.policy === "full"` render paid / previously refunded / refund lines and no `WITHDRAWAL_CALCULATION`; confirm button `Billing.WITHDRAWAL_CONFIRM` (already "Widerruf bestätigen"); success view shows refund status text per status. Keep the guard ref and state machine.
- `src/billing/PlanPicker.jsx` 50-59: add the continuation line under the annual card when `plan.continuation` exists.
- `DeclarationForm.jsx`: props `{ api, kind, defaultKind, onSubmitted, legalNotice }` — a kind switch (cancellation/withdrawal) unless `kind` fixed; fields per contract above; cancellation type radio (ordinary default), optional date, reason shown and required only for extraordinary; submit primes CSRF once then posts; acknowledgement view with reference, receipt time (`formatDateTime`), the submitted values, and a "save" button that downloads a `.txt` acknowledgement via `Blob` + object URL (and a print button). `legalNotice` is an optional node the app passes (seller/recipient text).
- `DeclarationConfirm.jsx`: props `{ api, token, onDone }`, posts once on mount-confirm click (explicit button, not auto-post).
- `src/i18n/billingTranslations.ts`: new key families `Billing.CONTRACT_*`, `Billing.CANCEL_*`, `Billing.DECLARATION_*`, `Billing.REFUND_STATUS_*`, plus `Billing.WITHDRAW_CONTRACT`, `Billing.WITHDRAWAL_PAID_TOTAL`, `Billing.WITHDRAWAL_REFUNDED_BEFORE`, `Billing.PLAN_CONTINUATION`. German formal "Sie" in `de`, "du" in `de_informal`. No existing key text changes.
- `src/index.js` 76-90: export `ContractSummary`, `CancellationDialog`, `DeclarationForm`, `DeclarationConfirm`.

## Part C — Orchestrator only

STOP — if you are the implementer reading this work order as your own specification: stop at this line. Everything below describes what the Orchestrator does after you finish. You do none of it.

Execution directive: codex/gpt-6-luna via CLI, cwd ui-core-micha root, banner read back. Dispatched in parallel with DCM-BILL-8 (contract fixed above, disjoint repos).

Review routing (Tier 3): lenses envelope, regression, duplication, tests + ui_review + sec_review, concurrent, codex/gpt-6-luna read-only.

Verification: `npx vitest run tests/billing*` (scoped), build, CHANGELOG `[4.31.0]` and version by the Orchestrator; release by push to `main`; verify publication before Maana pins it.
