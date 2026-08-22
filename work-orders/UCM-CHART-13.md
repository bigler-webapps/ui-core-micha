# UCM-CHART-13 — `ChartFrame` accepts a `height` it never applies. Remove that one.

- **Repo:** `ui-core-micha`, branch `main`
- **Tier:** 3 — shared-core API removal. **Zero measured consumer impact** (see below), so a minor:
  `3.1.0`.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx` and its tests.

> **CORRECTED 2026-08-22, before implementation. The first draft of this WO was wrong.**
>
> It claimed `aspect` was dead on `ChartFrame` and should be removed with `height`. **That was a
> measurement error on my part** — I read a truncated grep and concluded from absence. The applied
> `sx` is:
>
> ```jsx
> sx={{ width: '100%', minHeight, aspectRatio: aspect, ... }}   // ChartFrame.jsx:136-139
> ```
>
> **`aspect` IS applied**, as `aspectRatio` on the content box, and **four live call sites depend on
> it** — `fitness-monitor/BodyHistoryPage.jsx:328, :449` and `EnvironmentPage.jsx:250, :284`.
> Removing it would have stripped the aspect-derived height from every card on both of that app's
> main pages. **Do not remove `aspect`.**
>
> **Why the remaining finding still stands.** Measured against 3.0.1:
>
> | prop | destructured | applied | consumers passing it |
> |---|---|---|---|
> | `minHeight` | `:56` | **yes** (`:138`) | several |
> | `aspect` | `:58` | **yes** (`:139`, as `aspectRatio`) | 4 |
> | `height` | `:57` | **no** — only feeds `warnOnChartFrameHeightMismatch` | **0** |
>
> `height` alone is accepted and silently ignored. That is the one real defect here: **a prop that is
> accepted and does nothing lets a caller believe the card was sized when it was not** — the
> `UCM-CHART-9` regression in slow motion, kept alive by a warning that explains a prop which should
> not be accepted at all.
>
> **`ChartFrame` is not a chart** (`UCM-CHART-9`), so `minHeight` as a floor and `aspect` as a
> card-shape input are both legitimate and stay. The presets' one-size-source rule
> (`UCM-CHART-12`) governs charts, not cards.

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

`ChartFrame` accepts only sizing props it actually applies. `minHeight` (floor) and `aspect`
(card shape) stay; `height` — accepted and ignored — goes.

### Definition of Done

- [ ] **`aspect` is NOT removed.** It is applied at `:139` and four call sites depend on it. This
      line exists so the correction cannot be lost: an implementer reading only the first draft would
      have broken fitness-monitor.
- [ ] **`height` removed** from `ChartFrame`'s signature, and `warnOnChartFrameHeightMismatch` deleted
      with it — the warning exists only to explain a prop that should not be accepted in the first
      place. **A prop that is accepted and silently ignored is worse than one that errors**: it lets a
      caller believe the card was sized when it was not, which is precisely the `UCM-CHART-9`
      regression in slow motion.
- [ ] **`minHeight` stays, unchanged.** It is the one justified prop: a card with a loading or empty
      state would otherwise collapse, and `UCM-CHART-9` established the floor as correct. Do not
      touch its behaviour.
- [ ] **Passing `height` to `ChartFrame` is a dev-mode error naming what to do instead** —
      `minHeight` for a floor, `aspect` for a card shape, or `size` on the chart inside the frame if
      the caller meant the chart's height. Consistent with how `UCM-CHART-12` treats the presets' removed props.
- [ ] **`docs/CHART-LAYOUT.md`'s "What stays unchanged" entry is made precise.** It lists the frame's
      `minHeight`/`height`/`aspect` as retained without saying which are applied. State it per prop:
      `minHeight` and `aspect` are applied and stay; `height` was accepted and ignored, and is gone.

### Non-goals

- Do not change `minHeight`'s semantics, and do not give `ChartFrame` a `size` token. The frame is
  not a chart (`UCM-CHART-9`); its height follows its content with a floor, and that is correct.
- Do not touch the four presets. `UCM-CHART-12` settled them.
- No consumer migration for `height` (nobody passes it). The four call sites passing `aspect`
  are untouched and must stay that way.

### Risks

- **Low for `height`, which no consumer passes and which does nothing.** But **re-run the consumer
  scan by reading the call sites, not by grepping** — this WO's first draft was wrong precisely
  because a grep pattern silently matched nothing and that was read as evidence of absence.
- A minor version removing props is technically breaking for anyone outside the five known
  consumers. There are none, but state the removal in the release notes rather than burying it.

### Tests to WRITE — narrow

- `ChartFrame` with `minHeight`: floor applied, `UCM-CHART-9`'s existing assertions unchanged.
- `ChartFrame` given `height`: dev-mode error naming the replacement, and nothing applied.
- **`ChartFrame` given `aspect`: `aspectRatio` IS applied, and no error fires.** This is the
  regression test for this WO's own corrected draft — it must fail if someone later removes `aspect`
  along with `height`.
- The `UCM-CHART-9` regression test (content taller than the floor grows the box) stays green,
  unchanged.

No full suite.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry `ChartFrame.jsx`'s signature
> (`:56-58`), the applied `sx` (`:138`), `warnOnChartFrameHeightMismatch` (`:27-35`), the
> `docs/CHART-LAYOUT.md` line to correct, the absolute working directory, the progress contract, and
> the preamble. **Do not dispatch while this placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing, register maintenance, registry publish
> verification, commit, and the execution directive with its self-address guard.
