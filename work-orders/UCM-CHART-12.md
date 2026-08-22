# UCM-CHART-12 — One layout model for charts. Breaking, and the end of this series.

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main`, no staging step)
- **Tier:** 3 — shared-core, **BREAKING**: major version, `3.0.0`.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/chartDefaults.js` (the new resolver; `resolveChartHeight`,
  `spaceForRotatedTicks`, `warnOnHeightMismatch` are **deleted**), the four presets, `ChartFrame.jsx`,
  their tests, and a new `docs/CHART-LAYOUT.md` migration guide.
- **Consumers are NOT migrated here.** Operator decision 2026-08-22: ucm first, apps one at a time,
  each its own WO gated on its pin bump.

> **Why — four work orders is the evidence, not the anecdote.**
>
> | WO | what it corrected |
> |---|---|
> | `UCM-CHART-8` | `minHeight` vs `height` — wrapper reserved space the chart did not use |
> | `UCM-CHART-9` | `ChartFrame` given a fixed `height` it must never have |
> | `UCM-CHART-10` | rotated-tick allowance added to **both** `axis.height` and `margin.bottom` |
> | `UCM-CHART-11` | that same allowance **estimated** above the rendered text |
>
> Each fixed exactly one term of an equation nobody had written down. A fifth is already visible
> (`ScatterChart`'s x-axis band stays reserved when the tick labels are empty — hram's
> `AccessGapScatterPanel` shows 58 px of blank inside the SVG where the labels should be), and the
> operator has called a stop: **no more term-by-term corrections.**
>
> **The root cause is structural: no single place owns a chart's composition.** Five interacting
> knobs — `minHeight`, `height`, `aspect`, `margin`, `xAxisAngle` — are assembled differently by each
> preset, and consumers add pixel arithmetic of their own on top (`margin.bottom: 58` in
> `AccessGapScatterPanel`, `margin.left: 220` in hram's tornado). Every one of those is the same
> disease: **space reserved in one place and again in another, or reserved as a constant where the
> content is variable.**
>
> **Measured consumer surface, 2026-08-22** — this is why breaking is cheaper than continuing:
>
> | app | chart files | of which use `minHeight` |
> |---|---|---|
> | hram | 29 | 12 |
> | fitness-monitor | 5 | 2 |
> | cockpit / jg-ferien / spesix | 4 | 0 |
> | **total** | **38** | **14** |
>
> 76 % sits in one app. This is a sweep, not a migration programme.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

One function owns a chart's geometry. Every reserved band is derived from the content it holds and
collapses to zero when that content is empty. Consumers express intent, never pixels. And a test
asserts the composition adds up, so this class of defect cannot recur.

### The model — three rules

**Rule 1 — one size source, no interaction.**
A chart's height comes from a **named size token**: `size="compact" | "standard" | "tall"`, resolved
through the theme's spacing scale. `height` in pixels survives as a **documented escape** for the
justified special case, and the JSDoc says it requires a reason.
- **`minHeight` is removed from all four presets.** A floor is a *card* concern, not a chart one.
- **`aspect` is removed entirely** (operator decision 2026-08-22). One size source, system-wide.
- **`resolveChartHeight` is therefore deleted, not amended** — with `minHeight` and `aspect` both
  gone, its three-way resolution has nothing left to resolve. Do not preserve it out of caution.

**Rule 2 — every band is its own measured content, or zero.**
Height decomposes into `plot + xAxisBand + xTitleBand + legendBand`; width into
`yAxisBand + plot + rightPad`. Each band is sized from what it actually contains, measured in **one**
place. **An empty band is zero.** That single sentence is the fifth defect's fix: reserved space for
tick labels that turn out empty must collapse, not persist.
- No band is ever a constant.
- No term appears in two addends. That is what `UCM-CHART-10` was.

**Rule 3 — consumers pass intent, never pixels.**
- **No `margin` prop on the presets.** The model owns margins completely. Spacing between a chart and
  its neighbours is the card's job.
- **`xAxisAngle` is replaced by `xLabels: "auto" | "horizontal" | "angled"`.** Under `"auto"` the
  model decides from the *measured* labels and the available width whether rotation is needed. A
  consumer no longer states a rotation and separately pays for its geometry.

### The invariant — the actual deliverable

```
chartHeight === plotHeight + xAxisBand + xTitleBand + legendBand
chartWidth  === yAxisBand  + plotWidth  + rightPad
```

Asserted as a test, per preset, over a matrix of label loads: none, short, long, long-and-many,
empty-strings.

**`UCM-CHART-8`, `-10` and `-11` would each have failed this on day one.** The width line catches the
two findings still open elsewhere: a scatter y-axis reserving 72 px for a 33 px label, and the
tornado's 220 px gutter. **This assertion, not the fix, is what ends the series** — and it is the one
thing in this WO that must not be dropped for expedience.

### Definition of Done

- [ ] `resolveChartLayout({ size | height, xLabels, xTitle, yTitle, legend, ticks, measureText })`
      returns the **complete** geometry — wrapper `sx`, chart height, margins, and both axis sizes.
      Nothing outside it does chart arithmetic.
- [ ] `size` tokens resolve through the theme spacing scale; `height` documented as the escape.
- [ ] `minHeight`, `aspect` and `margin` are gone from the four presets. Passing one is a **dev-mode
      error naming the replacement**, not a silent ignore — 38 call sites will hit this and the
      message is the migration guide.
- [ ] `ChartFrame` **keeps** its `minHeight` as a card floor. `UCM-CHART-9` established that a frame
      is not a chart; do not sweep the frame's floor away with the presets' prop.
- [ ] `resolveChartHeight`, `spaceForRotatedTicks`, `warnOnHeightMismatch` deleted.
- [ ] Both invariants asserted, over the label matrix above.
- [ ] **Empty tick labels produce a zero-height axis band**, tested explicitly. This is the
      Access-scatter case and it is the reason the model exists.
- [ ] `docs/CHART-LAYOUT.md`: the model in one page, the removed props with their replacements, and a
      before/after per prop. Five apps have to read this.

### Non-goals

- No consumer migration here. Five per-app WOs follow, each gated on its pin bump.
- **No compatibility shim** (operator decision): two models coexisting is the ambiguity that caused
  this. One breaking version, clear error messages.
- No change to palettes, colours, series rendering, tooltips or interaction.
- Do not "improve" the estimate again. Under Rule 2 there is no estimate — bands are measured.

### Risks

- **Four call sites lose responsive height** with `aspect` gone: `hram/AccessGapScatterPanel.jsx:182`
  and three in `fitness-monitor/BodyHistoryPage.jsx`. fitness-monitor's `960/380` ratios were a
  design decision, not an accident. **Each converts to a size token as a named, visible decision in
  its own migration WO** — not silently. Charts still reflow horizontally (the wrapper stays
  `width: 100%`); only the height stops tracking width. Operator accepted this trade on 2026-08-22.
- **The invariant test cannot run on estimates in jsdom.** `UCM-CHART-11` established that jsdom's
  `getComputedTextLength` throws, so the unit tests must inject a measurement stub — and a
  **browser-level check is therefore mandatory, not optional**, or the invariant is only asserted
  against a fiction.
- **hram has several WOs in flight touching these files** (`RES-28`, `HRAM-RES-29`, `FIX-19`,
  `CHT-3`). hram's migration WO must sequence after them, and this WO must not start hram's sweep.
- A `3.0.0` major is the first in this package's history. Check `publish.yml`'s version gate handles a
  major, and that no consumer pins with a caret that would silently adopt it.

### Tests to WRITE

- The two invariants, per preset, over the label matrix — the centrepiece.
- Empty tick labels → zero-height band.
- `size` token → height mapping, stable and theme-derived.
- `height` escape overrides the token.
- Each removed prop raises the dev-mode error naming its replacement.
- `ChartFrame`'s `minHeight` floor still behaves as `UCM-CHART-9` fixed it — that test stays green
  unchanged.

**Browser-level check before publish**, on hram with real data at 1280 px and one narrow width: the
invariant holds on rendered geometry, and the Access scatter's blank band is gone. DOM measurement is
acceptable and must be declared; here it is sufficient, because the acceptance is arithmetic.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry the current `chartDefaults.js`
> exports with line anchors, the four presets' prop destructuring, `ChartFrame`'s content box, the
> `publish.yml` version gate, the absolute working directory, the progress contract, and the preamble.
> **Do not dispatch while this placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (`reviewer` + `ui_reviewer`, full context —
> Tier 3 shared-core, breaking), the invariant tests and the browser-level check as hard commit
> gates, register maintenance, registry publish verification for a major, commit, and the execution
> directive with its self-address guard.
