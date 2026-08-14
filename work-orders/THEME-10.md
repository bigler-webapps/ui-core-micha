# THEME-10 — A scatter preset, so the one app that needs one stops hand-drawing SVG

## Part A — Envelope

**Goal.** Add a `ScatterChart` preset alongside `BarChart` / `LineChart` / `TimeSeriesChart`,
with the same axis handling, tick formatting, legend and frame behaviour, so a consuming app
can plot a point cloud without building its own chart from raw SVG.

**Why.** hram's allocation panel draws its scatter **entirely by hand**: its own axis lines,
ticks, tick labels and rotated axis titles, on hard-coded `WIDTH = 720`, `HEIGHT = 420`,
`MARGIN.left = 92`. Only `ChartFrame` comes from this package. That is not negligence — **this
package has no scatter preset**, so there was nothing to reach for. Every fix this kit has
made since (axis sizing, tick formatting, label placement, the role palette) simply passes that
panel by, and will keep passing it by until a preset exists.

The operator chose this route deliberately over letting the app use MUI X directly
(hram `FIX-15`, fork option b), so that the scatter is built the same way as every other chart
in the estate rather than becoming a second, parallel charting style.

**The risk that comes with that choice, and how this WO handles it.** A shared abstraction
designed from a single consumer is how the wrong abstraction gets frozen. Therefore:

- **Build for the one real consumer, and only for it.** hram's allocation panel is the
  requirements document. Its needs are known and listed below.
- **Add no speculative options.** No props "because a future chart might want them". The second
  consumer will be the one to reveal what generalises — and adding an option later is cheap,
  removing one from a published package is not.
- **Say plainly in the docs that the surface is provisional** until a second consumer exists.

**Scope.**

1. **`ScatterChart` preset** with the same contract shape as the existing presets: `series`,
   `xAxis`, `yAxis`, `xAxisLabel`, `yAxisLabel`, `palette`, `grid`, `minHeight`, `aspect`,
   `hideLegend`, `legendPosition`, `slotProps`, and remaining props forwarded to MUI.
2. **Reuse the THEME-9 machinery rather than reimplementing it** — `withAxisDefaults`,
   `sizeYAxisForContent`, `spaceForRotatedTicks`, `defaultNumericTickFormatter`,
   `withGridDefaults`, `withChartSlotDefaults`. A preset that sizes its own axes differently
   from `BarChart` would re-open exactly what THEME-9 just closed.
3. **A neutral cloud by default.** Unlike a bar chart, where each series takes a categorical
   colour, a scatter's default is one undifferentiated cloud — the role register's neutral, not
   a series hue. This is the single most important default in this preset: hram's panel
   currently paints its cloud in a *KPI identity* colour, which is what made it read wrong.
4. **Small marks by default**, sized for hundreds of points, with the density of overlapping
   marks in mind. hram plots ~300; the default must not fuse them into a solid area.
5. **Support the composition the real consumer needs** — a point cloud **plus** an overlaid
   line (the cost-effectiveness envelope) **plus** individually marked points (status quo,
   optimum, current selection). If the preset cannot express that, the app will bypass it and
   we are back where we started. Whether that is one component with layers or a documented
   composition of MUI's `ChartContainer` + plots is an implementation decision — but the
   consumer must be able to do it *through* this package.
6. **Per-point colouring** for a continuous scale (hram colours points by one of three equity
   measures), including a legend for that scale. The uncoloured state stays the neutral cloud.
7. Documentation in `DESIGN.md` alongside the other chart guidance, including the axis-title
   rule THEME-9 introduced.

**Non-goals / do-not-touch.** No changes to the existing presets beyond what sharing helpers
requires. No new colour tokens — everything comes from the existing role register and palette.
No zoom, brush, selection-rectangle or animation features: none of them has a consumer, and
each would be a guess. Do not change `ChartFrame`.

**Tier 3** — shared-core surface, new public API. `reviewer` mandatory; `ui_reviewer` too,
since the deliverable is visual.

**Tests to write.** The mark count — a scatter that silently drops points is the failure mode
nobody sees, and it is trivial to assert. One test that the default cloud colour is the neutral
role, not a categorical series colour (that is the defect this preset exists to prevent). Axis
behaviour is already covered by THEME-9's tests if the helpers are reused — if a test has to be
duplicated here, the helpers were not reused.

**Risks.**
- **Designing for one consumer** — mitigated above by keeping the surface minimal and marking
  it provisional, but the risk does not disappear. If the API starts growing options during
  implementation to accommodate hypothetical cases, stop and report.
- **Performance at a few hundred marks** is fine; at tens of thousands it is not. State the
  tested magnitude in the docs rather than implying it scales indefinitely.
- The overlay composition (scope 5) is where this can quietly fail to meet its purpose. Verify
  against hram's actual panel shape — cloud, envelope, three special points — before calling it
  done, not against a synthetic example.

**Delivery is not done at publish.** hram `FIX-15` is the consumer and is blocked on this
package; the pin bump and the panel rebuild are what prove the preset works. THEME-8 and
THEME-9 are both sitting in the same state — published, consumer pins still open — so bundle
the pin bump rather than adding a third pending hop.

## Part B — Implementation map (implementer)

PLACEHOLDER — Orchestrator fills this on `git pull`: context package with `path:line` anchors
(`src/components/charts/BarChart.jsx` as the structural template, `chartDefaults.js`'s helpers
including THEME-9's new `sizeYAxisForContent` and `defaultNumericTickFormatter`, `palette.js`,
`ChartFrame.jsx`, and hram's `AllocationPerformancePanel.jsx` + its prototype
`work-orders/assets/FIX-15-allocation-panel-prototype.html` as the consumer requirement), the
absolute working directory, the progress contract and the preamble. Not dispatchable while
this placeholder stands.

## Part C — Orchestrator only

**STOP — addressee guard.** If you are the implementer reading this file as your own spec: this
part is not addressed to you. It tells the Orchestrator how to invoke you; you ARE that
invocation — do not shell out to `codex exec`. Stop reading at this line.

- **Execution.** Codex first per the tier rule, unless the status record carries a same-day
  unavailable line.
- **Review routing.** `reviewer` + `ui_reviewer`, concurrent, one background batch.
- **Verification.** The package's own suite, **plus a rendered check against hram's prototype**
  — the consumer's real shape (cloud + envelope + three special points), not a synthetic
  example. State the mark count rendered versus supplied.
- **Register & commit.** Advance the THEME-10 row with the reviewer verdicts. Then coordinate
  the consumer pin bump with THEME-8 and THEME-9, which are already waiting.
