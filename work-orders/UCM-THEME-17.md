# UCM-THEME-17: Decide a less compressed baseline type scale

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

The baseline's heading steps are too small to carry a hierarchy. Page title, card title and section label
differ by 1 to 3 px, so screens rely on weight alone, and where every level is bold the levels merge. This
order produces the **decided** type scale as a committed reference sheet that the operator freezes. A
later implementation order puts it into `src/theme/tokens.js`. The output here is a document, no code.

Operator decision (2026-10-04): treat this as a baseline finding, the way dark mode was treated
(`UCM-THEME-13`), not as per-app overrides.

## Context the operator established

- **The baseline scale today** (`src/theme/tokens.js:157-168`): h1 32, h2 28, h3 24, h4 20, h5 18, h6 16,
  subtitle1 15/600, subtitle2 13/500, body1 14, body2 13, button 14/500, caption 12, overline 11 (px).
- **Measured on rendered screens, 2026-10-04** (computed styles in the browser):

  | Screen | Page title | Card title | Section | Text |
  |---|---|---|---|---|
  | hram, Research | h4 20/500 | h5 18/500 | subtitle1 15/600 | 14 |
  | jg-ferien, Dashboard | h5 18/600 | h6 16/600 | – | 14, partly 600 |
  | kerzenziehen, Admin | h5 18/600 | – | – | 14 |
  | survey_app site (operator screenshots) | h4 20/800 | h6 16/800 | – | – |
  | for comparison, the MUI scale (spesix, stale local build) | h4 34 | h5 24 | – | 16 |

- **Operator feedback:** survey_app editor and sites read "more harmonious" at the old MUI sizes, and on the
  sites the section title and the question labels became indistinguishable. jg-ferien already restored its
  own sizes (`jg-ferien` `JG-DL-7`). Six other apps accepted the baseline scale without comment.
- **The MUI scale is the other extreme**: 34/24 px titles read heavy in a dense tool.

## Scope + non-goals

In scope: an inventory of the type sizes the estate actually uses (app overrides, prototypes, the
`THEME-1` reference sheet's own reasoning); an instrument showing two to three candidate scales next to
today's baseline and the MUI default, on real screens (hram Research, a survey site, the jg-ferien dashboard,
a kerzenziehen admin view), at 375 px and 1280 px; value rounds; a frozen sheet with provenance and the
rejected candidates.

Non-goals:
- No code, no tests (the implementation is a separate order).
- No change to font families. Apps keep their identity fonts.
- No per-app decisions. App overrides that exist only to escape the compressed scale (survey_app's planned
  revert, `JG-DL-7`) are reviewed after the freeze, not here.

## Tier · precondition / gate

- **Tier 2 · tests: none (document only).** It decides future shared-core content but changes none.
- Precondition: none.
- Gate: **the operator freezes the sheet**, with a dated section in it.

## Risks

- **Every adopted app moves with the baseline.** A new scale changes the look of ten-plus apps at once; the
  instrument has to show the dense tool screens, not only reading screens.
- **Bigger steps cost vertical space** on dense screens (hram, cockpit). The candidates must be judged
  there, not only on the survey sites.
- **Weight and size interact.** The fix may be partly a weight rule (fewer bold levels), not only sizes.

---

# B. Implementation map

*Not applicable. This is an Expertenchat document order, authored in-session with the operator.*

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this: STOP.** There is no implementer for this order.

Register: row -> `done` with the commit of the frozen sheet. Then the implementation order is written.
