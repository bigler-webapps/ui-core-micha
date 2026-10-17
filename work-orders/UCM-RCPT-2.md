# UCM-RCPT-2 — The receipt review matches its prototype, and line items render correctly

Prepared: 2026-10-17. Target repository: `ui-core-micha` (`main`). Correction to `UCM-RCPT-1` (4.7.0), found in the rendered comparison of `spesix/SPX-RCPT-1`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The rendered comparison in spesix against the prototype `work-orders/assets/UCM-RCPT-1-receipt-capture.html` shows that `ReceiptReviewDialog` deviates from its visual spec at five points. It also has one defect: when the host's form already holds line items, the review prints them as "[object Object]", struck through.

Expected outcome: the review dialog at 1280 px and the review sheet at 375 px match the prototype frames, and line items render as items in every case.

## Visual spec

The `UCM-RCPT-1` prototype, frames "1280 px · receipt read, review dialog open over the expense form" and "375 px · review as a sheet". **Parity guardrail:** look and layout only. Behaviour, the `onApply` contract and the props stay as in 4.7.x.

## Operator decisions this Envelope records (2026-10-17)

- The deviations are corrected in ui-core-micha, not worked around in the apps.

## Scope

1. **Row layout at wide widths:** each recognised field is one row with three columns (label, value, action) and a divider between rows, as in the prototype. At narrow widths the label stays above the value, as drawn in the sheet.
2. **"Uncertain" chip:** a soft warning tint with warning-coloured text, as in the prototype, not a solid fill.
3. **Sheet at 375 px:** its height follows its content up to the available height, not a fixed 92 %. Its three actions are full-width buttons stacked in the drawn order ("Alle übernehmen", "Nur leere Felder", "Schliessen").
4. **Currency:** shown together with the amount ("CHF 14.60"), not as a row of its own. Applying the amount still hands over amount and currency.
5. **Date:** the long form with a four-digit year (14.10.2026 in German), following the active language.
6. **Line items (defect):** the form's current items and the recognised items both render as item lists (description and amount). Blank rows count as empty. An items value is never printed through string conversion.

## Copy list

None new.

## Token delta list

None. The prototype's values come from the theme.

## Non-goals

- Changes to the capture card, the picker, the consent switch, the API client or the props.
- Changes in the consuming apps; they take the patch with their next pin bump.

## Tier

Tier 3: a change inside shared-core. Visual corrections plus one defect.

## Risks

- **Layout regressions in hosts** that rely on the stacked rows. None is known; the props stay unchanged.

## Required tests to write

- Items:
  - existing form items and recognised items render as lists;
  - blank rows count as empty;
  - "[object Object]" never appears.
- Currency: it shows with the amount, and applying the amount hands over amount and currency.
- Date: the long format follows the active language.
- Sheet: the actions are full width and in the drawn order.
- Without any change to props, the existing receipt tests pass, apart from tests that pinned the old layout.

# B. Implementation map — addressed to the implementer

Work from this package; do not explore broadly. Part A is the authoritative spec. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only `src/receipts/ReceiptReviewDialog.jsx`, `src/receipts/format.js`, `src/theme/kitSxRegistry.js` (additive, only for the new exported sx objects), `src/i18n/receiptsTranslations.ts` ONLY if a key is truly needed (none is expected: the copy list says none new) and the tests named below. The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not change any prop, the `onApply` contract (`onApply(values, { mode })`, modes `field`, `empty`, `all`; hand-over values keyed `merchant`, `date`, `total`, `currency`, `payment_method`, `account`, `items` and extension keys) or the other receipt components.

### Visual spec — read the prototype

Open `work-orders/assets/UCM-RCPT-1-receipt-capture.html` (CSS and the two frames "1280 px · receipt read, review dialog open over the expense form" and "375 px · review as a sheet"; classes `.dialog`, `.sheet`, `.d-head`, `.d-body`, `.d-foot`, `.sug`, `.k`, `.v`, `.new`, `.old`, `.same`, `.chip.low`, `.items`, `.item`). The components take every colour, type size and radius from the MUI theme; the prototype's literals are only the proportions. Current implementation: `src/receipts/ReceiptReviewDialog.jsx` (one long file; keep it readable while you edit: split long lines you touch).

### Changes (six points, all in `ReceiptReviewDialog.jsx` unless noted)

1. **Row layout.** Each recognised field is ONE row, a CSS grid. From `sm` up: three columns `120px minmax(0, 1fr) auto` = label (small secondary text, like `.k`), value block (the recognised value in semibold, below it the "wie im Formular" note or the struck-through form value in secondary text, like `.v`/`.new`/`.old`/`.same`), action (the "Übernehmen" button, vertically centred; no button when the value equals the form's). A divider (`1px solid` theme `divider` colour, subtle, like `.sug`) separates rows: a bottom border on every row except the last. Below `sm`: the label takes the full first line above the value (grid-column 1 / -1) and the value and action share the next line, as in the sheet frame. Row padding about 9 px top and bottom as drawn (use theme spacing, `py: 1.125`). No `Stack spacing` between rows any more. Export the row style as `RECEIPT_REVIEW_ROW_SX` (replace the existing object; keep the export name) with responsive values.
2. **Uncertain chip.** A soft tint: background the warning colour at about 12 percent opacity, text the warning colour (`alpha(theme.palette.warning.main, 0.12)` with `warning.dark` text; no solid fill, no `color="warning"` filled variant), height about 22 px, bold small text, as `.chip.low`. Put it in a new top-level `export const RECEIPT_REVIEW_CHIP_SX` (a function of the theme is allowed: `(theme) => ({ ... })`) and register it in `src/theme/kitSxRegistry.js` with `entry(...)` for `MuiChip` the way the receipt picker's or `ChatThread`'s chip entries are registered (read the registry first), without repeating properties the theme baseline of `MuiChip` already sets. `tests/themeCompleteness.test.js` must pass. Keep the `Receipts.UNCERTAIN` text.
3. **Sheet at narrow widths (below `sm`).** The Drawer paper has NO fixed height: replace `RECEIPT_REVIEW_SHEET_PAPER_SX` by `{ maxHeight: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column' }` (rounded top corners come from the theme/prototype radius: `borderTopLeftRadius` and `borderTopRightRadius` from `theme.shape.borderRadius * 2` if the baseline does not set them) so the sheet is as high as its content up to the available height; the `DialogContent` is the scrolling flex child (`overflowY: auto`, `flex: 1 1 auto`). The three actions are FULL-WIDTH buttons stacked in the drawn order from top to bottom: "Alle übernehmen" (contained), "Nur leere Felder" (outlined), "Schliessen" (text). At `sm` and up the actions stay in one row aligned to the end in the order "Schliessen" (text), "Nur leere Felder" (outlined), "Alle übernehmen" (contained), as in the 1280 frame. Replace the `order`-based CSS trick in `RECEIPT_REVIEW_ACTIONS_SX` by rendering the buttons in the right DOM order per breakpoint (the existing `mobile` flag from `useMediaQuery`), so the DOM order equals the visual order and keyboard order. Buttons keep their disabled rules. The dialog (wide) has `maxWidth="sm"`, `fullWidth`; the prototype's 640 px is satisfied by `sm` (600) plus paddings: keep `maxWidth="sm"`.
4. **Currency with the amount.** Remove the separate `currency` row. The `total` row shows the amount with the currency as now (`formatReceiptAmount(total, currency, language)`, e.g. "CHF 14.60" in the locale's currency style). Hand-over: `Übernehmen` on the total row calls `onApply({ total, currency }, { mode: 'field' })` (currency is added only when the receipt recognised one); "Alle übernehmen" hands over `total` and `currency` (when recognised) together with the other rows; "Nur leere Felder": the total row is included (with its currency) when the form's `total` is empty; when the form's `total` is NOT empty but the form's `currency` is empty and the receipt has a currency, hand over `currency` alone. The "wie im Formular" test of the total row is true only when both the amount (numerically) and the currency (when the receipt has one and the form has one, case-insensitive; a form without currency does not count as equal) match; the struck-through form value shows the form's amount and currency together (`formatReceiptAmount(values.total, values.currency, language)`; when the form has no currency, the amount alone). The label of the row is `FIELD_total`; `FIELD_currency` stays registered (hosts may use it) but is no longer shown by the dialog.
5. **Date.** `formatReceiptDate` (in `format.js`) formats with `Intl.DateTimeFormat(intlLocale(language), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })` so German gives "14.10.2026" and English "10/14/2026", always four digits in the year; invalid input still returns the raw string as today. The picker also uses `formatReceiptDate`: its output changes the same way (accepted; adjust any test that pinned the short form).
6. **Line items (defect).** Never print an items value through string conversion. In `format.js` export `normaliseItems(value)` -> an array of `{ description, amount }` strings (trimmed) for an array whose entries are objects or strings (a string entry is a description; an object uses `description` and `amount`; numbers become strings), dropping blank entries (both fields empty), and `[]` for anything that is not an array. `isEmptyValue('items-like')` stays as is for other keys; for the `items` row the form value is treated as empty when `normaliseItems(values.items)` is empty (so an array of blank rows counts as empty for "Nur leere Felder" and shows no struck-through value). `receiptValueEqual('items', a, b)` compares the normalised lists (same length, same description and amount per position, case-insensitive trimmed). The row renders BOTH the recognised items and the form's current items (struck-through, secondary text, when different and non-empty) as lists of "description · amount" lines (a `ul` or stacked `Typography`, no bullets needed; amount right-aligned like `.item` if it fits the grid), never `String(current)`. Any other non-string form value of a non-items row is shown only when it is a string or a number; otherwise it is not shown (never `[object Object]`).

### Tests to write (extend `tests/receiptsComponents.test.jsx` and `tests/receiptsReviewFixes.test.jsx` where they pinned the old layout or the separate currency row, plus a new file `tests/receiptsReviewParity.test.jsx`; same mocks as `tests/receiptsReviewFixes.test.jsx`)

Cover Part A "Required tests" concretely: form items given as objects (`[{ description: 'Tea', amount: '2.00' }]`) and strings render as list lines and the text "[object Object]" never appears anywhere in the dialog (also with unknown object shapes and with nested objects); the recognised items render as list lines with description and amount; blank rows (`[{}, { description: '', amount: '' }, ' ']`) count as empty: no struck-through value, "Nur leere Felder" hands over the recognised items, and the "wie im Formular" note does not show; equal item lists show "wie im Formular" and no apply button; currency: no row labelled with `Receipts.FIELD_currency`, the total row text contains the currency code with the amount, `Übernehmen` on the total hands over exactly `{ total, currency }` with `mode: 'field'`, "Alle übernehmen" hands over total and currency once each, "Nur leere Felder" with an empty form total hands over total and currency, with a filled form total and an empty form currency hands over currency alone, with both filled hands over neither; the total row shows "wie im Formular" only when amount and currency match; date: `formatReceiptDate('2026-10-14', 'de')` is `14.10.2026`, `'de_informal'` also `14.10.2026`, `'en'` is `10/14/2026`, invalid input unchanged; the dialog shows the formatted date in the active language; sheet: at a narrow `matchMedia` the three action buttons render in the order Alle übernehmen, Nur leere Felder, Schliessen in the DOM and each has full width style (no `flex` basis smaller than 100 percent: assert the computed `width` is `100%` or the buttons are `fullWidth`), at a wide one the order is Schliessen, Nur leere Felder, Alle übernehmen; the sheet paper has no fixed `height: 92%` (assert the style has no `height` and has a `max-height`); the uncertain chip has no solid warning background class (assert the chip does not carry the `MuiChip-colorWarning` filled class and its style is the tint from the exported sx); rows: each recognised field row exists once, label, value and action are in the same row element, and the last row has no bottom border (style assertion on the exported row sx or its computed style); the previous behaviours (apply a single field, only empty, apply all, extra fields, account label, HTML shown as text) still pass. Run `tests/receipts*`, `tests/themeCompleteness.test.js` and `tests/i18nAggregate.test.js` and nothing else; look at the whole vitest summary including a possible `Errors` line, not only the failures.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded (ui-core-micha@974334b, requested by the DCM/UCM Chat session `local_03d1141f-9577-4c9e-8ccf-3343b3b34a19`). Patch release 4.8.1. Tier 3: all lenses (envelope, regression, duplication, tests) plus `ui_reviewer` and `sec_reviewer` on the final combined diff, repeated after fixes to code; the `ui_reviewer` brief names the prototype `work-orders/assets/UCM-RCPT-1-receipt-capture.html` (frames "1280 px · receipt read, review dialog open over the expense form" and "375 px · review as a sheet") and asks for a point-by-point comparison of the six deviations of Part A against it, with the prototype's CSS excerpt inline. Evidence: a dispatched `ci.yml` run on `ci-test/UCM-RCPT-2`. Commit gate (requested): the rendered side-by-side at 375 px and 1280 px in spesix's local stack, exactly two images (review dialog at 1280, review sheet at 375), the count agreed in advance with the requesting session and recorded in the register Notiz; the Orchestrator additionally checks the dev harness entry "Receipts / Capture card". Report to `local_03d1141f-9577-4c9e-8ccf-3343b3b34a19`.
