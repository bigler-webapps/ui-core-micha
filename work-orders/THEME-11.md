# THEME-11 — The kit has no opinion on chart margins, so every chart in the estate inherits MUI's

## Part A — Envelope

**Goal.** Give the chart presets a margin default of their own, so charts stop falling back to
MUI X's `DEFAULT_MARGINS` of 20 px on all four sides, and trim the one comparable block in
`ChartFrame`. The whitespace around plots shrinks everywhere at once, without each consuming
panel having to hand-tune a `margin` prop.

**Why — measured, not estimated.** hram's four KPI cards were taken apart pixel by pixel. The
chart is 270 px tall and its plot area is 202 px; the remaining 167 px is furniture, and the
budget accounts for the card's observed ~370 px exactly:

| Block | px | Owner |
|---|---|---|
| `ChartFrame` root padding (`p: 2`) top | 16 | this package |
| Title text | ~24 | this package |
| Title box `mb: 2` | 16 | this package |
| `margin.top` | 20 | **MUI default** |
| **Plot area** | **202** | — |
| x-axis height (`DEFAULT_AXIS_SIZE_HEIGHT`) | 25 | MUI default |
| `margin.bottom` | 20 | **MUI default** |
| Forced blank (`minHeight 300` over `height 270`) | 30 | hram — its own `FIX-16` |

The forced blank is **centred, not stacked at the bottom**: `ChartFrame`'s content box is
`display: flex` with `alignItems: center`, so a `minHeight` above the chart's own height splits
evenly — 15 px above the chart and 15 px below. It is listed once here for the total.
| `ChartFrame` root padding bottom | 16 | this package |

**The MUI defaults apply because this package never forms an opinion.** `spaceForRotatedTicks`
returns the caller's `margin` untouched unless the x-ticks are rotated *and* the caller left
`bottom` unset — so for the ordinary case it hands `margin: undefined` straight to
`MuiBarChart`, and `DEFAULT_MARGINS = { top: 20, bottom: 20, left: 20, right: 20 }` takes over.
THEME-9 gave the kit axis *sizing*; margins were never in its scope. Every chart in every
consuming app has been paying those 20 px since.

**What each side is actually for**, which is what makes the trim safe rather than a guess:
- `margin.left` sits **outside** the y-axis width — this package's own comment records
  `drawingArea.left = margin.left + axisSizeLeft`. The tick labels live in `axisSizeLeft`, so
  `margin.left` is pure padding.
- `margin.bottom` sits **below** the x-axis block; `DEFAULT_AXIS_SIZE_HEIGHT` already contains
  the tick label.
- `margin.top` is the only one carrying real content: the topmost y tick label is centred on its
  gridline and overhangs the plot by roughly half a caption line-height (~9 px). This is why the
  top cannot simply be trimmed to match the others.
- `margin.right` is the risky one — see the scope note.

**Scope.**

1. **A margin default in the shared chart path**, applied when the caller passes no margin and
   merged per-side (not wholesale) when the caller passes a partial one, so an explicit
   `{ left: 60 }` does not silently reinstate 20 px on the other three sides:
   - `top: 10` — leaves the ~9 px overhang of the topmost tick label its room. **Not 8**: at 8
     that label sits on the edge.
   - `bottom: 8`
   - `left: 8`
   - `right: 16` — **deliberately a smaller trim than the other sides.** On a band x-axis the
     tick labels are centred and 8 would be fine, but on a **linear** x-axis the last tick label
     sits *at* the edge and overhangs by half its width (~13 px for a four-character label at
     caption size). 16 is the value that survives both. Do **not** make this conditional on
     scale type: that is inferred behaviour serving no named consumer, and a chart that genuinely
     needs more can pass `margin` explicitly.
2. **`ChartFrame`'s title box `mb: 2` → `mb: 1`** (16 → 8 px).
3. Apply consistently across the presets that share the path (`BarChart`, `LineChart`,
   `TimeSeriesChart`), so consumers do not have to know which chart type trims what.

**Non-goals / do-not-touch.**
- **`CHART_FRAME_ROOT_SX = { p: 2 }` stays.** Trimming it would help the left and right edges
  too, but `ChartFrame` wraps non-chart content as well, and its padding is what makes a panel
  read as a card. That is a separate proposal with a different blast radius, not a rider here.
- No change to axis sizing, tick formatting or label placement — THEME-9 owns those and they
  are working.
- No new props. This is a default, not a feature.

**Tier 3** — shared-core. `reviewer` mandatory; `ui_reviewer` too, the deliverable being visual.

**Two traps this WO must not walk into.**

1. **`spaceForRotatedTicks` decides "did the caller set bottom?" by `margin?.bottom != null`.**
   If a package-level default margin object is injected *before* that check, every rotated-tick
   chart sees it as caller-set and loses its extra bottom space — hram's `RatioMetricsPanel`
   runs x-labels at −45° and −90° and would clip them. The default must be applied so that
   `spaceForRotatedTicks` still distinguishes a genuine caller margin from the package default,
   or the rotated path must be computed first and the default merged under it.
2. **`MUI_CHART_MARGIN_BOTTOM = 20` in `chartDefaults.js` is a hard-coded mirror of MUI's
   default**, used as the base when the rotated path computes extra bottom space. It must move
   with the new default, or rotated charts get their extra height added to the wrong base.

**Tests to write.** Narrow, but these three are the ones that catch a real break:
- A rotated-tick chart still receives its enlarged bottom margin (trap 1 — the regression this
  change is most likely to cause).
- A caller-supplied partial margin keeps its own value on the side it set and gets the new
  default on the others (the merge semantics in scope 1).
- A chart with a linear x-axis does not clip its last tick label at the new right margin.

**Risks.**
- **The blast radius is every chart in every consuming app**, and it lands the moment each app
  bumps its pin — not at publish. A single wrong side value is therefore an estate-wide visual
  regression rather than a local one. That is also the point of doing it here rather than in
  each panel, but it raises the bar on the rendered check.
- **Panels that already hand-tune `margin`** (hram's `RatioMetricsPanel` passes
  `{ left: 60, right: 8, top: 20, bottom: … }`) must be unaffected on the sides they set. This
  is what scope 1's per-side merge is for; whole-object replacement would break them.
- The numbers above are derived from a caption-sized tick label. A consuming app with a
  markedly larger chart font would need more top margin. Do not build for that — no consumer
  has it — but state the assumption in the docs.

**Delivery is not done at publish.** hram is the consumer that reported this, and its pins for
THEME-8, THEME-9 and THEME-10 are all already open. Take this one in the same bump rather than
adding a fourth pending hop.

## Part B — Implementation map — ADDRESSED TO THE IMPLEMENTER

Codex not dispatched: `.claude/codex-status.md` already carried a same-day `unavailable` line —
implemented directly in Claude, authorship flip, `reviewer` + `ui_reviewer` mandatory (already
required at Tier 3).

### What landed

- `chartDefaults.js`: `PACKAGE_DEFAULT_MARGIN = { top: 10, bottom: 8, left: 8, right: 16 }`
  (exported) and `withMarginDefaults(margin)` (per-side merge, number-shorthand expansion).
  `MUI_CHART_MARGIN_BOTTOM` moved `20 → 8` to match the new baseline (trap 2).
- `BarChart.jsx`/`LineChart.jsx`: `spaceForRotatedTicks` still runs FIRST, on the caller's
  UNMODIFIED `margin` — its own `callerSetBottom` check (`margin?.bottom != null`) therefore
  still tells a genuine caller margin from "nothing set" correctly (trap 1 avoided by ordering,
  not by threading a flag through the shared helper). `withMarginDefaults` is applied AFTER,
  wrapping `rotatedTickSpace.margin` on the way into `MuiBarChart`/`MuiLineChart` — so a
  rotation-computed `bottom` (already present on that object) is preserved by the merge, and
  only genuinely-unset sides get the package default.
- `TimeSeriesChart.jsx`: no change needed — it never sets its own `margin`, so it inherits
  `BarChart`'s new default automatically through composition.
- `ChartFrame.jsx`: title row `mb: 2 → mb: 1`. Controls row `mb: 2` left untouched (not named).
  **Deliberately unconditional** (`ui_reviewer` U3 asked whether this should be scoped to only
  chart-preset consumers, matching the margin trim's scope): `ChartFrame` wraps non-chart
  content too, and scope item 2 names the title box specifically, with no "only when a chart
  preset is the child" qualifier anywhere in Part A — a scatter-backed or bespoke-SVG panel
  gets the tighter title spacing but keeps whatever margin its own content uses, which is
  correct: the title row and the plot margin are two independent pieces of furniture, not one
  setting that should move together.

### Scope gap surfaced, not silently folded in

`ScatterChart` (THEME-10, same day, not yet published) passes its `margin` prop straight
through with no default handling at all — it would keep MUI's flat 20px default while
`BarChart`/`LineChart`/`TimeSeriesChart` get 8/10/16. THEME-11's own scope item 3 names exactly
three presets, not four, and `ScatterChart` didn't exist when this WO's Part A was authored.
Flagging this explicitly rather than extending scope silently: `ScatterChart` should likely get
`withMarginDefaults` too, in a follow-up (or when `ScatterChart`'s own version bumps). **This is
NOT the same seam as the right-margin note below** — `ScatterChart`'s X axis is always linear by
construction (THEME-10 scope), so if/when it does adopt `withMarginDefaults`, its own rendered
check needs to re-examine the right-margin question specifically, not inherit this WO's
"no consumer has it" conclusion by assumption.

### Verification detail beyond the WO's own risk note — corrected after review

The rendered check found that a wide, locale-grouped tick value (`"1,000"`, 6 characters)
leaves only ~1px of clearance at the new `right: 16` before MUI's own internal `shortenLabels`
truncates it to `"1,0…"` — never actual overflow-clipping past the SVG boundary in either the
narrow or wide case. Two corrections to the original note, from `reviewer`/`ui_reviewer`:

- **The grouped formatting is MUI's OWN default tick rendering, not THEME-9's
  `defaultNumericTickFormatter`** (`reviewer`/`ui_reviewer` finding, independently confirmed:
  neither `BarChart.jsx` nor `LineChart.jsx` wires a `valueFormatter` onto the x-axis — only the
  y-axis gets THEME-9's default — and the dev fixture that produced `"1,000"` set none either).
  This means the tight case is not a THEME-9-introduced interaction; it is how MUI itself has
  always formatted a linear axis's ticks, now simply more VISIBLE because `right` shrank from
  20 to 16.
- **No real consumer hits this today** (`reviewer`, verified by grepping every hram panel that
  actually consumes `BarChart`/`LineChart`/`TimeSeriesChart`: `CostMetricsPanel`,
  `RatioMetricsPanel`, `AccessibilityPanel`, `TotalMetricsPanel`, `ReferralMetricsPanel`,
  `GroupMetricsPanel`, `GenericAnalysisPlot` — every one uses `scaleType: 'band'`, none
  `'linear'`. `AllocationPerformancePanel`, the panel this note originally worried about,
  imports only `ChartFrame` from this package and draws its own bespoke SVG axes — it does not
  go through `BarChart`/`LineChart` at all, so it is unaffected by this WO regardless.) The WO's
  own explicit "do not build for a case no consumer has; state the assumption" therefore applies
  cleanly, not just plausibly. The residual risk (`ui_reviewer`) is real but one hop removed: the
  first FUTURE consumer that renders a linear x-axis through `BarChart`/`LineChart` with wide
  values should re-check this margin before shipping, and there is no code-level guard that would
  catch it automatically — recorded here so that check doesn't get skipped.

### Target repo

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

## Part C — Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this
> line.**

- **Execution.** Codex known-unavailable today — implemented directly in Claude.
- **Review routing.** `reviewer` + `ui_reviewer`, concurrent, one background batch.
- **Verification.** Package suite: `chartDefaults.test.js` gained a dedicated
  `withMarginDefaults` describe block (pure-function contract) plus integration tests against
  `BarChart`/`LineChart` (package default applied, rotated-tick chart still gets its enlarged
  bottom margin — not the flat package default, partial-margin per-side merge, full-margin
  passthrough, right > left/bottom by construction); full affected set (`BarChart.test.jsx`,
  `LineChart.test.jsx`, `TimeSeriesChart.test.jsx`, `timeSeriesLegend.test.js`,
  `ScatterChart.test.jsx`, `chartsPalette.test.js`) — 91 tests, green.
  **Rendered check, done live** in the package's own dev harness: (1) the existing "Caller
  overrides" `LineChart` fixture (−25° rotated ticks, no explicit margin — exactly trap 1's
  shape) measured with NO overlap between the rotated tick labels and the axis title (15px
  clear gap) — trap 1 confirmed avoided; (2) a new `LineChart (linear x-axis)` fixture added
  and measured at two magnitudes — narrow (`"100"`) with 5px clearance from the SVG edge, wide
  locale-grouped (`"1,000"`) with MUI's own truncation kicking in at ~1px clearance but never
  actual clipping past the boundary (see the "beyond the WO's risk note" section above).
- **Register & commit.** Advance the THEME-11 row with the reviewer verdicts. Coordinate the
  consumer pin bump with THEME-8, THEME-9 and THEME-10 — all still open at publish time,
  pending this WO's own reviews and a bundled version bump.
