# Changelog

Only notable, user-facing changes. Not every version — see `WORK_ORDERS.md` for the full history.

## 3.3.0 — UCM-CHART-17

**The PNG export now includes the legend, size key, and footnotes — the SVG export still doesn't,
deliberately.** Both exports used to clone-and-serialise the same raw `<svg>`: no theme styles
carried over (a standalone viewer applied bare SVG defaults, the "graphically massively different"
symptom reported), and only the chart itself was captured — a panel's hand-built HTML legend and
its size-key SVG (rendered as siblings of the chart since `HRAM-RES-39`/`HRAM-VIS-2`) were silently
dropped from every export.

The two formats now keep two different, explicit promises instead of one broken shared one:

- **Export SVG** — the chart's own vector surface, with computed styles (font, colour, stroke)
  inlined so it renders correctly standalone. Chart only, no legend — that's what a portable,
  editable vector file is for.
- **Export PNG** — the whole card as shown: chart, legend, size key, footnotes. Rasterises the
  actual container instead of the chart's SVG alone.

Both buttons now carry a tooltip stating the difference, since the label alone no longer says so.

No new dependency: both paths route through the platform's own SVG → `Image` → `<canvas>`
pipeline. The PNG path specifically loads its intermediate SVG via a `data:` URI rather than a
`blob:` URL — an `<svg>` containing a `<foreignObject>` (needed to rasterise arbitrary HTML)
taints the canvas unconditionally in Chrome when loaded via `blob:`, confirmed live; a `data:` URI
does not.

## 3.2.1 — UCM-CHART-16

**A horizontal-axis chart with a title, or a large-enough tick font, could render every tick
label blank.** The x-axis tick band reserved a flat, font-size-independent floor; MUI's own
internal fit check (`shortenLabels`, against `tickLabelsMaxHeight`) blanks every tick label the
moment the real rendered text is even slightly taller than that floor leaves room for once MUI's
own tick/gap overhead — and, when a title shares the same band, its own gap too — is subtracted.
Correctly positioned tick marks with zero visible label text is the exact, easy-to-misread
signature; two hram consumers had independently patched around it with the same empirically
measured `height: 56` before this was traced to its shared-core cause.

The band is now derived from the actual tick font size (and whether an axis title shares it)
instead of the flat floor, matching MUI's real fit check rather than only its generic default.
Patch, not minor: this repairs existing behaviour — the SAME size tokens render at the SAME
heights (`UCM-CHART-15` is untouched) — the only change is the flat tick band growing by a few
pixels on charts that were previously either mis-sized or silently blanking their labels. The
rotated-tick path (`xLabels: "angled"`) is unaffected.

## 3.2.0 — UCM-CHART-15

**Breaking visual change: every existing chart using a `size` token — including the default
`standard` size — becomes 80px taller; `standard` is now 400px.** The chart `size` scale shifts
up one step and gains two new steps above the old ceiling:

| token | before | after |
|---|---|---|
| `compact` | 240px | **320px** |
| `standard` | 320px | **400px** |
| `tall` | 400px | **480px** |
| `extra_tall` | — | **560px** (new) |
| `super_tall` | — | **640px** (new) |

This redraws every chart already using a `size` token, in every consumer on `ui-core-micha` `3.x`.
The 10-unit step is unchanged; every value stays a clean multiple of the theme's 8px spacing unit.

**Why:** `tall` was the tallest token available, and hram had already needed the documented
`height` px escape to get past it — a scale that forces its own escape ends too early.
`standard`'s old 320px value was a migration guardrail from `UCM-CHART-12` (pinned to the
pre-existing deployed default so that migration did not itself redraw anything), not a design
verdict on its own merits; the operator judged the whole scale too cramped on its own merits and
chose to correct it now, before the fourteen remaining apps still on `2.x` migrate onto it.

**This is a breaking change shipped as a minor**, by explicit operator decision (`2026-08-24`),
against the Expertenchat's recommendation of a major. No consuming app is on `3.x` except hram, so
the practical blast radius is one application; hram's own adoption and visual verification is a
separate, deliberate work order (`HRAM-CHT-5`), not automatic from this release.

## 3.1.2 — UCM-CHART-14 follow-up

**The census script shipped in `3.1.1` worked; its test suite never ran.** `scripts/chart-api-census.mjs`
began with `#!/usr/bin/env node`. Node strips a shebang when executing a file directly, so the script
behaved correctly and its output was trustworthy — but Vite's module runner does not strip it, so any
test importing the module died at collection with `SyntaxError: Invalid or unexpected token`. The
suite reported `1 failed | 2 passed` with **0 of its 22 census tests collected**.

- Shebang removed; the script is invoked as `node scripts/chart-api-census.mjs <workspace-root>`, which
  is how it was already documented and run. A comment in its place records why: a shebang is invisible
  to direct execution but breaks any loader that pulls the file through an ESM graph, so re-adding one
  fails nothing user-facing and only takes out the tests.
- No change to the census logic, its output, or anything in the published runtime surface. The 22
  fixture tests were already correct; they now execute (118 passing across the chart suite, up from 96).

## 3.1.1 — UCM-CHART-14

**Corrects a wrong record from `3.1.0`, and a runtime error message that stated the opposite of
what actually happened. No API change in this version.**

`3.1.0` (`UCM-CHART-13`) removed `ChartFrame`'s `height` and `aspect` props, and claimed — in the
docblock, in `docs/CHART-LAYOUT.md`, and in the commit message — that no consumer passed `aspect`.
**That measurement was false.** A parser-based census (`scripts/chart-api-census.mjs`, ground truth
over a `head`-truncated grep that had missed them) found **four live call sites in
fitness-monitor** (`BodyHistoryPage.jsx` ×2, `EnvironmentPage.jsx` ×2) that do pass `aspect`, and
whose cards visibly change shape once `3.1.0`+ is adopted — `aspect` was genuinely applied
(`aspectRatio` on the card box) through `3.0.1`, not a no-op.

**The removal itself is not reverted** — the operator confirmed this stands. What changes here:

- The dev-mode error `<ChartFrame>` throws when a caller still passes `aspect` no longer claims the
  prop "was never applied". It now says plainly that it WAS applied, that this is a real visible
  change, and that `size` on the chart inside the frame is the replacement if a chart's own height
  was meant.
- The false "no consumer passes it" claim is corrected — not deleted — everywhere it shipped
  (`ChartFrame.jsx`'s docblock, `docs/CHART-LAYOUT.md`, `tests/ChartFrame.test.jsx`'s comment) so
  the record shows what was measured, both times.
- A new dev script, `scripts/chart-api-census.mjs`, parses (does not grep) every sibling repo's use
  of the four chart presets and `ChartFrame`, reporting exactly which of `aspect`/`height`/
  `minHeight`/`margin`/`xAxisAngle` each call site still carries, with file:line. Not part of the
  package's runtime surface — a workspace-local tool for the next migration WO.

**This is a patch, not a major**, even though an applied prop was removed: no consumer has crossed
`3.1.0` yet (hram is on `3.0.1`, fitness-monitor on `3.0.1` in its working tree, jg-ferien on
`2.41.1`), and the break is not silent — `assertRemovedChartProp` throws in dev at the exact call
site, which is what a major version's "read the release notes" warning exists to approximate in the
first place. Migrating fitness-monitor's four call sites is `FM-CHART-1`'s scope, not this one's.

## 3.1.0 — UCM-CHART-13

`ChartFrame` no longer accepts `height` or `aspect` — only `minHeight` (the card floor) is applied.
Both now throw a dev-mode error naming the replacement. See `3.1.1` above for a correction to this
version's own release notes.

## 3.0.1 — UCM-CHART-12 (fix round)

Follow-up fixes to `3.0.0`'s chart layout model after a second, independent review round: a
secondary (right-positioned) y-axis's width is now accounted for, `xLabels="auto"` decides rotation
from the label's real measured width rather than a character count, a blank-formatted y-axis
collapses its reserved band to zero the same way the x-axis case does, and the resolver now reserves
space for wherever a legend actually renders (`slotProps.legend.position`), not just the
`legendPosition` prop alone.

## 3.0.0 — UCM-CHART-12

**Breaking.** One layout model replaces the chart presets' `minHeight`/`height`/`aspect`/`margin`/an
implicit rotation prop with `resolveChartLayout`, driven by `size`
(`"compact"`|`"standard"`|`"tall"`, + a `height` px escape) and `xLabels`
(`"auto"`|`"horizontal"`|`"angled"`). Every reserved band now derives from its own content and
collapses to zero when empty. See `docs/CHART-LAYOUT.md` for the full migration guide.
