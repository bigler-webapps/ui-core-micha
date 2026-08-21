# UCM-CHART-9 — `ChartFrame` is a card, not a chart: it must never take a fixed height

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main`, no staging step)
- **Tier:** 3 — shared-core, and this is a **live layout regression in a published version**.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx` and its tests. `chartDefaults.js` only if the
  resolver needs a second shape — see below; the preset behaviour is correct and must not change.

> **Why — regression, observed on staging after hram bumped to 2.42.0.** `UCM-CHART-8` wired
> `resolveChartHeight()` through the four chart presets **and through `ChartFrame`**. For the
> presets that is right. For `ChartFrame` it is not, and the difference is what the box contains.
>
> In the `minHeight` alone / no `height` / no `aspect` branch, `resolveChartHeight` returns
> `chartHeight = minHeight`, and `ChartFrame` now applies it:
>
> ```diff
> -          minHeight,
> +          minHeight: wrapperMinHeight,
> +          height: chartHeight,
> ```
>
> **A chart preset's box contains exactly one chart. `ChartFrame`'s box contains a whole card** —
> title, toolbar, the chart, a legend, footnotes, export links. Turning its `minHeight` floor into a
> fixed `height` makes the box shorter than its content, the content overflows, and **adjacent cards
> visibly overlap**: the operator's screenshot shows a card title rendered over the chart of the card
> above it and three sets of "Export SVG / Export PNG" stacked at different offsets.
>
> `UCM-CHART-8`'s own Files note recorded that `ChartFrame` "never destructures `height`" — and the
> implementation then gave it one. The rule was written for presets and applied to a frame.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

`ChartFrame` stops setting a fixed `height` on its content box. Its `minHeight` goes back to meaning
what its name says — a floor that content can exceed. The four chart presets keep `UCM-CHART-8`'s
three-way resolution unchanged.

### Definition of Done

- [ ] **`ChartFrame` never applies `chartHeight` to its content box.** Its box takes `minHeight` as a
      floor, as it did before 2.42.0. Whether that is done by not calling `resolveChartHeight` at
      all, or by giving the resolver an explicit frame shape, is the implementer's call — but
      `ChartFrame` must not end up with a fixed `height` in any branch.
- [ ] **A `ChartFrame` whose content exceeds `minHeight` grows.** This is the regression, stated as
      the acceptance criterion: content taller than the floor must extend the box, never overflow it.
- [ ] **The four presets are untouched.** `ScatterChart`, `BarChart`, `LineChart`, `TimeSeriesChart`
      keep `UCM-CHART-8` exactly as it landed — including the `aspect` branch that four live call
      sites depend on. This WO narrows one consumer of the resolver; it does not revisit the rule.
- [ ] **`ChartFrame`'s JSDoc is corrected.** 2.42.0 added a paragraph claiming `minHeight`
      "sizes the content box itself" when there is no `height`/`aspect`. That sentence is the bug in
      prose form and must go.
- [ ] **`warnOnHeightMismatch` stays** on `ChartFrame` — a caller passing both is still worth a
      dev-mode note, even though the frame no longer acts on `height`.

### Non-goals

- Do **not** revert `UCM-CHART-8`. Its preset behaviour is correct and is the fix hram needs; only
  the frame's participation was wrong.
- Do not change `resolveChartHeight`'s three-way rule for presets.
- No consumer-side change in this WO.

### Risks

- **`ChartFrame` is used by every Research card in hram and by other consumers.** The change restores
  pre-2.42.0 behaviour for it, so the risk is low in direction — but it is still a shared-core
  publish, and the rendered check below is what proves it.
- 2.42.0 is `latest` on the registry and carries this regression. Publish 2.42.1 promptly; note in
  the register that 2.42.0 should not be adopted by a new consumer.
- **Unresolved, and worth watching:** hram's Detailed Results tab, which crashed with React #185
  before the bump (`HRAM-RES-29` item 1), **stopped crashing after it**. The plausible mechanism is
  that deterministic sizing removed a resize-driven `setState` loop. That is a hypothesis, not a
  finding. If this WO changes `ChartFrame`'s sizing back toward a floor, **re-check whether the crash
  returns** — and if it does, that is a real finding for `HRAM-RES-29`, not a reason to undo this.

### Tests to WRITE — narrow

- **The regression test:** a `ChartFrame` with `minHeight` and no `height`/`aspect`, containing
  content taller than `minHeight`, does **not** receive a fixed `height` on its content box.
- `ChartFrame` with `height` explicitly passed: `height` is still not applied as a fixed box height
  (the frame is not a chart), and no exception is thrown.
- The four presets' existing `UCM-CHART-8` tests stay green **unchanged** — if one of them has to be
  edited, the change has leaked out of `ChartFrame` and that is a stop-and-report.

**Rendered check before the hram pin bump — mandatory, and the reason this WO exists.** The unit
tests for 2.42.0 were 188 green and said nothing about layout, because they cannot. Before hram's pin
moves again, the affected cards are checked rendered at 375 px and 1280 px: Sensitivity, Access,
Access Ladder, Allocation, Optimization. Named in the register note, with the substitution declared
if capture is unavailable.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry `ChartFrame.jsx`'s current
> `resolveChartHeight` call and the content-box `sx`, the `chartDefaults.js` resolver, the absolute
> working directory, the progress contract, and the preamble. **Do not dispatch while this
> placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (`reviewer` + `ui_reviewer`, full context —
> Tier 3 shared-core), the rendered check above as a hard commit gate, register maintenance, publish
> verification on the registry, commit, and the execution directive with its self-address guard.
