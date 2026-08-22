# UCM-CHART-13 — A card has no size of its own. Remove `height` and `aspect` from `ChartFrame`.

- **Repo:** `ui-core-micha`, branch `main`
- **Tier:** 3 — shared-core API removal, **four measured consumer call sites** (see below). Breaking:
  `4.0.0`, sequenced with `FM-CHART-1`.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx` and its tests.

> **Why. Twice reversed — the reasoning below is what settled it, not the earlier prop-inventory.**
>
> Draft 1 said remove `height` **and** `aspect`, on the grounds that both were dead code. That
> premise was wrong: `aspect` **is** applied — `ChartFrame.jsx:136-139` sets
> `sx={{ width: '100%', minHeight, aspectRatio: aspect, ... }}`.
>
> Draft 2 therefore kept `aspect`. **That was the worse error**, and the operator caught it: it
> reintroduces through the card exactly what `UCM-CHART-12` removed from the chart.
>
> **The structural argument, which neither earlier draft made.** After the migration a consumer
> looks like this:
>
> ```jsx
> <ChartFrame minHeight={320} aspect="960 / 380">   // height derived from WIDTH
>   <LineChart size="tall" />                        // height from a TOKEN
> </ChartFrame>
> ```
>
> **Two independent size sources for nested boxes that have to agree.** Before the migration they
> were coherent — same ratio on both. Afterwards the frame tracks width and the chart tracks a token,
> and they coincide only by accident. Whichever way they diverge is a defect this series already has
> a name for: the frame taller than its content is dead space, the frame shorter is the
> `UCM-CHART-9` overflow.
>
> **A card must have no size of its own.** Its height is its content's height, with `minHeight` as a
> floor so an empty or loading state does not collapse. That is what `UCM-CHART-9` established — it
> found the defect at a fixed `height`; `aspect` is the same defect derived from width instead of
> stated directly.
>
> | prop | applied today | verdict |
> |---|---|---|
> | `minHeight` | yes (`:138`) | **stays** — the floor, and the only legitimate one |
> | `aspect` | yes (`:139`) | **goes** — a second size source on a box that must follow its content |
> | `height` | no — only feeds a warning | **goes** — accepted and silently ignored |
>
> **This one has consumer impact**, unlike draft 2's claim: four `ChartFrame`s pass `aspect` —
> `fitness-monitor/BodyHistoryPage.jsx:328, :449` and `EnvironmentPage.jsx:250, :284`. They are
> migrated by `FM-CHART-1`, not here.

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

`ChartFrame` has no size source of its own. Its height is its content's height, floored by
`minHeight`. `aspect` and `height` are gone.

### Definition of Done

- [ ] **`aspect` removed** from the signature and from the applied `sx` (`:139`). A card that sizes
      itself from its width can be shorter than its content (the `UCM-CHART-9` overflow) or taller
      (dead space); both are defects this series already has names for.
- [ ] **`height` removed** from `ChartFrame`'s signature, and `warnOnChartFrameHeightMismatch` deleted
      with it — the warning exists only to explain a prop that should not be accepted in the first
      place. **A prop that is accepted and silently ignored is worse than one that errors**: it lets a
      caller believe the card was sized when it was not, which is precisely the `UCM-CHART-9`
      regression in slow motion.
- [ ] **`minHeight` stays, unchanged.** It is the one justified prop: a card with a loading or empty
      state would otherwise collapse, and `UCM-CHART-9` established the floor as correct. Do not
      touch its behaviour.
- [ ] **Passing `height` or `aspect` to `ChartFrame` is a dev-mode error naming what to do instead**
      — `minHeight` for a floor, or `size` on the chart *inside* the frame if the caller meant the
      chart's height. Consistent with how `UCM-CHART-12` treats the presets' removed props.
- [ ] **`docs/CHART-LAYOUT.md`'s "What stays unchanged" entry is made precise.** It lists the frame's
      `minHeight`/`height`/`aspect` as retained without saying which are applied. Replace it: the frame
      keeps **`minHeight` only**, as a floor; it has no size source of its own, and a chart's height
      comes from its `size` token.

### Non-goals

- Do not change `minHeight`'s semantics, and do not give `ChartFrame` a `size` token. The frame is
  not a chart (`UCM-CHART-9`); its height follows its content with a floor, and that is correct.
- Do not touch the four presets. `UCM-CHART-12` settled them.
- No consumer migration here. The four `ChartFrame`s passing `aspect` are fitness-monitor's, and
  `FM-CHART-1` removes them — **sequence this after `FM-CHART-1`, or land both together**, or those
  four cards hit the new error.

### Risks

- **`height` is free — no consumer passes it and it does nothing.** `aspect` is not: four cards
  depend on it and lose their shape when it goes. That is intended (their height becomes their
  content's), but it is a **visible change in fitness-monitor**, so `FM-CHART-1`'s rendered two-width
  check is what confirms it, not this WO's unit tests.
- **Re-run the consumer scan by reading the call sites, not by grepping.** Both earlier drafts of this
  WO were wrong about `aspect` — once from a grep that matched nothing, once from a `head`-truncated
  grep that cut off the line where it is applied. Open the files.

### Tests to WRITE — narrow

- `ChartFrame` with `minHeight`: floor applied, `UCM-CHART-9`'s existing assertions unchanged.
- `ChartFrame` given `height` or `aspect`: dev-mode error naming the replacement, and **no
  `aspectRatio` or `height` on the box**.
- **A `ChartFrame` whose content is taller than `minHeight` grows to fit** — `UCM-CHART-9`'s
  regression test, unchanged, and now the only thing that decides the card's height.
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
