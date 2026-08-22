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

- [ ] **`extraHeight` is applied once, not twice.** Either the axis band carries it (`axis.height`)
      or the chart margin does (`margin.bottom`) — not both. **Establish which one MUI actually needs
      before choosing**, and say so in the commit: the two are additive, so the wrong choice moves the
      dead space rather than removing it.
- [ ] **The plot area grows by the reclaimed amount.** Acceptance is numeric, on a real chart with
      long rotated labels: with 35 rotated labels on a 340 px surface, the empty band below the axis
      drops from ~130 px to the ordinary axis padding, and the plot area grows correspondingly.
- [ ] **Tick labels are not clipped.** Reserving once must not tip into reserving too little — the
      lowest label's bounding box stays inside the surface at every width tested.
- [ ] **Charts with no rotation are byte-identical.** `rotatedTickMetrics` returns `null` at angle 0
      and the helper already passes the axis through untouched; that path must not shift.
- [ ] **A caller-set `margin.bottom` still wins.** The existing `callerSetBottom` escape hatch stays.

### Investigate in the same pass — likely the same helper

hram reports **x-axis tick marks rendering without their labels** on scatter charts
(`AccessGapScatterPanel`, the optimization cost-effectiveness scatter) — `HRAM-RES-29` item 2, still
open. A formatter exists on both axes (`ScatterChart.jsx:193,199`), so it is not a missing formatter.
**The suspicion is that it is this same function in the other direction:** `axis.height` set to a
band the labels do not fit, so MUI draws the ticks and clips the text.

- [ ] Confirm or refute that, with a measurement, and say which. If confirmed, fix it here — it is
      the same arithmetic. If refuted, hand the finding back to `HRAM-RES-29` with what was measured,
      so that WO stops carrying a guess.

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
