# Changelog

Only notable, user-facing changes. Not every version — see `WORK_ORDERS.md` for the full history.

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
