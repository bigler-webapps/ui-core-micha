# Baseline type scale

Reference sheet for `UCM-THEME-17`. **This file is the value source** for the baseline typography:
`UCM-THEME-18` takes every value from here by variant name, and if code and this sheet ever disagree, this
sheet is the one to fix first.

Instrument: [`work-orders/assets/UCM-THEME-17-type-scale.html`](../work-orders/assets/UCM-THEME-17-type-scale.html)
(the candidates beside today's baseline and the MUI default on four estate screens at 375 px and 1280 px; sizes,
ratios and frame heights are measured in the page).

## Frozen

**Frozen 2026-10-04 by the operator** ("Ja, einfrieren"), after two value rounds.

## Why the scale changed

The previous baseline stepped its headings by 1 to 3 px (h4 20, h5 18, h6 16, subtitle1 15), so hierarchy rested
on weight alone, and where apps raised every level to 700 or 800 the levels merged (survey_app sites, operator
screenshots 2026-10-04). The approved prototypes in the estate had used the larger title step all along: screen
title about 1.7x body at 1280 px, stepped down on mobile, section labels below body size.

## Structural decisions (operator, 2026-10-04)

1. **One scale** for every app and page type; no separate reading register. Body stays at the tool density
   (`jg-ferien` `JG-DL-7` had rejected a larger body).
2. **The screen title (h4) steps down on narrow screens.** No other variant does.
3. **Size carries the hierarchy, weight is fixed**: every heading 600. App overrides are for font family, not
   for per-level weight.
4. **The section label (subtitle1) sits below body size**, set apart by weight.

Role mapping, unchanged from the `THEME-1` sheet: h4 screen title, h5 panel or dialog, h6 card title,
subtitle1 section label.

## Token table

| Variant | Before | Frozen | Weight | Line height | Origin |
|---|---|---|---|---|---|
| h1 | 32 | **36** | 600 | 1.2 | derived: 4 px steps above h3 |
| h2 | 28 | **32** | 600 | 1.22 | derived: 4 px steps above h3 |
| h3 | 24 | **28** | 600 | 1.25 | derived: 4 px above h4 |
| h4, screen title | 20 | **24** | 600 | 1.3 | distilled: prototype median (KZ-UI-1, UX-10, JG-MEM-1) |
| h4 below `sm` (600 px) | 20 | **23** | 600 | 1.3 | decided round 2: the smallest size that keeps h4 : h5 at 1.12 or more on mobile. The breakpoint is the baseline's own `sm`, derived, not judged |
| h5, panel | 18 | **20** | 600 | 1.3 | distilled: prototypes 18 to 20 |
| h6, card title | 16 | 16 | 600 | 1.35 | unchanged |
| subtitle1, section label | 15/600 | **13** | 600 | 1.4 | distilled: prototypes 12 to 13 at 600 to 700 |
| subtitle2 | 13/500 | 13 | 500 | 1.4 | unchanged |
| body1 | 14 | 14 | 400 | 1.55 | unchanged (decision 1) |
| body2 | 13 | 13 | 400 | 1.55 | unchanged |
| button | 14/500 | 14 | 500 | 1.4 | unchanged |
| caption | 12 | 12 | 400 | 1.4 | unchanged |
| overline | 11/600 | 11 | 600 | 1.4 | unchanged |

Sizes in px. `letterSpacing` 0 throughout, overline 0.4px uppercase as before.

## Measurements (computed in the instrument, 2026-10-04)

| Ratio | Before | Frozen | MUI |
|---|---|---|---|
| h4 : h5 at 1280 | 1.11 | 1.20 | 1.42 |
| h4 : h5 at 375 | 1.11 | 1.15 | 1.42 |
| h5 : h6 | 1.13 | 1.25 | 1.20 |
| h6 : body1 | 1.14 | 1.14 | 1.25 |
| h4 : body1 at 1280 / 375 | 1.43 / 1.43 | 1.71 / 1.64 | 2.13 / 2.13 |
| subtitle1 : body1 | 1.07 | 0.93 | 1.00 |

The instrument works with a threshold of 1.12 between two heading levels at the same weight. That number is this
sheet's working assumption, not a standard.

Frame height against the previous baseline: hram Research -1.1 % / -1.0 % (375 / 1280), jg-ferien dashboard
+0.5 % / +0.5 %, kerzenziehen admin -1.4 % / -1.3 %, survey site +0.7 % / +0.8 %. The smaller section label offsets
the larger titles; the vertical-space risk named in the work order does not occur. MUI by comparison: +4 to +18 %.

## Rejected, and why

- **Candidate A** (h4 22, h5 18, h6 16, subtitle1 13): leaves h5 : h6 at 1.13, the panel and card stay as
  close as before.
- **Candidate C** (h4 28, h5 22, h6 17, subtitle1 12): the counter-test; closest to MUI, largest height cost
  (up to +2.3 %).
- **Mobile title at desktop minus 2** (round 1, B at 22): h4 : h5 on mobile falls to 1.10, as close as before.
- **h1 to h3 kept at 32 / 28 / 24**: h3 would equal the new h4 and drop out as a level.
- **The MUI scale**: body 16 is the size `jg-ferien` already rejected for tool screens.

## Known consequences outside this repo

These are inputs for the per-app follow-up after the release, not part of the baseline:

- **Screens that use another variant as their screen title** do not get the new title value or the mobile step.
  Measured 2026-10-04 (first heading variant in each `*Page.jsx`, a heuristic): hram 5 pages h5, jg-ferien 3 pages
  h5 (`DashboardPage.jsx:187`), kerzenziehen admin h5 (rendered measurement), spesix 1 page h5, fitness-monitor
  1 page h5; survey_app uses h3 on 7 pages, which grows from 24 to 28.
- **Per-level weight overrides** contradict decision 3: survey_app (h1 to h6 800/700, site builder 800),
  hram (500), spesix (weights). survey_app's held typography revert (`SVA-THEME-1`) is decided by this sheet.
- **subtitle1 also serves as a title, not only as a section label** (added 2026-10-04, after the freeze; the
  inventory missed it, because it read subtitle1 only in its section-label role on hram Research). Uses in
  `src/`: hram 72, jg-ferien 39, ui-core-micha itself 12 (`UserMenu` user name, `SectionNav` active item,
  announcement titles), innoservice 9, survey_app 7, reimbursements 6, spesix 5. As item or panel titles they
  fall below body size. **Decided at the jg-ferien pilot `JG-DEPS-4`, 2026-10-04: subtitle1 stays at 13 px.**
  The operator looked at jg-ferien on the 3.12.0 build, including `FinanceSummaryPanel` with subtitle1 as a
  panel section title, and accepted it without any remapping. Rollout orders therefore do not remap
  subtitle1 by default; a remap happens only where an app's own look rejects a specific screen.
- **Exception to decision 3: spesix keeps its own heading weights** (operator, 2026-10-04, at `SPX-DEP-3`). Its
  `DESIGN` block (h1 800, h2-h5 700, h6 600, button 700) belongs to a decided design (`SPX-THEME-1`, identity
  bucket), and the new sizes separate the levels on their own. survey_app's 800/700 weights are not covered by
  this exception: there the operator found the bold levels themselves to be the problem.
- webshop-guenter keeps its handoff scale (decided brand, identity bucket). Kira, Cinevia and Gustav use no MUI
  heading variants and are unaffected.

## Unverified

Declared, not shown by the static instrument: long titles wrapping in French and German at 375 px, dialogs,
the h1 to h3 sizes on real public pages, and the step at exactly 600 px.
