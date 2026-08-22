# UCM-CHART-13 — `ChartFrame` accepts three sizing props and applies one. Remove the other two.

- **Repo:** `ui-core-micha`, branch `main`
- **Tier:** 3 — shared-core API removal. **Zero measured consumer impact** (see below), so a minor:
  `3.1.0`.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx` and its tests.

> **Why — measured 2026-08-22 against 3.0.1, prompted by the operator asking why the frame keeps all
> three props.**
>
> | prop | destructured | **applied to the box** | consumers passing it |
> |---|---|---|---|
> | `minHeight` | `:56` | **yes**, `:138` | several |
> | `height` | `:57` | **no** — only feeds a dev warning | **0** |
> | `aspect` | `:58` | **no — nowhere at all** | **0** |
>
> `aspect` is destructured and then never read again: there is no `aspectRatio` in the applied `sx`.
> `height` exists solely to feed `warnOnChartFrameHeightMismatch`. A grep across all five consuming
> apps (`hram`, `fitness-monitor`, `cockpit`, `jg-ferien`, `spesix`) finds **no `<ChartFrame>` passing
> either one**.
>
> **The justification that was offered for keeping them does not hold.** `docs/CHART-LAYOUT.md` says
> the frame's trio "was never in scope here (UCM-CHART-9)" — but that is a statement about
> `UCM-CHART-12`'s *boundary*, not a finding that the props are correct. Reading a scope note as a
> design endorsement is the same error this whole series is made of: **a reservation kept because it
> exists rather than because something needs it.**

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

`ChartFrame` accepts exactly the sizing prop it applies: `minHeight`, the card floor. Nothing else.

### Definition of Done

- [ ] **`aspect` removed** from `ChartFrame`'s signature. It is applied nowhere and passed by nobody.
- [ ] **`height` removed** from `ChartFrame`'s signature, and `warnOnChartFrameHeightMismatch` deleted
      with it — the warning exists only to explain a prop that should not be accepted in the first
      place. **A prop that is accepted and silently ignored is worse than one that errors**: it lets a
      caller believe the card was sized when it was not, which is precisely the `UCM-CHART-9`
      regression in slow motion.
- [ ] **`minHeight` stays, unchanged.** It is the one justified prop: a card with a loading or empty
      state would otherwise collapse, and `UCM-CHART-9` established the floor as correct. Do not
      touch its behaviour.
- [ ] **Passing `height` or `aspect` to `ChartFrame` is a dev-mode error naming what to do instead**
      — `minHeight` for a floor, or `size` on the chart inside the frame if the caller meant the
      chart's height. Consistent with how `UCM-CHART-12` treats the presets' removed props.
- [ ] **`docs/CHART-LAYOUT.md`'s "What stays unchanged" entry is corrected.** It currently lists the
      frame's `minHeight`/`height`/`aspect` as retained. Only `minHeight` is; the sentence as written
      is what made a later reader defend all three.

### Non-goals

- Do not change `minHeight`'s semantics, and do not give `ChartFrame` a `size` token. The frame is
  not a chart (`UCM-CHART-9`); its height follows its content with a floor, and that is correct.
- Do not touch the four presets. `UCM-CHART-12` settled them.
- No consumer migration: nothing to migrate, measured.

### Risks

- **Low, and the measurement is the reason.** Both props are unapplied and unpassed. The only way
  this breaks a consumer is if one passes `height`/`aspect` to a `ChartFrame` in code not caught by
  the grep — re-run it across the five apps at implementation time rather than trusting this note.
- A minor version removing props is technically breaking for anyone outside the five known
  consumers. There are none, but state the removal in the release notes rather than burying it.

### Tests to WRITE — narrow

- `ChartFrame` with `minHeight`: floor applied, `UCM-CHART-9`'s existing assertions unchanged.
- `ChartFrame` given `height` or `aspect`: dev-mode error naming the replacement, and **nothing is
  applied to the box** — the assertion that the props are gone rather than merely undocumented.
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
