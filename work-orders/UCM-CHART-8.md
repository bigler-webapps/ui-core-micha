# UCM-CHART-8 — Make the chart presets stop producing dead space below the chart

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main` without a staging step)
- **Tier:** 3 — shared-core. Every consuming app inherits the behaviour change.
- **Status:** planned
- **Workstream:** `CHART-*` (chart presets)
- **Files:** `src/components/charts/ScatterChart.jsx`, `BarChart.jsx`, `LineChart.jsx`,
  `TimeSeriesChart.jsx`, **`ChartFrame.jsx`** — all five destructure `minHeight` **and** `aspect`
  (verified 2026-08-21) — plus their tests. **Note for the implementer: only `ScatterChart` and
  `TimeSeriesChart` reference `height` at all.** `BarChart`, `LineChart` and `ChartFrame` never
  destructure it, so for them the incoherent "pair" exists only via the rest spread into the MUI
  chart. Do not go looking for a declared `height` prop there.

> **Why.** `minHeight` and `height` are two different things on these presets, and the API lets a
> caller pass both. `minHeight` lands on the **wrapper `Box`** —
> `sx={{ width: '100%', minHeight, aspectRatio: aspect }}` (`ScatterChart.jsx:260`, same
> construction in `BarChart.jsx`) — while `height` sizes the **chart**. When `minHeight > height`,
> the difference is dead space **below the chart**.
>
> Measured in `hram` on 2026-08-20:
>
> | panel | `minHeight` | `height` | dead space |
> |---|---|---|---|
> | `StructuralReachabilityPanel` | 420 | 380 | 40 px |
> | `ExpertTimelinePanel` | 340 | 280 (×2) | 60 px |
> | `ResultsTimelinePanel` | 320 | 280 | 40 px |
> | `GroupMetricsPanel` | 300 | **none** | the whole chart is unsized |
> | Cost, Ratio, Accessibility, Referral, Total | equal | equal | 0 |
>
> **The equal-value majority is why this survived.** Passing both looks like harmless
> belt-and-braces and costs nothing when the numbers match, so the pattern spread by copy-paste and
> nobody noticed the cases where they diverge. It has been diagnosed and fixed **pointwise twice**
> in hram (`AllocationPerformancePanel.jsx:462-478`, `OptimizationResultsPanel.jsx:928-940`, both to
> `height={420}`) — with the explanation written as a comment **inside those two files**, where no
> new panel will ever read it.
>
> This is not N panel bugs. It is one shared API that permits an incoherent pair, and it will keep
> recurring for as long as it does. Fixing it here fixes every consumer at once, including the ones
> nobody sweeps.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

A caller can no longer produce dead space by passing `minHeight`. The presets resolve the pair
themselves, and the incoherent combination becomes impossible rather than merely discouraged.

### Definition of Done

- [ ] **The resolution is three-way, not two-way — `aspect` is the third input and it changes the
      answer.** Amended 2026-08-21; the original two-way rule would have broken four live call sites.
      - **`height` present** → it sizes the chart, and the wrapper reserves no more than that.
      - **No `height`, no `aspect`** → **`minHeight` sizes the chart**, not merely the wrapper.
        This is what a caller in that shape meant (`GroupMetricsPanel`: `minHeight={300}`, no
        `height`, no `aspect` — chart unsized today).
      - **No `height`, but `aspect` present** → **today's behaviour is correct and must not change.**
        The wrapper is `width: 100%` with `aspectRatio`, so its height derives from its width, and
        `minHeight` is the floor that stops it collapsing on a narrow viewport. Here `minHeight`
        means exactly what its name says.

      **Same prop shape, opposite intent** — which is why the rule cannot be stated on
      `minHeight`/`height` alone.
- [ ] **`minHeight > height` produces no wrapper padding.** The chart is sized by `height` and the
      wrapper does not reserve more than the chart occupies. The extra space was never intentional.
- [ ] **Equal values behave exactly as today** — that is the majority of call sites and they must
      not shift by a pixel.
- [ ] **A dev-mode warning names the offending call site** when both are passed and they disagree.
      Not a throw: a shared package that throws on a prop combination in production breaks a
      consumer's page over a layout nit.
- [ ] **JSDoc on every preset that takes it** states in one line what `minHeight` now does, so the
      next caller does not have to infer it from a comment in a consumer app.

### Deliberately NOT done

- **`minHeight` is not removed from the API.** Removing it is a breaking change to a shared package,
  which would make every consumer's pin bump a Tier-3 change with a real chance of unnoticed layout
  regressions — a worse outcome than the defect. Deprecate in the docstring, coerce in the code.
- No change to chart internals, palettes, axis defaults or `aspect`.
- No consumer-side sweep in this WO. hram's call-site cleanup is its own follow-up, gated on the pin
  bump — see below.

### Preconditions and ordering

The fix only reaches hram after **(a)** this lands and publishes and **(b)** hram bumps its
`@micha.bigler/ui-core-micha` pin. Verify the published version is actually live before the consumer
bump — this package publishes from `main` with no staging step, so a failed publish is silent until
a consumer installs it.

### Risks

- **The consumer check is done, and it found something — 2026-08-21.** It was written here as a
  hypothetical ("a consumer may be relying on the padding as spacing"); the real finding is
  different and larger. **Four live call sites pass `aspect` together with `minHeight` and no
  `height`:**

  | call site | props |
  |---|---|
  | `hram/AccessGapScatterPanel.jsx:182` | `aspect={1.8}` + `minHeight={320}` |
  | `fitness-monitor/BodyHistoryPage.jsx:~328` | `aspect="960 / 380"` + `minHeight={320}` |
  | `fitness-monitor/BodyHistoryPage.jsx:~355` | `aspect="960 / 380"` + `minHeight={320}` |
  | `fitness-monitor/BodyHistoryPage.jsx:~450` | `aspect="400 / 220"` + `minHeight={220}` |

  These are not relying on padding-as-spacing. They are using `minHeight` **as a floor under an
  aspect-derived height**, which is legitimate and is what the name promises. The original
  Definition of Done would have turned all four into fixed-height charts and removed their
  responsive behaviour. **That is the reason for the three-way rule above**, and it is the case to
  hold onto when reading the rest of this order.

  Scope note: `survey-renderer` is named above as a consumer to check. **The standalone repo is
  retired** (2026-07-31); the widget now lives at `survey_app/frontend/packages/survey-renderer`,
  and neither it nor `cockpit` or `jg-ferien` passes `aspect` to a chart preset. jg's one `aspect=`
  hit is an `ImageCropDialog`, unrelated.
- The dev warning must not fire on the equal-value majority, or it becomes noise that trains people
  to ignore it.

### Tests to WRITE — narrow

- `minHeight` alone, **no `aspect`** → the chart receives that height.
- **`minHeight` + `aspect`, no `height` → unchanged from today**: the wrapper keeps its
  `aspectRatio` and `minHeight` stays a floor, and the chart is **not** given a fixed height. This is
  the four-call-site case in Risks and the one a two-way rule would have broken — **it is the test
  that has to fail if someone later re-simplifies the resolution.**
- `minHeight > height` → the chart receives `height` and the wrapper reserves no more than that.
- `minHeight === height` → byte-identical to the current output.
- `height` alone → unchanged.
- The dev warning fires only on the disagreeing pair, and names the values. It must **not** fire on
  `minHeight` + `aspect` without `height`, which is a legitimate combination.

No full suite.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry the preset files with `path:line`
> anchors (`ScatterChart.jsx:173-174, :260` and the equivalents), the absolute working directory,
> the progress contract, and the preamble. **Do not dispatch while this placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (`reviewer` + `ui_reviewer`, full context —
> Tier 3 shared-core), verification, register maintenance, commit, publish check, and the execution
> directive with its self-address guard.
