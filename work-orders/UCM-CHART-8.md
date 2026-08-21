# UCM-CHART-8 — Make the chart presets stop producing dead space below the chart

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main` without a staging step)
- **Tier:** 3 — shared-core. Every consuming app inherits the behaviour change.
- **Status:** planned
- **Workstream:** `CHART-*` (chart presets)
- **Files:** `src/components/charts/ScatterChart.jsx`, `BarChart.jsx`, `LineChart.jsx`,
  `TimeSeriesChart.jsx` (whichever of them accept `minHeight`), plus their tests.

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

- [ ] **`minHeight` alone sizes the chart.** When `height` is absent, `minHeight` is used as the
      chart height — not only as wrapper padding. This is what every caller passing `minHeight`
      already meant (`GroupMetricsPanel` is the proof: `minHeight={300}` and no `height`, and the
      chart is unsized today).
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

- **A consumer may be relying on the padding as spacing** without knowing it. Unlikely — nobody
  writes `minHeight` to get a gap under a chart — but it is the one way this change could look like
  a regression. Check the other consumers (`django-core-micha`-based apps, `survey-renderer`) for
  `minHeight` on a chart preset before publishing, and name what was found.
- The dev warning must not fire on the equal-value majority, or it becomes noise that trains people
  to ignore it.

### Tests to WRITE — narrow

- `minHeight` alone → the chart receives that height.
- `minHeight > height` → the chart receives `height` and the wrapper reserves no more than that.
- `minHeight === height` → byte-identical to the current output.
- `height` alone → unchanged.
- The dev warning fires only on the disagreeing pair, and names the values.

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
