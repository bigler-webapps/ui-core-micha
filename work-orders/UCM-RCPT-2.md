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

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Patch release. The rendered side-by-side at 375 px and 1280 px against the prototype is the commit gate. ucm has no host app, so run it in spesix's local stack, as in `SPX-RCPT-1`. Agree the image count before taking images.
