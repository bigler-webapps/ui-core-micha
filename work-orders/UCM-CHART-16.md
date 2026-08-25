# UCM-CHART-16 — The x-axis band starves MUI's tick-fit check, and two consumers have patched around it

## Part A — Envelope

*Authored by the Expertenchat. Authoritative WHAT/WHY.*

### Goal

A chart with an axis title **and** horizontal tick labels renders its tick labels. No consumer needs
to set `xAxis[].height` by hand to make that happen.

### The defect

When the x-axis stays horizontal, `resolveXAxisGeometry` reserves one combined band from
`TICK_BAND_BASE_PX` + `AXIS_TITLE_BAND_PX`. Once an axis title is also taken from that budget, MUI's
own internal fit check (`shortenLabels`, against `tickLabelsMaxHeight`) is left **just under one line
of 12 px text** — so it fails for **every** tick and blanks **every** label, regardless of content.

The signature is distinctive and easy to misread: correctly positioned tick marks, zero non-empty
label texts. It looks like a data or formatter problem and is neither.

### The evidence: two consumers, same workaround, same magic number

In hram, independently, in two different work orders:

```
StructuralReachabilityPanel.jsx:386   height: 56      (HRAM-RES-32)
AccessGapScatterPanel.jsx:212         height: 56      (HRAM-RES-39)
```

`HRAM-RES-32`'s own comment already diagnosed it correctly and called it what it is — *"a
pre-existing, latent **shared-core** near-miss"* — then patched locally, because a shared-core fix was
outside that WO. `HRAM-RES-39` hit the identical wall, read the MUI source, arrived at the same
cause and the same 56, and patched locally again.

Two things follow. **The third chart with a titled horizontal axis will hit it too**, and its author
will have to rediscover both the cause and the number. And the package is violating its own stated
rule: `chartDefaults.js` says *"Rule 1: nothing outside the resolver does chart arithmetic"* — a
caller hand-computing an axis height is exactly that, now in two places.

### A third occurrence — and it proves scope item 2

Reported by the operator on 2026-08-25, hram's `AccessibilityPanel` in its
`Urban/Peri-urban/Rural × Division` mode: five band categories, five rendered bar groups, **no tick
labels at all**. Same signature — positioned ticks, blank text.

This one is different in a way that matters. That chart has **no `xAxisLabel`**
(`AccessibilityPanel.jsx:164-178`), so the axis title is *not* competing for the band. What it does
have is `tickLabelStyle: { fontSize: 13 }` — one pixel above the 12 px the base band was sized
against.

**So the trigger is not "a title takes the room". It is that the band is a near-miss at all**, and
anything that consumes a little more — a title, a slightly larger font, presumably a taller line
height — pushes it over. A fixed `height: 56` patched into a third consumer would work at 13 px and
fail at 14. That is precisely why scope item 2 requires the resolver to **derive** the requirement
from the tick font size it already knows, rather than adopting the constant two consumers measured
empirically at 12 px.

(Signature-matched, not yet instrumented — confirm the mechanism on this third case as part of the
work, since it is the one that distinguishes a derived fix from a bigger constant.)

### Scope

1. **Fix the reservation in the resolver.** The band must leave MUI's fit check room for one full
   line of tick text *after* the axis title's share, not just under it. The near-miss is small, which
   is why it went unnoticed — the fix is a correction to the arithmetic, not a redesign.
2. **Derive it, do not add a second magic number.** 56 is what two consumers measured empirically
   against a 12 px font; the resolver knows the tick font size and the title band, so it can compute
   the requirement instead of hard-coding a constant that will be wrong at a different font size.
3. **Say what changed and why in the comment**, in the style the file already uses — this is the
   third time this arithmetic has been reasoned about and the first time it is written down where it
   belongs.

### Non-goals / do not touch

- The rotated-tick path (`xLabels: "angled"`, `spaceForRotatedTicks`). The defect is specific to the
  horizontal case; a rotated axis reserves its own projected band and is unaffected.
- `CHART_SIZE_SPACING_UNITS` and the size scale — `UCM-CHART-15`, done.
- `ChartFrame`, margins, the legend band, `resolveChartLayout`'s other outputs.
- The consuming panels. Removing hram's two workarounds is `HRAM-CHT-6`, after this ships.

### Risks

- **A mocked prop-assertion test cannot catch this.** The file already records the same trap for a
  neighbouring bug: *"a mocked prop-assertion test cannot catch this, it only reproduces on an actual
  MUI scale computation"*. A test that asserts the computed band's number would pass whatever the
  number is. The test has to observe **rendered label text**, or it is decoration — see test 1.
- **Raising the band changes every titled-horizontal-axis chart's plot area** by the difference. Small,
  but it is a visual change to consumers, and it lands on top of `UCM-CHART-15`'s 80 px shift.
- Fixing it too generously wastes vertical space on every chart. The margin of the near-miss is the
  budget; do not round it up "to be safe".

### Tests to write

1. **A rendered test**: a chart with an axis title and horizontal ticks produces **non-empty** tick
   label texts. Written so it fails against the current resolver — a blank-label render is the
   defect, so the test must be able to see blankness.
2. The rotated path is unchanged — same band as before for `xLabels: "angled"`.
3. An axis **without** a title still reserves only the tick band (Rule 2: a band that is not needed
   collapses to zero).

---

## Part B — Implementation map

`.claude/models.local.json` has no local override, so the default applies: `implementation.runtime`
is `claude`/`sonnet` — the Orchestrator implemented directly, no Codex dispatch.

**The defect could not be diagnosed from source reading alone** (see Risk section: "a mocked
prop-assertion test cannot catch this"). MUI's internal fit check (`shortenLabels`, weighed
against `tickLabelsMaxHeight`, in `node_modules/@mui/x-charts/ChartsXAxis/ChartsSingleXAxisTicks.mjs`
and `shortenLabels.mjs`) depends on `getBBox`, which jsdom does not implement — so the mechanism
was confirmed and the fix calibrated against a REAL browser render, not derived from reading MUI's
source alone:

- `dev/entries.jsx`'s dev harness (`vite`, real Chrome via the internal preview browser) was used
  to dynamically render the actual, unmocked `BarChart` with a titled horizontal axis under this
  package's own `createAppTheme`/DM Sans default. Confirmed the defect reproduces exactly as
  described (blank tick labels, correctly positioned) and does NOT reproduce under MUI's default
  Roboto stack (real glyph metrics run ~1.3-1.36× fontSize for DM Sans vs ~1.06-1.17× for Roboto —
  explains why the defect is font-dependent and was missed until a consumer used a taller font).
- Binary-searched the real, minimal `xAxis[].height` needed to stop blanking, at tick font sizes
  11-18px, with and without a title (ten measured thresholds total). The result matched
  `ceil(fontSize * 1.3) + 9` (no title) / `+ 11` (with title, i.e. the same plus 2px) almost
  exactly — over by at most 1px, never under, across all ten points. `9` corresponds to MUI's own
  `tickSize`(6, default) + `TICK_LABEL_GAP`(3) internal overhead
  (`ChartsXAxis/utilities.mjs`/`ChartsSingleXAxisTicks.mjs`); the extra `+2` when a title is
  present was constant across every font size tested, independent of font.
- The fix (`resolveXAxisGeometry`'s `angle === 0` branch, `chartDefaults.js`) was re-verified
  against the SAME real-browser harness after implementing, confirming both reproduced scenarios
  (title + default font; no title + `tickLabelStyle.fontSize: 13`, the `AccessibilityPanel`
  signature) now render correctly with no explicit `height` override needed.

Context package: `chartDefaults.js:322-341` (`TICK_BAND_BASE_PX`/`AXIS_TITLE_BAND_PX`/new
constants), `:366-430ish` (`resolveXAxisGeometry`, the `angle === 0` early-return that was the
defect site), `:450-475` (`resolveChartLayout`'s `xAxisBand`/`xTitleBand` composition, unchanged).
Non-goal boundary respected: the `angle !== 0` (rotated) branch below the fixed code is untouched.

---

## Part C — Orchestrator only

> **STOP — everything below addresses the Orchestrator.**

**Tier 3 · tests: the three cases above, at least one of them rendered**

Shared-core, by the tiering table regardless of diff size.

- `reviewer` — the arithmetic, and above all whether test 1 can actually fail.
- `ui_reviewer` — the plot-area change this causes across consumers.
- `sec_reviewer` — not run; no auth, data or exposure surface.

### Release

Patch or minor per the repo's convention — this repairs existing behaviour rather than adding
capability, so **patch** unless the plot-area change is judged large enough to warrant a minor. State
which and why in the CHANGELOG; `UCM-CHART-15`'s entry is the model for describing a visual
consequence plainly.

### Register

Row `UCM-CHART-16`, both review notes, the published version, landing SHA(s) in a second commit
before the push. Record that the fix arrived **third** — two consumers patched around it first — so
the cost of leaving a shared-core near-miss to consumers is on the record.

### Log

- **2026-08-25** — Envelope authored after `HRAM-RES-39` hit the same defect `HRAM-RES-32` had
  already diagnosed as shared-core, and applied the identical `height: 56` workaround independently.
