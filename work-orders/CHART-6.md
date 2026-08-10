# CHART-6 — Chart-chrome defaults in the three wrappers, plus the two generic fixes hoisted up

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 2 (shared core — `ui-core-micha` is named in AGENTS.md's Tier-2 forcing list)
**Review:** independent `reviewer` (Sonnet, full) **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Decision record:** `webapp-management/DESIGN_SYSTEM_PROGRAM.md` (DS-4), plus the operator decisions of 2026-08-10 recorded below
**Version target:** `2.31.0`
**Hard precondition:** **THEME-1 must have landed and published as `2.30.0` first** — see Preconditions

---

## A. Envelope

### Goal

Close the chart-chrome default surface in ucm's three chart wrappers, resolve
`TimeSeriesChart`'s double legend, and hoist the two generic fixes that live in a consuming app
today up into the kit.

Expected outcome: a chart rendered through the kit looks deliberate without the caller setting
anything, and the four props that today decide whether it looks deliberate stop being the
caller's problem.

### Why

Both hram and fitness-monitor import the **same** thin wrappers. There is no app-local chart
module to promote — the quality gap is **three unset props plus one library default**. The
wrappers are roughly 18 lines of logic each: they enforce axis labels, apply a `hideLegend`
heuristic, force axis-trigger tooltips, and supply a palette fallback. Tick font, grid, margins
and marker styling are simply absent, so MUI X-Charts' own visual language shows through
untouched.

### Measured evidence (2026-08-08/09, verified)

- **Hand discipline fails even in the exemplar.** hram sets `tickLabelStyle.fontSize` at only
  **4 of 9** wrapper call sites — absent in `ExpertTimelinePanel`, `ReferralMetricsPanel`,
  `ResultsTimelinePanel`, `TotalMetricsPanel` and `GenericAnalysisPlot`'s top chart. This is the
  argument for defaults at the chokepoint rather than a convention.
- **The hollow-marker default is a library value, verified in source:**
  `@mui/x-charts/LineChart/MarkElement.js:27` sets `fill: theme.palette.background.paper` — a
  white-filled marker with a coloured stroke. hram avoids it by disabling markers globally;
  fitness-monitor turns them on and inherits it.
- **`TimeSeriesChart` renders a double legend** whenever ≥2 series are visible: its toolbar toggle
  row names and toggles the series, and MUI draws its own legend underneath.
- **The label-collapse workaround has two independent consumers** — fitness-monitor's
  `utils/chartLabels.js` (36 lines) and jg-ferien's `ActivitySection.jsx:10-16`, which documents
  the identical upstream issue. The promotion test is met.
- **`TeachingRunDetailPanel` (hram) bypasses the wrapper entirely** with a direct
  `@mui/x-charts` import — noted, not fixed here.
- **X-Charts `8.28.2` API limits, both verified in the installed types:** the legend's `position`
  is a 3×3 grid (`vertical: top|middle|bottom` × `horizontal: start|center|end`) and participates
  in layout — it reserves space rather than overlaying the plot. `skipAnimation` is a boolean per
  chart with **no separate enter/update control**.

### Scope

#### A. Prop defaults in all three wrappers

Applies to `LineChart`, `BarChart` **and `TimeSeriesChart`** — the third was overlooked when this
strand was first written and is the kit's most mature preset.

| Default | Value | Replaces |
|---|---|---|
| `tickLabelStyle.fontSize` | the baseline's tick size | MUI's ~12px, unstyled |
| `showMark` | `false` | MUI's `true` |
| marker style, when a caller opts markers back in | **filled** | MUI's hollow `background.paper` fill |
| `grid` | `{ horizontal: true }` | MUI's default of no grid at all |
| bottom margin | increased automatically when tick labels are rotated | hand-tuned per call site, or forgotten |
| `legendPosition` | **new prop** over MUI's nine positions; default **bottom-start**, filled marks, aligned to `ChartFrame`'s `p: 2` | MUI's centered-top with dash marks |

**Every one of these is a default, not an override.** A prop set by the caller always wins — hram's
four tuned `tickLabelStyle` call sites must render exactly as they do today.

#### B. `TimeSeriesChart`'s double legend

Where the toolbar toggle row is present, **MUI's legend is switched off and the toolbar becomes
the legend** (filled colour dots on the toggles). A row that both names and toggles the series is
the more capable of the two, and two elements saying the same thing is one too many.

The toggles must keep their accessible names — this must not become a row of unlabelled controls
for keyboard or screen-reader users.

#### C. Motion

- **Charts animate on entry** (operator, 2026-08-10), at the baseline's `motion.chart` duration.
- **Charts that poll or re-render on a timer get `skipAnimation`** — named concretely: cockpit's
  status board and hram's `CampaignMonitorPanel`. There the animation replays on every refresh and
  the value never comes to rest.
- Because `skipAnimation` is all-or-nothing in 8.28.2, those two also lose their entry animation.
  **A library limit, documented as such — not a design choice.**

#### D. The two hoists from fitness-monitor

- **`chartLabels.js`** — the documented X-Charts label-collapse workaround, 36 lines. Two
  independent consumers already, so this is a promotion and not a bet.
- **`yearTickInterval`** — hoisted **on its own merits**, not by association: it currently lives
  page-locally in fitness-monitor's `BodyHistoryPage` and is **not** part of `chartLabels.js`. The
  duplicated-year-tick defect it fixes hits any dense time axis, so it belongs to every
  `TimeSeriesChart` consumer. Ships as **its own export**, not mixed into `chartLabels.js`.

Both apps keep working unchanged. **Removing their local copies is not part of this WO** — that
happens in each app's own adoption WO, so this one stays reviewable in a single repo.

#### E. Version

`2.31.0` — minor: new props and new exports, nothing removed.

### Non-goals / do not touch

- **The legend auto-placement heuristic.** The operator's idea — detect whether the top-right or
  bottom-right corner of the plot is empty and place the legend there, otherwise below — is good,
  but X-Charts' built-in legend reserves layout space instead of overlaying, so a true in-plot
  legend needs a custom overlay. **Own strand, once someone has verified that path.** Deliberately
  kept out of a Tier-2 shared-core WO in a repo with no staging net, so this one stays fully
  verifiable.
- **The theme factory** — THEME-1.
- **`useNeutralChartPalette`'s ramp transition** — owned by THEME-1 (decision 22). This WO must not
  touch `charts/palette.js`.
- **The six hand-drawn hram plots** — DS-7/8/9.
- **`TeachingRunDetailPanel`'s wrapper bypass** — its own small WO in hram.
- **Removing the hoisted helpers' local copies** in fitness-monitor and jg-ferien.
- **Per-app adoption** of any of this.
- **No behaviour, permission or data-contract change.**

### Replaces / removes

1. MUI's **hollow marker** as the effective marker whenever a caller opts markers in.
2. MUI's **centered-top legend with dash marks** as the effective default.
3. **`TimeSeriesChart`'s second legend** — the MUI one, where the toolbar row exists.
4. Nothing is removed from the public API. No export disappears, no prop is dropped.

### Deliberately keeps

- **The `hideLegend={series.length <= 1}` heuristic.** A one-series legend is noise, and giving the
  legend a good position does not change that.
- **The required `xAxisLabel` / `yAxisLabel` contract** — the wrappers throw without them, and that
  is already generic and correct.
- **The `palette=` convention** and the wrapper's palette fallback.
- **`ChartFrame`'s `p: 2` padding and its foot row**, byte-for-byte — 16 panels depend on them.
- **Every caller's explicit props.** A set prop beats a default; hram's four tuned call sites must
  be visually unchanged.

### Risks

- **Adding a default is a behaviour change for every call site that did not set the prop**, and the
  effect is deliberately uneven: hram's four tuned `tickLabelStyle` sites stay identical, the other
  five change. That is the intended fix, but it means the rendered check must look at more than one
  chart.
- **No staging net.** A push to `main` touching `src/**` publishes to npm at once; the independent
  review is the only gate and is not back-fillable.
- **Ordering against THEME-1 is hard, not preferential.** Both WOs touch `src/index.js` and
  `src/components/charts/`, and decision 23 fixes the release order. Two implementers in this repo
  at once would race the version bump or ship half of this WO inside `2.30.0`.
- **A chart-preset bump deserves the same treatment as a theme bump.** Decision 11's argument
  applies unchanged: the consumer's next pin bump is a visual verification event, not a dependency
  line.
- **`skipAnimation` is all-or-nothing**, so the two polling charts lose entry animation too.

### Required tests to WRITE

Narrow per AGENTS.md → "Test scope". Written as part of implementation; **run only by the
Orchestrator**.

**`tests/chartDefaults.test.js`** (new, parametrised across `LineChart` / `BarChart` /
`TimeSeriesChart` where applicable)

1. A minimal call receives the tick font size, `grid: { horizontal: true }` and `showMark: false`.
2. A caller-set prop **beats** the default — asserted separately for each of tick font, grid,
   `showMark` and `legendPosition`.
3. Rotated tick labels increase the bottom margin; unrotated labels do not.
4. When a caller opts markers back in, the marker renders **filled** — not MUI's
   `background.paper` hollow default.
5. `legendPosition` defaults to bottom-start, and a caller-set position wins.

**`tests/timeSeriesLegend.test.js`** (new)

6. With the toolbar row present and ≥2 series, MUI's legend is **absent** — assert the absence
   explicitly, this is a removal.
7. The toolbar toggles keep an accessible name.
8. With a single series, `hideLegend` still applies.

**`tests/chartLabels.test.js`** (new, ported with the hoist)

9. The label-collapse workaround behaves as it does in fitness-monitor today — port its existing
   cases rather than inventing new ones.
10. `yearTickInterval` produces one tick per year across a dense multi-year range. **Prove
    non-vacuity** by removing it and confirming duplicate year labels reappear — this is the
    defect that started the whole investigation.

Plus `tsc -p tsconfig.build.json --noEmit` clean.

**No full-suite run.** The affected-areas set is the three new files plus the existing
`tests/chartsPalette.test.js` if the hoist touches it.

### Verification

- The **harness page** from THEME-1 gains chart specimens, so the defaults get a rendered
  acceptance rather than only assertions.
- The Orchestrator runs the **rendered two-width side-by-side** before commit (DS-1's hard gate),
  and names the two screenshots in the register Notiz.
- Because the effect is uneven, the rendered check must cover **at least one chart that set the
  props and one that did not** — otherwise it proves nothing about the change.

### Preconditions

- **THEME-1 landed and published as `2.30.0`.** Not before: both WOs touch `src/index.js` and
  `src/components/charts/`, this repo publishes on push, and decision 23 fixes the order.
- The baseline supplies `motion.chart` and the tick/grid token values this WO applies.

### Parity guardrail

Visual/UX only. **No behaviour, permission or data-contract change.** The hard condition: a caller
that already sets a prop sees **no change at all** — the defaults fill absence, they do not
override intent.

### Operator decisions binding this WO

- **2026-08-10:** charts animate on entry; polling charts get `skipAnimation` (light movement is
  wanted, and AAA is explicitly not the bar).
- **2026-08-10:** the toolbar row becomes the legend in `TimeSeriesChart`; MUI's legend goes.
- **2026-08-10:** `yearTickInterval` is hoisted, with its own justification and as its own export.
- **2026-08-10:** `legendPosition` ships as a prop with a fixed default; the auto-placement
  heuristic becomes its own strand because the in-plot overlay path is unverified.
- **Decision 23:** `2.31.0`, after THEME-1's `2.30.0`.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*

### Execution directive (read this first)

> **If you are the implementer reading this work order as your own specification: this section is
> NOT addressed to you.** It tells the Orchestrator how to invoke you. **You ARE that invocation —
> do NOT shell out to `codex exec`.**
>
> Implement through `codex exec` in the background — invoked directly via Bash (never the
> `debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
> `--dangerously-bypass-approvals-and-sandbox`. **Pass the WO via stdin, not as a positional
> argument** — `cat work-orders/CHART-6.md | codex exec --skip-git-repo-check
> --dangerously-bypass-approvals-and-sandbox -` — a positional arg hit Windows' command-line length
> limit on THEME-1 ("Argument list too long" from the npm shim); stdin is the proven working
> invocation for a WO this size on this platform. (Fallback to direct Claude implementation only on
> Codex quota/rate-limit/non-zero exit.)

### Context package

**Precondition verified 2026-08-10:** THEME-1 landed (`b329b39`, `96992cf`, `35f70b2`) and is live on
npm as `2.30.0` (`npm view @micha.bigler/ui-core-micha version` initially showed the registry cache
still at `2.29.2` right after push — the `Publish ui-core-micha to npm` GitHub Action had completed
successfully in ~1m42s; this repo's `package.json` already reads `2.30.0`, which is the authoritative
signal, not the possibly-cached registry response).

**Named files to change:**

- `src/components/charts/BarChart.jsx`, `src/components/charts/LineChart.jsx` — near-identical
  wrappers (currently 45 lines each, both shown in full above under "Named files"). Add: (1) default
  `tickLabelStyle` (merged into each axis entry, not replacing a caller's own `xAxis`/`yAxis` array
  entries — same "caller wins" pattern `labelledAxis` already uses for `label`); (2) default
  `showMark: false` on the wrapper's own `chartProps`-level default (only meaningful for `LineChart`
  — `BarChart` has no marks; skip it there or make it a shared no-op, your call, but do not add a
  prop MUI's `BarChart` doesn't accept); (3) default `grid={{ horizontal: true }}`; (4) an explicit
  `hideLegend` prop that DEFAULTS to today's `series.length <= 1` heuristic but is OVERRIDABLE by the
  caller — **this is a real gap, not cosmetic**: today `hideLegend={series.length <= 1}` is hardcoded
  after the `{...chartProps}` spread, so a caller-passed `hideLegend` in `chartProps` is silently
  discarded (JSX prop order: later wins, and the hardcoded one comes last). `TimeSeriesChart` (below)
  needs to force `hideLegend={true}` when it draws its own toolbar-as-legend, so this plumbing gap
  must close first; (5) a new `legendPosition` prop, default `{ vertical: 'bottom', horizontal:
  'start' }` (MUI's `Position` type — verified in
  `node_modules/@mui/x-charts/models/position.d.ts`: `{ vertical?: 'top'|'middle'|'bottom',
  horizontal?: 'start'|'center'|'end' }`), passed as `slotProps={{ legend: { position:
  legendPosition } }}` merged with the existing `tooltip: { trigger: 'axis' }` slotProp (don't
  clobber one with the other); (6) automatic bottom-margin increase when tick labels are rotated —
  MUI X-Charts reads rotation from `xAxis[i].tickLabelStyle.angle` (or similar; verify the exact
  field in the installed types before relying on it) — when a caller's `xAxis` sets a non-zero
  angle, add `margin.bottom` (a `ChartContainer`-level prop, check exact prop name/shape in
  `node_modules/.pnpm/@mui+x-charts@8.29.2_.../node_modules/@mui/x-charts/ChartContainer` types)
  large enough for the rotated label height — don't hardcode a single magic number without deriving
  it from the tick font size/angle, and don't touch margin at all when no rotation is set (default
  MUI margin must survive unchanged, per the parity guardrail).
  **On-chart marker fill (LineChart only):** verified in
  `node_modules/@mui/x-charts/LineChart/MarkElement.js:26-31` — the hollow marker is `styled('path',
  {name:'MuiMarkElement', slot:'Root'})(({theme}) => ({fill: theme.palette.background.paper, ...}))`,
  a genuine MUI-theme-connected styled component (same mechanism as `MuiButton`/`MuiTableCell` etc.
  already overridden in THEME-1's `BASELINE_STATIC.components`). The cleanest fix, consistent with
  every other component default in this kit, is a `MuiMarkElement: { styleOverrides: { root: {
  fill: 'currentColor' } } }` entry (paired with `stroke: color` already set per-instance by
  MarkElement itself, `color` inherited via the mark's own `color` CSS from its parent — verify
  `currentColor` actually resolves to the series colour in the rendered DOM, since `MarkElementPath`
  doesn't explicitly set a `color` CSS property alongside `stroke`; if `currentColor` doesn't
  resolve, use `fill: 'inherit'` or accept a small amount of extra plumbing) added to
  **`src/theme/tokens.js`'s `BASELINE_STATIC.components`** (a THEME-1 file, but this is a
  theme-component-override, not a `charts/palette.js` change — the WO's non-goal only excludes
  `charts/palette.js`, not `src/theme/`). If that turns out infeasible, fall back to a per-wrapper
  `slotProps`/`sx` override targeting `.MuiMarkElement-root` and say so explicitly in the PR — do not
  silently ship the hollow default.
  **Legend swatch shape:** verified in `LineChart/seriesConfig/seriesProcessor.js:97` — LineChart
  series default to `labelMarkType: 'line'` (a short dash, matching the WO's "dash marks" default to
  replace); `BarChart/seriesConfig/bar/seriesProcessor.js:94` already defaults to `labelMarkType:
  'square'` (already filled — nothing to change there). Fix: in `LineChart.jsx`'s series mapping,
  default each series entry's `labelMarkType` to `'square'` unless the caller's series object already
  sets one (`{ labelMarkType: 'square', ...series }` — caller key after the default wins the object
  spread, matching the "default, not override" invariant).
- `src/components/charts/TimeSeriesChart.jsx` — (1) pass `hideLegend` explicitly to its internal
  `BarChart` call (currently absent, so `BarChart`'s own heuristic applies): `hideLegend` should be
  `true` whenever the toolbar's series-toggle row renders (`seriesConfig.length > 0`, same condition
  already used at line 214 to render `FormGroup`) — that removes MUI's own legend while the toolbar
  toggles take over as the visible legend, satisfying Scope B. The toggles already carry an
  accessible name via each `FormControlLabel`'s `label` prop (line 217-231) — verify this still holds
  after your change (test 7), no new work expected there. (2) Pass `motion.chart`-based
  animation/`skipAnimation` through unchanged — `TimeSeriesChart` doesn't currently accept or need a
  `skipAnimation` prop itself; a caller wanting a polling chart to skip animation calls the wrapper
  with `skipAnimation` in `chartProps`, which already passes through `BarChart`'s `{...chartProps}`
  spread untouched — **verify this passthrough still works after your `hideLegend`/`legendPosition`
  changes** (i.e. don't accidentally consume/strip `skipAnimation` while destructuring), there is
  likely nothing to build here beyond that verification.
- `src/theme/tokens.js` — add the `MuiMarkElement` override described above (if that's the mechanism
  you land on), and a `chart` typography-adjacent tick-size reference if one doesn't already exist
  cleanly reachable (`BASELINE_STATIC.typography.caption` is `12px/400/1.4` — the natural fit for
  `tickLabelStyle.fontSize`; reference it directly via `theme.typography.caption.fontSize` inside the
  wrappers rather than inventing a new token, unless a dedicated token reads better — your call, but
  don't hardcode a bare `'12px'` string in the wrapper divorced from the theme).
- **New: `src/components/charts/chartLabels.js`** — port `formatShortTime`/`formatShortDate`/
  `formatShortMonth`/`formatShortYear` from
  `fitness-monitor/frontend/src/utils/chartLabels.js` (read that file directly — 37 lines, shown in
  full above under "Named files"; also check `fitness-monitor/frontend/src/utils/chartLabels.test.js`
  for the existing test cases to port per test 9, "port its existing cases rather than inventing new
  ones"). This is a straight port, not a rewrite — keep the exact locale-fallback behaviour and the
  `hour12: false` comment/rationale intact (it documents a real upstream MUI bug, mui-x#18768).
- **New: `src/components/charts/yearTickInterval.js`** (own export per the WO, not merged into
  `chartLabels.js`) — generalise
  `fitness-monitor/frontend/src/pages/BodyHistoryPage.jsx:39-43`'s `yearTickInterval(range, dates)`.
  That version is app-specific (gated on a literal `range !== "All"` string fitness-monitor owns) —
  the ucm export should NOT take a `range` string at all (this repo's own `TimeSeriesChart` uses
  different range keys, `'1y'` not `'All'`, and other callers may have yet another vocabulary). Ship
  it as `yearTickInterval(dates)`: always computes one Date per calendar year present in `dates` (the
  same `[...new Set(dates.map(d => d.getFullYear()))].sort().map(y => new Date(y, 0, 1))` logic,
  minus the range gate) — the CALLER decides when a dense-enough multi-year range warrants using it
  (as `xAxis[0].tickInterval`), matching the original's actual computation, not its app-specific gate.
- `src/theme/index.js`, `src/index.js` — export `chartLabels`' functions and `yearTickInterval` (new
  entries near the existing `## 6. Charts` section in `src/index.js`, alongside `ChartFrame`/
  `BarChart`/`LineChart`/`TimeSeriesChart`/palette exports).
- `package.json` — version `2.30.0` → `2.31.0` (minor).
- **New: `tests/chartDefaults.test.js`, `tests/timeSeriesLegend.test.js`, `tests/chartLabels.test.js`**
  — per Required tests below. Follow the existing mock convention in `tests/BarChart.test.jsx`
  (shown in full above): `vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: chartSpy }))` with a
  hoisted spy capturing props, assert on `chartSpy.mock.calls[...][0]` rather than deep-rendering the
  real chart. Mirror the same pattern for `@mui/x-charts/LineChart` where `LineChart.jsx` is under
  test.
- `dev/entries.jsx` — the WO's Verification section requires the harness to gain "chart specimens"
  and the rendered check must cover **at least one chart that set the props and one that did not**.
  Add a small addition to the existing THEME-1 `ThemeBaselineEntry` (or a sibling entry) showing two
  `BarChart`/`LineChart` instances side by side: one with zero extra props (shows the new defaults —
  grid, filled marks, bottom-start legend) and one with an explicit caller override on at least
  `tickLabelStyle`/`legendPosition` (proves the override still wins, visually).

### Do-not-touch / invariants

- **`src/components/charts/palette.js`** — untouched, THEME-1 owns the ramp transition.
- **`ChartFrame`'s `p: 2` padding and its foot row** — untouched, 16 panels depend on them.
- **hram's four tuned `tickLabelStyle` call sites** (not in this repo — nothing to verify directly
  here beyond making sure an explicit caller `tickLabelStyle` always wins the merge, which the new
  tests must prove per required test 2).
- **No behaviour, permission, or data-contract change.**
- **Removing fitness-monitor's/jg-ferien's local copies** of the hoisted helpers — explicitly not
  this WO; both keep working unchanged, on their own exact-pin versions.
- **The legend auto-placement heuristic** — out of scope, `legendPosition` ships as a plain prop with
  a fixed default, not an auto-detecting overlay.

### Pitfalls (verified against landed code and installed `node_modules` 2026-08-10)

- **The WO's Scope A table says X-Charts `8.28.2`; the actually installed version in this repo is
  `8.29.2`** (`node_modules/.pnpm/@mui+x-charts@8.29.2...`). Verify every API claim above against the
  INSTALLED source (`node_modules/.pnpm/@mui+x-charts@8.29.2.../node_modules/@mui/x-charts/`), not
  against the WO's prose or MUI's public docs for a different version.
- `hideLegend`'s current hardcoded placement in both `BarChart.jsx` and `LineChart.jsx` (after the
  `{...chartProps}` spread) is the same class of bug CHART-1's R2/R3-style findings have caught
  before in this kit — don't just add a new prop next to it without checking whether other
  post-spread hardcoded props (`colors`, `slotProps`) have the same caller-cannot-override issue; the
  WO only asks you to fix `hideLegend` and add `legendPosition`, but note anything else you find
  rather than silently leaving it.
- `MarkElementPath`'s `fill` comes from `theme.palette.background.paper` via `styled()` — this only
  resolves correctly if the chart is actually rendered under a `ThemeProvider` carrying
  `createAppTheme`'s output (or any MUI theme with the override). A consumer NOT using
  `createAppTheme` yet (all 14 today) still gets MUI's own theme with no `MuiMarkElement` override —
  confirm this is an acceptable, expected "you get it once you adopt THEME-1 + this bump" outcome
  (it is, per the WO's own "next pin bump is a visual verification event" framing), not a regression
  to chase further.
- `src/index.js` already has a duplicate `// --- 9. ... ---` header comment (pre-existing, noted in
  THEME-1's WO too) — don't compound it.

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Required tests to WRITE (Codex writes them; the Orchestrator runs them)

Exactly the 10 tests plus `tsc` check enumerated in Envelope § "Required tests to WRITE" above —
`tests/chartDefaults.test.js` (5 tests, parametrised across `LineChart`/`BarChart`/`TimeSeriesChart`
where applicable), `tests/timeSeriesLegend.test.js` (3 tests), `tests/chartLabels.test.js` (2 tests,
test 9 ported from fitness-monitor's existing cases, test 10 proven non-vacuous by temporarily
removing `yearTickInterval`'s effect and confirming duplicate year labels reappear, then restoring
it), plus `tsc -p tsconfig.build.json --noEmit` clean. Do not add more, do not run the full suite —
the affected-areas set additionally includes `tests/chartsPalette.test.js` ONLY if the hoist
incidentally touches it (it shouldn't, since `charts/palette.js` is explicitly untouched).

### Preamble (append verbatim)

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. Do NOT `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`. WO:
`work-orders/CHART-6.md`. Follow `orchestrate-codex`.
