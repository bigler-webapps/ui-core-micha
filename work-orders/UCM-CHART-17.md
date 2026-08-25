# UCM-CHART-17 — The two export buttons make two different promises; make them keep them

## Part A — Envelope

*Authored by the Expertenchat. Authoritative WHAT/WHY.*

### Goal

**Export SVG** yields the chart as scalable, correctly styled vector art. **Export PNG** yields what
the user is looking at — legend, size key and footnotes included.

### The defect, from the source

`exportChart.js:7-11` clones the first `<svg>` in the container and serialises it raw:

```js
const svg = findSvg(chartContainer).cloneNode(true);
svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
return new Blob([new XMLSerializer().serializeToString(svg)], …)
```

Three consequences, and they compound:

1. **No styles are carried.** MUI X-Charts styles nearly everything through emotion CSS classes —
   tick fonts and sizes, axis and grid colours, text fill, the theme's typography. The clone keeps
   `class="MuiChartsAxis-tickLabel css-1abc"` and none of the rules behind it, so a standalone
   viewer applies bare SVG defaults. This is the "graphically massively different" the operator
   reported. **The PNG inherits it**, because it rasterises the same blob.

2. **The legend is gone, and that is ours.** `findSvg` takes the *first* `<svg>`, i.e. the chart.
   Since `HRAM-RES-39`/`HRAM-VIS-2`, consuming panels hide MUI's own legend and render a hand-built
   one as **HTML** beside the chart, with the size key as a *second* SVG. Both sit outside the
   exported element. **Before that consolidation, MUI's legend was inside the chart SVG and did get
   exported** — unstyled, but present. Fixing a legend overlap silently degraded the export, and
   nobody noticed because nobody opened an exported file.

3. **"The first SVG" is fragile** regardless — a panel that renders any SVG ahead of the chart
   exports the wrong element. It works today by accident of ordering.

### The decision: two paths, two meanings

The operator chose option C on 2026-08-25. The two buttons already promise different things and
should stop pretending to be one mechanism:

- **SVG — the chart, faithfully styled.** Keep the clone-and-serialise path, but **inline computed
  styles onto the cloned nodes** before serialising. Stays true vector: scalable, editable in
  Illustrator/Inkscape, chart only. It does **not** gain the legend, and that is correct for what
  this format is for.
- **PNG — the container, as seen.** Rasterise the whole `chartRef` node rather than the chart SVG, so
  legend, size key and footnotes are in the file and the output matches the screen by construction.

**Make the difference legible to the user, not only to us.** Two buttons that produce visibly
different content need labels or tooltips saying so; today they read as one thing in two formats.

### Scope

**`src/components/charts/exportChart.js`**

1. **Inline computed styles** into the SVG clone before serialisation. Walk the clone against the
   live tree and write the resolved properties as inline style. Keep it to the properties that matter
   for chart rendering rather than dumping every computed property — a full dump produces enormous
   files and is its own defect.
2. **Rasterise the container for PNG.** The `chartRef` node ChartFrame already passes
   (`ChartFrame.jsx:138`) is the right root — it holds the chart plus everything the panel renders
   beside it.
3. **Stop relying on "the first SVG"** for the SVG path — take the chart deliberately, not
   positionally.
4. **Preserve the public signatures.** `exportChartSvg(container, filename)` and
   `exportChartPng(container, filename, backgroundColour)` are consumed by `ChartFrame` and possibly
   directly; the change is what they produce, not how they are called.

**`src/components/charts/ChartFrame.jsx`** — labels or tooltips that distinguish the two outputs.
Translated via the existing `chartsTranslations` path, not hard-coded.

### Non-goals / do not touch

- The chart presets, `resolveChartLayout`, the size scale, the axis bands.
- Consuming apps. hram's six panels with `exportOptions` gain the fix through the pin bump; that is
  a separate row.
- Adding export to panels that do not have it (`HRAM-RES-43` did that for one panel in hram).

### Risks

- **A rasteriser is a new dependency in shared-core**, and this package currently has exactly one
  runtime dependency (`@fontsource/dm-sans`). Adding a second is a real decision — check whether the
  job can be done with the platform's own APIs first, and if a library is warranted, say why in the
  WO's implementation record rather than just installing one.
- **Canvas tainting.** DOM-to-canvas rasterisation routes through an SVG `foreignObject`; any
  external image or font reference taints the canvas and `toBlob` throws. The existing PNG path
  already has this exposure and may already be failing on it — worth checking before assuming the new
  path introduces it.
- **Fonts in the SVG.** Inlining computed styles records `font-family: "DM Sans"`, which a machine
  without that font will substitute. Either embed the font or accept the substitution — but decide it
  and write it down, because a silently substituted font is exactly the "looks different" complaint
  this WO is fixing.
- **Style inlining can bloat.** See scope item 1.
- **This has no test that can see it.** A unit test can assert that a `style` attribute exists; it
  cannot see that the file looks right. See verification.

### Verification

**Open the exported files.** That is the whole gate, and its absence is why this defect shipped: the
SVG in a viewer and the PNG in an image viewer, both compared against the rendered panel.

Do it for **two** panels with different shapes — one with a hand-built legend and size key
(`AccessGapScatterPanel`), one without — because the legend behaviour is precisely what differs
between the two export paths.

Unit tests: the SVG clone carries inlined styles for tick labels and axis strokes; both entry points
still resolve with their existing signatures; the PNG path resolves for a container holding more than
one SVG.

---

## Part B — Implementation map

`.claude/models.local.json` has no local override, so the default applies: `implementation.runtime`
is `claude`/`sonnet` — the Orchestrator implemented directly, no Codex dispatch.

**Dependency decision (risk section, and Part C's approval gate):** no library added. Checked
first, per the WO's own instruction, and it held up: the platform's own `<foreignObject>` → `Image`
→ `<canvas>` pipeline works for arbitrary DOM rasterisation with no dependency at all. The one
obstacle — **confirmed live, not assumed** — is that Chrome taints the canvas on `toBlob`
unconditionally the moment the source SVG contains a `<foreignObject>` with HTML content, even with
zero external references (a minimal repro: a `<foreignObject>` holding one `<div>` with inline
`color: red` styling and no images/fonts/external refs still throws `SecurityError: Tainted
canvases may not be exported` when the SVG is loaded via `URL.createObjectURL`). The SAME SVG loaded
via a `data:` URI instead does **not** taint the canvas — confirmed with an identical minimal repro,
then re-confirmed end-to-end against the real `exportChartPng`/`ChartFrame` (real Chrome, via the
dev harness). This is why the approval gate never triggered: the platform-only approach IS viable,
it just needed the `blob:` → `data:` URI swap in `rasterize` (`exportChart.js`), documented inline
there.

**Canvas tainting on the PRE-FIX path:** checked per the risk section's own instruction ("may
already be failing on it"). It was not — a plain SVG-only blob (no `foreignObject`) loaded via
`URL.createObjectURL` does **not** taint the canvas; the exposure is specific to the `foreignObject`
this WO's PNG path adds, not a pre-existing defect.

**Verification (both real-browser, via the dev harness's module graph — `dev/entries.jsx` never
committed a probe entry, all verification was done by dynamically rendering `ChartFrame` into a
detached container and calling the real `exportChartSvg`/`exportChartPng`):**

- Panel shape WITH a hand-built legend + size key (mirroring `AccessGapScatterPanel`: MUI's own
  legend hidden, a `<div>` HTML legend with a coloured swatch, a second `<svg>` "size key" beside
  the chart): PNG rasterised at 2x scale, no taint, and pixel-sampling the produced PNG at the
  swatch's and size-key's known screen coordinates read back their EXACT source colours
  (`rgb(25,118,210)` / `#1976d2` and `rgb(156,39,176)` / `#9c27b0`) — the legend and size key are
  genuinely present in the raster, not just "no error thrown". SVG export of the same panel:
  contains `MuiChartsSurface-root` (the chart), does NOT contain the legend's own text/markup —
  chart-only as designed.
- Panel shape WITHOUT a hand-built legend (plain `BarChart` inside `ChartFrame`): both exports
  resolve cleanly, no regression for the common case.

Context package used: `exportChart.js` (rewritten in full, was short), `ChartFrame.jsx:42-108`
(the `runExport`/`exportOptions` wiring) and `:137-151` (`chartRef`, the export root — confirmed
correct: it wraps `content` only, excluding the meta/export-button footer), `chartsTranslations.ts`
(new `EXPORT_SVG_TOOLTIP`/`EXPORT_PNG_TOOLTIP` keys, all four locales).

---

## Part C — Orchestrator only

> **STOP — everything below addresses the Orchestrator.**

**Tier 3 · verification: opened files for two panel shapes, plus the unit tests above**

Shared-core, and — depending on scope item 2's answer — a dependency addition, which is its own
approval surface under Core Behaviour. If a library is needed, **stop and get the operator's
approval for that specific dependency** before adding it; the approval given on 2026-08-25 was for
the approach, not for a named package.

- `reviewer` — the inlining's completeness and the taint/font questions.
- `ui_reviewer` — whether the two buttons now read as two different things to a user.
- `sec_reviewer` — not run; no auth, data or exposure surface.

### Release

**Minor → 3.3.0**, per the operator. The PNG's *content* changes (it now includes the legend and
footnotes), so the CHANGELOG entry must **lead** with that, in the style `UCM-CHART-15` established:
a consumer who bumps and finds their exported PNGs different should read why in the first line, not
find it in a bullet.

### Register

Row `UCM-CHART-17`, both review notes, the published version, landing SHA(s) in a second commit
before the push. Record what the opened files actually looked like — that evidence is the point.

Consumer adoption (hram's pin bump) is a separate row; a shared-core fix that is published but not
consumed is not finished.

### Log

- **2026-08-25** — Envelope authored after the operator reported exports producing graphically very
  different plots. Diagnosed from source, not reproduced by the Expertenchat: the operator has seen
  the files. Option C chosen — SVG stays vector and chart-only, PNG becomes what the screen shows.
