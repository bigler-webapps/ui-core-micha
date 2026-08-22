# UCM-CHART-11 — The rotated-tick allowance is now counted once, but estimated too high

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main`, no staging step)
- **Tier:** 3 — shared-core; every consumer's chart proportions change.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/chartDefaults.js` — `rotatedTickMetrics`, `longestFormattedTick`,
  `AVERAGE_GLYPH_WIDTH_EM` — and its tests. The presets only call the helper; leave them alone.

> **Why — measured in hram on 2026-08-22, ucm 2.42.2 installed via the pin, Teaching → Basic Plots,
> real data, 1280 px.** `UCM-CHART-10` removed the double reservation and that holds. What is left is
> a **single reservation that is too large**:
>
> | card | longest x label | `axis.height` reserves | rendered tick band | unused | axis title? |
> |---|---|---|---|---|---|
> | Ward Metrics | `Msolwa Station` (14 ch, full) | 131 px | **79 px** | **52 px** | no |
> | Access Ladder | `Msolwa Station` (14 ch, full) | 131 px | **79 px** | **52 px** | no |
> | Division Metrics | `mang-ula` (8 ch) | 97 px | **56 px** | **41 px** | no |
> | Cost | `Ching'a…` (**MUI-truncated**) | 68 px | **53 px** | 15 px | no |
>
> All four are `-45°`, all four are the same preset. **The unused band scales with the estimate, not
> with the rendered text.** `rotatedTickMetrics` derives `extraHeight` from
> `longestFormattedTick × AVERAGE_GLYPH_WIDTH_EM (0.6) × sin(angle)` — a character-count estimate of
> how wide the longest label *would* be. The rendered text is consistently shorter than that estimate,
> and the surplus becomes an empty band inside the axis.
>
> **Cost is not the well-behaved case — it is the case where the estimate happens to be small.** MUI
> truncates its labels itself (`Ching'a…`), so the estimator sees a short string. Nothing about Cost
> is configured better; it just has less to overestimate.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

The rotated-tick allowance reflects the text that is actually rendered. A chart with long rotated
labels reserves what those labels occupy — not what a character-count estimate predicts.

### Definition of Done

- [ ] **`extraHeight` is derived from measured text extent, not from character count.** Whether that
      is a canvas `measureText`, a transient hidden SVG `<text>`, or MUI's own measurement is the
      implementer's call — but `AVERAGE_GLYPH_WIDTH_EM` as the basis goes. State in the commit which
      mechanism was chosen and why.
- [ ] **MUI's own truncation is accounted for.** Cost's labels arrive at the axis already shortened
      to `Ching'a…`. If the estimate is taken from the untruncated string while MUI renders the
      truncated one, the error returns in a new form. Measure what will render.
- [ ] **Numeric acceptance, on the same four live cards.** Ward Metrics and Access Ladder: unused band
      from 52 px to under ~15 px. Division Metrics: from 41 px. Cost: unchanged at ~15 px, since its
      estimate was already close. Measured at 1280 px on hram Teaching → Basic Plots.
- [ ] **Nothing is clipped, at any width.** The mirror failure is worse than the defect: an
      under-reserved band cuts label text, which loses information rather than space.
- [ ] **Angle 0 stays byte-identical.** `rotatedTickMetrics` returns `null` there and the axis passes
      through untouched — `UCM-CHART-10`'s test for this must stay green unchanged.

### One trap, and I walked into it myself

**An axis *title* also sits below the lowest tick label.** In the same measurement pass, `Expert
Mode: Simulation Trajectory` showed 53 px below its lowest tick — and every pixel of it is the
x-axis title (`hasAxisTitle: true`, angle 0). I first read that as waste. It is not.

The four cards in the table above all have **`hasAxisTitle: false`**, which is why their residual is
genuinely unused. **Any measurement used to validate this fix must separate the axis title from the
empty band**, or a "fix" will reclaim space the title needs and clip it.

### Non-goals

- Do **not** revert `UCM-CHART-10`. Its single-reservation change is correct and verified; this is
  the size of that single reservation, not whether there are two.
- Do not touch `ScatterChart` — it never calls this helper (established under `UCM-CHART-10`).
- Do not shrink `MUI_LABELLED_X_AXIS_HEIGHT`. That constant is the un-rotated baseline and is not
  where the error is.
- Do not "fix" this by forcing truncation on every consumer. Ward names rendering in full is correct
  behaviour; the bug is that the reservation does not match them.

### Risks

- **Every consumer's chart proportions change again**, the third time in this series. Plots get
  taller. That is the intent, and the numeric acceptance above is what proves it landed.
- Text measurement is environment-sensitive: a canvas or hidden-node measurement must run with the
  same font that will render, or it trades one estimate for another. The font is loaded from the
  consumer's theme, not from this package — check what is available at call time.
- If measurement is not reliably available at that point in the render, an *improved* estimate
  (per-character widths rather than a flat 0.6 em) is an acceptable fallback — but say so explicitly
  rather than leaving it looking like a measurement.

### Tests to WRITE — narrow

- A rotated axis whose longest label is long: the reserved height matches the measured extent within
  a stated tolerance, asserted against a stubbed measurement so the test is deterministic.
- A rotated axis whose labels MUI truncates: the reservation follows the **truncated** string.
- Angle 0: identical to input, by reference — `UCM-CHART-10`'s existing assertion, unchanged.
- A caller-set `margin.bottom`: still untouched (`UCM-CHART-10`'s guarantee, unchanged).

**Rendered check before publish — numeric, on hram with real data**, at 1280 px, the four cards
above, before and after, with the axis-title separation described in the trap section. Declare a DOM
measurement as a substitution if capture is unavailable.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry `rotatedTickMetrics`,
> `longestFormattedTick`, `AVERAGE_GLYPH_WIDTH_EM` and `spaceForRotatedTicks` with line anchors, the
> absolute working directory, the progress contract, and the preamble. **Do not dispatch while this
> placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (`reviewer` + `ui_reviewer`, full context —
> Tier 3 shared-core), the numeric rendered check as a hard commit gate, register maintenance,
> registry publish verification, commit, and the execution directive with its self-address guard.
