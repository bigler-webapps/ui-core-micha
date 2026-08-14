# THEME-10 — A scatter preset, drawn from three real consumers

## Part A — Envelope

**Goal.** Add a `ScatterChart` preset alongside `BarChart` / `LineChart` / `TimeSeriesChart`,
with the same axis handling, tick formatting, legend and frame behaviour, so a consuming app
can plot a point cloud without building its own chart from raw SVG.

**Why.** hram draws **three** scatters entirely by hand — its own axis lines, gridlines, ticks,
tick labels and rotated axis titles, on hard-coded canvases. Only `ChartFrame` comes from this
package. That is not negligence: **this package has no scatter preset**, so there was nothing
to reach for. Every fix this kit has made since (axis sizing, tick formatting, label placement,
the role palette) passes all three by, and will keep doing so until a preset exists.

| Consumer | Canvas | Composition |
|---|---|---|
| `AllocationPerformancePanel` | `WIDTH 720`, `HEIGHT 420`, `MARGIN.left 92` | cloud + computed envelope curve + three individually marked points; continuous per-point colouring by one of three equity measures |
| `AccessGapScatterPanel` | `CHART_H 714`, responsive width, `M.left 58` | bubble cloud (radius by population, z-ordered) + labelled y=x reference diagonal; **categorical** per-point colouring (division or settlement) with a discrete legend; both axes pinned to 0–1, ticks fixed at 0/25/50/75/100 % |
| `OptimizationResultsPanel` | `WIDTH 720`, `HEIGHT 420`, `MARGIN.left 72` | cloud at `r=6` + dashed reference line; the status-quo point drawn hollow (`fill: none`) against filled candidates |

The operator chose this route deliberately over letting each app reach for MUI X directly
(hram `FIX-15`, fork option b), so that scatters are built the same way as every other chart in
the estate rather than becoming a second, parallel charting style.

**On the single-consumer risk this WO originally carried.** The first draft was written when
only the allocation panel was known, and warned that an abstraction drawn from one example is
how the wrong shape gets frozen. **The operator then named the access panel, and a sweep found
a third.** That risk is largely spent: three independent consumers, written by different hands
at different times, are enough to tell a real axis of variation from a guess. What replaces it
is a narrower discipline:

- **Every option in the API must be traceable to one of the three panels above.** They are the
  requirements document. An option no listed consumer needs does not go in — adding one later
  is cheap, removing one from a published package is not.
- **Two of the variation axes were discovered, not designed**, and that is the point: neither
  categorical-colour-plus-discrete-legend nor data-driven mark radius appears in the allocation
  panel at all. Had this been built from that panel alone, both would have been missed and the
  access panel would have had to bypass the preset.
- The surface is no longer "provisional pending a second consumer" — but the docs should still
  state which consumers it was drawn from, so a fourth with different needs knows what it is
  extending.

**Scope.**

1. **`ScatterChart` preset** with the same contract shape as the existing presets: `series`,
   `xAxis`, `yAxis`, `xAxisLabel`, `yAxisLabel`, `palette`, `grid`, `minHeight`, `aspect`,
   `hideLegend`, `legendPosition`, `slotProps`, and remaining props forwarded to MUI.
2. **Reuse the THEME-9 machinery rather than reimplementing it** — `withAxisDefaults`,
   `sizeYAxisForContent`, `spaceForRotatedTicks`, `defaultNumericTickFormatter`,
   `withGridDefaults`, `withChartSlotDefaults`. A preset that sizes its own axes differently
   from `BarChart` would re-open exactly what THEME-9 just closed.
3. **A neutral cloud by default.** Unlike a bar chart, where each series takes a categorical
   colour, an *undifferentiated* scatter cloud is one neutral mass — the role register's
   neutral, not a series hue. **The distinction matters, because one consumer colours
   categorically and is right to:** the access panel encodes division or settlement class, a
   real data dimension, and already draws those from the frozen family register. The allocation
   panel's defect is different in kind — it paints a cloud that encodes *nothing* in
   `dataViz.cost.main`, a KPI identity colour. Neutral is the default for "no dimension
   encoded", not a prohibition on colour.
4. **Three colouring modes, all three in use today:** neutral (default), **categorical** with a
   discrete legend (access — division, settlement), and **continuous** with a scale legend
   (allocation — three equity measures). Categorical draws from the family register's
   positional slots; the consumer must not have to hand-index a palette array to get them.
5. **Mark size: small fixed default, optionally data-driven.** The default is sized for hundreds
   of overlapping points (hram plots ~300; it must not fuse into a solid area). The access panel
   additionally needs a **radius bound to a value** (`max(3, 10·√(pop/maxPop))`) with **explicit
   z-ordering by that value**, so large bubbles do not hide small ones. Bubble sizing without a
   defined draw order is a silently wrong chart.
6. **Support the compositions the consumers actually need** — a point cloud **plus** overlaid
   reference geometry **plus** individually marked points:
   - reference geometry appears in all three: a computed curve (allocation's envelope), a
     straight identity line carrying a rotated inline label (access's y=x "no gap"), and a
     dashed reference line (optimization);
   - individually marked points appear in two, including a **hollow** state — optimization
     draws the status quo as `fill: none` with a coloured stroke against filled candidates.

   Whether that is one component with layers or a documented composition of MUI's
   `ChartContainer` + plots is an implementation decision — but a consumer must be able to do it
   *through* this package. If it cannot, the app bypasses the preset and we are back where we
   started.
7. **Axis furniture from theme tokens, not hard-coded greys.** This is the concrete regression
   the preset exists to stop: the access panel hard-codes `#F0F0F0` (grid), `#D0D0D0` (axis),
   `#999` (ticks), `#666` (tick labels), `#555` (axis titles), `#B0B0B0` (reference line) —
   six greys that no theme change can reach. The other two are better but still partial.
8. **Support a pinned tick set on a fixed domain.** The access panel's axes are both 0–1 with
   ticks fixed at 0/25/50/75/100 % — a deliberate choice (the y=x diagonal is only readable on
   equal, fixed axes), not something auto-ticking should override.
9. Documentation in `DESIGN.md` alongside the other chart guidance, including the axis-title
   rule THEME-9 introduced, and naming the three consumers the surface was drawn from.

**Non-goals / do-not-touch.** No changes to the existing presets beyond what sharing helpers
requires. No new colour tokens — everything comes from the existing role register and palette.
No zoom, brush, selection-rectangle or animation features: none of them has a consumer, and
each would be a guess. Do not change `ChartFrame`.

**Explicitly NOT in scope — the row-based dot plots.** The same sweep found two more
hand-drawn hram panels that also plot circles, and they are **a different chart, not a wide
scatter**: `CalibrationPanel` is a forest plot (`MARGIN.left = 150`, one `ROW_HEIGHT` band per
parameter, point estimate `r=5` plus a dashed interval) and `SensitivityAnalysisPanel` is a
tornado (`MARGIN.left = 220`, `<rect>` bars per row). `OptimizationResultsPanel` carries a third
of the same family in its divergence sub-view (`DIVERGENCE_MARGIN.left = 150`). Their y-axis is
categorical, their left margin is 150–220 px of row labels, and their layout problem is row
density — none of which a scatter preset should try to absorb. **Stretching this preset to cover
them is exactly the over-generalisation this WO is guarding against.** They are a separate
preset and a separate WO; note them, do not serve them.

**Tier 3** — shared-core surface, new public API. `reviewer` mandatory; `ui_reviewer` too,
since the deliverable is visual.

**Tests to write.** The mark count — a scatter that silently drops points is the failure mode
nobody sees, and it is trivial to assert. That the default cloud colour is the neutral role, not
a categorical series colour. That bubble mode draws large marks **before** small ones (the
z-order is the whole correctness of a bubble chart, and it is one assertion on draw order). Axis
behaviour is already covered by THEME-9's tests if the helpers are reused — if a test has to be
duplicated here, the helpers were not reused.

**Risks.**
- **Serving three consumers is not the same as serving all scatters.** The single-consumer risk
  is spent, but the opposite one is now live: with three shapes in hand it is tempting to
  generalise to a fourth that does not exist. Every option traces to a listed panel, or it does
  not go in. If the API starts growing during implementation, stop and report.
- **The row-plot family is the specific over-reach to watch** (see non-goals). Two more panels
  draw circles and will look like near-misses. They are not.
- **Performance at a few hundred marks** is fine; at tens of thousands it is not. State the
  tested magnitude in the docs rather than implying it scales indefinitely.
- The overlay composition (scope 6) is where this can quietly fail its purpose. Verify against
  the real panel shapes — cloud + envelope + three special points, and bubble cloud + labelled
  diagonal — not against a synthetic example.

**Delivery is not done at publish.** hram `FIX-15` (allocation) is the first consumer and is
blocked on this package; the pin bump and that panel's rebuild are what prove the preset works.
The access and optimization panels are known consumers with **no WO yet** — they are what this
surface was designed against, so they are not optional evidence, but converting them is separate
work to be scheduled, not folded in here. THEME-8 and THEME-9 are both sitting published with
consumer pins still open, so bundle the pin bump rather than adding a third pending hop.

## Part B — Implementation map (implementer)

PLACEHOLDER — Orchestrator fills this on `git pull`: context package with `path:line` anchors
(`src/components/charts/BarChart.jsx` as the structural template, `chartDefaults.js`'s helpers
including THEME-9's new `sizeYAxisForContent` and `defaultNumericTickFormatter`, `palette.js`,
`ChartFrame.jsx`), the absolute working directory, the progress contract and the preamble.

**The consumer requirement must be carried in as excerpts, not as a repo pointer** — the three
panels live in a different repository the implementer will not have open. Include the rendering
block of each: `AllocationPerformancePanel.jsx` (constants :31-35, `ShapeGlyph` :150-169, the
hand-drawn axis block :424-452, point rendering :500-565) plus its approved prototype
`work-orders/assets/FIX-15-allocation-panel-prototype.html`; `AccessGapScatterPanel.jsx`
(scales and `rOf` :107-113, the reference diagonal and ticks :196-245, point rendering with the
z-order sort :249-272, the legend construction :121-131); and `OptimizationResultsPanel.jsx`
(the hollow status-quo marker at :720-730). Not dispatchable while this placeholder stands.

## Part C — Orchestrator only

**STOP — addressee guard.** If you are the implementer reading this file as your own spec: this
part is not addressed to you. It tells the Orchestrator how to invoke you; you ARE that
invocation — do not shell out to `codex exec`. Stop reading at this line.

- **Execution.** Codex first per the tier rule, unless the status record carries a same-day
  unavailable line.
- **Review routing.** `reviewer` + `ui_reviewer`, concurrent, one background batch.
- **Verification.** The package's own suite, **plus a rendered check against both real consumer
  shapes** — cloud + envelope + three special points (allocation, against its approved
  prototype), and bubble cloud + labelled y=x diagonal + categorical legend (access). One
  synthetic example does not exercise the two modes that were only discovered by looking at the
  second panel. State the mark count rendered versus supplied.
- **Register & commit.** Advance the THEME-10 row with the reviewer verdicts. Then coordinate
  the consumer pin bump with THEME-8 and THEME-9, which are already waiting.
