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

*To be filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*
