# Chart layout model (UCM-CHART-12)

One function, `resolveChartLayout` (`src/components/charts/chartDefaults.js`), owns the geometry
of every chart preset (`BarChart`, `LineChart`, `ScatterChart`, and indirectly `TimeSeriesChart`,
which wraps `BarChart`). It replaces `resolveChartHeight`, `spaceForRotatedTicks`, and
`warnOnHeightMismatch` — all three deleted in this version. This is a **breaking major (`3.0.0`)**.

## The model

Every reserved band is derived from the content it holds and collapses to zero when that content
is empty. Consumers express intent, never pixels.

```
chartHeight === plotHeight + xAxisBand + xTitleBand + legendBand
```

- `xAxisBand` — the tick row. Zero when the axis has no visible tick content (an empty `data`
  array, or every formatted tick is a blank string). Non-zero otherwise: a flat baseline for
  horizontal labels, or a measured/estimated projection for rotated ones (same measurement
  mechanism as before — a real DOM measurement when available, a per-glyph estimate otherwise).
  The flat baseline (25px) and the title addition (20px) are MUI X-Charts' own
  `DEFAULT_AXIS_SIZE_HEIGHT`/`AXIS_LABEL_DEFAULT_HEIGHT` constants, not a re-estimate — the plain
  unrotated/untitled case renders pixel-identical to before this WO, even though the resolver now
  sets `axis.height` explicitly where MUI used to fill it in implicitly.
- `xTitleBand` — the axis title. Zero unless the x-axis carries a `label`.
- `legendBand` — one row for the legend. Zero when `hideLegend` is set.
- `plotHeight` is the residual: `chartHeight` minus the three bands above.
- The y-axis band collapses to zero the same way the x-axis one does: candidates existed (the
  axis has real `min`/`max` or plotted data) but a caller `valueFormatter` blanks every formatted
  tick, and there is no axis title either — the axis has nothing to show, so it reserves nothing.
  Distinct from "nothing to measure at all" (no `min`/`max`/data), where MUI's own default applies
  untouched.

Width follows the same shape (`yAxisBand + plotWidth + secondaryYAxisBand + rightPad`), but the
presets stay responsive — they never fix a pixel width — so `plotWidth`/`containerWidth` are only
meaningful when a caller explicitly supplies `containerWidth` (tests, or the browser-level check);
the presets themselves never pass it. A **secondary (right-positioned) y-axis** — `TimeSeriesChart`'s
`axis: 'secondary'` feature, or any preset given a two-entry `yAxis` array with one `position:
'right'` — reserves its own width on the right, added to `margin.right` alongside the fixed
breathing-room pad; an axis with no explicit `position` defaults to the left, matching MUI's own
default-assignment rule.

## Removed props, and their replacement

| Removed prop | Replacement | Why |
|---|---|---|
| `minHeight` | `size` (see below) | A floor was a *card* concern, not a chart one — `ChartFrame` still has its own `minHeight`, unchanged. |
| `aspect` | `size` | One size source, system-wide (operator decision). A chart's height no longer tracks its width. |
| `margin` | *(none)* | The model owns margins completely — spacing between a chart and its neighbours is the card's job. |
| `xAxisAngle` / a caller-set `tickLabelStyle.angle` | `xLabels: "auto" \| "horizontal" \| "angled"` | Under `"auto"` the model decides from the tick count and label length whether rotation is needed — a consumer no longer states a rotation and separately pays for its geometry. |

Passing a removed prop throws in development (`assertRemovedChartProp`), naming the replacement.
It is inert in production — a shared package must not crash a consumer's page over a layout prop.
This is deliberate, not a silent ignore: every call site that still passes `minHeight`/`aspect`/
`margin` will see it immediately in dev.

## `size` — before / after

```diff
- <BarChart minHeight={320} series={series} />
+ <BarChart size="standard" series={series} />
```

```diff
- <BarChart aspect={1.8} minHeight={280} series={series} />
+ <BarChart size="tall" series={series} />
```

Tokens resolve through the theme's spacing scale (`theme.spacing`, MUI's 8px unit):

| Token | Spacing units | Height |
|---|---|---|
| `compact` | 40 | 320px |
| `standard` | 50 | 400px |
| `tall` | 60 | 480px |
| `extra_tall` | 70 | 560px |
| `super_tall` | 80 | 640px |

**UCM-CHART-15** shifted the whole scale up one step and added `extra_tall`/`super_tall` above the
old ceiling — `tall` (400px) had been the largest token, and hram had already needed the `height`
px escape to get past it. `standard`'s old pin to 320px (`TimeSeriesChart`'s historical
`CHART_HEIGHT`) was a migration guardrail for CHART-12, not a design verdict; that migration is
long complete, so the scale is now a chosen set of five values rather than one inherited number.
`height` (a raw px number) survives as a **documented escape** for a justified special case; prefer
`size`.

**Four call sites lose responsive height with `aspect` gone**: `hram/AccessGapScatterPanel.jsx`
and three in `fitness-monitor/BodyHistoryPage.jsx` (its `960/380` ratios were a design decision,
not an accident — operator accepted this trade 2026-08-22). Each converts to a size token as a
named, visible decision in its own migration WO — charts still reflow horizontally (`width: 100%`
on the wrapper), only the height stops tracking width.

## `xLabels` — before / after

```diff
- <BarChart xAxis={[{ data: wardNames, tickLabelStyle: { angle: -45 } }]} />
+ <BarChart xAxis={[{ data: wardNames }]} xLabels="angled" />
```

```diff
- <BarChart xAxis={[{ data: months }]} />   {/* horizontal by default, unrotated */}
+ <BarChart xAxis={[{ data: months }]} xLabels="auto" />   {/* the new default; equivalent here */}
```

`"auto"` (the default) is a **heuristic**, not a true fit computation — the presets stay
responsive, so the resolver has no real container width to measure against before render. It
rotates when there are more than 6 categories *and* the longest label's real MEASURED width
(same DOM measurement the rotated-band projection itself uses — a real browser measurement when
available, a per-glyph estimate otherwise) exceeds 50px; otherwise it stays horizontal.
`"horizontal"` always stays flat; `"angled"` always rotates (at the caller's own
`tickLabelStyle.angle`, or -45° if unset). "Measured labels" (Rule 3) is therefore real — what
remains unmeasured is "available width", since no container width exists before render. Verify a
specific chart's real rendered fit with the browser-level check described below.

## `margin` — no replacement

There is no margin prop any more. Spacing between a chart card and its neighbours is the card's
job (a wrapping `Box`/`Stack`'s own `gap`/`p`), not the chart's.

```diff
- <Chart series={series} margin={{ left: 220 }} />   {/* hand-tuned gutter for a long label */}
+ <Box sx={{ pl: '220px' }}>
+   <Chart series={series} />
+ </Box>
```

If the extra space was compensating for a wide y-axis label the resolver now sizes itself
(`sizeYAxisForContent`), try dropping the override entirely first — the model may already reserve
the right amount.

## What stays unchanged

- `ChartFrame`'s own `minHeight` — it is a whole-card floor (title, toolbar, chart, legend,
  footnotes, export links), not a single chart's size (`UCM-CHART-9` established this distinction).
  `height` and `aspect` are **not** part of this — `UCM-CHART-13` removed them, but for different
  reasons: `height` was destructured and only ever fed a dev-mode warning, never applied — genuinely
  dead. `aspect` was applied (`aspectRatio` on the box, through 3.0.1) and worked.
  **Correction (`UCM-CHART-14`, left legible rather than silently rewritten):** `UCM-CHART-13`
  originally claimed here that no consumer passed `aspect`. That measurement was false — a
  parser-based census (`scripts/chart-api-census.mjs`) found **four live call sites in
  fitness-monitor** (`BodyHistoryPage.jsx` ×2, `EnvironmentPage.jsx` ×2) a `head`-truncated grep had
  missed. The removal itself still stands; only the affected-consumer count was wrong. Those four
  sites are `FM-CHART-1`'s scope. Passing either prop now throws in dev, naming the real replacement
  — `aspect`'s message states plainly that it WAS applied and this is a real, visible behaviour
  change for whoever still passes it, not a no-op cleanup.
- Palettes, series colours, tooltips, legend content, interaction.
- `sizeYAxisForContent` (y-axis width from tick content) — reused unchanged inside the resolver.

## Verifying a migrated chart

The invariant is arithmetic, but only against **real rendered geometry** — jsdom cannot measure
SVG text (`getComputedTextLength` is unimplemented there), so the unit suite injects a stubbed
measurement. Before shipping a chart that leans on rotated or auto-detected labels, render it in
a real browser at a realistic width and confirm no tick label is clipped and no band is reserved
with nothing in it (the Access-scatter defect this WO exists to close).
