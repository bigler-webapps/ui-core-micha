# WORK ORDER CHART-3 (ui-core-micha) — fix TimeSeriesChart rendering nothing on async data load

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Bug-fix WO on the landed CHART-2. Found live in jg-ferien's "Aktivität" screen (ACT-3 consumer): the
toolbar (range picker + series checkboxes) renders correctly, but the chart body never appears —
`ChartFrame`'s empty-state `Alert` shows permanently, even once real data has loaded.

## TIER
Tier 2 — shared-core UI consumed by every app that adopts `TimeSeriesChart`.
Independent `reviewer` + `ui_reviewer` mandatory.

## WHY

`TimeSeriesChart` initializes `visibleKeys` via a **lazy `useState` initializer** that reads
`seriesConfig` (derived from the `data` prop) only once, at first mount:

```js
const [visibleKeys, setVisibleKeys] = useState(
  () => new Set(seriesConfig.map((series) => series.key)),
);
```

jg-ferien's `ActivitySection.jsx` mounts `TimeSeriesChart` with `data = { xLabels: [], series: [] }`
(its own initial `useState`), then fetches asynchronously in a `useEffect` and updates `data` only
once the API call resolves — the standard "mount empty, fill later" pattern. Because the lazy
initializer never re-runs on prop updates, `visibleKeys` stays a permanently empty `Set` even after
real series arrive. Downstream:

```js
const visibleSeries = seriesConfig.filter((series) => visibleKeys.has(series.key)); // always []
const isDataEmpty = seriesConfig.length === 0 || visibleSeries.length === 0;        // always true
```

`isDataEmpty` is permanently `true`, so `ChartFrame` renders its empty-state `Alert` forever, no
matter how much data loads. The toolbar renders fine because the range picker and the series
checkboxes are driven directly off the live `seriesConfig`, not off `visibleKeys` — only the chart
body is gated on the stale set. This reproduces on every host that fetches asynchronously after
mount (the overwhelmingly common case), not just jg-ferien.

## SCOPE

**Fix `visibleKeys` to track newly-appeared series without discarding a user's manual toggle.**

Required behaviour:
1. When `data`/`seriesConfig` changes and introduces a series key not seen before, that key must
   become visible by default (matches current first-mount behaviour, just not mount-only).
2. A series key the user has manually toggled off must **stay off** across a range change that
   still includes that key (e.g. don't reset all toggles to "all visible" on every `data` update —
   that would silently undo the user's own toggle, a second bug of the opposite kind).
3. A key that disappears from `seriesConfig` (e.g. a range change that drops a series) and later
   reappears is treated as new for step 1 (simplest correct behaviour; do not attempt to remember
   toggle state for absent keys unless it falls out naturally from the fix).

This is a "seen this key before, default it visible; otherwise respect the user's own toggle" sync,
not a full rewrite of the toggle model — `toggleSeries`, the checkbox rendering, and the empty-state
logic in SCOPE stay as they are; only the initialization/sync of `visibleKeys` changes.

## NON-GOALS / DO NOT TOUCH
- Do not change `ChartFrame`, `BarChart`, `LineChart`, or the palette.
- Do not change the range-picker or the range-to-granularity mapping (`RANGE_OPTIONS`).
- Do not add an `onSeriesToggle` callback or any other new prop/API surface — this is a bug fix
  within the existing component contract, not a scope extension.
- Do not touch `chartsTranslations.ts` — this WO is unrelated to i18n (a separate, already-diagnosed
  issue in a different repo is being fixed independently).

## RISKS
- The fix must not reintroduce the mount-time bug in a different form (e.g. resetting on every
  render, or resetting on every `data` change including in-place mutations of the same series set —
  that would silently discard the user's manual toggles on every range change, which is the
  behaviour test 2 below exists to catch).
- Every host that has adopted `TimeSeriesChart` since CHART-2 shipped is affected by this fix
  (currently only jg-ferien via ACT-3); this changes rendering behaviour for all of them, in the
  correct direction (chart now actually renders).

## REQUIRED TESTS TO WRITE
Narrow and behavioural, extending `tests/TimeSeriesChart.test.jsx`. Do NOT run the full suite.

1. **Regression test for this exact bug**: mount `TimeSeriesChart` with empty `data`
   (`{ xLabels: [], series: [] }`), then rerender with populated `data` (real `xLabels`/`series`) —
   assert the chart body renders (not `ChartFrame`'s empty state), i.e. `isEmpty` becomes `false`
   and `BarChart` receives the new series. This must fail against the current code and pass after
   the fix — it is the non-vacuity check for this WO.
2. **Toggle persistence across a data update**: toggle one series off, then rerender with updated
   `data` that still contains that series key (e.g. a value change, same keys) — assert that series
   is still filtered out (the user's manual toggle was not reset by the data update).
3. **New series key appearing later defaults to visible**: mount with one series, rerender with a
   second series key added — assert the new key is visible by default while any prior manual toggle
   on the first key is preserved.

**Non-vacuity:** test 1 must fail against the current `visibleKeys` lazy-initializer code (verify
this before considering the fix complete) — it is reproducing the exact live bug from jg-ferien.

## CONTEXT PACKAGE — verified current state (Orchestrator, Implementation map)

Work from this package; do not explore broadly from scratch — open only the named files to verify.

**File to change: `src/components/charts/TimeSeriesChart.jsx`.**

Current state (verified, full relevant slice):
```js
const seriesConfig = data?.series || [];

const [range, setRange] = useState(defaultRange);
// Series identity (keys) is assumed stable for a given chart instance — the
// toggle set is initialized once from the first data the chart receives.
const [visibleKeys, setVisibleKeys] = useState(
  () => new Set(seriesConfig.map((series) => series.key)),
);
```
(`TimeSeriesChart.jsx:52-59`) — the comment above `visibleKeys` states the now-disproven assumption
("series identity is stable for a given chart instance") that this WO corrects; update or remove it
to match the new behaviour.

`toggleSeries` (`:68-75`), `visibleSeries`/`visiblePalette`/`isDataEmpty` derivation (`:77-84`), and
the checkbox rendering (`:103-123`) are all downstream of `visibleKeys` and should not need changes
— only how `visibleKeys` is initialized/kept in sync with `seriesConfig` changes.

**Suggested shape (not prescriptive — implement whatever satisfies SCOPE correctly):** replace the
lazy `useState` with a `useEffect` keyed on the set of series keys in `seriesConfig`, that adds any
newly-seen key to `visibleKeys` (defaulting it visible) without touching keys already present in the
set — e.g. track previously-seen keys in a ref to detect "new" vs "toggled off", since a key
present in both old and new `seriesConfig` but absent from `visibleKeys` must stay absent (it was a
deliberate user toggle-off, not a fresh key). Keep `visibleKeys`'s existing `Set`-of-keys shape,
`toggleSeries`'s update pattern, and the checkbox/empty-state code untouched.

**Test file to extend: `tests/TimeSeriesChart.test.jsx`** — matches `tests/ChartFrame.test.jsx`/
`tests/BarChart.test.jsx` conventions: `// @vitest-environment jsdom` header, vitest +
`@testing-library/react`, `afterEach(cleanup)`, a minimal per-file `i18next.createInstance()` +
`I18nextProvider`, wrapped in `ThemeProvider theme={createTheme()}`. Use `rerender()` from
`@testing-library/react`'s `render()` return value to simulate the host updating `data` after mount
(this is the exact scenario CHART-2's own tests never covered — they only mounted once with
synchronous populated data).

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main`. Publish per the repo's release
flow (patch bump — bug fix, no interface change); consumer pin bumps are separate, out of scope.

## TEST SCOPE FOR THE GATE (orchestrator)
`tests/TimeSeriesChart.test.jsx` only. Not the full suite.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`).
> Work order: `work-orders/CHART-3.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Bug fix on CHART-2's `TimeSeriesChart`: `visibleKeys` is initialized once via a lazy `useState`
> from whatever `data` is at first mount, so any host that fetches asynchronously after mount (the
> normal case) ends up with a permanently-empty `visibleKeys` and the chart body never renders —
> `ChartFrame`'s empty state shows forever even once real data arrives. Fix the sync so newly-seen
> series keys default to visible while a user's manual toggle-off on an already-seen key survives a
> data update. Regression test 1 is the non-vacuity check — verify it fails against current code
> first.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
