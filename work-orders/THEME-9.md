# THEME-9 — Charts spend more space on furniture than on data

## Part A — Envelope

**Goal.** Give the chart presets back the space their axis furniture currently reserves and
does not use, stop broadcasting one axis label onto every axis, keep the axis label out of
the tick band, and make short, locale-correct tick numbers the default.

**Why — measured in a consuming app (hram), not estimated.** One KPI card, "Coverage":

| layer | size | owner |
|---|---|---|
| card (`Paper`, 16 px padding) | 470 × 372 | app |
| chart wrapper `Box` | 436 × **300** (`minHeight: 300`) | **this package** — the SVG inside is 270 tall, so **30 px are dead** |
| SVG | 436 × 270 | this package |
| **plot area** | **301 × 175** | — |

**The plot is 45 % of the SVG and 30 % of the card.** 135 px of width and 95 px of height are
consumed inside the SVG. Walking the left edge outward: 17 px card padding, then **60 px of
blank between the SVG edge and the axis label**, then 9 px, then the first tick — 104 px before
a number appears. Below the chart: 30 px of blank inside the SVG under the axis label, then
another 32 px to the card edge.

Three further findings from the same app, all measured:

1. **One label is applied to every axis.** `withAxisDefaults` ends with
   `label: axis.label || label`, so a single `yAxisLabel` lands on *all* axes in the array. In
   hram's dual-axis chart both y-axes therefore carry the identical 43-character string
   `"Treated / Untreated / Saved / Avoid. Deaths"`, each reserving 65 px of a 206 px-wide chart.
2. **The axis label is drawn inside the tick band.** On hram's Accessibility chart **4 of 4**
   y-tick labels overlap the axis label — the rotated title runs straight through
   `"0.0 min"`, `"50.0 min"`, … The same happens on an x-axis whose tick labels are rotated
   (30+ ward names over the label `"Ward"`). The space reserved for rotated ticks does not
   actually keep the label clear of them.
3. **Ticks carry units and needless decimals.** `"0.0 min"`, `"50.0 min"` — the unit appears in
   every tick *and* twice in the label (`"Accessibility (minutes) (min)"`). Elsewhere MUI
   truncates ticks it cannot fit, rendering `"0.0…"`, `"50.0…"`. `BarChart` sets no default tick
   formatter at all, while `TimeSeriesChart` already applies one conditionally — so every app
   re-solves this, and where nobody remembered, the numbers are wide and truncated.

**Scope.**

1. **Shrink the default margins and the axis-size reservation.** MUI X sizes axes itself; the
   generous fixed values here predate that. Target the measured waste: ~60 px of blank left of
   the label and ~30 px below it. Re-measure in a consuming app afterwards — the number to beat
   is "plot area = 45 % of the SVG".
2. **Stop broadcasting the label.** An axis label is set on the axis that needs it, not on every
   axis in the array. Add a test that pins this: one label must never land on two axes. That is
   the exact defect measured above, and nothing currently prevents it.
3. **Keep the label out of the tick band.** Whatever space rotated or long tick labels occupy
   must be excluded from where the axis label is placed. Verify with the real case — rotated
   45° ward names, and a y-axis whose ticks are wide.
4. **A default tick formatter for `BarChart`** (and any preset lacking one): short numbers, no
   decorative decimals, no unit in the tick. **Do not simply switch on `Intl` compact
   notation** — measured across the four locales this package's consumers use:

   | value | de-CH | en | fr | sw |
   |---|---|---|---|---|
   | 12 500 | **`12'500`** | `12.5K` | `12,5 k` | **`elfu 12.5`** |
   | 998 000 | **`998'000`** | `998K` | `998 k` | **`elfu 998`** |
   | 1 000 000 000 | `1 Mrd.` | `1B` | `1 Md` | `1B` |

   German does not compact thousands **at all** — exactly the range these charts live in — and
   Swahili puts a word in front of the number, which is wider than the raw value. So compact
   notation alone does not solve the width problem and in one locale makes it worse. A
   per-axis unit chosen once (with the unit named in the axis label) does. Also note: a
   hand-rolled `"B"` suffix would be **wrong in German**, where *Billion* is 10¹² — `Intl` gets
   this right (`Mrd.`), hand-rolled suffixes do not.
5. **Document the decision rule in `DESIGN.md`**, where a developer will find it at the call
   site:
   - **Categorical axis → no title by default.** The tick values are names; a title only
     restates their type. Exception: ticks that are codes or abbreviations whose kind is not
     self-evident.
   - **Numeric axis → title carries the quantity and the unit.** A bare number is meaningless
     without one. Exception: the ticks already show the unit (`%`, a currency symbol).
   - **The unit belongs in the title once — never in every tick.**

**Non-goals / do-not-touch.** No new chart types, no colour or typography changes, no change to
what any chart plots. **Do not auto-suppress axis labels** — make them opt-in, but leave the
decision with the caller; silently dropping a label someone deliberately set is a worse failure
than the redundancy we are removing. Do not fix any of this per-app with `sx` overrides.

**Tier 3** — shared-core surface. `reviewer` mandatory, `ui_reviewer` too: the visible result is
a layout change in every consuming app.

**Tests to write.** The one-label-per-axis assertion (scope 2) — it is cheap and it is the
defect that actually shipped. A formatter test with the four locales above as fixtures, so the
German and Swahili behaviour is pinned rather than rediscovered. Margins and overlap are carried
by the rendered check, not by unit tests.

**Risks.**
- **Estate-wide visual change**, in apps nobody is currently working on. Name it in the release
  notes; do not let it arrive as a surprise.
- **Tighter margins can clip** where they previously over-reserved. The overlap fix (scope 3)
  and the margin cut (scope 1) pull in opposite directions — do them together and measure, or
  the second will re-create the first.
- The tick formatter changes numbers on screens used for teaching. Rounding that hides a
  meaningful difference is worse than a wide label: keep full precision in tooltips and tables,
  compact only where space is scarce.

**Delivery is not done at publish.** Consuming apps need their pin bumped and their charts
looked at — hram first, where all of this was measured, and where the app-side follow-up is
tracked as `FIX-13`.

## Part B — Implementation map (implementer)

PLACEHOLDER — Orchestrator fills this on `git pull`: context package with `path:line` anchors
(`src/components/charts/chartDefaults.js` — `withAxisDefaults`, `spaceForRotatedTicks`, the
margin constants; `src/components/charts/BarChart.jsx`; `src/components/charts/formatters.js`;
`DESIGN.md`), the absolute working directory, the progress contract and the preamble. Not
dispatchable while this placeholder stands.

## Part C — Orchestrator only

**STOP — addressee guard.** If you are the implementer reading this file as your own spec: this
part is not addressed to you. It tells the Orchestrator how to invoke you; you ARE that
invocation — do not shell out to `codex exec`. Stop reading at this line.

- **Execution.** Codex first per the tier rule, unless the status record says otherwise.
- **Review routing.** `reviewer` + `ui_reviewer`, concurrent, one background batch.
- **Verification.** The package's own suite, **plus a rendered check in hram** (the stack runs
  locally on `:8000`; see the `preview-running-app` skill): re-measure the Coverage KPI card's
  plot-area share, and confirm no tick label overlaps an axis label on the Accessibility and
  Ward Metrics charts. State the numbers, before and after.
- **Register & commit.** Advance the THEME-9 row with the reviewer verdicts and the measured
  before/after. Then track the consumer pin bumps — this WO is not done at publish.
