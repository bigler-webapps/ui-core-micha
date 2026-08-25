# UCM-CHART-18 — The PNG export shows what the chart says, not what the user can click

## Part A — Envelope

*Authored by the Expertenchat. Authoritative WHAT/WHY.*

### Goal

The whole-container PNG export contains the chart and everything that **explains** it, and none of the
controls that **operate** it. And a rotated element exports rotated.

### Two defects, one file, a few lines apart

Both raised by `HRAM-CHT-7`'s independent `ui_reviewer` on 2026-08-25 and confirmed — partly by
reading, partly live in the running app.

**1. Interactive controls are in the image.** Since 3.3.0 the PNG rasterises `ChartFrame`'s whole
`chartRef` box, and `chartRef` wraps `children` only — not `toolbar`, `controls` or `meta`. Anything a
panel renders as children is now in the file. In hram:

- `StructuralReachabilityPanel.jsx:468` — the footer "More about these caveats" `IconButton`, always
  visible, so **every** PNG of that panel carries a button.
- `AllocationPerformancePanel.jsx:536,548` — the drill-down `Button`, and `ResearchDrilldownPanel`
  itself when open, both inside the `<ChartFrame>` children.
- `OptimizationResultsPanel.jsx:1120,1141` — the same shape on the frontier chart.

**2. `transform` is not inlined.** `CHART_STYLE_PROPERTIES` (`:32-36`) and
`CONTAINER_LAYOUT_STYLE_PROPERTIES` (`:44-52`) do not list it, so
`OptimizationResultsPanel.jsx:1107`'s rotated legend swatch exports as a **square instead of a
diamond**.

### Why this is fixed here and not in the consuming app

The alternative was moving each panel's controls out of `children` into `ChartFrame`'s `controls` /
`toolbar` slots, which sit outside `chartRef`. That was rejected, for two reasons:

- **It is a property of the element kind, not of each panel.** An exported image should show what the
  chart communicates, not what can be clicked. Solved generically here, it also holds for every
  consumer nobody has looked at.
- **It would undo a deliberate design decision.** `StructuralReachabilityPanel`'s info affordance sits
  in the **footer**, beside the caveat line, because `HRAM-RES-30` put it there. Hoisting it into the
  toolbar to dodge an export defect would trade a design choice for a workaround.

After this, hram needs **only a pin bump** — `HRAM-CHT-8` becomes a consumer row, not a rebuild of
three panels.

### Scope

`src/components/charts/exportChart.js`

1. **Drop interactive controls from the container clone** in `containerSvgBlob` (`:120`) — `button`,
   `input`, `select`, `textarea`, `[role="button"]` at minimum. The SVG path is unaffected: it
   exports the chart surface, which holds no HTML controls.

2. **Do it *after* `inlineComputedStyles`, never before.** That function walks source and clone
   **in lockstep by index** (`:70-77`, `sourceNodes[index]` ↔ `cloneNodes[index]`). Removing nodes
   from the clone first shifts every subsequent index, so elements silently receive their
   neighbours' styles — an export that looks plausible and is wrong everywhere after the first
   removal. **This is the single most likely way to get this WO wrong.**

3. **Add `transform` (and `transform-origin`) to the inlined properties.**

### Non-goals / do not touch

- The SVG export path, `findChartSvg`, the `data:`-URI decision, the taint workaround —
  `UCM-CHART-17`, done and verified.
- `ChartFrame`'s slot structure. `chartRef` wrapping `children` only is correct; the fix is what the
  rasteriser does with them.
- The consuming panels. hram's adoption is `HRAM-CHT-8`.

### Risks

- **The lockstep-index trap.** Scope item 2. Name it in the code comment too, not only here.
- **What disappears must be operation, not content.** A consumer whose legend items are `<button>`s —
  MUI's own legend can be interactive — would lose its legend to this change. The affected hram panels
  all pass `hideLegend`, so they are not the test case. **Verify against a chart that keeps MUI's own
  legend**, and if it vanishes, that is a finding that changes the approach, not a detail to paper
  over.
- **`transform` may double-apply on SVG nodes.** An SVG element can carry `transform` as a
  *presentation attribute*, which the clone already keeps, while `getComputedStyle` returns the
  resolved CSS transform. Writing that inline could compose with the attribute and move the element
  twice. Check on a chart with rotated tick labels (`xLabels="angled"`) before assuming it is inert.
- Removing nodes changes layout if anything sized around them — a flex row that held a button now
  has one fewer item. Expected, but look at it rather than assuming it is invisible.

### Verification

**Open the files.** Same gate as `UCM-CHART-17`, and for the same reason — both of these defects were
invisible to every test and visible immediately in an exported image.

1. A PNG of a panel with a control in `children`: the control is gone, everything else is where it
   was.
2. A PNG of a chart that keeps **MUI's own legend**: the legend is still there. This is the
   counter-check for the risk above, and it is not optional.
3. A rotated element exports rotated — the diamond is a diamond.
4. A chart with `xLabels="angled"`: tick labels are not doubly rotated or displaced.

Unit tests: the clone contains no `button` after export; a non-interactive sibling at the same depth
survives; `transform` appears in the inlined declarations.

---

## Part B — Implementation map

`.claude/models.local.json` has no local override, so the default applies: `implementation.runtime`
is `claude`/`sonnet` — the Orchestrator implemented directly, no Codex dispatch.

Implemented exactly per scope: `transform`/`transform-origin` added to `CHART_STYLE_PROPERTIES`
(shared by both export paths); a new `INTERACTIVE_CONTROL_SELECTOR`
(`button, input, select, textarea, [role="button"]`) and `stripInteractiveControls` helper, called
in `containerSvgBlob` strictly **after** `inlineComputedStyles` (the lockstep-index trap named in
the WO) — verified by temporarily reverting the ordering-safe call and confirming the new tests
fail, then restoring.

**Verification (real Chrome, via the dev harness's module graph — no probe entry committed to
`dev/entries.jsx`, all four cases rendered via direct script injection into detached containers):**

1. Control in `children` (an `IconButton` beside a `<span>` caveat note, mirroring
   `StructuralReachabilityPanel`'s footer affordance): captured the PNG path's actual intermediate
   SVG (intercepting `Image.src`) and confirmed no `<button` tag and no button text present, while
   the sibling text and the chart itself both survive.
2. MUI's own legend (two-series `BarChart`, no `hideLegend`): confirmed live that MUI's legend
   renders as `<ul>/<li>/<div>/<span>` (no `button`/`role="button"` in it), then confirmed both
   series labels ("Opened", "Resolved") and the `MuiChartsLegend-root` class survive the export
   fully intact.
3. Rotated element: a 24x24px swatch with `transform: rotate(45deg)`, exported to PNG and
   pixel-sampled on a real `<canvas>` — the swatch's own bounding-box corner reads back as
   background white, its centre as the swatch's own red, i.e. a genuine diamond (clipped corners),
   not an unrotated square.
4. `xLabels="angled"` (7 long category labels): the exported tick `<text>` carries BOTH its
   original `transform="rotate(-45, 30, 9)"` XML presentation attribute (kept by `cloneNode`) AND
   the newly-inlined `style="transform: matrix(0.707107, -0.707107, 0.707107, 0.707107, ...)"`.
   The matrix values are exactly `cos(-45°)=0.707107, sin(-45°)=-0.707107` — a SINGLE 45° rotation,
   not a doubled/composed one (which would show different values, e.g. matching -90°) — confirming
   the inline `style` declaration wins over the presentation attribute (SVG2: presentation
   attributes carry the lowest specificity) rather than composing with it. Tick text still renders
   non-blank.

Context package used: `exportChart.js` in full (short, already read start to finish),
`ChartFrame.jsx:137-151` (`chartRef` — re-confirmed it wraps `children` only).

**Post-review correction, both reviewers converging independently on the same gap the WO's own
risk section named:** the initial `stripInteractiveControls` removed EVERY matched element
outright, including MUI's own chart legend when it is interactive
(`onItemClick`/`toggleVisibilityOnClick`) — X-Charts renders each legend item as
`<button role="button" class="...MuiChartsLegend-series...">` wrapping the series swatch and
label, so a blanket removal deleted the legend's content along with its click handler. This is
EXACTLY the WO's own risk section, made concrete: "if it vanishes, that is a finding that changes
the approach, not a detail to paper over." Fixed by UNWRAPPING `MuiChartsLegend-series` matches
(replace with a plain `<span>` carrying the same class/style/children) instead of removing them —
content survives, only the (irrelevant, in a static image) clickability is dropped. Re-verified
live against a REAL interactive legend (`slotProps={{ legend: { toggleVisibilityOnClick: true } }}`,
confirmed the live legend items render as actual `<BUTTON>` tags): the export contains zero
`<button` tags, but `MuiChartsLegend-series` and both series labels survive intact. `INTERACTIVE_
CONTROL_SELECTOR` also broadened to `a[href]`/`[role="link"]` (reviewer finding — a drill-down
built as a link, not only a `<Button>`, is equally out of place in an export).

Also fixed a genuine test-coverage gap the reviewer found: the original ordering test's `<button>`
was the LAST descendant in its fixture, so a "strip before inline" regression would not have shifted
any node the test actually asserted on — content-presence checks can't observe a style
misattribution at all, only a missing/wrong STYLE VALUE can. Rewrote it with a distinctively-styled
sibling AFTER the button (stylesheet-driven colour, not an inline style `cloneNode` would copy
regardless) and confirmed, by temporarily reverting the call order, that the new assertion actually
fails when the order is wrong (the button's own style — `border-style: none`, `text-align: center`
— leaks onto the trailing sibling).

---

## Part C — Orchestrator only

> **STOP — everything below addresses the Orchestrator.**

**Tier 3 · verification: opened files for the four cases above, plus the unit tests**

Shared-core, by the tiering table regardless of diff size.

- `ui_reviewer` — what belongs in an exported image, and the MUI-legend counter-check.
- `reviewer` — the ordering trap and the `transform` double-apply question.
- `sec_reviewer` — not run; no auth, data or exposure surface.

### Release

**Patch → 3.3.1.** This repairs behaviour 3.3.0 itself introduced — the whole-container PNG was never
meant to carry buttons — rather than adding capability. `UCM-CHART-16` (a repair) went out as a patch
on the same reasoning, while `-15` and `-17` were minors because they changed what a consumer gets on
purpose. The CHANGELOG should still say plainly that exported PNGs no longer contain controls; a
consumer who liked the button in their image deserves to find out by reading, not by looking.

### Register

Row `UCM-CHART-18`, both review notes, the published version, landing SHA(s) in a second commit
before the push. Record what the opened files looked like, including the MUI-legend counter-check.

Consumer adoption is `HRAM-CHT-8`, which this WO reduces to a pin bump.

### Log

- **2026-08-25** — Envelope authored. The operator chose the shared-core fix over moving controls in
  three hram panels, so that the rule holds for every consumer and `HRAM-RES-30`'s footer placement
  survives.
