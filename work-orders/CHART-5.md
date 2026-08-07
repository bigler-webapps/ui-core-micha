# WORK ORDER CHART-5 (ui-core-micha) — dual y-axis + always-visible x-axis ticks

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.
**Known at WO authoring time: the Codex workspace is out of credits for this session — the fallback
applies immediately, do not spend time retrying `codex exec` first.**

Feature WO on `TimeSeriesChart` (CHART-2/3/4). Operator request, found live in jg-ferien's Aktivität
screen: (a) the shared y-axis mixes an integer count series ("Eindeutige Nutzer") with a fractional
hours series ("Anwesenheitszeit"), producing decimal ticks (0.2, 0.4, ...) that don't make sense for a
user count; (b) the x-axis (time buckets) shows **zero** visible tick labels once there are enough
buckets that MUI X-Charts' built-in collision-avoidance decides none of them fit — worse than showing
a sparse subset, this shows nothing at all.

## TIER
Tier 2 — shared-core UI, new public surface (a new optional per-series field). Independent `reviewer`
+ `ui_reviewer` mandatory.

## WHY

**Y-axis.** CHART-2 deliberately rejected a second y-axis in favor of series toggles ("if you do not
add one, say so deliberately" — CHART-2 said so, choosing toggles). The operator has now explicitly
requested the second y-axis for this exact case, with full awareness of that prior decision (asked
in-chat, chose it knowingly over forcing shared-axis integer ticks — which would make the fractional
series nearly invisible — and over hiding the tick label only when one series is toggled off). This
WO reverses CHART-2's choice on operator authority, it does not silently second-guess it.

**X-axis.** `node_modules/@mui/x-charts/ChartsXAxis/getVisibleLabels.js`'s default behaviour drops a
tick label the moment it would overlap the previous one (`tickLabelMinGap`) — with many narrow-band
categories (e.g. 24 hourly buckets) and non-trivial label text (jg-ferien's `formatBucketLabel`
produces e.g. `"08/06, 08:00"`), every label can end up colliding and the *entire* axis goes blank.
MUI's own escape hatch is `tickLabelInterval` as a **function** — when provided, it fully replaces the
collision-based filtering (`getVisibleLabels.js`: `if (typeof tickLabelInterval === 'function') return
new Set(xTicks.filter((item, index) => tickLabelInterval(item.value, index)))`), so a deterministic,
evenly-spaced selection can guarantee *some* labels always render regardless of container width or
label length.

## SCOPE

**A. Per-series `axis` field, backward-compatible.** Each entry in `data.series[i]` gains an optional
`axis: 'primary' | 'secondary'` field. Default (omitted, or every series `'primary'`): **byte-for-byte
today's single-shared-axis behaviour** — no `yAxis` array change, no `yAxisKey` on series, nothing
observably different for existing consumers (jg-ferien pre-adoption, or any future host that doesn't
use the field). Only when **at least one** series declares `axis: 'secondary'` does dual-axis mode
activate:
  - Build `yAxis` as two entries: primary (`id: 'primary'`, label = existing `yAxisLabel` prop) and
    secondary (`id: 'secondary'`, label = new prop `secondaryYAxisLabel`).
  - Each series passed to `BarChart` gets `yAxisKey: 'secondary'` when its `axis` is `'secondary'`,
    omitted (defaults to the first/primary axis) otherwise — `series` items already pass straight
    through `BarChart`'s `...chartProps` to the real `MuiBarChart`, which natively supports
    `yAxisKey` per series; no `BarChart.jsx` change needed for this part, verify that during
    implementation rather than assuming.
  - `secondaryYAxisLabel` is required (throw, matching `BarChart`'s own `xAxisLabel`/`yAxisLabel`
    required-prop convention) **only when dual-axis mode is actually active** (i.e. when computing
    it: if any series has `axis === 'secondary'` and `secondaryYAxisLabel` is falsy, throw with a
    clear message) — do not require it unconditionally, that would break every existing single-axis
    caller.

**B. Auto-detected integer-only ticks per axis group, not a new prop.** For each y-axis actually in
use (primary always; secondary only in dual-axis mode), if **every** data value across that axis's
currently-**visible** series (respecting the existing series-toggle `visibleKeys` state — an axis
whose only integer series just got toggled off should not keep forcing integer ticks on whatever
remains) is a whole number (`Number.isInteger`), apply a `valueFormatter` to that axis's config that
only emits a label for integer tick values and an empty string otherwise (mirrors the X-axis
collision convention: `getVisibleLabels.js` already treats `formattedValue === ''` as "don't show
this tick" for the X axis; verify the Y-axis tick renderer honours the same convention during
implementation — if it does not, use whatever mechanism it actually supports to the same effect, and
say so in the completion note). If not all-integer, leave the axis's default (no custom formatter) —
this is what keeps `Anwesenheitszeit` (fractional hours) unaffected on its own axis, and correctly
does nothing extra for a primary axis that legitimately has fractional data.

**C. Deterministic x-axis tick visibility.** Replace MUI's default collision-based tick filtering with
an explicit `tickLabelInterval` function on the x-axis config, evenly sampling up to `MAX_X_TICKS`
(pick a sensible constant, e.g. 8) labels across `data.xLabels`, e.g. `index % Math.max(1,
Math.ceil(xLabels.length / MAX_X_TICKS)) === 0` (adjust as needed so the *last* category is also
reachable/considered, not just an artifact of the modulo — check this doesn't systematically drop the
final bucket). This must apply regardless of dual-axis mode (independent scope).

## NON-GOALS / DO NOT TOUCH
- No third axis, no per-axis custom colors, no new axis-styling props beyond what SCOPE describes.
- Do not touch the range picker, series-toggle checkboxes' own rendering, `chartsTranslations`, or the
  CHART-3/CHART-4 fixes (`visibleKeys` sync, `CHART_HEIGHT`).
- Do not change `BarChart.jsx`/`ChartFrame.jsx` unless SCOPE A's `yAxisKey` passthrough turns out to
  need it (verify first, per SCOPE A's own note) — if it does, extend deliberately and say so, matching
  CHART-2's own "do not work around a primitive gap in the preset" rule.
- jg-ferien's own adoption (setting `axis: 'secondary'` on `presence_hours`, adding a
  `secondaryYAxisLabel`, shortening `formatBucketLabel`) is **explicitly out of scope for this WO** —
  a separate companion change in that repo, after this publishes.

## RISKS
- `tickLabelInterval` as a function fully bypasses MUI's built-in overlap detection (per SCOPE C's
  quoted source) — a fixed `MAX_X_TICKS` could still produce overlapping text at extreme narrow
  widths with very long labels. Accepted: "some labels, deterministically" is strictly better than
  "zero labels, unpredictably" (today's bug), and host-side label shortening (jg-ferien's future
  companion change) is the complementary fix for extreme cases, not this WO's job.
- Every host that adopts `axis: 'secondary'` changes its chart's visual scale contract (two
  independent y-domains can visually mislead if not clearly labelled) — mitigated by requiring
  `secondaryYAxisLabel`, not by this WO deciding it's always fine.
- The integer-tick auto-detection (SCOPE B) re-evaluates on every toggle (depends on `visibleKeys`) —
  confirm this doesn't cause a visible axis-label flicker/jump on toggle beyond the intended "ticks
  change because domain changed" behaviour the toggles already produce today.

## REQUIRED TESTS TO WRITE
Extend `tests/TimeSeriesChart.test.jsx`. Do NOT run the full suite.

**Learn from CHART-4's own history in this file (read `WORK_ORDERS.md`'s CHART-4 row before writing
these): an unmocked test asserting real rendered DOM/tick visibility was proven VACUOUS in this exact
component (jsdom's layout/ResizeObserver handling doesn't reproduce real-browser collision behaviour).
Do not repeat that mistake here.** For anything about tick *visibility* or *positions* (SCOPE C, and
SCOPE B's empty-string-for-non-integer-ticks mechanism), assert on the **function/config actually
passed** to the mocked `MuiBarChart` (`chartSpy.mock.calls`) — e.g. call the captured
`tickLabelInterval` function directly with sample `(value, index)` pairs and assert its boolean
results, or call the captured y-axis `valueFormatter` directly with sample tick values and assert its
string output — never assert on rendered pixel positions or DOM overlap in jsdom.

1. **Dual-axis backward compatibility**: with no series declaring `axis`, `chartSpy`'s `yAxis` prop
   must be unchanged from today's single-entry shape (or however it's currently constructed — assert
   equivalently to the existing tests, not a new shape).
2. **Dual-axis activation**: with one series `axis: 'secondary'`, assert `chartSpy`'s `yAxis` has two
   entries (primary/secondary ids, correct labels from `yAxisLabel`/`secondaryYAxisLabel`), and assert
   the secondary series' entry in `chartSpy`'s `series` prop carries `yAxisKey` matching the secondary
   axis id while the other series' entry does not (or carries the primary id — whichever the
   implementation settles on, be explicit and consistent).
3. **Missing `secondaryYAxisLabel` throws** when a series declares `axis: 'secondary'` but the prop is
   absent — mirrors `BarChart`'s own required-prop throw test convention (check
   `tests/BarChart.test.jsx` for that pattern).
4. **Integer-tick auto-detection, both directions**: one case where a y-axis's visible series are all
   whole numbers (assert the captured `valueFormatter` returns a non-empty string for an integer tick
   value and `''` for a non-integer one), and one case where they are not all whole numbers (assert no
   custom `valueFormatter` is applied, or that it returns the value formatted normally for every tick —
   whichever the implementation does, assert it explicitly).
5. **Toggle re-evaluation**: toggling off the one non-integer series on a shared/primary axis (single-
   axis mode) changes that axis from "not all-integer" to "all-integer" — assert the formatter
   behaviour changes accordingly after the toggle. (This is the SCOPE B "re-evaluates on toggle" case,
   RISKS section.)
6. **X-axis `tickLabelInterval` guarantees coverage**: call the captured function against a large
   `xLabels` array (e.g. 24 entries) and assert it returns `true` for at least `N` evenly-spread
   indices (pick a concrete, checkable lower bound, e.g. at least 3 for 24 items at `MAX_X_TICKS=8`)
   and that it does not return `true` for literally zero indices (the non-vacuity check for the whole
   WO — the very bug this section fixes).
7. **Non-vacuity**: each new test must fail against the current (pre-fix) code — verify before
   considering the fix complete. (SCOPE C's test 6 obviously fails today since there is no
   `tickLabelInterval` at all; confirm the others similarly.)

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main`. Publish per the repo's release flow
(minor bump — new optional field/prop, additive, no breaking change to existing callers).

## TEST SCOPE FOR THE GATE (orchestrator)
`tests/TimeSeriesChart.test.jsx`. Not the full suite.

## CONTEXT PACKAGE — verified current state (Orchestrator, Implementation map)

Work from this package; do not explore broadly from scratch — open only the named files to verify.

**File to change: `src/components/charts/TimeSeriesChart.jsx`** — current full return statement and
surrounding derived-state variables (`:117-189`, verified current):
```jsx
const visibleSeries = seriesConfig.filter((series) => visibleKeys.has(series.key));
const visiblePalette = visibleSeries.map((series) => palette[seriesConfig.indexOf(series) % palette.length]);
const isDataEmpty = seriesConfig.length === 0 || visibleSeries.length === 0;
...
return (
  <ChartFrame ... minHeight={CHART_HEIGHT}>
    {!isDataEmpty && (
      <BarChart
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        xAxis={[{ data: data?.xLabels || [] }]}
        series={visibleSeries.map((series) => ({ data: series.data, label: series.label }))}
        palette={visiblePalette}
        height={CHART_HEIGHT}
      />
    )}
  </ChartFrame>
);
```
Component signature currently: `{ title, subtitle, xAxisLabel, yAxisLabel, data, loading, error,
onRangeChange, defaultRange }` (`:56-66`) — add `secondaryYAxisLabel` here.

**`BarChart.jsx`** (full file, unchanged by this WO unless SCOPE A's verification says otherwise):
`series`/`xAxis`/`yAxis` are BarChart's own named props; `series` is passed straight through
(`series={series}` onto `MuiBarChart`, `:35`) with NO per-item transformation — so a `yAxisKey` field
already present on a series object the caller builds should reach `MuiBarChart` unmodified. `yAxis`
goes through `labelledAxis(yAxis, yAxisLabel, {scaleType:'linear'})` (`:37`), which preserves any
`label` already set on an axis entry (only fills in the default when absent) — so `TimeSeriesChart`
passing two fully-labelled `yAxis` entries will not have `BarChart`'s own `yAxisLabel` prop override
them; **`TimeSeriesChart` should stop passing a single top-level `yAxisLabel` to `BarChart` once it is
building its own multi-entry `yAxis` array explicitly** (or `BarChart`'s `yAxisLabel` requirement
throws — check `BarChart.jsx:27-29`'s `if (!xAxisLabel || !yAxisLabel) throw` and account for it:
either keep passing `yAxisLabel` as before, since `labelledAxis` won't clobber pre-labelled entries
anyway, or restructure — pick whichever keeps `BarChart`'s existing required-prop contract intact
without a special case).

**X-axis**: `xAxis={[{ data: data?.xLabels || [] }]}` (`:181` current) — add `tickLabelInterval` to
this object; `labelledAxis` will preserve it (only fills `label`, spreads everything else through).

**Existing tests to model conventions on**: `tests/TimeSeriesChart.test.jsx` (chartSpy mock pattern,
already described above) and `tests/BarChart.test.jsx` (required-prop-throws test pattern for the
`secondaryYAxisLabel` throw case).

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`).
> Work order: `work-orders/CHART-5.md` — read it fully, then follow the `orchestrate-codex` skill.
> **Codex workspace is out of credits this session — go straight to the direct-Claude fallback.**
>
> Two independent additions to `TimeSeriesChart`, both operator-requested after seeing the shipped
> CHART-2/3/4 chart live: (1) an opt-in second y-axis via a new per-series `axis: 'secondary'` field,
> fully backward-compatible when unused, with auto-detected integer-only tick labels per axis group
> (not a new prop — derived from whether that axis's visible series data is all whole numbers); (2) a
> deterministic x-axis `tickLabelInterval` so time-bucket labels never all vanish under MUI's default
> collision-avoidance, which is exactly what happened live (zero labels shown with 24 hourly buckets).
> **Test-writing pitfall already hit once in this file (CHART-4): do not write a test that asserts on
> real jsdom-rendered tick visibility/position — it will be vacuous. Assert on the captured
> `tickLabelInterval`/`valueFormatter` functions' own return values instead**, calling them directly
> with sample inputs against the mocked `chartSpy` call's props.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
