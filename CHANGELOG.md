# Changelog

## 4.23.0 - UCM-CHAT-10

`ChatWorkspace` (and `ChatThread`) accept an optional `renderTurnError({ turn, chat, retry })`. For a failed or
cancelled turn with an error code, a returned node replaces the generic "answer could not be completed" alert; `null`
(or no prop) keeps the generic alert. `retry` re-sends the turn and is `undefined` where the thread is read-only.
Interrupted turns and every other state are unchanged.

## 4.22.0 - UCM-CHAT-9

Chat pieces for the DCM-CHAT-16 server data; without that data nothing changes. `ChatWorkspace` reads the per-user
period limit (`api.getLimit()`, `GET <apiBase>limit/`; a missing route counts as no limit) and passes it to
`ChatComposer`'s new `usageLimit` prop: a usage meter ("<used> of <limit> USD") below the limit, and at the limit a
disabled composer with "Monthly/Daily limit reached" and the reset date. Answers keep their stored tool steps
(`turn.tool_steps`) as chips after reload. The model picker shows "≈ <cost> USD per answer" from
`average_cost_usd_micros`. Visible change in every app: Markdown links in answers are links now. App links
(same origin) go through the new `ChatWorkspace` / `MarkdownReply` prop `onNavigate(path)` when given, external http(s)
links open in a new tab, and every other scheme stays text as before.

## 4.21.0 - UCM-SHELL-9

`AccountPage` accepts an optional `groups` declaration (`[{ key, label, order?, tabs?, visible? }]`) that replaces the
kit's My account / Management / Help groups: app labels, order, built-in tabs placed in any declared group (their own
permission checks unchanged), `extraTabs[].group` naming any declared key, and a `visible(context)` rule that hides a
group together with its tabs (also for `?tab=`). Empty groups stay hidden; unplaced tabs land in "More". Without
`groups` nothing changes.

## 4.20.0 - UCM-AUTH-15

`SignUpContent` and `SignUpPage` accept an optional `preferredSignupMode`: when the server offers that mode it is shown
first and preselected, otherwise it is ignored and the server order applies (a QR link still selects the QR mode).
Visible change in every app: the submit button of open self-signup (`self_signup_open`) now reads "Konto anlegen" /
"Create account" (new key `Auth.SIGNUP_SUBMIT_OPEN`); access-code, e-mail-domain and QR signup keep "Einladung
anfordern" / "Request invitation".

## 4.19.0 - UCM-CHAT-8

`ChatWorkspace` starts the status, catalogue and both chat-list requests together on mount and on every scope change,
instead of waiting for the status first; when the status is not `available` (or fails) the other answers are discarded
and the unavailable or error state is shown as before. New optional prop `preloadedChats` (`{ scope, results, next }`):
an active list the app already loaded for the same `scope` replaces the active-list request at the start; the archived
list is still requested, and later reloads are unchanged. Every consumer now sends catalogue and list requests also when
the assistant is not configured.

## 4.18.0 - UCM-BILL-10

`AccountPage` accepts an optional `billingOperator({ user, account }) => boolean` and passes it as the operator rule to
the billing users columns it builds when `billingUsers` is set, so status, badge and the "Ohne Abo" switch follow the
app's rule. Without the prop the superuser default stays; with `billingUsers` off nothing changes.

## 4.17.0 - UCM-BILL-9

Users tab, every app: the billing access column is a short coloured status (`accountAccessText` now returns
"Freigeschaltet", "{plan name} · bis {short date}", "Team · bis {date}", "Schreibgeschützt" or "Betreiber"; plan names from
`getMe().plans`, neutral `Billing.OP_SUBSCRIPTION` when missing, never the key) and the free-access switch moved to its own
"Ohne Abo" column without a visible label (`FreeAccessSwitch` option `hideLabel`; "–" for subscription, team and operator
rows); grant and revoke dialogs unchanged. `useBillingUsersColumn` returns two columns and takes `isOperator` (default
`user.is_superuser`). The built-in delete in `UserListComponent` is an icon button named "Löschen – {name}" and is shown
disabled on the own row instead of hidden; confirmation, permissions and app row actions unchanged. New `formatShortDate`.
New keys `Billing.OP_FREE_ACCESS_SHORT`, `OP_TEAM`, `OP_OPERATOR`, `OP_SUBSCRIPTION`, `OP_NO_SUBSCRIPTION`,
`OP_FREE_ACCESS_FOR`, `Common.DELETE_FOR`.

## 4.16.0 - UCM-CHAT-7

Opt-in compact chat composer: `ChatWorkspace` props `composerLayout` (`'standard'` default, `'compact'`) and
`renderComposerContext({ chat })`; `ChatComposer` props `layout`, `context`, `notice`; `ModelPicker` prop `shortLabel`.
Compact: a non-wrapping context row (host content, model choice at its end), a full-width input with an icon Send that
becomes Stop while running, the short model label, and the long-chat hint as one dismissible line per chat
(`Chat.longChatShort` with "Neuer Chat"). New keys `Chat.longChatShort`, `Chat.stopAnswer`, `Chat.dismissNotice`.
Without the option the composer, its texts and `renderComposerExtra` are unchanged.

## 4.15.0 - UCM-PERF-4

Opt-in `AuthProvider` prop `bootstrap` (`true` for `/api/bootstrap/`, or a same-origin path; requires
`django-core-micha` >= 3.17.0): the app shell starts from one bootstrap request instead of CSRF, `users/current`,
`auth-methods`, feed and unread count; `NotificationsProvider` takes its initial feed and count from it once for the same
person and still opens the WebSocket only after that. Any bootstrap failure falls back to the separate start requests
exactly once. New hook `useBootstrapExtension(name)` for dcm bootstrap provider payloads. Without the prop nothing
changes.

## 4.14.0 - UCM-PERF-5

New `installChunkLoadRecovery({ guardWindowMs?, reload? })` and `isChunkLoadError(error)`. Installed once at app
startup, a failed chunk load after a deploy (Vite `vite:preloadError` or an unhandled dynamic-import rejection whose
error is a fetch failure) reloads the page once; a repeat within the guard window (default 60 s, held in
`sessionStorage` across the reload) does not, and without usable storage nothing reloads. Module evaluation errors and
all other errors are left alone. Additive; nothing changes for apps that do not install it.

## 4.13.0 - UCM-AUTH-14

Composable account and profile steps for a page-based setup wizard; all additive. New exports: `SetupWizardShell`
(host-controlled single-column frame with step list, title, error, content and one action row), `SignUpContent`,
`SignupConfirmContent`, `LoginContent` (the existing page controllers without page framing; `LoginPage`, `SignUpPage`
and `SignupConfirmPage` now wrap them and behave as before), `ProfileStepContent` (names, one required statement,
optional convenience cookies, host draft bound to the person), `createTermsApi` / `defaultTermsApi`, and
`createCheckoutIdempotencyKey`. `createBillingApi()` gains `startCheckout(planKey, { context, idempotencyKey })` and
`resolveCheckoutAttempt(reference)`; `startCheckout(planKey)` sends exactly `{ plan_key }` as before. Terms acceptance
and contextual checkout require `django-core-micha` >= 3.16.0; everything else works with the existing DCM versions.
Continuations are same-origin paths only and never bypass recovery or required-security redirects. New keys
`Auth.PROVIDER_TRANSITION`, `CONFIRMATION_EMAIL_INSTRUCTION`, `TERMS_*`, `PRIVACY_*`, `CONVENIENCE_COOKIES_LABEL`,
`PROFILE_NAME_REQUIRED`, `Onboarding.COMPLETED`, `Onboarding.BACK` (de, de_informal where it addresses the person, en,
fr, sw). The dev harness has a `setup-wizard` entry (`#setup-wizard` opens it alone at the browser viewport).

## 4.12.0 - UCM-BILL-8

`SubscriptionSection` accepts an optional `onChoosePlan` callback for apps that have their own plan page. With it, the
read-only state (no access) shows the "access ended" banner and one button "Abo waehlen" (`Billing.CHOOSE_PLAN`) that
calls `onChoosePlan()`, instead of the inline plan picker; the banner's "Abo erneuern" action calls it too (when an app
passes both `onRenew` and `onChoosePlan`, `onChoosePlan` wins for the banner action). Without the prop nothing
changes: the inline picker and the existing `onRenew` behaviour stay. The active-subscription view is untouched.

## 4.11.0 - UCM-BILL-7

An entry of `AccountPage`'s `extraTabs` accepts an optional `group` naming one of the kit's navigation groups:
`my-account` (Profil, Sicherheit), `management` (Benutzer, Einladen) or `help` (Support). With it the tab appears in
that group after the kit's own tabs (in the order of `extraTabs`), in the desktop sidebar and in the phone navigation;
without `group`, or with `more` or an unknown value, it stays in "Weitere" as before. The kit's own tabs, their order
and labels are unchanged.

## 4.10.0 - UCM-BILL-6

The account section matches the Maana prototype in three places, against `django-core-micha` >= 3.13.0 (DCM-BILL-6).
The token balance is broken down by origin in a small table "Herkunft / verbleibend / gültig": one row per grant
(Kontingent, Paket, Gutschrift, Test-Guthaben, by `tokens.grants[].origin`) and the team pool (`tokens.pool`, "Team-Pool"),
each with the remaining amount, "verfällt am {Datum}" or "verfällt nicht" and a thin bar of the remaining share (on a
phone the validity moves under the row). A seat holder sees "Platz im Team-Paket von {Name}" (`seat.payer_name`) under
"Team-Platz bis {Datum}". The section "Käufe" lists every purchase of the withdrawal list: eligible ones with "Vertrag
hier widerrufen" and "bis {Datum}", withdrawn ones with "Widerrufen am {Datum}", ones past the period with
"Widerrufsfrist abgelaufen", other reasons without an action. With an older dcm (no `origin`, `pool` or `payer_name`)
the section shows today's display. New keys `Billing.ORIGIN_*`, `EXPIRES_ON`, `NEVER_EXPIRES`, `ORIGIN_LINE`,
`SEAT_PAYER`, `PURCHASES`, `WITHDRAWN_ON`, `WITHDRAWAL_PERIOD_OVER` (de, de_informal, en, fr, sw).

## 4.9.0 - UCM-BILL-5

Informal German for the whole billing surface: every `Billing.*` key now has a `de_informal` value (the "du" form where
the text addresses the person, identical to `de` otherwise), selected through the kit's existing German variant
mechanism. In German the seat is a "Platz" everywhere ("Sitzplatz" is gone: `Billing.SEATS_ADD` "Platz vergeben",
`Billing.TEAM_SEATS` "Plaetze im Team-Paket", `Billing.ERROR_SEAT_LIMIT` "Alle Plaetze sind belegt.", the seat counts).
New optional prop `seatCandidates` on `SubscriptionSection`: an array of `{ id, name, email? }` from the app. With it the
seat assignment is a select "Teammitglied waehlen" plus the button "Platz vergeben" (people who already hold a seat are
not offered; the chosen id goes to the existing `api.addSeat({ userId })`), and a team without a free seat shows only
"Alle Plaetze sind belegt." Without the prop the free text field stays exactly as before. New key `Billing.SEAT_PICK`.

## 4.8.1 - UCM-RCPT-2

`ReceiptReviewDialog` matches its prototype again. Each recognised field is one row with the columns label, value and action and a divider between rows (the label above the value on phones); the "uncertain" chip is a soft warning tint beside the action (under the value on phones); the sheet on phones is as high as its content up to the available height, with full-width actions stacked as "Alle uebernehmen", "Nur leere Felder", "Schliessen"; the wide dialog is 640 px wide with a 640 px maximum height; the currency is shown with the amount (a receipt that has a currency but no amount keeps a currency row) and applying the amount hands over amount and currency; the date has a four-digit year in the active language (the picker follows). The review no longer prints line items of the form through string conversion: both the recognised and the current items are lists, blank rows count as empty. "Only empty fields" never overwrites a filled currency. Props and the `onApply` contract are unchanged.

## 4.8.0 - UCM-BILL-2

Operator surfaces for billing and a fuller "Abo" section, against the `django-core-micha` operator endpoints
(DCM-BILL-5, dcm >= 3.7.0). `OperatorOverview` (month selector; active accounts by source, new and ended subscriptions,
packages sold, tokens granted, used and expired, AI cost and cost per token, AI cost by model) is read-only and renders
nothing without the operator right or without billing. `useBillingUsersColumn` gives the shared Users tab the column
"Zugang" (plan and end date, team seat, free access, read-only) with the switch "Ohne Abo freigeschaltet" per account
(`FreeAccessSwitch`: a mandatory reason when switching on, a confirmation when switching off; the switch only shows what
the server confirmed); `AccountPage` takes the new optional prop `billingUsers` (`true` or a billing api) and adds the
column, without it nothing changes and no request is made. `SubscriptionSection` shows plan name and period with
"renews" or "ends", the token grants with remaining amount and expiry, for a team payer "n of m seats used" with the
holders' names, and for a seat holder "team seat until"; a `me/` without the new keys renders as before.
`createBillingApi` gets `getOperatorOverview`, `listOperatorAccounts`, `grantFreeAccess`, `revokeFreeAccess`; new keys
`Billing.OP_*`.

## 4.7.1 - UCM-BILL-4

The withdrawal dialog no longer says the subscription will not renew for a token package: for `kind: token_package` it says that the unused tokens of the purchase are removed (`Billing.WITHDRAWAL_EFFECT_TOKENS`, de, de_informal, en, fr, sw).

## 4.7.0 - UCM-RCPT-1

Shared receipt capture and review, against the `django-core-micha` receipts module (DCM-RCPT-1; `consent/` and `read/`
under `apiBase`, default `/api/receipts/`). `ReceiptCaptureCard` offers the camera (`capture="environment"`) and a file
button for JPG, PNG, HEIC and PDF, scales large JPEG and PNG files on the device (HEIC and PDF pass through; at most
10 MB), shows the progress while the receipt is read and the recognised boxes on the image, and the edge states (no
consent, nothing recognised, recognition unavailable, file not readable). Without consent it shows the consent switch
and, when the host gives `onUploadOnly`, an upload-only path. `ReceiptReviewDialog` (a sheet on phones) lists each
recognised value next to the form's current one with "Apply", "Only empty fields" and "Apply all"; the host passes its
form values, field labels and extra fields and receives only the chosen values (`onApply(values, { mode })`).
`ReceiptPicker` selects among several receipts in one photo (low confidence starts unselected). `ReceiptConsentSwitch`
reads and writes the user's own consent and works on a profile page too; the text names the `provider` the host passes.
Also `useReceiptConsent`, `createReceiptsApi` / `defaultReceiptsApi` (every function overridable), `receiptFileProblem`,
`prepareReceiptFile` and `receiptsTranslations` (de/en/fr/sw, part of `uiCoreTranslations`). The kit stores nothing; the
app keeps its form and its files.

## 4.6.0 - UCM-CHAT-6

Plain model choice, summary and cost on the shared chat surface, against `django-core-micha` 3.5.0 (DCM-CHAT-13).
`ModelPicker` moves next to "Send" (new `ChatComposer` prop `actions`) and shows only the models the server offers,
grouped by quality level (`level`), with the known name, "by <provider>", an estimate "about x-y tokens per reply" (a
relative three-step scale when the server sends no tokens, "no tokens, Claude subscription" for subscription entries)
and the effort in words (Quick, Thorough, Very thorough, Maximum); the groups by driver, the "pay per use" chip and
the old effort labels are removed (keys `Chat.driver.*`, `Chat.payPerUse` gone). The catalogue is requested with the
chat (`getCatalogue({ chat })`, `?chat=<id>`) so the estimate follows the chat's length; a stored selection the
catalogue no longer offers is replaced once by the default. New optional `ChatWorkspace` props: `tokenBalance`
(footer "Balance"), `usageToTokens(usage)` (per-reply cost "<model> - <effort> - n tokens" under a reply) and
`longChatTokens` (default 40000, 0 turns it off; a notice above the composer and in the picker with "New
conversation"). `ChatThread` shows the server's summary collapsed as "Summary up to here" before the first newer turn
(plain text), from the turns page, the `history` frame and the `summarised` notice. Without the new props behaviour as
in 4.5.x apart from the picker's new look.

## 4.5.0 - UCM-BILL-3

"Withdraw contract here" for EU/EEA consumers, against the `django-core-micha` 3.5.0 withdrawal API
(`withdrawal/`, `withdrawal/<id>/preview/`, `POST withdrawal/<id>/`). `WithdrawalSection` lists only the purchases the
server calls eligible, with the 14-day deadline (purchase date plus 14 days) and a button; `WithdrawalDialog` shows the
server's refund amount and a calculation composed from the server's numbers (`describeCalculation`), confirms exactly
once and shows the result. The kit never decides eligibility or the amount itself; a 409 shows "not possible". The
section is part of `SubscriptionSection` (prop `withdrawal`, default `true`, `false` hides it). `createBillingApi`
gets `listWithdrawals`, `previewWithdrawal`, `confirmWithdrawal`; `formatPrice` takes an optional currency and
`formatDateTime` is new. New keys `Billing.WITHDRAWAL_*` (de formal, de_informal, en, fr, sw).

## 4.4.0 - UCM-BILL-1

Subscription and token surfaces in the main entry, against the `django-core-micha` billing API (DCM-BILL-1, `me/`,
`checkout/`, `portal/`, `team/seats/`; base path `apiBase`, default `/api/billing/`). `PlanPicker` (monthly/yearly
switch when both exist, team packages with seats and term, token packages with `kinds`) continues to Stripe Checkout:
the checkout and portal links are followed only when the server returns an `https://` URL, through an injectable
`redirect`. `SubscriptionSection` is the account section "Abo": the state comes only from the server (active
subscription with end date and customer portal, team payer with seat management, team member, free access, ended
access with `AccessEndedBanner` and renewal, token balance and "buy a package"). Also `TokenBalanceBadge`,
`TokenCostPreview` (the cost, alternatives and balance the app passes in), `useBilling`, `createBillingApi` /
`defaultBillingApi` and `billingTranslations` (de/en/fr/sw, part of `uiCoreTranslations`). The operator overview and the
"free access" switch are not part of this release (UCM-BILL-2, no API yet). The server does not send the plan name,
token expiry or seat-holder names, so none are shown.

## 4.3.0 - UCM-CHAT-5

`ChatWorkspace` gets three optional props; without them it behaves as in 4.2.x. `getSendContext()` (synchronous, no
arguments) is called once per `send` frame, right before it is sent, for every route: the composer, `send(text)` from
the answer slot, `sendRequest` and the retry of a failed turn. A plain object is sent as `context` on the frame
(`{ type: 'send', message, context }`, read by `django-core-micha` 3.3.0, DCM-CHAT-11); `undefined` or `null` sends no
`context`; anything else, or a thrown error, sends nothing, keeps the draft and shows the generic action-error notice
(a failed retry also keeps the failed turn on screen). The surface does not interpret or size-check the context; the core
answers `invalid_frame` for a bad or oversized one. The context never appears in the displayed turn text.
`sendRequest` (`{ id, text }`) sends `text` as the next message of the shown chat, like a typed send including
`getSendContext`. Each new `id` is handled once; with no chat shown, an archived chat, no connection, a running turn,
blank text or `activeChatId` `null` it is not sent. A request that arrives together with an `activeChatId` switch waits
for that chat. `onSendRequestHandled({ id, sent })` is called once per request so a host can fall back to
`composerPrefill` when `sent` is `false`. Give every request a fresh `id` (a counter); an `id` that was answered earlier
is treated as the same request and ignored.

## 4.2.0 - UCM-CHAT-4

`ChatWorkspace` takes two optional props so a host can control which chat is shown. `activeChatId` shows that chat
(`null` shows none, `undefined`, the default, keeps the selection internal); an id that is not in the loaded lists
triggers one reload of the lists, and an id that still cannot be found leaves the normal no-chat state. It is applied
only when the prop value changes, so a host that echoes `onActiveChatChange` back causes no extra requests.
`onActiveChatChange(chatId)` is called when the id of the shown chat changes (selection, creation, deletion as `null`,
a change driven by `activeChatId`), not for the initial state with no chat and not when the shown chat is only
archived, renamed or updated.
`composerPrefill` (`{ id, text }`) puts the text into the composer of the shown chat and focuses it; each new `id` is
applied (the same text twice, if asked twice), and a request with no chat shown, for an archived chat, or while
`activeChatId` is `null` is ignored. A prefill sent together with an `activeChatId` switch waits for the requested chat.
`renderAnswerExtra` additionally receives `send(text)`, which sends the text as the next message exactly like a typed
send, and `canSend` (false while a turn runs, for an archived chat and while disconnected). `ChatComposer` takes an
optional `inputRef`. Switching chats now clears the previous chat's content before paint.
Without the new props nothing changes.

## 4.1.0 - UCM-CHAT-3

Extension points on the `/chat` surface; with none of the new props `ChatWorkspace` renders and behaves as in 4.0.x.
New `ChatWorkspace` props: `scope` (now also sent on the chat lists and the status request), `unavailableReasonText`
(object or function mapping the server's `unavailable` reason to the app's text; generic fallback otherwise),
`sidePanel(chat)` with `sidePanelLabel` (a column next to the thread, a sheet in the narrow and compact layouts),
`renderAnswerExtra({ turn, chat, appFrames })` (under each answer, with the `app` frames that arrived during that turn),
`renderComposerExtra({ chat })`, `onAppFrame({ name, payload, chatId, turnId })`, and `layout` (`'viewport'` default,
`'container'` follows the container width below `compactBelow` px, `'compact'` always narrow). `ModelPicker` takes an
optional `sheet` boolean. A `history_trimmed` notice shows a quiet chip with the number of left-out messages. New texts
`Chat.notAvailableHere`, `Chat.historyTrimmed_one/_other` and the fallback `Chat.sidePanel` (de/en/fr/sw). Built
against the `django-core-micha` DCM-CHAT-10 contract.

## 4.0.1 - UCM-DEP-3

The `exports` map no longer lists `./package.json`; the public entries are exactly `.`, `./charts`, `./chat` and `./markdown`.

## 4.0.0 - UCM-DEP-2

Breaking: a consumer installs only the peers of the features it imports. The package gets an `exports` map, so deep
imports such as `.../dist/...` no longer resolve. Only `dist`, `README.md` and `CHANGELOG.md` are published.

Peers: `react-helmet` is gone (the seven auth/account pages render a native React 19 `<title>`, text unchanged).
`@mui/icons-material` is now a required peer (it was used at runtime but only a devDependency), same range as
`@mui/material`. `i18next` is `>= 26.2.0`. `@mui/x-charts`, `react-markdown` and `remark-gfm` are optional peers,
needed only for the sub-paths below. `react-markdown` and `remark-gfm` are no longer dependencies.
`qrcode.react` stays a required peer: `AccountPage` renders `QrSignupManager`, so QR stays in the main entry.

| Old import (main entry) | New import | Optional peers needed |
|---|---|---|
| `ChartFrame`, `BarChart`, `LineChart`, `TimeSeriesChart`, `ScatterChart`, `ScatterReferenceCurve`, `ScatterReferenceLine`, `scaleBubbleRadius` | `@micha.bigler/ui-core-micha/charts` | `@mui/x-charts` |
| `ChatWorkspace`, `ChatList`, `ChatThread`, `ChatComposer`, `ModelPicker`, `useChatSocket`, `createChatApi`, `defaultChatApi` | `@micha.bigler/ui-core-micha/chat` | `react-markdown`, `remark-gfm` |
| `MarkdownReply` | `@micha.bigler/ui-core-micha/markdown` | `react-markdown`, `remark-gfm` |

Unchanged in the main entry: `getNeutralChartPalette`, `useNeutralChartPalette`, the `formatShort*` and chart
formatter helpers, `yearTickInterval`, `chartsTranslations`, `chatTranslations`, auth, messaging, notifications,
onboarding, layout and theme exports.

`KIT_COMPONENT_SX_REGISTRY` now lists only components of the main entry. The sx registry entries of the moved
components are `CHARTS_KIT_SX_REGISTRY` (from `/charts`) and `CHAT_KIT_SX_REGISTRY` (from `/chat`); concatenate them
where a check needs the full set. The theme (`createAppTheme`) no longer reaches charts, chat or markdown modules.

## 3.14.4 - UCM-DEP-1

Dependency updates. The runtime dependency `@fontsource/dm-sans` moves to ^5.3.0; the peer dependency ranges are
unchanged. Tooling: TypeScript 7 (`moduleResolution: Bundler` in `tsconfig.build.json`), vitest 5, jsdom 30, pnpm 12
and updated GitHub Actions in both workflows. No source or API change.

## 3.14.3 - UCM-CHAT-1 publish fix

3.14.0 to 3.14.2 were never published: `themeCompleteness` rejected the chat components' inline `sx` on baseline-styled
MUI components. The chat surface now follows the kit convention (exported top-level `sx` constants registered in
`KIT_COMPONENT_SX_REGISTRY`; no `sx` that repeats a theme value such as the button minimum height). No behaviour
change; this release contains everything from 3.14.0 to 3.14.2.

## 3.14.2 - UCM-CHAT-2

The chat model picker shows readable, translated names for the drivers `claude_cli`, `anthropic_api` and
`openai_api` as group heading and accessible name (`Chat.driver.<id>`, de/en/fr/sw). An unknown driver id still
appears as its raw id. No other chat text or behaviour changes.

## 3.14.1 - UCM-CHAT-1 post-landing review

`ChatThread` starts at most one older-turns request at a time, also for rapid scroll events. `ModelPicker` shows no
trailing separator when a chat has no effort set.

## 3.14.0 - UCM-CHAT-1

New shared AI chat surface. `ChatWorkspace` shows the user's chats (rename, archive, restore, delete), streams
answers into a thread, renders them as Markdown (no raw HTML, no images, links as text), shows the sources of each
answer as chips and lets the user pick model and effort per chat. The parts are exported on their own:
`ChatList`, `ChatThread`, `ChatComposer`, `ModelPicker`, `MarkdownReply`, `useChatSocket`.
`createChatApi(overrides, { apiBase })` returns the full default REST client; overriding one function keeps the
others. Strings are in `chatTranslations` (de, en, fr, sw), included in `uiCoreTranslations`. Adds the dependencies
`react-markdown` and `remark-gfm`. The wire shape (URLs, frame and field names) is isolated in `src/chat/wire.js`
and follows `django-core-micha/DCM-CHAT-1`.

## 3.13.2 - UCM-AUTH-13

`ProfileComponent` preserves edited names and consent values when the same person's
context data refreshes. Untouched fields still receive server updates. Account changes
and logout reset the form, keeping edits and consent isolated between people.

## 3.13.1 - UCM-SHELL-8

`SectionNav` now renders grouped and overview navigation buttons inside list items on
desktop and in the mobile drawer. Selection, callbacks, labels and spacing are preserved.

## 3.13.0 - UCM-AUTH-12

`AccountPage` accepts `showProfileStatements` (default `true`). Set it to `false` in consumers
without privacy/cookie statement endpoints to suppress the statement panels and their requests.
Both existing consent controls and their submitted values remain available.

## 3.12.0 - UCM-THEME-18

The shared type scale now uses h1–h5 sizes of 36/32/28/24/20px, h4 steps to 23px below `sm`, and subtitle1 is 13px; every adopted app changes on its next bump, with hram, jg-ferien, kerzenziehen, spesix, and fitness-monitor moving screen titles from h5 to h4, while survey_app should remove its 800/700 weights and h4 `2.125rem`/400 override and decide its h3 page titles (24px to 28px), closing the held `SVA-THEME-1` typography revert. An app h4 `fontSize` override retains the baseline’s 23px mobile step (survey_app currently sets `2.125rem`); heading weights are fixed at 600, so apps should not override them per level. All other adopted apps need only bump; webshop-guenter, Kira, Cinevia, and Gustav are unaffected.

## 3.11.2 — UCM-THEME-16

The "Signup Access / valid until" box in `QrSignupManager` now takes `background.subtle` instead of the fixed light `grey.50`,
so its text stays readable in dark mode (2.00:1 before). In light the ground moves from `#FAFAFA` to `#F4F5F6` (1.05:1 step).
The white ground behind the QR code itself is unchanged on purpose.

## 3.11.1 — UCM-I18N-5

`UserListComponent`'s pagination range text ("1–4 of 4") now goes through `labelDisplayedRows`,
translated in all four supported locales (de/fr/en/sw), including the "more than" wording for an
unbounded count. Previously only `labelRowsPerPage` was translated, so MUI's English default leaked
through regardless of locale.

## 3.11.0 — UCM-THEME-14

Added dark-mode composition to `createAppTheme` from the central dark token baseline, including own-surface
contrast derivation, safe primary/status colours, adaptive data series, dark overlays, scrim, and autofill.
The light theme output remains unchanged.

## 3.10.0 — UCM-TEST-1

Added the exported `checkKitIntegration` consumer check for app i18n, providers, kit page rendering, and auth error translation wiring.

## 3.9.1 — UCM-AUTH-11

`UserListComponent` no longer offers an administrator the delete action for their own account, including when a consumer-supplied `canDeleteUser` callback returns true.

## 3.9.0 — UCM-AUTH-10

Kit auth errors now resolve through explicit backend i18n keys, field-specific keys, code translations,
backend messages, and caller defaults, so a raw backend code is never shown. The auth API client also sends
the active UI language as `Accept-Language` on every request, and the auth catalog now includes field-specific
`invalid` and `required` messages for kit-submitted fields in all four supported languages.

## 3.8.0 — UCM-THEME-15

`createAppTheme` can now derive baseline status `main` colours and control-border colours against the theme's own
page background when their WCAG contrast would otherwise fail. Values that already pass remain byte-identical, and
app-supplied values are unchanged. When a status `main` is derived, its `light` and `dark` shades move with it too,
so components using `error.dark` for hover may change on tinted pages.

Only notable, user-facing changes. Not every version — see `WORK_ORDERS.md` for the full history.

## 3.7.0

- `UCM-PRIM-2`: Added the `EmptyState` primitive with icon, title, description, action, and theme tokens.
- `UCM-SHELL-7`: Improved `UserMenu` avatar-initial contrast to at least 4.5:1 against `primary.main` on any theme.
- `UCM-MSG-20`: Kept `Composer` usable at 375px, rendered only safe `http`/`https` message links, and added
  read-ratio tooltip behavior that hides when there are no recipients.
- `UCM-AUTH-9`: Kept the password-invite form visible after server-side password rejection, made success wait for
  an explicit login action, explained disabled self-signup, and confirmed successful role changes.
- `UCM-I18N-4`: Added the `createUiCoreTranslations({ germanVariant })` factory for informal German and translated
  hard-coded user/admin messages across all four locales.

## 3.6.0 — AUTH-8

**Behavior change, not purely additive — re-check error displays after adopting this version.**
`extractErrorInfo` (`src/utils/auth-errors.js`) previously returned the hardcoded, untranslated
literal `'GENERIC'` as the `.code` for ANY backend error shaped `{"detail": "..."}` — Django's
generic error format, produced by DRF's `Throttled`/`Http404`/`PermissionDenied` and any unhandled
`APIException`. This unconditionally overrode every caller's own, properly translated
`defaultCode` (all 39 call sites in this repo already pass one). Fixed: the `{detail}` fallback now
returns `code: null`, so `normaliseApiError`'s existing `info.code || defaultCode` correctly falls
back to the caller's default instead. `.message` still carries the raw `detail` text unchanged.

Also closes 7 translation gaps found while auditing every `defaultCode` in use (`Auth.RECOVERY_LOGIN_FAILED`,
`Auth.USER_LIST_FAILED`, `Auth.USER_DELETE_FAILED`, `Auth.USER_ROLE_UPDATE_FAILED`,
`Auth.USER_SUPPORT_UPDATE_FAILED`, `Auth.PASSKEY_CANCELLED`, `Auth.MFA_CHALLENGE_FAILED`) — these
existed as fallback codes in the source but had no translation entry in any of the 4 shipped
locales, so they would have rendered as a raw, untranslated key even with the code-precedence fix
above. All 39 in-use `defaultCode` values are now confirmed translated in `de`/`en`/`fr`/`sw`.

## 3.5.1 — AUTH-7

`loginWithPassword`'s "already authenticated" (409) retry — the re-fetch of the current user when
allauth reports a still-valid session — no longer lets a second failure (e.g. the account's own
request quota being exhausted elsewhere) escape as a raw, unnormalised error. It now goes through
the same `normaliseApiError` path every other login failure already uses, so the caller (any app's
`LoginPage`) gets a `.code` it can translate instead of a bare exception. The success path (409 +
successful retry) is byte-identical; no prop/behavior contract changed for any existing caller.

## 3.5.0 — MSG-19

`DirectMessageLauncher`'s recipient picker is now a searchable MUI `Autocomplete` instead of a
flat, unfiltered list — the same "a picker without search stops working long before the list feels
long" pattern already established elsewhere in this fleet. The public prop contract (`candidates`,
`scope`, `onOpen`) and the selection/scope-resolution logic are unchanged; only the picker's own
rendering changed. One new i18n key, `MessagingDirect.NO_MATCHES` (shown when a typed query
matches nothing), plus a reworded `MessagingDirect.CANDIDATES` (now an instruction-style field
label, "Select recipient", rather than the old `<List aria-label>` text) — both in all four
languages this repo ships (de/en/fr/sw).

## 3.4.0 — AUTH-6

`QrSignupManager` gains two optional props, both backward-compatible (existing callers keep
today's behaviour unchanged): `registrationContext` (merged into the generated QR's
`registration_context`, letting a consumer scope the signup to e.g. a specific department) and
`defaultMaxRedemptions` (overrides the component's own low default, for a poster-scale code meant
to be scanned by many people). Fixed in the same change: a context change combined with a
previously-customized redemption count could fire a redundant `createSignupQr` call.

## 3.3.1 — UCM-CHART-18

**Exported PNGs no longer contain interactive controls — buttons, drill-down links, and the like
are gone from the image, while an interactive chart legend (MUI's own, e.g. a
`toggleVisibilityOnClick` legend) keeps every pixel of its swatch and label — only its
clickability is dropped, which a static image never had anyway. A rotated element (e.g. a legend
swatch drawn as a diamond) now exports rotated instead of square.** Since `3.3.0` the PNG export
rasterises `ChartFrame`'s whole `chartRef` box, which wraps a panel's `children` — any button or
link a panel renders alongside its chart (an info affordance, a "view details" link) was
rasterised straight into every exported image. Fixed generically here rather than by moving each
panel's controls elsewhere: an exported image should show what the chart *communicates*, not what
can be *clicked*, and that is a property of the element kind, not of any one panel's layout
choices. `transform` was also missing from the properties this package inlines onto an export, so
a CSS-rotated element silently lost its rotation; both exports (SVG and PNG) now carry it.

This is a patch, not a minor: it repairs behaviour `3.3.0` itself introduced (interactive controls
were never meant to appear in an export) rather than changing what a correctly-shaped export
contains.

## 3.3.0 — UCM-CHART-17

**The PNG export now includes the legend, size key, and footnotes — the SVG export still doesn't,
deliberately.** Both exports used to clone-and-serialise the same raw `<svg>`: no theme styles
carried over (a standalone viewer applied bare SVG defaults, the "graphically massively different"
symptom reported), and only the chart itself was captured — a panel's hand-built HTML legend and
its size-key SVG (rendered as siblings of the chart since `HRAM-RES-39`/`HRAM-VIS-2`) were silently
dropped from every export.

The two formats now keep two different, explicit promises instead of one broken shared one:

- **Export SVG** — the chart's own vector surface, with computed styles (font, colour, stroke)
  inlined so it renders correctly standalone. Chart only, no legend — that's what a portable,
  editable vector file is for.
- **Export PNG** — the whole card as shown: chart, legend, size key, footnotes. Rasterises the
  actual container instead of the chart's SVG alone.

Both buttons now carry a tooltip stating the difference, since the label alone no longer says so.

No new dependency: both paths route through the platform's own SVG → `Image` → `<canvas>`
pipeline. The PNG path specifically loads its intermediate SVG via a `data:` URI rather than a
`blob:` URL — an `<svg>` containing a `<foreignObject>` (needed to rasterise arbitrary HTML)
taints the canvas unconditionally in Chrome when loaded via `blob:`, confirmed live; a `data:` URI
does not.

## 3.2.1 — UCM-CHART-16

**A horizontal-axis chart with a title, or a large-enough tick font, could render every tick
label blank.** The x-axis tick band reserved a flat, font-size-independent floor; MUI's own
internal fit check (`shortenLabels`, against `tickLabelsMaxHeight`) blanks every tick label the
moment the real rendered text is even slightly taller than that floor leaves room for once MUI's
own tick/gap overhead — and, when a title shares the same band, its own gap too — is subtracted.
Correctly positioned tick marks with zero visible label text is the exact, easy-to-misread
signature; two hram consumers had independently patched around it with the same empirically
measured `height: 56` before this was traced to its shared-core cause.

The band is now derived from the actual tick font size (and whether an axis title shares it)
instead of the flat floor, matching MUI's real fit check rather than only its generic default.
Patch, not minor: this repairs existing behaviour — the SAME size tokens render at the SAME
heights (`UCM-CHART-15` is untouched) — the only change is the flat tick band growing by a few
pixels on charts that were previously either mis-sized or silently blanking their labels. The
rotated-tick path (`xLabels: "angled"`) is unaffected.

## 3.2.0 — UCM-CHART-15

**Breaking visual change: every existing chart using a `size` token — including the default
`standard` size — becomes 80px taller; `standard` is now 400px.** The chart `size` scale shifts
up one step and gains two new steps above the old ceiling:

| token | before | after |
|---|---|---|
| `compact` | 240px | **320px** |
| `standard` | 320px | **400px** |
| `tall` | 400px | **480px** |
| `extra_tall` | — | **560px** (new) |
| `super_tall` | — | **640px** (new) |

This redraws every chart already using a `size` token, in every consumer on `ui-core-micha` `3.x`.
The 10-unit step is unchanged; every value stays a clean multiple of the theme's 8px spacing unit.

**Why:** `tall` was the tallest token available, and hram had already needed the documented
`height` px escape to get past it — a scale that forces its own escape ends too early.
`standard`'s old 320px value was a migration guardrail from `UCM-CHART-12` (pinned to the
pre-existing deployed default so that migration did not itself redraw anything), not a design
verdict on its own merits; the operator judged the whole scale too cramped on its own merits and
chose to correct it now, before the fourteen remaining apps still on `2.x` migrate onto it.

**This is a breaking change shipped as a minor**, by explicit operator decision (`2026-08-24`),
against the Expertenchat's recommendation of a major. No consuming app is on `3.x` except hram, so
the practical blast radius is one application; hram's own adoption and visual verification is a
separate, deliberate work order (`HRAM-CHT-5`), not automatic from this release.

## 3.1.2 — UCM-CHART-14 follow-up

**The census script shipped in `3.1.1` worked; its test suite never ran.** `scripts/chart-api-census.mjs`
began with `#!/usr/bin/env node`. Node strips a shebang when executing a file directly, so the script
behaved correctly and its output was trustworthy — but Vite's module runner does not strip it, so any
test importing the module died at collection with `SyntaxError: Invalid or unexpected token`. The
suite reported `1 failed | 2 passed` with **0 of its 22 census tests collected**.

- Shebang removed; the script is invoked as `node scripts/chart-api-census.mjs <workspace-root>`, which
  is how it was already documented and run. A comment in its place records why: a shebang is invisible
  to direct execution but breaks any loader that pulls the file through an ESM graph, so re-adding one
  fails nothing user-facing and only takes out the tests.
- No change to the census logic, its output, or anything in the published runtime surface. The 22
  fixture tests were already correct; they now execute (118 passing across the chart suite, up from 96).

## 3.1.1 — UCM-CHART-14

**Corrects a wrong record from `3.1.0`, and a runtime error message that stated the opposite of
what actually happened. No API change in this version.**

`3.1.0` (`UCM-CHART-13`) removed `ChartFrame`'s `height` and `aspect` props, and claimed — in the
docblock, in `docs/CHART-LAYOUT.md`, and in the commit message — that no consumer passed `aspect`.
**That measurement was false.** A parser-based census (`scripts/chart-api-census.mjs`, ground truth
over a `head`-truncated grep that had missed them) found **four live call sites in
fitness-monitor** (`BodyHistoryPage.jsx` ×2, `EnvironmentPage.jsx` ×2) that do pass `aspect`, and
whose cards visibly change shape once `3.1.0`+ is adopted — `aspect` was genuinely applied
(`aspectRatio` on the card box) through `3.0.1`, not a no-op.

**The removal itself is not reverted** — the operator confirmed this stands. What changes here:

- The dev-mode error `<ChartFrame>` throws when a caller still passes `aspect` no longer claims the
  prop "was never applied". It now says plainly that it WAS applied, that this is a real visible
  change, and that `size` on the chart inside the frame is the replacement if a chart's own height
  was meant.
- The false "no consumer passes it" claim is corrected — not deleted — everywhere it shipped
  (`ChartFrame.jsx`'s docblock, `docs/CHART-LAYOUT.md`, `tests/ChartFrame.test.jsx`'s comment) so
  the record shows what was measured, both times.
- A new dev script, `scripts/chart-api-census.mjs`, parses (does not grep) every sibling repo's use
  of the four chart presets and `ChartFrame`, reporting exactly which of `aspect`/`height`/
  `minHeight`/`margin`/`xAxisAngle` each call site still carries, with file:line. Not part of the
  package's runtime surface — a workspace-local tool for the next migration WO.

**This is a patch, not a major**, even though an applied prop was removed: no consumer has crossed
`3.1.0` yet (hram is on `3.0.1`, fitness-monitor on `3.0.1` in its working tree, jg-ferien on
`2.41.1`), and the break is not silent — `assertRemovedChartProp` throws in dev at the exact call
site, which is what a major version's "read the release notes" warning exists to approximate in the
first place. Migrating fitness-monitor's four call sites is `FM-CHART-1`'s scope, not this one's.

## 3.1.0 — UCM-CHART-13

`ChartFrame` no longer accepts `height` or `aspect` — only `minHeight` (the card floor) is applied.
Both now throw a dev-mode error naming the replacement. See `3.1.1` above for a correction to this
version's own release notes.

## 3.0.1 — UCM-CHART-12 (fix round)

Follow-up fixes to `3.0.0`'s chart layout model after a second, independent review round: a
secondary (right-positioned) y-axis's width is now accounted for, `xLabels="auto"` decides rotation
from the label's real measured width rather than a character count, a blank-formatted y-axis
collapses its reserved band to zero the same way the x-axis case does, and the resolver now reserves
space for wherever a legend actually renders (`slotProps.legend.position`), not just the
`legendPosition` prop alone.

## 3.0.0 — UCM-CHART-12

**Breaking.** One layout model replaces the chart presets' `minHeight`/`height`/`aspect`/`margin`/an
implicit rotation prop with `resolveChartLayout`, driven by `size`
(`"compact"`|`"standard"`|`"tall"`, + a `height` px escape) and `xLabels`
(`"auto"`|`"horizontal"`|`"angled"`). Every reserved band now derives from its own content and
collapses to zero when empty. See `docs/CHART-LAYOUT.md` for the full migration guide.
