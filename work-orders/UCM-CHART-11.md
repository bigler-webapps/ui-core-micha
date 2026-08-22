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

- [x] **`extraHeight` is derived from measured text extent, not from character count.** Chose a
      transient, invisible, shared SVG `<text>` node (`measureTickTextWidthPx`), not canvas: it is
      the same element type MUI's own axis ticks render as, so it inherits font metrics via the
      page's own cascade with no extra plumbing. Verified live against hram: a hidden node measuring
      "Msolwa Station" at 13px returned 91.203125, and the REAL rendered tick's own
      `getComputedTextLength()` for the same string was 91.203125 — exact match. `AVERAGE_GLYPH_WIDTH_EM`
      stays (still used by the unrelated `sizeYAxisForContent`, Y-axis width, THEME-9) but is no
      longer read by the rotated-tick path; a new per-character-width table
      (`estimateTextWidthPx`) is the explicitly-declared ESTIMATE fallback for when no DOM is
      available (confirmed live: jsdom's `getComputedTextLength` throws "not a function", so the
      fallback is what the unit tests actually exercise; the real measurement only runs in a browser).
      `measureTextWidth` is also injectable (`spaceForRotatedTicks`'s new optional 4th param) so
      tests stub it for determinism instead of depending on either environment.
- [x] **MUI's own truncation is accounted for.** The estimate is always taken from
      `longestFormattedTick`'s OUTPUT (i.e. whatever `axis.valueFormatter` produces), never the raw
      `axis.data` value — already true structurally before this WO, confirmed and locked in by a new
      test (`measures the formatted (already-truncated) tick text...`) using a formatter that
      truncates. Cost's own axis sets an explicit `height: 60` (bypasses this helper entirely,
      confirmed by reading `CostMetricsPanel.jsx`), so it was never affected either way.
- [x] **Numeric acceptance, on the same four live cards**, Teaching → Basic Plots, 1280 px, real data:
      Ward Metrics 129.6 px → **14.6 px**; Access Ladder 156.9 px → **14.6 px**; Division Metrics
      85.2 px → **14.2 px**; Cost 92.3 px → **14.6 px** (unchanged, as expected — its axis.height is
      caller-fixed). All four land under the ~15 px target. Getting there needed correcting not just
      the width term but how it combines with the `MUI_LABELLED_X_AXIS_HEIGHT` baseline — see the
      code comment on `ROTATED_TICK_CLEARANCE_PX` for why an accurate width alone left ~38 px
      unused, verified by direct DOM inspection before adding the second half of the fix.
- [x] **Nothing is clipped, at any width.** Checked at 1280 px and 375 px on all four cards: 0 of the
      35 (Ward Metrics/Access Ladder/Cost) or 5 (Division Metrics) x-axis tick labels exceeded their
      SVG's bottom edge at either width.
- [x] **Angle 0 stays byte-identical.** `UCM-CHART-10`'s own byte-identical-by-reference test for
      this is unchanged and still green (137/137 total, no rewrite needed).

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
