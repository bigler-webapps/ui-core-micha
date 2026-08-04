# WORK ORDER CHART-2 (ui-core-micha) — a time-series chart preset with range picker and series toggles

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Extends CHART-1. Operator request 2026-08-04 from jg's event
activity chart; the same controls are wanted wherever a time series is charted, and `django-core-micha`
ACT-1 makes activity data available to every app.

## TIER
Tier 2 — shared-core UI consumed by every app. Independent `reviewer` + `ui_reviewer` mandatory.

## WHY

CHART-1 already ships `ChartFrame` (Paper + title + **toolbar slot** + loading / error / empty +
responsive container + SVG/PNG export + a11y), a themed `BarChart`, `getNeutralChartPalette` and
`chartsTranslations`. The frame's toolbar slot exists for exactly this and is currently unused by any
consumer.

jg's `ActivitySection.jsx` bypasses the kit entirely (`import { BarChart } from '@mui/x-charts/BarChart'`
at `:9`) and hand-rolls its own `Paper`, loading, error and empty states. Rather than jg building a
range picker and series checkboxes locally, they belong in the kit — every app charting a time series
wants both.

## SCOPE

**A. A range picker for the toolbar slot.** Presets **1 day / 1 week / 1 month / 1 year** (operator,
2026-08-04), emitting the selected range to the host. The host owns fetching; the picker owns the choice.

The range must also carry the **granularity** the consumer should request — dcm ACT-1's query endpoint
aggregates server-side, and a year of 4-hour buckets is ~2190 points, which no chart can render
usefully. A picker that changes the window but not the resolution reproduces exactly the
unreadable-density problem this WO exists to fix.

**The range-to-resolution mapping (operator, 2026-08-04) — implement exactly this:**

| Range | Resolution | Points |
|---|---|---|
| 1 day | 1 hour | 24 |
| 1 week | 4 hours | ~42 |
| 1 month | 1 day | ~30 |
| 1 year | 1 month | 12 |

Every preset lands between a dozen and fifty points, which is what keeps the chart readable at any
range. **The resolution follows the window; it is not an independent control** and must not be exposed
as one.


**B. Series toggles for the toolbar slot.** Check/uncheck each series independently.

**These are not cosmetic.** In jg's chart two series share one y-axis with different units — user counts
reach 28 while presence-hours sit near zero, so the second series is invisible. Toggling one off
rescales the axis and makes the other readable. Whether to offer a second y-axis instead is a real
alternative: **if you do not add one, say so deliberately** rather than leaving it unconsidered.

Deselecting every series must leave a stable empty chart — not a crash, not a permanent spinner.

**C. Compose them into a preset** on `ChartFrame` + the existing `BarChart`, so a consumer gets frame,
chart, picker and toggles from one component and passes data plus callbacks.

**Presentational only — the host fetches.** Take `data`, the current range and series selection, and
callbacks; do not call any endpoint. If all four hosts later write the identical fetch against ACT-1's
endpoint, *that* is the signal to add an adapter — and note the inverse trap from this estate's recent
history: building the shared thing before two identical consumers exist is how you generalise against a
single case and get it wrong.

## CONTEXT PACKAGE — verified current state (Orchestrator, Implementation map)

Work from this package; do not explore broadly from scratch — open only the named files to verify.

**New file: `src/components/charts/TimeSeriesChart.jsx`** (generic name — non-goal bars anything
app-specific; this is not called `ActivityChart`). Export it in `src/index.js` right after the
existing `LineChart` export (`:46`): `export { TimeSeriesChart } from './components/charts/TimeSeriesChart';`.

**`ChartFrame`'s toolbar slot (`src/components/charts/ChartFrame.jsx`)** — the prop is named
**`toolbar`** (not `toolbarSlot`), destructured `:20`, rendered `:74` inside a `Box` next to the
title/subtitle, `justifyContent: 'space-between'`. Full prop list `:17-34`:
`title, subtitle, toolbar, loading, error, isEmpty, emptyMessage, minHeight, aspect, exportOptions,
onExportSvg, onExportPng, ariaLabel, children, variant, sx`. State precedence `:58-65`:
`loading → error → isEmpty → children` — `TimeSeriesChart` passes its own `loading`/`error`/`isEmpty`
straight through, it does not reimplement these.

**`BarChart` (`src/components/charts/BarChart.jsx`, 44 lines)** — required props `xAxisLabel`/
`yAxisLabel` (throws if absent, `:27-29`). `series` is a bare array of MUI X-Charts series objects,
e.g. `{ data: [...], label, ... }` — no ucm wrapping. Colors: `palette || neutralPalette.categorical`
(from `useNeutralChartPalette()`), assigned **positionally by index** — series `i` gets
`categorical[i]`. `hideLegend={series.length <= 1}`.

**Data contract for `TimeSeriesChart`** (design decision, state it): the host has already fetched
and shaped the series (dcm ACT-1's query endpoint returns rolled-up buckets; this component knows
nothing about that origin). Prop shape:
```jsx
<TimeSeriesChart
  title
  xAxisLabel
  yAxisLabel
  data={{ xLabels: [...], series: [{ key: 'users', label: 'Users', data: [...] }, { key: 'presence', label: 'Presence', data: [...] }] }}
  loading
  error
  onRangeChange={(rangeKey, granularity) => {...}}   // rangeKey: '1d'|'1w'|'1m'|'1y'
/>
```
Range selection is **self-managed internal state** (default a sensible preset, e.g. `'1w'`), emitting
`onRangeChange(rangeKey, granularity)` on every change so the host can refetch `data` for the new
window — the host owns fetching (non-goal), this component owns only which range is currently
selected and telling the host what changed. Series-toggle visibility is **also self-managed internal
state** (`Set` of visible series keys, all visible by default) — deselecting is a pure client-side
filter over already-fetched `data`, no host round-trip needed, so no `onSeriesToggle` callback is
required (optional to add if a reviewer disagrees, but the WO's own framing — "these are not
cosmetic... toggling rescales the axis" — describes a display-only operation).

**Range-to-granularity mapping — implement exactly, no per-app override:**
`'1d' → 'hour'`, `'1w' → '4hour'`, `'1m' → 'day'`, `'1y' → 'month'` (match whatever granularity
vocabulary dcm ACT-1's query endpoint expects once it publishes — since CHART-2 does not fetch, the
exact string values are this component's own contract, name them clearly, e.g. `'hour' | '4hour' |
'day' | 'month'`, and state the chosen vocabulary in the completion note so ACT-1/ACT-3 can align).

**Range picker widget — decide and state (per WO's own "if you consider X, say so"):** this repo has
**zero existing `ToggleButtonGroup` usage** (grepped, confirmed) but an established, deliberate
`RadioGroup` + `FormControlLabel` convention for single-choice controls
(`src/messaging/PollCard.jsx:1-140`, code comment there explains why: native arrow-key nav + grouped
screen-reader announcement — "a bare ungrouped `Radio` per option... loses both"). Prefer
`RadioGroup`/`FormControlLabel` to match this repo's convention unless a segmented-button visual is
judged clearly better for a 4-preset picker — either is acceptable, but state which and why.

**Series toggles — `Checkbox` + `FormControlLabel` per series**, matching this repo's established
multi-choice pattern (`PollCard.jsx`'s multi-choice mode; also `Composer.jsx:181`,
`ProfileComponent.jsx:232,244`). **Accessibility requirement, verified as a real gap**: colors from
`getNeutralChartPalette` are assigned positionally with no name-to-color map and no shape
differentiation (`src/components/charts/palette.js`, full file) — so each checkbox's `label` MUST be
the series' text name (`FormControlLabel` gives this for free), not a bare colored swatch. Optionally
also render a small colored swatch next to the label (matching the series' `BarChart` color at the
same index) as a secondary, non-exclusive cue.

**Second y-axis — decision required by the WO, make it explicitly:** `BarChart` already supports a
dual-axis shape (`yAxisKey: 'secondary'` per series, paired with `yAxis={[{id:'primary'},
{id:'secondary'}]}`), so it is technically available — but **do not use it here**. Scope B's series
toggles are the WO's chosen, required fix for the shared-axis-different-units problem (jg's user
counts vs. presence-hours); a second y-axis is the *alternative* the WO explicitly did not choose.
State this decision plainly in the completion note — do not leave it to be inferred from absence.

**Empty state — all series deselected:** `ChartFrame`'s `isEmpty` prop drives its own empty-state
`Alert` (`:58-65`). When every series is toggled off, `TimeSeriesChart` must NOT pass an empty
`series` array to `BarChart` (which would likely throw or render a blank axis) — instead set
`isEmpty` truthy on `ChartFrame` and skip rendering `BarChart` entirely for that render, matching
required test 3 ("stable empty chart: no crash, no spinner").

**i18n — extend `src/i18n/chartsTranslations.ts` in place** (single `chartsTranslations` object,
`<ComponentName>.<CONSTANT_KEY>` convention, all four `de/fr/en/sw`, `:1-38` for the existing shape
to match). New keys needed: `TimeSeriesChart.RANGE_1_DAY`, `RANGE_1_WEEK`, `RANGE_1_MONTH`,
`RANGE_1_YEAR`, and a label for the series-toggle group (e.g. `TimeSeriesChart.SERIES_LABEL`).

**Tests — new `tests/TimeSeriesChart.test.jsx`**, matching `tests/ChartFrame.test.jsx`/
`tests/BarChart.test.jsx` conventions (both fully precedent): `// @vitest-environment jsdom` header,
vitest + `@testing-library/react`, `afterEach(cleanup)`, a minimal per-file `i18next.createInstance()`
+ `I18nextProvider` (not the app's real i18n config), wrapped in `ThemeProvider theme={createTheme()}`.
For test 1 (range emits granularity) and the series-filter tests, mock `@mui/x-charts/BarChart` itself
via `vi.hoisted` + `vi.mock` to inspect exact props passed through (`BarChart.test.jsx`'s own pattern,
`chartSpy.mock.calls[0][0]`) — do not mock ucm's own `BarChart`/`ChartFrame`, the point is testing the
real composition.

## NON-GOALS / DO NOT TOUCH
- Do not fetch data, and do not import anything app-specific.
- Do not change `ChartFrame`, `BarChart`, `LineChart` or the palette beyond what composing requires. If
  `ChartFrame` lacks something, **extend it deliberately and say so** — do not work around it in the
  preset.
- Do not add a charting dependency; MUI X-Charts is already the kit's basis.
- No persistence of the picker or toggle state — that is the host's decision.

## RISKS
- The toolbar slot has no consumer today, so this is its first real use. Expect to find gaps in it;
  fixing them is in scope, working around them is not.
- Accessibility: the picker and checkboxes are controls, not decoration — labels, keyboard operation and
  state must be right. Series colour alone must not be the only way to tell which toggle maps to which
  series. `ui_reviewer` should check this specifically.
- Every host inherits the preset; a visible behaviour change beyond jg.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. Selecting a range emits both the range **and** the mapped granularity to the callback — assert the
   granularity, which is the half most likely to be dropped.
2. Toggling a series off removes it from the rendered chart and leaves the others.
3. Toggling **all** series off renders a stable empty chart: no crash, no spinner.
4. The preset renders `ChartFrame`'s empty state for empty data, exactly once.

**Non-vacuity:** test 1 must fail if only the range is emitted. Assert the emitted payload, not that a
callback fired.

## TEST SCOPE FOR THE GATE (orchestrator)
The chart component tests. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; consumer pin bumps are separate.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`, or `develop` if present).
> Work order: `work-orders/CHART-2.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Extends CHART-1, whose `ChartFrame` already has an unused **toolbar slot** — that is where the range
> picker and series toggles go. **Presentational only: the host fetches, this component takes data and
> callbacks.**
>
> The one thing most likely to be half-done: the range picker must emit a **granularity** alongside the
> window. dcm ACT-1 aggregates server-side, and a 1-year range at 4-hour buckets is ~2190 points — a
> picker that widens the window without coarsening the resolution reproduces the unreadable chart this
> WO exists to fix. Test 1 asserts the granularity for that reason.
>
> The series toggles are a real fix, not a preference: jg's two series share one y-axis with different
> units, which is why one of them is invisible today. If you consider a second y-axis instead, decide
> deliberately and say so.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
