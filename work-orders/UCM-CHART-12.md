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

### Context package

**Named files to change**

- `src/components/charts/chartDefaults.js` — the resolver lives here today as three separate,
  interacting functions. **Delete** `resolveChartHeight` (:385-394), `warnOnHeightMismatch`
  (:408-421), and `spaceForRotatedTicks` (:229-238) plus its private helper `rotatedTickMetrics`
  (:183-210) — but **keep** the text-measurement primitives they call: `measureTickTextWidthPx`
  (:120-131, real DOM measurement via a hidden shared SVG `<text>` node — this is the "measured, not
  estimated" plumbing Rule 2 needs) and `estimateTextWidthPx`/`glyphWidthEm` (:71-86, the no-DOM
  fallback — SSR / jsdom without an injected stub). Also keep `sizeYAxisForContent` (:311-348, THEME-9,
  y-axis width from tick content — the new resolver's `yAxisBand` should call this, not reinvent it),
  `withGridDefaults`, `withAxisDefaults`, `withChartSlotDefaults`, `defaultNumericTickFormatter`,
  `PACKAGE_DEFAULT_MARGIN`/`withMarginDefaults` (margins are now fully owned by the resolver per Rule
  3 — decide whether `withMarginDefaults` survives as an internal helper the resolver calls, or is
  folded into it; either is fine, it must not stay a separate exported knob a consumer can pass into).
  Add the new `resolveChartLayout` export here.
- `src/components/charts/BarChart.jsx` (:35-98), `LineChart.jsx` (:52-123), `ScatterChart.jsx`
  (:173-289), all four accept `{ minHeight, height, aspect, margin }` in their destructuring and call
  `resolveChartHeight`/`warnOnHeightMismatch`/`spaceForRotatedTicks` — every one of those call sites
  is replaced by a single `resolveChartLayout(...)` call. `xAxisAngle` is not currently a named prop on
  any of the three (rotation today comes in via `tickLabelStyle.angle` on a caller-supplied `xAxis`
  entry, see `rotatedTickMetrics`'s `axis.tickLabelStyle?.angle`) — introducing `xLabels: "auto" |
  "horizontal" | "angled"` as a first-class prop is new surface, not a rename; decide how `"angled"`
  maps onto what MUI needs (`tickLabelStyle.angle` + the axis height the resolver computes) and how
  `"auto"` decides using the *measured* label widths against `plotWidth` (Rule 3) — this is the one
  piece of real algorithmic design in this WO, budget time for it.
- `TimeSeriesChart.jsx` (:269, :286) passes `minHeight={CHART_HEIGHT}` to `ChartFrame` (stays — that's
  the frame floor, Rule/DoD says `ChartFrame`'s `minHeight` survives) and `height={CHART_HEIGHT}` to the
  inner `BarChart` (:286, must migrate to `size="standard"` or equivalent — decide the token that
  reproduces 320px, see size-token note below).
- `src/components/charts/ChartFrame.jsx` (:28-49, :112-124) — **unchanged behaviourally**: keeps
  `minHeight`/`height`/`aspect` as its own card-floor props (DoD: "`ChartFrame` keeps its `minHeight`
  as a card floor"). It currently also imports `warnOnHeightMismatch` (:14, :62-65) for its own
  mismatch note — that function is deleted, so `ChartFrame` needs either an inline replacement of the
  same dev-mode console warning (same text/condition, just no longer imported from `chartDefaults`) or
  a decision that the note is no longer worth keeping now that the presets' own version of it is gone
  — **do not delete `ChartFrame`'s warning silently**; if dropping it, say so in `CHART-LAYOUT.md`.
- New file `docs/CHART-LAYOUT.md` — the model in one page, each removed prop paired with its
  replacement and a before/after code snippet. Look at `docs/` (if it exists) or the package README for
  the house doc style/tone to match; five apps' implementers read this cold.
- Tests: `tests/chartDefaults.test.js` (imports the now-deleted functions at :17-26 — every one of
  those imports must be replaced) and `tests/ChartFrame.test.jsx` (the `minHeight` floor regression
  test named in the DoD must stay green, unchanged in intent).

**The invariant, concretely**

```
chartHeight === plotHeight + xAxisBand + xTitleBand + legendBand
chartWidth  === yAxisBand  + plotWidth  + rightPad
```

`resolveChartLayout` must return every term on the right as its own named field (not just the totals)
so the test can sum them and assert equality against the height/width it also returns — a test that
can only compare final totals cannot catch a term double-counted against another (which is exactly
what `UCM-CHART-10` was). `xAxisBand` comes from `axis.height` (today's `MUI_LABELLED_X_AXIS_HEIGHT` +
`rotatedTickMetrics`'s extra, now unconditional on `xLabels`, not just on caller-supplied
`tickLabelStyle.angle`), `yAxisBand` from `sizeYAxisForContent`'s width, `legendBand` from whether
`hideLegend`/`legendPosition` puts a legend on the vertical axis (0 when legend is off or horizontal —
this band existed nowhere before this WO; MUI's own legend today just grows the SVG uncounted), `plot`
is whatever remains. Empty tick labels (Rule 2 / DoD, the Access-scatter case) must resolve
`xAxisBand`/`yAxisBand` to 0, not the MUI/package floor — trace `longestFormattedTick` (:271-284)
returning `''` through to the band, since today's `rotatedTickMetrics` floors width at `fontSize`
(:193-194) rather than letting empty collapse to zero.

**Size tokens**

`theme.spacing` is MUI's 8px unit (`src/theme/tokens.js:182`). `TimeSeriesChart.jsx`'s existing
`CHART_HEIGHT = 320` (its own comment at :18-33 explains *why* a fixed height exists — read it, the
reason still applies) is the one deployed number every current consumer has already implicitly agreed
looks right; make `"standard"` resolve to exactly that (`theme.spacing(40)`) so this migration doesn't
also silently redraw every existing default-sized chart. Pick `"compact"`/`"tall"` proportionally
(e.g. `theme.spacing(30)` / `theme.spacing(50)`) and document the exact numbers in `CHART-LAYOUT.md` —
these are visible product decisions, not internal plumbing, so state them plainly rather than burying
them in the resolver.

**Removed-prop dev-mode error**

Two existing precedents pull in different directions: `warnOnHeightMismatch` (being deleted) was a
`console.warn`, gated on `process.env.NODE_ENV !== 'production'`; `TimeSeriesChart.jsx:195`
(`hasSecondaryAxis && !secondaryYAxisLabel`) is a real `throw new Error(...)`, ungated, in production
too. The DoD text ("a dev-mode error naming the replacement, not a silent ignore") reads as: gate on
`NODE_ENV !== 'production'` like the deleted warning did (a shared package must not crash a
consumer's production page over a layout prop), but make it a `throw`, not a `console.warn`, inside
that gate — loud in dev, inert in prod. Apply it to `minHeight`/`aspect`/`margin` on the four presets;
each error message names the specific replacement (`size`/removed-with-no-replacement/removed
respectively — `margin` has no successor prop at all, the model owns it completely, say that plainly
in the message).

**Do-not-touch / invariants that must survive unchanged**

- Palette, series colours, tooltips, legend *content*, interaction — none of this WO's concern (Non-
  goals). Only the geometry that decides *how much room* things get.
- `sizeYAxisForContent`'s existing behaviour and its own tests (:311-348) — reuse, do not rewrite.
- `ChartFrame`'s `minHeight` floor test (`UCM-CHART-9`'s regression) — must stay green, unmodified in
  intent, even though its `warnOnHeightMismatch` import needs to change.
- `ScatterChart.jsx` keeps its own y-axis-only sizing rationale (:213-223, the `data.map(point => y)`
  adapter) — this WO's `resolveChartLayout` change must not silently break that adapter's contract.

**Known pitfall**

`UCM-CHART-11`'s own register note: jsdom's `getComputedTextLength` throws / is unimplemented, so
`measureTickTextWidthPx` returns `null` under test and every unit test that needs a real number must
inject a measurement stub (the existing `measureTextWidth` injection point in `spaceForRotatedTicks`
is the pattern — carry the same injectability into `resolveChartLayout`). This is *why* the WO also
requires a **mandatory browser-level check** before publish (see Verification, Part C) — the unit
suite alone cannot prove the invariant holds against real rendered text.

Directive: work from this package; open only the named files to verify. If you need the full
`docs/` directory listing or README style, or need to search for other `chartDefaults` imports across
the package (there may be call sites in `src/index.js` exports or `dev/` harness files not listed
above), delegate that lookup to a read-only Explore sub-agent rather than open-ended browsing.

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Preamble — REQUIRED, do not dispatch without it

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`,
> and this repo's `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/
> deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` —
> the register row and the review verdicts are the orchestrator's alone.** Do NOT `git add`/`commit`/
> `push` — leave every change uncommitted in the working tree for the orchestrator's independent
> review. WRITE the tests the "Tests to WRITE" section (Part A) calls for AND **RUN the tests you just
> wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's
> affected/full suite, NOT any review, NOT the mandatory browser-level check — that is the
> orchestrator's, after you finish). The orchestrator re-runs the authoritative set, does the
> independent review, and drives the browser-level check after you finish — those are the gate; your
> own run does not count as it.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

## Part C — Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.** You ARE the invocation described
> below; do NOT shell out to `codex exec`.

### Execution directive

Implement through `codex exec` in the background, invoked directly via Bash (never the
`debugger`/`*_coder` Agent wrappers), with BOTH `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`. `cwd` = this repo's root (never `…/webapps`). Fallback
to direct Claude implementation only on Codex quota/rate-limit/non-zero exit — check
`.claude/codex-status.md` first per `AGENTS.md`; the fallback flips authorship, making an independent
`reviewer` mandatory regardless of the routing below.

### Review routing

Tier 3, shared-core, **breaking**: `reviewer` AND `ui_reviewer` both run, full context, concurrently
in one background batch (not sequential, not after commit) — model Sonnet for `reviewer` given Tier 3.
The Orchestrator additionally runs its own targeted pass for: the invariant test's actual assertion
strength (does it sum the named bands, or only compare totals — the thing that would let a
`UCM-CHART-10`-shaped bug back in), whether the dev-mode error truly stays inert in production, and
whether `ChartFrame`'s dropped/kept mismatch warning was a silent behaviour change.

### Verification

1. The affected-areas test gate: `tests/chartDefaults.test.js`, `tests/ChartFrame.test.jsx`, and any
   new chart-preset test files, via the package's test runner (`pnpm test` scoped to these files/dirs
   — check `package.json`'s test script for the right invocation, do not run the full suite unless it
   turns out these are the only test files in the package).
2. **Mandatory browser-level check, not optional** (Part A "Tests to WRITE" + Risks): render on hram
   with real data at 1280px and one narrow width (375px), confirm the invariant holds against actually
   rendered geometry and that the Access-scatter blank band is gone. DOM measurement is acceptable
   here and must be declared as such in the register Notiz (per AGENTS.md → Reviews, prototype-style
   substitution disclosure) — this WO's own text calls the browser check "sufficient... because the
   acceptance is arithmetic," so a declared DOM-measurement substitution meets the gate; a screenshot
   is not required, but the specific measured numbers must be reported, not just "looks fine."
3. Check `publish.yml`'s version gate (`.github/workflows/publish.yml:72-96`, a plain per-segment
   integer `greaterThan` compare) — it already handles a major bump correctly (`3.0.0 > 2.42.3`), no
   change needed there. Bump `package.json`'s `"version"` (:3, currently `2.42.3`) to `3.0.0` as part
   of this diff — the publish workflow is push-triggered off `main` and gates only on the version
   string increasing, so the version bump IS the publish trigger; do not push before everything else
   here is green. Per the Risk note, do NOT chase down consumer caret pins in this WO — that is each
   consumer's own migration WO's problem (Non-goals: no consumer migration here).

### Register + commit

`WORK_ORDERS.md` row `UCM-CHART-12`: `done`, both reviewers named with verdict, the browser-level
check's declared method (DOM measurement or real screenshots) and its numbers, commit SHA. Single
concise commit subject, e.g. `UCM-CHART-12: one layout model for charts (breaking, 3.0.0)`. Push to
`main` (this repo's trunk — no `develop` step, per the Envelope header). This is a **major, breaking,
shared-core** publish: after push, confirm in the Actions log that `publish.yml` actually ran and
published `3.0.0` — a silent publish failure here is invisible to every consumer's future pin bump.
