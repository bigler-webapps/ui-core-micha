# WORK ORDER CHART-4 (ui-core-micha) — TimeSeriesChart renders no chart body (zero height)

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.
**Known at WO authoring time: the Codex workspace is out of credits for this session — the fallback
applies immediately, do not spend time retrying `codex exec` first.**

Bug-fix WO on CHART-2/CHART-3. Found live in jg-ferien's "Aktivität" screen (ACT-3/ACT-5 consumer)
immediately after CHART-3 shipped and jg's pin was bumped: the toolbar, series checkboxes, and MUI
X-Charts **legend** now all render correctly (proving CHART-3's fix works and real data is present),
but the chart canvas itself — bars and axes — is entirely absent. The card ends right after the
legend row with visible empty space beneath it.

## TIER
Tier 2 — shared-core UI consumed by every app that adopts `TimeSeriesChart`.
Independent `reviewer` + `ui_reviewer` mandatory.

## WHY

`TimeSeriesChart` composes `ChartFrame` + `BarChart` but never supplies either with a height:

```jsx
<ChartFrame title={title} subtitle={subtitle} toolbar={toolbar} loading={loading} error={error} isEmpty={isDataEmpty}>
  {!isDataEmpty && (
    <BarChart xAxisLabel={xAxisLabel} yAxisLabel={yAxisLabel} xAxis={[{ data: data?.xLabels || [] }]}
      series={visibleSeries.map(...)} palette={visiblePalette} />
  )}
</ChartFrame>
```

Neither `minHeight`/`aspect` (ChartFrame's own sizing props) nor `minHeight`/`aspect`/a raw MUI
`height` (BarChart's) are passed. `ChartFrame`'s inner content `Box` has `display: flex, alignItems:
center, justifyContent: center` with no defined height — with `alignItems: center` (not `stretch`),
a flex child gets its own intrinsic height, not the parent's. `BarChart`'s own wrapping `Box` (`sx:
{width:'100%', minHeight, aspectRatio}`) therefore also has no height when neither prop is supplied.
MUI X-Charts' internal responsive container measures its actual parent height via `ResizeObserver` to
size the SVG — with a zero-height parent, the chart canvas (bars, axes) renders at zero size. The
**legend** is a separate MUI X-Charts sub-component sized by its own content (text + swatches), so it
renders regardless of container height — which is exactly why the legend was the only visible sign
of a mounted chart in the live screenshot.

This gap was invisible until now because CHART-3's own bug (`visibleKeys` never populating) kept
`isDataEmpty` permanently `true`, so `BarChart` never actually mounted in any live deployment before
today. It also went uncaught by CHART-2's and CHART-3's own tests: both `tests/BarChart.test.jsx` and
`tests/TimeSeriesChart.test.jsx` mock `@mui/x-charts/BarChart` itself (`vi.mock('@mui/x-charts/BarChart', ...)`
per CHART-2's own required-tests convention), so no test in this repo has ever mounted the *real* MUI
chart and observed its rendered size. The working reference is `dev/entries.jsx`'s `BarChartEntry`
(DX-1 harness), which explicitly sets `minHeight={360}` on `ChartFrame` and `height={320}` directly
on `BarChart` — i.e. every other real consumer of these primitives in this repo already knows it must
supply a height; `TimeSeriesChart`, as a preset built on top, was supposed to supply this itself
(hosts don't see `ChartFrame`/`BarChart` directly through the preset) and doesn't.

## SCOPE

**Give `TimeSeriesChart` a sensible built-in height for the chart it composes**, matching the
DX-1-proven working pattern:
1. Pass `minHeight` to `ChartFrame` (sizes the loading/error/empty states too, not just the chart).
2. Pass a height down to `BarChart` so the actual MUI chart canvas gets a real, non-zero pixel size —
   either `BarChart`'s own `minHeight`/`aspect` wrapper props, or a raw `height` forwarded via
   `BarChart`'s `...chartProps` pass-through to `MuiBarChart` (the mechanism `dev/entries.jsx` uses
   directly against `BarChart`, confirmed working there). Pick whichever actually renders a non-zero
   chart canvas when verified (see REQUIRED TESTS) — do not assume `aspectRatio` CSS alone reliably
   drives MUI X-Charts' `ResizeObserver` sizing without checking; the raw `height` prop is the
   confirmed-working mechanism in this repo's own reference usage and is the safer default if there
   is any doubt.
3. Pick one fixed value (e.g. `320`/`360`, matching `dev/entries.jsx`'s own numbers) as a preset
   default — this is a preset, not a raw primitive; the host does not choose chart height, matching
   `TimeSeriesChart`'s existing "no new props" presentational contract. Do not add a new prop for
   this unless a reviewer specifically asks for one.

**This WO's real fix is the test gap, not just the pixels.** The reason this shipped broken twice is
that every test in this file mocks the real MUI chart component. Required test 1 below must exercise
the **unmocked** `@mui/x-charts/BarChart` and assert a real rendered size — a mocked-chart test would
be exactly the kind of vacuous coverage that let this ship.

## NON-GOALS / DO NOT TOUCH
- Do not change the range picker, series toggles, `chartsTranslations`, or the CHART-3 `visibleKeys`
  sync logic — this WO is scoped to sizing only.
- Do not change `ChartFrame`'s or `BarChart`'s own prop contracts (`minHeight`/`aspect` already exist
  on both) — only how `TimeSeriesChart` calls them.
- Do not add a new prop to `TimeSeriesChart`'s public API for this — see SCOPE point 3.

## RISKS
- Every host that has adopted `TimeSeriesChart` is affected (currently jg-ferien via ACT-3/ACT-5) —
  this changes rendering behaviour for all of them, in the correct direction (chart canvas now
  actually visible).
- Getting this wrong a second time (e.g. an `aspectRatio`-only fix that still doesn't reliably drive
  MUI X-Charts' internal measurement) ships a third silent failure in the same component. The
  required unmocked-render test exists specifically to catch that before it reaches a live app again.

## REQUIRED TESTS TO WRITE
Extend `tests/TimeSeriesChart.test.jsx`. Do NOT run the full suite.

1. **The real bug's mechanism, not a jsdom layout measurement.** An initial attempt at this WO wrote
   an *unmocked* test (real `@mui/x-charts/BarChart`, no `vi.mock`) asserting the rendered chart
   surface's `viewBox` height was non-zero — verified, in practice, to be **vacuous**: it stayed green
   even with the pre-fix code (no `height` prop anywhere), because jsdom's `ResizeObserver`/layout
   handling does not reproduce the real-browser zero-height-parent behaviour this bug depends on. Do
   not repeat that approach. Instead, keep the existing `chartSpy` mock convention (`vi.hoisted` +
   `vi.mock('@mui/x-charts/BarChart', ...)`, already at `tests/TimeSeriesChart.test.jsx:9-10`) and
   assert directly on the props the real `MuiBarChart` receives: `chartSpy.mock.calls.at(-1)[0].height`
   must be a real, non-zero number. This is what actually distinguishes fixed from broken — confirmed
   by reverting the fix and re-running: the prop assertion fails pre-fix (`props.height` is
   `undefined`), the unmocked viewBox assertion does not.
2. **Non-vacuity**: this test must fail against the current (pre-fix) code — verify before considering
   the fix complete (see note above — already verified once for the prop-assertion approach).
3. Existing mocked-`BarChart` tests (range/toggle/empty-state behaviour) stay as they are.

## CONTEXT PACKAGE — verified current state (Orchestrator, Implementation map)

Work from this package; do not explore broadly from scratch — open only the named files to verify.

**File to change: `src/components/charts/TimeSeriesChart.jsx`.**

Current return statement (verified, full slice, `:150-169`):
```jsx
return (
  <ChartFrame
    title={title}
    subtitle={subtitle}
    toolbar={toolbar}
    loading={loading}
    error={error}
    isEmpty={isDataEmpty}
  >
    {!isDataEmpty && (
      <BarChart
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        xAxis={[{ data: data?.xLabels || [] }]}
        series={visibleSeries.map((series) => ({ data: series.data, label: series.label }))}
        palette={visiblePalette}
      />
    )}
  </ChartFrame>
);
```

**Reference (working) pattern — `dev/entries.jsx:35-39`:**
```jsx
function BarChartEntry() {
  return (
    <ChartFrame title="Monthly cases" subtitle="Standalone BarChart entry" minHeight={360}>
      <BarChart {...barChartFixture} xAxisLabel="Month" yAxisLabel="Cases" height={320} />
    </ChartFrame>
  );
}
```
Note `height={320}` on `BarChart` here is NOT `BarChart`'s own `minHeight`/`aspect` wrapper prop — it
lands in `BarChart`'s `...chartProps` rest spread (`BarChart.jsx:24,34`) and is forwarded straight to
`MuiBarChart`'s own native `height` prop, which MUI X-Charts uses as a fixed pixel height instead of
measuring the parent via `ResizeObserver`. This is the confirmed-working mechanism in this repo.

**`ChartFrame.jsx:86-99`** — the content `Box`: `sx={{ width:'100%', minHeight, aspectRatio: aspect,
display:'flex', alignItems:'center', justifyContent:'center' }}`. `alignItems:'center'` means a flex
child (here, `BarChart`'s own `Box`) is NOT stretched to fill this Box's height — it keeps its own
intrinsic height. Passing `minHeight` to `ChartFrame` sizes this outer Box correctly for the
loading/error/empty `Alert`/`CircularProgress` states (which have no fixed height of their own and
DO benefit from the flex-centered parent height), but does **not**, by itself, give `BarChart`'s
child `Box` any height — that must come from `BarChart` itself (its own `minHeight`/`aspect`, or the
raw `height` chartProp per the reference pattern above).

**`BarChart.jsx:15-44`** — full file, already shown above in this WO's WHY section — `minHeight`/
`aspect` are explicit named props (`:22-23`) applied to `BarChart`'s own wrapping `Box` (`:32`);
anything else lands in `...chartProps` (`:24`) and is spread onto `MuiBarChart` directly (`:34`),
which is how a raw `height` reaches the underlying MUI component.

**Test file: `tests/TimeSeriesChart.test.jsx`** — already mocks `@mui/x-charts/BarChart` via
`vi.hoisted` + `vi.mock` (`:9-10`) and every existing test reads `chartSpy.mock.calls.at(-1)[0]` to
assert exact props (e.g. the `series`/`colors` assertions at `:87-89,94-99`). Add the new test in the
same style, asserting `props.height` — see REQUIRED TESTS above for why an unmocked render test does
NOT work here.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main`. Publish per the repo's release
flow (patch bump — bug fix, no interface change).

## TEST SCOPE FOR THE GATE (orchestrator)
`tests/TimeSeriesChart.test.jsx`. Not the full suite.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`).
> Work order: `work-orders/CHART-4.md` — read it fully, then follow the `orchestrate-codex` skill.
> **Codex workspace is out of credits this session — go straight to the direct-Claude fallback, do
> not attempt `codex exec` first.**
>
> Second bug in `TimeSeriesChart` (after CHART-3): the chart legend renders but the actual bars/axes
> never appear because neither `ChartFrame` nor `BarChart` ever receive a height — MUI X-Charts'
> responsive container measures a zero-height parent and draws nothing. `dev/entries.jsx`'s
> `BarChartEntry` is the proof this is fixable: `minHeight={360}` on `ChartFrame` + `height={320}`
> forwarded straight to `BarChart` (MUI's own native height prop, not the wrapper's `minHeight`/
> `aspect`). The required regression test must NOT mock `@mui/x-charts/BarChart` — every existing test
> in this component mocks it, which is exactly how two sizing/rendering bugs shipped undetected.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
