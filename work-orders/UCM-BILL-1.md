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

### Scope decision during implementation (operator, 2026-10-16)

The DCM-BILL-1 API that exists today serves the plan picker, the checkout and portal links, the account state, the token balance and the team seats. It has no operator overview endpoint, no free-access switch endpoint (operator commands only), no plan name, term grants, token expiry or seat-holder names. The operator chose: build now what the API supports (decisions 1 to 4 and the tokens display of 3, without the term grant and expiry details), and register the operator overview and the switch „Ohne Abo freigeschaltet“ (decision 5) as `UCM-BILL-2`, to be built when DCM provides the endpoints. The deletion date of decision 4 shows only when a host passes one: the amended DCM-BILL-1 deletes nothing automatically.

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

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). The Orchestrator owns `package.json`, the version, the lockfile, `CHANGELOG.md`, `README.md` and the register; do not touch them. Do not edit existing tests (add new files); the only existing files you may edit are `src/index.js` (exports), `src/i18n/uiCoreTranslations.js` (spread the new bundle), `tests/i18nAggregate.test.js` (register the new bundle exactly as `chatTranslations` is registered there) and `src/theme/kitSxRegistry.js` (registry entries). Money is involved: every state comes from the server response, never from local guesswork; when a response is missing or malformed, show nothing that implies access or a balance.

**Money and trust rules (binding):**
- The surfaces never decide access. `access.status` (`active` | `read_only`), `access.source` (`subscription` | `team` | `free` | `null`) and `tokens.balance` come from `GET me/`; render exactly those. An unknown status or a missing `access` object renders the neutral error notice, not an "active" look.
- The checkout and portal calls return `{ url }`. Navigate only to a string that starts with `https://` (otherwise show the generic error); navigation goes through an injectable `redirect(url)` prop whose default is `window.location.assign`, so tests can observe it.
- No plan prices, plan names or token numbers are hard-coded: they all come from the plans the server returns or from props.
- No secrets, no tokens or ids in text the user did not already see; never log.

**Scope decision (operator, 2026-10-16):** this order builds what the DCM-BILL-1 API supports today: plan picker, account section "Abo", balance badge, cost preview, banner for ended access. The operator overview and the "Ohne Abo freigeschaltet" switch are split off as `UCM-BILL-2` (no API for them yet). Do not build them.

**DCM-BILL-1 API (fixed shapes; isolate them in ONE module `src/billing/wire.js`, like `src/chat/wire.js`).** Base path from an `apiBase` option, default `/api/billing/`; HTTP goes through `src/auth/apiClient` exactly like `src/chat/api.js` (default export `apiClient`; every function returns `response.data`):
- `GET me/` -> `{ access: { status, source, ends_at|null }, tokens: { balance: int }, plans: [ { key, kind, name, amount_cents, token_allowance, interval?, term_months?, seats?, tokens? } ] }`. `kind` is `subscription` (has `interval`: `month` | `year`), `team_package` (has `term_months`, `seats`) or `token_package` (has `tokens`); `token_allowance` is tokens granted per term (0 when none). Amounts are US cents; the currency is USD.
- `POST checkout/` body `{ plan_key }` -> `{ url }`; errors `400 {detail:'unknown_plan'}`, `502 {detail:'checkout_unavailable'}`, `401` unauthenticated.
- `POST portal/` -> `{ url }`; errors `404 {detail:'no_customer'}`, `502 {detail:'portal_unavailable'}`.
- `GET team/seats/` -> `{ seats: [ { user_id } ] }` for the owner of an active team package; `404 {detail:'no_active_team'}` for everyone else. `POST team/seats/` body `{ user_id }` or `{ email }` -> `201 { user_id }`; errors `400 invalid_user`, `409 seat_limit`. `DELETE team/seats/` body `{ user_id }` or `{ email }` -> `{ removed: bool }`.
- The server does not return the name of the current plan, term grants or token expiry, or a seat holder's name: show only what exists (the source label and the end date), never invent the rest.

**Files to create (all under `src/billing/` unless noted):**
1. `wire.js`: URL builders (`billingApiUrls(base)`), constants for the statuses, sources, kinds and the error detail codes above.
2. `api.js`: `createBillingApi(overrides = {}, { apiBase } = {})` and `defaultBillingApi`, functions `getMe`, `startCheckout(planKey)`, `openPortal()`, `listSeats()`, `addSeat({ userId, email })`, `removeSeat({ userId, email })`; `{ ...defaults, ...overrides }` like `createChatApi`, so overriding one keeps the others. `DELETE` sends its JSON body through axios' `data` option.
3. `useBilling.js`: `useBilling(api)` -> `{ state: 'loading' | 'ready' | 'error', me, reload }`; loads `getMe` on mount, reloads on `reload()`, ignores a late response after unmount, and treats a response without a well-formed `access` object as `error`.
4. `format.js`: `formatPrice(amountCents, language)` (USD via `Intl.NumberFormat`) and `formatTokens(count, language)` (grouped digits via `Intl.NumberFormat`); `formatDate(iso, language)`. The language comes from `useTranslation().i18n.language`.
5. `TokenBalanceBadge.jsx`: a small `Chip` (props `balance`, `lowBelow` optional number: warning colour below it, `sx`); text `t('Billing.BALANCE', { tokens })`, accessible name the same. `balance` not a finite number: renders nothing.
6. `TokenCostPreview.jsx`: props `cost` (tokens of the action), `alternatives` optional `[{ label, cost }]` (app text such as "with translation"), `balance`; renders for example "47 Token, mit Übersetzung 71 · Guthaben 1'153" using the numbers formatted for the language; when `balance < cost` the whole line takes the error colour and shows the extra text `Billing.NOT_ENOUGH`. Also exports nothing else; the app fills in `cost`.
7. `AccessEndedBanner.jsx`: persistent `Alert` (severity warning, `role="status"`) with the text "Abo beendet – Projekte sind schreibgeschützt. Export bleibt möglich." (`Billing.ENDED_TITLE`), the end date when `endedAt` is given (`Billing.ENDED_ON`), a deletion date line only when the optional `deletionDate` prop is given (`Billing.DELETION_ON`; the server does not send one today, so by default none shows), and a button "Abo erneuern" (`Billing.RENEW`) calling `onRenew`.
8. `PlanPicker.jsx`: props `plans` (the server's plan array), `kinds` (default `['subscription','team_package']`), `api`, `redirect`, `describePlan(plan)` optional (returns extra plain-words ReactNode for a plan, e.g. the hours of transcription the app can convert), `onError` optional. Behaviour: subscription plans are filtered by a monthly/yearly toggle (`Billing.MONTHLY` / `Billing.YEARLY`, a `ToggleButtonGroup`, shown only when both intervals exist among the subscription plans); team packages list seats and term in months; each plan is a selectable card (radio semantics, `aria-pressed`/`aria-checked`), with name, price (`formatPrice`, with `/ Monat` or `/ Jahr` for subscriptions: `Billing.PER_MONTH`, `Billing.PER_YEAR`), and "N Token inklusive" (`Billing.TOKENS_INCLUDED`) when `token_allowance` > 0. A "Weiter zur Bezahlung" button (`Billing.CONTINUE_TO_PAYMENT`) is disabled until a plan is selected; it calls `api.startCheckout(key)`, then `redirect(url)` for an `https://` url; on any failure it shows the generic error notice (`Billing.ERROR_CHECKOUT`) and keeps the selection. While the call runs the button is busy and cannot fire twice. The prototype `maana/work-orders/assets/MAANA-APP-1-projects.html` (the steps "Plan" and "Bezahlung": CSS around lines 23-34, texts and markup around lines 80-111) is the visual reference for the card grid (two columns wide, one column narrow), selected state and summary; all colours, radii and type come from the MUI theme, never literals.
9. `SubscriptionSection.jsx` (the account section "Abo"): props `api`, `redirect`, `onRenew` (called by the ended state's renew button and the "Abo erneuern" action; if absent the section shows its own `PlanPicker` for renewal), `describePlan`, `sx`. It loads `useBilling(api)` and renders by server state:
   - loading: a neutral progress state; error: the generic error notice with a retry button (`Billing.ERROR_LOAD`, `Billing.RETRY`);
   - `active` + source `subscription`: heading "Abo", the line "Persönliches Abo" (`Billing.SOURCE_SUBSCRIPTION`), the term end date (`Billing.ACTIVE_UNTIL`), and a "Abo verwalten" button (`Billing.MANAGE`, text beside it: cancel, payment method, receipts) that calls `api.openPortal()` and redirects (`https://` only; `no_customer` / `portal_unavailable` show `Billing.ERROR_PORTAL`);
   - `active` + source `team`: first try `api.listSeats()`: a `200` means this person pays for the team: show the seat holders (`user_id` only, since no names exist) with a remove button each, the capacity from the matching team plan if one can be derived (do not guess: when it cannot, omit it), and an add form (email or id, `Billing.SEATS_ADD`); handle `409 seat_limit` with `Billing.ERROR_SEAT_LIMIT` and `400 invalid_user` with `Billing.ERROR_SEAT_USER`; a `404 no_active_team` means a team member: show "Platz in einem Team-Paket" (`Billing.SOURCE_TEAM`) and the end date;
   - `active` + source `free`: "Ohne Abo freigeschaltet" (`Billing.SOURCE_FREE`), no end date, no portal button;
   - `read_only`: the `AccessEndedBanner` (with `endedAt` = `access.ends_at`) and the plan picker for renewal;
   - in every state with a loaded `me`: the token balance (`TokenBalanceBadge` plus the number in words, `Billing.BALANCE_LABEL`) and a "Paket kaufen" section (`Billing.BUY_PACKAGE`) listing the `token_package` plans with price and token count, each with a buy button that calls `startCheckout` and redirects.
10. `kitSxRegistry` entries: this repository fails its build (`tests/themeCompleteness.test.js`) on an inline `sx` object on a baseline-styled MUI component (Alert, Button, Chip, Paper, Card, IconButton, Dialog, ...). For any `sx` on such a component export a top-level `export const NAME_SX = {...}` from the component module and register it in `src/theme/kitSxRegistry.js` (these components live in the main entry, so they join `KIT_COMPONENT_SX_REGISTRY`, import them there like the other main-entry components, add each constant to the `SX_EXPORTS` object and an `entry('Billing.xxx', 'MuiAlert', NAME_SX)` line); never repeat a value the theme already sets (button min height, text transform). `sx` on `Box`, `Stack` and `Typography` is not checked. Run `tests/themeCompleteness.test.js` as part of your tests.
11. `src/i18n/billingTranslations.ts`: ONE exported const `billingTranslations`, keys `Billing.XXX` (UPPER_SNAKE like `messagingTranslations`), each `{ de, en, fr, sw }`, plurals with `_one`/`_other` where a count is shown; German is the formal variant ("Sie"). All visible text above is German source copy for de; write natural en/fr/sw. Register it in `src/i18n/uiCoreTranslations.js`, export it from `src/index.js` next to the other bundles and add it to `tests/i18nAggregate.test.js` exactly as `chatTranslations` is.
12. `src/index.js`: export `PlanPicker`, `SubscriptionSection`, `TokenBalanceBadge`, `TokenCostPreview`, `AccessEndedBanner`, `useBilling`, `createBillingApi`, `defaultBillingApi`, `billingTranslations` (main entry; no optional peer is needed).

**Tests to write (new files `tests/billing*.test.jsx`, `tests/billingApi.test.js`, `tests/billingTranslations.test.js`; imitate `tests/chatWorkspace.test.jsx` and `tests/chatApi.test.js`; `react-i18next` mocked so `t` returns the key plus interpolated values where a test needs them, or use the real translations through a real i18next as `tests/chatDriverNames.test.jsx` does for text checks):**
- API client: URLs and bodies of every call, overriding one function keeps the others, `DELETE` body.
- Plan picker variants: only subscriptions (no toggle when one interval), both intervals (toggle filters the cards), team packages (seats and term shown), token packages excluded by default and included with `kinds`, nothing selected -> button disabled, selection sets the pressed state.
- Checkout redirect: selecting a plan and continuing calls `startCheckout` with the plan key once, then `redirect` with the returned `https://` url; a non-`https` url (for example `javascript:alert(1)` or `http://x`) is NOT followed and shows the error; a rejected call shows the error and keeps the selection; the button cannot fire twice while busy.
- Account section states: loading, error with retry, active subscription (end date, portal button redirects; `no_customer` shows the error), team payer (seat list, add, remove, `seat_limit`, `invalid_user`), team member (`404 no_active_team`), free (no end date, no portal), ended (banner with the date, renew shows the picker, `onRenew` called when given), malformed `me` (no `access`) -> error, never an active look.
- Balance and cost preview: badge number and low state, preview line with and without alternatives, insufficient balance state, non-finite values render nothing / safe text.
- Banner: text, date, optional deletion date only when given, renew button.
- i18n: every key of `billingTranslations` exists in all four languages with the same `{{placeholders}}` (follow `tests/chatTranslations.test.js`), and the aggregate test still passes.
- Export check: the new names are exported from `src/index.js` (follow `tests/chatExports.test.js`).
Run `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and your new tests; do not run anything else.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: the operator, in the Orchestrator session 2026-10-16 (answer "Teil jetzt, Rest registrieren": build now what the DCM-BILL-1 API supports, register the rest as UCM-BILL-2). Tier 3: all review lenses (envelope, regression, duplication, tests), `sec_reviewer` (redirect and money states) and `ui_reviewer`; one review on the final combined diff, repeated after any fix to code. Evidence: a dispatched `ci.yml` run on `ci-test/UCM-BILL-1`. Minor release 4.4.0 by push to main after the register row; report to the Expertenchat. Known gaps for the DCM side (to the Expertenchat in the report): the plan name, term grants and token expiry, seat-holder names and the operator endpoints are not in the API.
