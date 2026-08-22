# UCM-CHART-10 — The rotated-tick allowance is reserved twice, and the surplus is dead space

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main`, no staging step)
- **Tier:** 3 — shared-core; every consumer's chart proportions change.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/chartDefaults.js` (`spaceForRotatedTicks`, `rotatedTickMetrics`)
  and its tests. The presets only *call* the helper — do not change them.

> **Why — measured in hram, 2026-08-22, with ucm 2.42.1 loaded and real data.** `spaceForRotatedTicks`
> adds the same `extraHeight` in **two** places:
>
> ```js
> return { ...axis, height: MUI_LABELLED_X_AXIS_HEIGHT + metrics.extraHeight };   // (1) the axis band
> ...
> ? { ...margin, bottom: MUI_CHART_MARGIN_BOTTOM + largestExtraHeight }           // (2) the chart margin
> ```
>
> **In MUI v8 the axis `height` and the chart `margin.bottom` are additive.** The allowance for
> rotated tick labels is therefore counted twice, the axis band already holds the labels, and the
> margin copy is left over as an empty band below the plot.
>
> Measured on the Research → Allocation drill-down at 1280 px:
>
> | card | surface height | plot ends at | empty below the axis | x tick labels |
> |---|---|---|---|---|
> | Ward Metrics | 340 | 131 | **130 px (38 %)** | 35 |
> | Access Ladder | 340 | 131 | **130 px (38 %)** | 35 |
> | Cost | 340 | 194 | 92 px | 35 |
> | Division Metrics | 340 | 199 | 85 px | 5 |
> | Cost-effectiveness | 420 | 331 | 44 px | 22 |
> | Expert Mode: Simulation Trajectory | 340 | 287 | 8 px | 31 |
>
> Two things make this conclusive rather than suggestive. First, the empty band **scales with the
> label load** — 35 long rotated ward names cost 130 px, short labels cost 8 px. Second,
> `emptyBelowLowestLabel` equals `emptyBelowAxisLine` on **every** chart measured: the tick labels sit
> inside the axis band, and the space below them is occupied by nothing at all.
>
> **This is the same failure class as hram's tornado** (`RES-28`), where `margin.left: 220` was
> reserved *in addition to* an unsized `yAxis`, and as `UCM-CHART-8`'s `minHeight`/`height` pair:
> **space reserved in two places that add up.** Third instance in this file. Neither `UCM-CHART-8`
> nor `UCM-CHART-9` could have caught it — both worked on the wrapper box; this one is in the axis
> margin arithmetic.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

The rotated-tick allowance is reserved **once**. A chart with long rotated x labels uses its surface
for the plot, not for an empty band under the axis.

### Definition of Done

- [x] **`extraHeight` is applied once, not twice.** Kept on `axis.height` only; `margin.bottom`'s
      addition removed. MUI needs `axis.height` — the live measurement below shows rendered labels
      sit fully inside the axis band with nothing below them, i.e. the band already fully
      accommodates the rotation; `margin.bottom`'s copy was reserving space nothing used.
- [x] **The plot area grows by the reclaimed amount.** Measured live on hram (`CLI-Kilombero_2026-per_cell-network`,
      real data, 1280 px), same three cards, same candidate, before vs. after swapping in the fixed
      build: Ward Metrics (35 labels, 340 px) 129.6 px → 51.6 px empty; Access Ladder (35 labels,
      369 px) 156.9 px → 80.6 px; Division Metrics (5 labels, 340 px) 85.2 px → 41.2 px — each
      roughly halved, matching "remove exactly one of two equal additive reservations." The residual
      is the legitimate rotation-geometry padding this WO's non-goals say not to chase.
- [x] **Tick labels are not clipped.** Checked at both 1280 px and 375 px on the same three live
      cards (lowest label's rendered bottom never exceeded the SVG's own bottom edge at either
      width) — no clipping introduced by reserving less.
- [x] **Charts with no rotation are byte-identical.** Unit-tested directly against
      `spaceForRotatedTicks` (angle-0 axis entry and margin object both pass through by reference,
      not just by value) — see `tests/chartDefaults.test.js`, `spaceForRotatedTicks (CHART-10)`.
- [x] **A caller-set `margin.bottom` still wins.** Implemented as an unconditional guarantee rather
      than the named `callerSetBottom` escape hatch: `spaceForRotatedTicks` no longer writes to
      `margin` in any branch, so a caller-set value is never at risk regardless of rotation — a
      strict superset of the old conditional guard, confirmed by both independent reviewers as a
      clean simplification, not a behaviour gap. The named variable/constant it used
      (`callerSetBottom`, `MUI_CHART_MARGIN_BOTTOM`) were removed as dead code once nothing reads
      them.

### Investigate in the same pass — likely the same helper

hram reports **x-axis tick marks rendering without their labels** on scatter charts
(`AccessGapScatterPanel`, the optimization cost-effectiveness scatter) — `HRAM-RES-29` item 2, still
open. A formatter exists on both axes (`ScatterChart.jsx:193,199`), so it is not a missing formatter.
**The suspicion is that it is this same function in the other direction:** `axis.height` set to a
band the labels do not fit, so MUI draws the ticks and clips the text.

- [x] **Refuted.** `ScatterChart.jsx` never calls `spaceForRotatedTicks` at all (grep-confirmed:
      only `BarChart.jsx`/`LineChart.jsx` import it) — its x-axis `height` is never touched by this
      helper in either direction, so this function cannot be the cause. Confirmed further at the two
      named hram call sites (`AccessGapScatterPanel.jsx:203`, `OptimizationResultsPanel.jsx:1014`):
      neither sets `tickLabelStyle.angle` on its `xAxis`, so `rotatedTickMetrics` would return `null`
      even if the helper were in the path. This matches hram's own `HRAM-RES-29` register row
      (`WORK_ORDERS.md`), which had already independently traced and closed item 2 the same day
      (2026-08-22, before this WO's own "still open" line was written): the real cause was
      `ScatterChart.jsx` rendering `<MuiScatterChart>` with no explicit `height` pre-`11d362c`
      (`UCM-CHART-8`, `2.41.3`), racing MUI's own collision-avoidance against the wrapper's
      `aspect-ratio` CSS and clipping tick text with no missing formatter involved. `2.42.0` already
      fixes it for every consumer by passing a resolved `height` explicitly; hram's `develop` already
      pinned `2.42.0` (why local measurement looked clean) and only `main`/`hram.ch` (still on
      `2.41.3` at the time) showed it — closing on hram's next `develop -> main` promotion. No action
      needed here or in `HRAM-RES-29`; this WO's own suspicion is retired, not carried forward.

### Non-goals

- Do not change the four presets or `ChartFrame` — they only call this helper.
- Do not revisit `UCM-CHART-8`'s `minHeight`/`height`/`aspect` resolution or `UCM-CHART-9`'s frame
  fix. Both are correct and verified; this is a third, independent reservation.
- Do not "fix" this by shrinking `MUI_LABELLED_X_AXIS_HEIGHT` or `MUI_CHART_MARGIN_BOTTOM` — those
  constants are not the bug, the double application is.

### Risks

- **Every consumer's chart proportions change**, and in the visible direction: plots get taller. That
  is the point, but it is a shared-core publish and the rendered check below is what proves it.
- The clipping failure mode is the mirror of this one. A fix that reserves too little trades a
  cosmetic defect for an information-losing one — clipped labels are worse than empty space.
- hram's `RES-28` fixes the same class in hram's own tornado (`margin.left` vs `yAxis.width`). The
  two are independent; do not assume one closes the other.

### Tests to WRITE — narrow

- `spaceForRotatedTicks` with a rotated axis: the total reserved space equals the allowance **once**,
  asserted against the computed `axis.height` + `margin.bottom` sum — the assertion that fails today.
- Angle 0: output identical to input, axis and margin untouched.
- A caller-set `margin.bottom`: preserved, allowance not added on top.
- The longest-label path (`longestFormattedTick`) still drives the estimate.

**Rendered check before publish — numeric, on hram with real data.** The same six cards measured
above, at 1280 px and 375 px: the empty band below the axis, per card, before and after. Named in
the register note. If capture is unavailable, DOM measurement is acceptable **and must be declared
as a substitution** — for this WO that is nearly sufficient anyway, since the acceptance criterion
is a measured pixel count rather than an impression.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry `spaceForRotatedTicks` and
> `rotatedTickMetrics` with line anchors, the two constants, the callers, the absolute working
> directory, the progress contract, and the preamble. **Do not dispatch while this placeholder
> stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (`reviewer` + `ui_reviewer`, full context —
> Tier 3 shared-core), the numeric rendered check as a hard commit gate, register maintenance,
> registry publish verification, commit, and the execution directive with its self-address guard.
