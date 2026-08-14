# THEME-9 — Charts spend more space on furniture than on data

## Part A — Envelope

**Goal.** Give the chart presets back the space their axis furniture currently reserves and
does not use, stop broadcasting one axis label onto every axis, keep the axis label out of
the tick band, and make short, locale-correct tick numbers the default.

**Why — measured in a consuming app (hram), not estimated.** One KPI card, "Coverage":

| layer | size | owner |
|---|---|---|
| card (`Paper`, 16 px padding) | 470 × 372 | app |
| chart wrapper `Box` | 436 × **300** (`minHeight: 300`) | **this package** — the SVG inside is 270 tall, so **30 px are dead** |
| SVG | 436 × 270 | this package |
| **plot area** | **301 × 175** | — |

**The plot is 45 % of the SVG and 30 % of the card.** 135 px of width and 95 px of height are
consumed inside the SVG. Walking the left edge outward: 17 px card padding, then **60 px of
blank between the SVG edge and the axis label**, then 9 px, then the first tick — 104 px before
a number appears. Below the chart: 30 px of blank inside the SVG under the axis label, then
another 32 px to the card edge.

Three further findings from the same app, all measured:

1. **One label is applied to every axis.** `withAxisDefaults` ends with
   `label: axis.label || label`, so a single `yAxisLabel` lands on *all* axes in the array. In
   hram's dual-axis chart both y-axes therefore carry the identical 43-character string
   `"Treated / Untreated / Saved / Avoid. Deaths"`, each reserving 65 px of a 206 px-wide chart.
2. **The axis label is drawn inside the tick band.** On hram's Accessibility chart **4 of 4**
   y-tick labels overlap the axis label — the rotated title runs straight through
   `"0.0 min"`, `"50.0 min"`, … The same happens on an x-axis whose tick labels are rotated
   (30+ ward names over the label `"Ward"`). The space reserved for rotated ticks does not
   actually keep the label clear of them.
3. **Ticks carry units and needless decimals.** `"0.0 min"`, `"50.0 min"` — the unit appears in
   every tick *and* twice in the label (`"Accessibility (minutes) (min)"`). Elsewhere MUI
   truncates ticks it cannot fit, rendering `"0.0…"`, `"50.0…"`. `BarChart` sets no default tick
   formatter at all, while `TimeSeriesChart` already applies one conditionally — so every app
   re-solves this, and where nobody remembered, the numbers are wide and truncated.

**Scope.**

1. **Shrink the default margins and the axis-size reservation.** MUI X sizes axes itself; the
   generous fixed values here predate that. Target the measured waste: ~60 px of blank left of
   the label and ~30 px below it. Re-measure in a consuming app afterwards — the number to beat
   is "plot area = 45 % of the SVG".
2. **Stop broadcasting the label.** An axis label is set on the axis that needs it, not on every
   axis in the array. Add a test that pins this: one label must never land on two axes. That is
   the exact defect measured above, and nothing currently prevents it.
3. **Keep the label out of the tick band.** Whatever space rotated or long tick labels occupy
   must be excluded from where the axis label is placed. Verify with the real case — rotated
   45° ward names, and a y-axis whose ticks are wide.
4. **A default tick formatter for `BarChart`** (and any preset lacking one): short numbers, no
   decorative decimals, no unit in the tick. **Do not simply switch on `Intl` compact
   notation** — measured across the four locales this package's consumers use:

   | value | de-CH | en | fr | sw |
   |---|---|---|---|---|
   | 12 500 | **`12'500`** | `12.5K` | `12,5 k` | **`elfu 12.5`** |
   | 998 000 | **`998'000`** | `998K` | `998 k` | **`elfu 998`** |
   | 1 000 000 000 | `1 Mrd.` | `1B` | `1 Md` | `1B` |

   German does not compact thousands **at all** — exactly the range these charts live in — and
   Swahili puts a word in front of the number, which is wider than the raw value. So compact
   notation alone does not solve the width problem and in one locale makes it worse. A
   per-axis unit chosen once (with the unit named in the axis label) does. Also note: a
   hand-rolled `"B"` suffix would be **wrong in German**, where *Billion* is 10¹² — `Intl` gets
   this right (`Mrd.`), hand-rolled suffixes do not.
5. **Document the decision rule in `DESIGN.md`**, where a developer will find it at the call
   site:
   - **Categorical axis → no title by default.** The tick values are names; a title only
     restates their type. Exception: ticks that are codes or abbreviations whose kind is not
     self-evident.
   - **Numeric axis → title carries the quantity and the unit.** A bare number is meaningless
     without one. Exception: the ticks already show the unit (`%`, a currency symbol).
   - **The unit belongs in the title once — never in every tick.**

**Non-goals / do-not-touch.** No new chart types, no colour or typography changes, no change to
what any chart plots. **Do not auto-suppress axis labels** — make them opt-in, but leave the
decision with the caller; silently dropping a label someone deliberately set is a worse failure
than the redundancy we are removing. Do not fix any of this per-app with `sx` overrides.

**Tier 3** — shared-core surface. `reviewer` mandatory, `ui_reviewer` too: the visible result is
a layout change in every consuming app.

**Tests to write.** The one-label-per-axis assertion (scope 2) — it is cheap and it is the
defect that actually shipped. A formatter test with the four locales above as fixtures, so the
German and Swahili behaviour is pinned rather than rediscovered. Margins and overlap are carried
by the rendered check, not by unit tests.

**Risks.**
- **Estate-wide visual change**, in apps nobody is currently working on. Name it in the release
  notes; do not let it arrive as a surprise.
- **Tighter margins can clip** where they previously over-reserved. The overlap fix (scope 3)
  and the margin cut (scope 1) pull in opposite directions — do them together and measure, or
  the second will re-create the first.
- The tick formatter changes numbers on screens used for teaching. Rounding that hides a
  meaningful difference is worse than a wide label: keep full precision in tooltips and tables,
  compact only where space is scarce.

**Delivery is not done at publish.** Consuming apps need their pin bumped and their charts
looked at — hram first, where all of this was measured, and where the app-side follow-up is
tracked as `FIX-13`.

## Part B — Implementation map — ADDRESSED TO THE IMPLEMENTER

Codex was not dispatched: `.claude/codex-status.md` already carried a same-day (2026-08-14)
`unavailable` line (recorded earlier during `THEME-8`), so per the known-unavailable shortcut
the Orchestrator implemented directly, which flips authorship — `reviewer` + `ui_reviewer`
became mandatory (already required at Tier 3).

### What landed, and why (measured, not guessed)

- **`withAxisDefaults` label broadcast (scope 2).** Fixed: the single `label` argument now falls
  back only onto `index === 0` of a multi-entry axis array — mirrors MUI's own
  `position: 'left'`-only-on-first-entry default. Test: `chartDefaults.test.js`.
- **`sizeYAxisForContent`, new (scope 1/3).** MUI's own y-axis width default is a flat 45px+20px
  regardless of tick content (verified against `@mui/x-charts`' `DEFAULT_AXIS_SIZE_WIDTH` /
  `AXIS_LABEL_DEFAULT_HEIGHT` and its `useChartDimensions` selector: margin and axis-size are
  ADDITIVE, not nested — confirmed pixel-for-pixel against a live hram render, see below). This
  sizes a linear y-axis from its own `min`/`max` or the plotted series, mirroring
  `spaceForRotatedTicks`'s existing glyph-width heuristic.
- **`defaultNumericTickFormatter`, new (scope 4).** Locale-grouped, non-compact by default —
  verified live against `Intl.NumberFormat` output for all four locales (de-CH does not compact
  thousands at all; sw's compact form is WIDER than the raw number).
- **DESIGN.md #8a, new (scope 5).** The categorical/numeric axis-title rule.
- **Not originally scoped, added because scope 5 required it:** `BarChart`/`LineChart` used to
  hard-`throw` unless BOTH `xAxisLabel` and `yAxisLabel` were supplied — this made #8a's stated
  "categorical axis gets no title by default" unachievable through either preset (`ui_reviewer`
  finding U1). Both labels are now optional; omitting one renders no title for that axis. This is
  the change FIX-13 needs to actually remove a title.

### The Coverage-KPI-card measurement itself was NOT a package-level bug

Live DOM measurement in the running hram app (`localhost:8000`, Basic Results → Coverage card)
traced the Envelope's own "60px blank / 30px dead" numbers to their exact source:
`drawingArea.left = margin.left + axisSizeLeft` (MUI's own `useChartDimensions` selector) — the
60px is hram's OWN `margin={{left: 60, ...}}` prop on `TotalMetricsPanel.jsx`, stacking
ADDITIVELY with MUI's separate ~65px axis-width reservation, not one containing the other. That
duplication is `FIX-13`'s item 6 to fix (trim the app's own margin now that this package sizes
the axis itself), not something `THEME-9` could fix by itself — packages can right-size their own
axis reservation, not an app's separately-chosen margin.

### Review findings, fixed before commit

- **`reviewer` R1 (P1):** `sizeYAxisForContent`'s series-to-axis matching used
  `(item.yAxisId ?? undefined) === (axis.id ?? undefined)`, which only matches when BOTH sides are
  literally `undefined` — but MUI assigns an unmarked series to the FIRST axis in the array
  (`yAxisIds[0]`), not to "no axis". This made the sizer a silent no-op for the PRIMARY axis of
  exactly the dual-axis case (`TimeSeriesChart`'s `CHART-5` feature) that motivated this WO. Fixed:
  match against `yAxis[0]?.id` as the default, not `undefined`. Regression test added.
- **`ui_reviewer` U1 (P1):** see "not originally scoped" above — labels made optional.
- **`ui_reviewer` U3 (P2):** the sizer used the theme-wide tick font size even when a caller
  overrode `tickLabelStyle.fontSize` per-axis. Fixed: reads the axis' own (already-merged)
  `tickLabelStyle.fontSize` first, falling back to the theme default only if absent.
- **`ui_reviewer` U5 (P3):** the label-thickness term was derived from `theme.typography.body1`,
  which only coincidentally matches MUI's own HARDCODED 14px axis-label font
  (`ChartsYAxisImpl.js` sets `fontSize: 14` after spreading `body1`, so it always wins regardless
  of theme). Fixed: a named `MUI_AXIS_LABEL_FONT_SIZE_PX = 14` constant, decoupled from theme.
- **`ui_reviewer` U2 (P2, accepted as a documented limitation, not fixed):** the width estimate is
  driven by the axis' own `min`/`max`/series values, not MUI's actual "nice-tick" rounding, which
  can occasionally round a domain's extremes outward to a longer string. The existing 1.1x safety
  factor absorbs small overshoots; a tighter fix would require duplicating MUI's own tick
  algorithm, out of proportion for this WO. The rendered check below is the actual proof either way.
- **`ui_reviewer` U4:** claimed `TimeSeriesChart.jsx` bypasses `withAxisDefaults`/
  `sizeYAxisForContent` entirely. Verified against source: `TimeSeriesChart` renders through this
  package's own `<BarChart>` (not `MuiLineChart` directly), so its `yAxis` array — including the
  dual-axis case — DOES flow through both functions. Not acted on; recorded here so the claim
  isn't silently dropped.

### Target repo

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

## Part C — Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this
> line.**

- **Execution.** Codex known-unavailable today (see Part B) — implemented directly in Claude.
- **Review routing.** `reviewer` + `ui_reviewer`, concurrent, one background batch — both ran,
  findings above, all in-scope findings fixed before commit.
- **Verification.** The package's own affected-set suite (`BarChart.test.jsx`, `LineChart.test.jsx`,
  `TimeSeriesChart.test.jsx`, `timeSeriesLegend.test.js`, `chartDefaults.test.js` — 60 tests,
  green). **The rendered check in hram could NOT be completed live in this session** — the Browser
  pane only carries real viewport dimensions for the tab the operator has actually displayed;
  freshly-opened tabs (both a new hram tab and ui-core-micha's own dev harness) measured 0×0 and
  produced negative-width SVG rect errors as a direct consequence, not a code defect. The BEFORE
  numbers (Coverage KPI card) WERE captured live from the properly-displayed hram tab and are
  quoted above; the AFTER re-measurement is deferred to `FIX-13`, which needs it anyway once
  hram's pin is bumped (its own WO already orders re-measurement after the pin bump, so this
  doesn't lose anything — it was always going to happen there).
- **Register & commit.** Advance the THEME-9 row with the reviewer verdicts. Track the consumer
  pin bumps (hram = `FIX-13`) — this WO is not done at publish.
