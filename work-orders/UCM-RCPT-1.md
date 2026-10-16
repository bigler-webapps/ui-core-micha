# UCM-RCPT-1 — Shared receipt capture and review components

Prepared: 2026-10-16. Target repository: `ui-core-micha` (`main`). Backend counterpart: `django-core-micha/DCM-RCPT-1`. Consumers:
- `reimbursements/RMB-RCPT-1`;
- `spesix/SPX-RCPT-1`;
- `bigler-consult/BCO-EXP-1`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

reimbursements and spesix each built their own receipt capture and their own review of recognised values:
- spesix: client-side downscaling, `capture="environment"`, prefilling untouched fields;
- reimbursements: a suggestions dialog with apply per field, apply to empty fields and apply all.

bigler-consult needs the same.

Expected outcome: ui-core-micha offers receipt components that any app places next to its own form:
- a capture card;
- a review dialog, shown as a sheet on phones;
- a picker for several receipts in one photo;
- a consent switch.

They talk to `DCM-RCPT-1`'s endpoints. The app keeps its form and decides what to do with the values it receives.

## Visual spec

Prototype: [`work-orders/assets/UCM-RCPT-1-receipt-capture.html`](assets/UCM-RCPT-1-receipt-capture.html), drawn in spesix's theme. It shows:
- the capture card and the review dialog at 1280 px;
- capture and the review sheet at 375 px;
- several receipts from one photo;
- the edge states.

It declares its coverage at the top. The components take every colour, type and radius from the consuming app's theme.

**Parity guardrail:** the prototype governs look and interaction. Behaviour, consent and data contract come from `DCM-RCPT-1`.

## Operator decisions this Envelope records (2026-10-16)

- The receipt UI is shared, with a prototype as the visual spec.
- Consent is standing and revocable; the capture card offers it inline.

## Scope

- **Capture card:**
  - a camera button (`capture="environment"`) and a file button;
  - accepted types JPG, PNG, HEIC and PDF;
  - client-side downscaling of large images before upload, with the 10 MB bound; HEIC and PDF pass through unchanged;
  - progress while the receipt is read;
  - the image with the recognised fields outlined;
  - "use another receipt";
  - without consent, the inline consent switch and an upload-only path, so the app can still attach the file without recognition.
- **Review**, as a dialog at wide widths and a sheet at narrow ones:
  - **Per field:** the recognised value, the form's current value when it differs, a "same as in the form" note when they match, an "uncertain" chip for low confidence, and "Apply".
  - **Line items** as a list.
  - **Actions:** "Only empty fields", "Apply all", "Close".
  - **The host** passes its current form values and field labels and receives the chosen values. It decides how to fill its form.
- **Several receipts in one photo:** one card per receipt, with a crop preview, merchant, date, amount and a confidence chip. Low-confidence receipts are unselected by default. The confirm button reports the selected receipts to the host; its label is "{n} übernehmen", or a label the host supplies.
- **Consent switch:** usable inside the capture card and on an app's profile page. It reads and writes the user's own consent through `DCM-RCPT-1`. The text names the provider as configured.
- **API client:** default calls for recognition and consent, overridable per function as in the chat client.
- **Edge states, as drawn:** no consent yet; nothing recognised; recognition unavailable (spend cap, count limit or provider); file too large or wrong type.
- **Strings:** all registered in a new translations module in German, English, French and Swahili. Field labels can be overridden by the host.

## Copy list (released with this Envelope)

German shown; translated in the four languages:
- "Beleg fotografieren", "Datei wählen", "JPG, PNG, HEIC oder PDF", "Beleg wird gelesen …", "Anderer Beleg"
- "Erkannte Werte", "wie im Formular", "Übernehmen", "Nur leere Felder", "Alle übernehmen", "Schliessen"
- Chips "sicher" / "unsicher"
- "{n} Belege erkannt", "{n} übernehmen", "Unleserlich", "Betrag nicht erkannt"
- Consent: "Belege dürfen für die automatische Erkennung an {provider} übermittelt werden. Jederzeit widerrufbar.", "Nur hochladen"
- "Auf diesem Beleg wurden keine Angaben erkannt. Bitte von Hand erfassen."
- "Die Belegerkennung ist im Moment nicht verfügbar. Bitte von Hand erfassen."
- "Diese Datei kann nicht gelesen werden. Erlaubt sind JPG, PNG, HEIC und PDF bis 10 MB."
- Default field labels: "Händler", "Datum", "Betrag", "Währung", "Zahlungsart", "Konto", "Positionen"

## Token delta list

None. Drawn from spesix's theme.

## Replaces / removes

Nothing in ui-core-micha. Each consumer order lists its own removals.

## Non-goals

- The expense or claim forms of the apps.
- Bank-proof pairing and ZIP upload.
- Live camera streams through `getUserMedia`; the operating system's camera via `capture` is enough.

## Tier

Tier 3: a new shared-core surface with a privacy-relevant consent control.

## Risks

- **Overwriting user input:** "Apply all" replaces values the user typed. "Only empty fields" and the per-field view exist for that reason, and the form's current value is always shown beside the suggestion.
- **Consent wording:** the switch is the only consent the user gives, so it must name the provider and that consent is revocable.

## Required tests to write

- Capture:
  - camera and file inputs carry the right `accept` and `capture`;
  - large images are downscaled under the bound;
  - HEIC and PDF pass through;
  - files that are too large or of a wrong type show the error state without a request.
- Consent:
  - without consent, recognition is not called and upload-only is offered;
  - switching it on calls the consent endpoint.
- Review:
  - "Apply" hands over one field;
  - "Only empty fields" hands over only fields the form left empty;
  - "Apply all" hands over every field;
  - "same as in the form" and the "uncertain" chip render from the data.
- Several receipts: low-confidence receipts start unselected, and confirm reports exactly the selected ones.
- Edge states render from their error codes.
- API client: overriding one function keeps the defaults.
- Translations: every new key exists in all four languages.

# B. Implementation map — addressed to the implementer

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes names, shapes and invariants. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only the files named here. The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files. Do not touch `src/chat/**`, `src/billing/**` (read `src/billing/` as the pattern: `api.js`, `wire.js`, `useBilling.js`, components with exported `NAME_SX`), `src/messaging/**` and `src/theme/**` except the one registry file named below. No new dependency: MUI and React only (the project already has `@mui/material` and `@mui/icons-material` as optional or dev peers; use `@mui/icons-material/CameraAlt`, `InsertDriveFile`, `Close` style default imports only if an existing component already imports the same package form; otherwise draw without icons).

### Backend contract (django-core-micha `DCM-RCPT-1`; isolate every name in `src/receipts/wire.js`)

The app mounts the module's urls under a prefix of its choice; the default `apiBase` here is `/api/receipts/`. Session cookie auth; the shared `apiClient` (`src/auth/apiClient.jsx`, the one the billing and chat clients use) handles CSRF for POST and DELETE. Every response is JSON.
- `GET {base}consent/` -> `{ granted: boolean, granted_at: ISO|null, revoked_at: ISO|null }`; `POST {base}consent/` grants and answers the same shape; `DELETE {base}consent/` revokes and answers the same shape.
- `POST {base}read/`, multipart: `file` (required), `context` (optional, a JSON object serialised as a string) -> `{ receipts: [ receipt, ... ] }`. A receipt: `{ merchant: string, date: 'YYYY-MM-DD' | '', total: decimal string with two places | '', currency: 'CHF', payment_method: 'cash'|'card'|'other'|'unknown', items: [ { description, amount, box: {x,y,w,h}|null } ], vat: [ { rate, amount } ], box: { x, y, w, h } | null, confidence: 'high'|'low', account_suggestions?: [ { account_id: string, confidence: 'high'|'low' } ], ...extension fields }`. Box numbers are fractions 0 to 1 of the image; `null` or a zero width or height means unknown. Strings may be empty and mean "not recognised". Extension fields (the app's own keys) pass through untouched.
- Errors: HTTP status with body `{ code }`: `consent_required` 403, `unsupported_file_type` 415, `file_too_large` 413, `invalid_request` 400, `nothing_recognised` 422, `spend_cap_reached` 429, `count_limit_reached` 429, `provider_unavailable` 503, `authentication_required` 401. Read the code from `error.response.data.code`; any other failure (network, 5xx without a code) is treated as `provider_unavailable`. Never show server text.

### Files to build (all new, in `src/receipts/` unless stated)

1. `wire.js`: `receiptsApiUrls(base = '/api/receipts/')` -> `{ consent, read }`; `RECEIPT_ERROR_CODES` (the list above); `RECEIPT_MAX_BYTES = 10 * 1024 * 1024`; `RECEIPT_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.pdf'`; `RECEIPT_FIELD_KEYS = ['merchant', 'date', 'total', 'currency', 'payment_method', 'account', 'items']`.
2. `api.js`: `createReceiptsApi(overrides = {}, { apiBase = '/api/receipts/' } = {})` and `defaultReceiptsApi`, same shape as `createBillingApi` (`{ ...defaults, ...overrides }`): `getConsent()`, `setConsent(granted)` (POST when true, DELETE when false), `readReceipts(file, { context, onUploadProgress, signal } = {})` (FormData with `file`, and `context` only when given as `JSON.stringify`; pass no Content-Type header so the browser sets the boundary; returns `response.data.receipts` as an array, `[]` when the field is missing).
3. `files.js`: `receiptFileProblem(file)` -> `null` or `'unsupported_file_type'` or `'file_too_large'` (type decided from the MIME type OR the extension, case-insensitive, because phones often send an empty type for HEIC; size bound `RECEIPT_MAX_BYTES`); `prepareReceiptFile(file)` -> a `File` (async): only JPEG and PNG larger than 1.5 MB are scaled so the longest edge is at most 2400 px and re-encoded as JPEG quality 0.85 via canvas; HEIC, HEIF and PDF are returned unchanged; any failure to decode returns the original file. Reuse the decoding technique of `src/messaging/composerImageCompression.js` (object URL, `Image`, canvas, `toBlob`) but do NOT change that file; keep your helper self-contained and small. After preparing, the caller re-runs `receiptFileProblem` (a file still over the bound is `file_too_large` and no request is made).
4. `useReceiptConsent.js`: `useReceiptConsent(api)` -> `{ status: 'loading'|'ready'|'error', granted, busy, error, set(granted), reload }`. Loads once; `set` calls `api.setConsent` and takes the server's answer as the new state (never optimistic); a failure keeps the old state and sets `error`. Ignores results after unmount.
5. `ReceiptConsentSwitch.jsx`: props `api`, `provider` (string, default `'OpenAI'`), `consent` (optional result of `useReceiptConsent`; when absent the component creates its own), `onChange(granted)`, `sx`. Renders an MUI `FormControlLabel` + `Switch` (`inputProps` with an accessible name) whose label is the copy "Belege dürfen für die automatische Erkennung an {provider} übermittelt werden. Jederzeit widerrufbar." Disabled while loading or busy; on load error shows an `Alert` (`Receipts.CONSENT_ERROR`) with a retry button. Usable on its own on a profile page.
6. `ReceiptReviewDialog.jsx`: props `open`, `receipt`, `values` (the form's current values keyed by field key: `merchant`, `date`, `total`, `currency`, `payment_method`, `account`, `items`, and any extension key), `fieldLabels` (partial map key -> label overriding the defaults), `extraFields` (optional array of `{ key, label, format?: (value) => string }` shown after the core fields for extension keys the receipt carries), `accountLabel` (optional `(accountId) => string`, default the id), `onApply(values, { mode })`, `onClose`. Rows, in order: merchant, date, total (shown with the currency, e.g. "CHF 14.60"), currency, payment_method (labels `Receipts.PAYMENT_cash/card/other`; `unknown` is not a recognised value and is skipped), account (the first suggestion that has an `account_id`; chip when its confidence is low), items (list of description and amount), then `extraFields`. A field the receipt did not recognise (empty string, empty list, missing) is not shown. Each row shows: the recognised value; when the form's current value is non-empty and differs, the form value struck through beside it; when equal (compare trimmed, case-insensitive; `total` numerically; `items` by length and entries) the note "wie im Formular" and NO apply button; the "unsicher" chip when the receipt's `confidence` is low (on every row) or the account suggestion's confidence is low (on the account row only), otherwise no chip on a row (the "sicher" chip is only used by the picker); button "Übernehmen" per row calling `onApply({ [key]: value }, { mode: 'field' })` (dialog stays open). Footer: "Schliessen" (`onClose`), "Nur leere Felder" (hands over only rows whose form value is empty: `''`, `null`, `undefined`, `[]`; `mode: 'empty'`; closes afterwards via `onClose`), "Alle übernehmen" (hands over every recognised row, `mode: 'all'`; closes afterwards). Hand-over values: strings for merchant, date (ISO), total (decimal string), currency, payment_method (the enum), `account` (the account id), `items` (the array), extension keys verbatim. Buttons that would hand over nothing are disabled. Dialog below the `sm` breakpoint is a bottom sheet (MUI `Drawer anchor="bottom"`, paper top corners rounded by the theme, height 92 percent, footer buttons stacked with "Alle übernehmen" first); at `sm` and up an MUI `Dialog` `maxWidth="sm"` `fullWidth`. Title "Erkannte Werte". All values are rendered as text (never HTML).
7. `ReceiptPicker.jsx`: props `receipts`, `imageUrl` (object URL of the photo, optional), `onConfirm(selectedReceipts)`, `onCancel`, `confirmLabel` (optional `(n) => node`), `fieldLabels`, `sx`. Title "{n} Belege erkannt". One selectable card per receipt (MUI `Card`, a real checkbox inside, whole card toggles): a crop preview (a `div` with the photo as `backgroundImage`, positioned and sized from `receipt.box` so that exactly that fraction of the image shows, `backgroundSize` computed from the box width and height; a neutral placeholder when there is no box or no image), the merchant (or "Unleserlich" when empty), the date and amount ("14.10.2026 · CHF 14.60", or "Betrag nicht erkannt" when the total is empty), and the chip "sicher" or "unsicher" by `confidence`. Receipts with low confidence start unselected, others selected. Buttons "Abbrechen" (`Receipts.CANCEL`) and the confirm button, label "{n} übernehmen" by default, disabled with nothing selected; confirm calls `onConfirm` with exactly the selected receipts in their original order. Selection state resets when the `receipts` array identity changes. Grid: three columns from `md`, one column below `sm`.
8. `ReceiptCaptureCard.jsx`: props `api` (default `defaultReceiptsApi`), `provider`, `context` (object sent as `context`), `values`, `fieldLabels`, `extraFields`, `accountLabel` (all passed to the review dialog), `onApply(values, { mode })`, `onSelectReceipts(receipts)` (called with the picker's selection when a photo held several receipts), `confirmLabel`, `onUploadOnly(file)` (host attaches the file without recognition; the "Nur hochladen" button is only rendered when this prop is given), `onFile(file)` (optional: called with the prepared file whenever a recognition starts, so the host can store it), `onReset`, `disabled`, `sx`. Behaviour:
   - Without consent (`granted === false`): show the consent switch with its text and, if `onUploadOnly` is given, the button "Nur hochladen" which opens the file chooser (accept `RECEIPT_ACCEPT`), validates with `receiptFileProblem` and then calls `onUploadOnly(file)` without any recognition request; the camera and file buttons are NOT shown. While consent is loading show a small progress. When the user switches consent on, the normal capture buttons appear.
   - With consent: a drop-like panel with the primary button "Beleg fotografieren" (hidden input `type="file" accept="image/*" capture="environment"`), the outline button "Datei wählen" (hidden input with `accept={RECEIPT_ACCEPT}`), and the muted text "JPG, PNG, HEIC oder PDF". After choosing a file: validate (`receiptFileProblem`), prepare (`prepareReceiptFile`), validate again, then `api.readReceipts(prepared, { context, onUploadProgress, signal })`. State machine `idle | reading | review | picker | error`. While reading: the preview (an `img` from an object URL for images, a file-name line for PDF/HEIC where no preview is possible) and a determinate or indeterminate `LinearProgress` with "Beleg wird gelesen …" (`role="status"`); the previous request is aborted when another file is chosen or the component unmounts; object URLs are revoked.
   - Result with exactly one receipt: show the preview with the item boxes outlined (absolutely positioned boxes from `receipt.items[].box` and `receipt.box` fractions, theme primary colour, ignoring boxes with zero size), open `ReceiptReviewDialog`, and keep a button "Erkannte Werte" to reopen it after closing. Several receipts: render `ReceiptPicker` with the photo; its confirm calls `onSelectReceipts`. Zero receipts or `nothing_recognised`: `Alert` severity info with the copy "Auf diesem Beleg wurden keine Angaben erkannt. Bitte von Hand erfassen." Codes `provider_unavailable`, `spend_cap_reached`, `count_limit_reached`, `authentication_required` and any unknown failure: `Alert` severity warning "Die Belegerkennung ist im Moment nicht verfügbar. Bitte von Hand erfassen." `unsupported_file_type`, `file_too_large`, `invalid_request` (also from the client-side checks, with no request): `Alert` severity error "Diese Datei kann nicht gelesen werden. Erlaubt sind JPG, PNG, HEIC und PDF bis 10 MB." `consent_required` from the server: reload the consent (the switch appears). In every state after a file was chosen the button "Anderer Beleg" resets the card to idle and calls `onReset`.
   - The card is an MUI `Paper`/`Card` with `aria-label` "Beleg" (`Receipts.CARD_LABEL`, not in the copy list: use the already released word "Beleg"). Use the theme only: no colours, fonts or radii of your own.
9. `format.js`: `formatReceiptAmount(total, currency, language)` (decimal string to a localised currency amount using `Intl.NumberFormat`; currency code validated like `src/billing/format.js`; import `intlLocale` from `../billing/format` for the kit language codes such as `de_informal`; unparseable input returns the raw string), `formatReceiptDate(iso, language)` (valid ISO `YYYY-MM-DD` to a localised short date, else the raw string), `receiptValueEqual(key, a, b)` and `isEmptyValue(value)` helpers used by the review dialog.
10. `src/i18n/receiptsTranslations.ts`: `export const receiptsTranslations = { 'Receipts.KEY': { de, en, fr, sw } }` like `billingTranslations` (no `de_informal`: the copy is neutral). Keys, with the German from the released copy list verbatim: `CAMERA` "Beleg fotografieren", `PICK_FILE` "Datei wählen", `ACCEPTED_TYPES` "JPG, PNG, HEIC oder PDF", `READING` "Beleg wird gelesen …", `ANOTHER` "Anderer Beleg", `REVIEW_TITLE` "Erkannte Werte", `SAME_AS_FORM` "wie im Formular", `APPLY` "Übernehmen", `ONLY_EMPTY` "Nur leere Felder", `APPLY_ALL` "Alle übernehmen", `CLOSE` "Schliessen", `CERTAIN` "sicher", `UNCERTAIN` "unsicher", `RECOGNISED_COUNT` "{{n}} Belege erkannt", `APPLY_COUNT` "{{n}} übernehmen", `UNREADABLE` "Unleserlich", `AMOUNT_UNKNOWN` "Betrag nicht erkannt", `CONSENT` "Belege dürfen für die automatische Erkennung an {{provider}} übermittelt werden. Jederzeit widerrufbar.", `UPLOAD_ONLY` "Nur hochladen", `NOTHING_RECOGNISED`, `UNAVAILABLE`, `FILE_PROBLEM` (the three sentences of the list), `FIELD_merchant` "Händler", `FIELD_date` "Datum", `FIELD_total` "Betrag", `FIELD_currency` "Währung", `FIELD_payment_method` "Zahlungsart", `FIELD_account` "Konto", `FIELD_items` "Positionen". Added beyond the list, minimal and neutral: `CARD_LABEL` "Beleg", `CANCEL` "Abbrechen", `PAYMENT_cash` "Bar", `PAYMENT_card` "Karte", `PAYMENT_other` "Andere", `CONSENT_ERROR` "Die Einwilligung konnte nicht geladen werden.", `RETRY` "Erneut versuchen". Write natural English, French and Swahili; placeholders identical in all four. Field labels shown by the components come from `fieldLabels[key]` when given, else `t('Receipts.FIELD_<key>')`.
11. Registration: add `receiptsTranslations` to `src/i18n/uiCoreTranslations.js` and export it from `src/index.js` next to `billingTranslations`; in `src/index.js` export `ReceiptCaptureCard`, `ReceiptReviewDialog`, `ReceiptPicker`, `ReceiptConsentSwitch`, `useReceiptConsent`, `createReceiptsApi`, `defaultReceiptsApi`, `receiptFileProblem`, `prepareReceiptFile`, `RECEIPT_ACCEPT`, `RECEIPT_MAX_BYTES`; add `receiptsTranslations` to `tests/i18nAggregate.test.js` the way `billingTranslations` is listed.
12. Kit sx convention (enforced by `tests/themeCompleteness.test.js`): never put an inline `sx` object on a baseline-styled MUI component (`Button`, `Alert`, `Card`, `Paper`, `Chip`, `Dialog`, `Drawer`, `Switch`, `TextField`, `LinearProgress`, `FormControlLabel`, ...). Put the style in a top-level `export const NAME_SX = {...}` in the component module and register it in `src/theme/kitSxRegistry.js` (this one file, additive only) following the existing `entry(...)` and `SX_EXPORTS` pattern used for billing; never repeat a property the theme baseline already sets (radius, min height, text transform). `sx` on `Box`, `Stack`, `Typography` is not checked. Run `tests/themeCompleteness.test.js`.

### Tests to write (new files `tests/receipts*.test.jsx` / `.test.js`; imitate `tests/billingHardening.test.jsx`: mocked `react-i18next` returning keys with interpolated values, `// @vitest-environment jsdom`)

Cover everything in Part A "Required tests to write", concretely: camera input has `capture="environment"` and `accept="image/*"`, file input has the `RECEIPT_ACCEPT` list; `prepareReceiptFile` with a stubbed `Image` and canvas (as `tests/messagingComposer*.test.jsx` stub them) downsizes a large JPEG to edge <= 2400 and returns a JPEG file, returns HEIC and PDF and small images unchanged, returns the original on a decode failure; a 11 MB file and a `.gif` produce the file-problem alert and `readReceipts` is never called; HEIC with an empty MIME type but `.heic` name is accepted; without consent `readReceipts` is not called, the switch and "Nur hochladen" are shown and `onUploadOnly` receives the validated file, the camera and file buttons are absent; switching consent on calls `api.setConsent(true)` and then shows the buttons (answer of the server, not optimistic); `useReceiptConsent` keeps the old state on a failed `set`; review dialog: "Übernehmen" of one row calls `onApply` with exactly that key and `mode: 'field'`; "Nur leere Felder" hands over only the rows whose form value is empty; "Alle übernehmen" hands over every recognised row; equal values show "wie im Formular" and no apply button; differing values show the form value struck through; low confidence shows the "unsicher" chip; account row uses `accountLabel`; extension fields via `extraFields`; unrecognised fields are not shown; sheet (Drawer) at a narrow `matchMedia` and dialog at a wide one; picker: low-confidence receipts start unselected, confirm reports exactly the selected receipts in order, confirm disabled with none selected, default and custom confirm label, "Unleserlich" and "Betrag nicht erkannt" copy, crop style from `box`; edge states from codes (`nothing_recognised`, `provider_unavailable`, `spend_cap_reached`, `file_too_large`, an unknown failure, `consent_required` reloads consent); a second file aborts the first request; values from the server are rendered as text (an HTML string in `merchant` appears as text); API client: overriding one function keeps the others, URLs for a custom `apiBase`, `setConsent(false)` uses DELETE, `readReceipts` sends a FormData with `file` and a JSON `context`, no `context` key when none given; translations: every `Receipts.*` key exists in de/en/fr/sw with identical placeholders, and the keys the components use are all present. Run `tests/receipts*`, `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and nothing else.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded by the Expertenchat session (ui-core-micha@36a470c). Minor release 4.7.0 (after UCM-CHAT-6's 4.6.0). Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` and `sec_reviewer` (privacy: consent control, file to provider, no content logging or storage), run on the final combined diff, repeated after fixes to code. Evidence: a dispatched `ci.yml` run on `ci-test/UCM-RCPT-1`. Built against the DCM-RCPT-1 contract (`django-core-micha/work-orders/DCM-RCPT-1.md`), not yet published at the time of writing. ucm has no host app: the rendered side-by-side at 375 px and 1280 px runs in `spesix/SPX-RCPT-1` (that order's commit gate); the Orchestrator additionally checks the components in the dev harness (entry "Receipts") at both widths. Report to the requesting Expertenchat session `local_03d1141f-9577-4c9e-8ccf-3343b3b34a19`.
