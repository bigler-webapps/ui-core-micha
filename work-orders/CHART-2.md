# WORK ORDER CHART-2 (ui-core-micha) — a time-series chart preset with range picker and series toggles

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Extends CHART-1. Operator request 2026-08-04 from jg's event
activity chart; the same controls are wanted wherever a time series is charted, and `django-core-micha`
ACT-1 makes activity data available to every app.

## TIER
Tier 2 — shared-core UI consumed by every app. Independent `reviewer` + `ui_reviewer` mandatory.

## WHY

CHART-1 already ships `ChartFrame` (Paper + title + **toolbar slot** + loading / error / empty +
responsive container + SVG/PNG export + a11y), a themed `BarChart`, `getNeutralChartPalette` and
`chartsTranslations`. The frame's toolbar slot exists for exactly this and is currently unused by any
consumer.

jg's `ActivitySection.jsx` bypasses the kit entirely (`import { BarChart } from '@mui/x-charts/BarChart'`
at `:9`) and hand-rolls its own `Paper`, loading, error and empty states. Rather than jg building a
range picker and series checkboxes locally, they belong in the kit — every app charting a time series
wants both.

## SCOPE

**A. A range picker for the toolbar slot.** Presets **1 week / 1 month / 1 year** (operator, 2026-08-04),
emitting the selected range to the host. The host owns fetching; the picker owns the choice.

The range must also carry the **granularity** the consumer should request — dcm ACT-1's query endpoint
aggregates server-side, and a year of 4-hour buckets is ~2190 points, which no chart can render
usefully. A picker that changes the window but not the resolution reproduces exactly the
unreadable-density problem this WO exists to fix.

**The range-to-granularity mapping (operator, 2026-08-04) — implement exactly this:**

| Range | Granularity | Points |
|---|---|---|
| 1 week | 4 hours | ~42 |
| 1 month | 1 day | ~30 |
| 1 year | 1 month | 12 |

Every preset lands between roughly a dozen and fifty points, which is what keeps the chart readable at
any range. The resolution follows the window; it is not an independent control.


**B. Series toggles for the toolbar slot.** Check/uncheck each series independently.

**These are not cosmetic.** In jg's chart two series share one y-axis with different units — user counts
reach 28 while presence-hours sit near zero, so the second series is invisible. Toggling one off
rescales the axis and makes the other readable. Whether to offer a second y-axis instead is a real
alternative: **if you do not add one, say so deliberately** rather than leaving it unconsidered.

Deselecting every series must leave a stable empty chart — not a crash, not a permanent spinner.

**C. Compose them into a preset** on `ChartFrame` + the existing `BarChart`, so a consumer gets frame,
chart, picker and toggles from one component and passes data plus callbacks.

**Presentational only — the host fetches.** Take `data`, the current range and series selection, and
callbacks; do not call any endpoint. If all four hosts later write the identical fetch against ACT-1's
endpoint, *that* is the signal to add an adapter — and note the inverse trap from this estate's recent
history: building the shared thing before two identical consumers exist is how you generalise against a
single case and get it wrong.

## NON-GOALS / DO NOT TOUCH
- Do not fetch data, and do not import anything app-specific.
- Do not change `ChartFrame`, `BarChart`, `LineChart` or the palette beyond what composing requires. If
  `ChartFrame` lacks something, **extend it deliberately and say so** — do not work around it in the
  preset.
- Do not add a charting dependency; MUI X-Charts is already the kit's basis.
- No persistence of the picker or toggle state — that is the host's decision.

## RISKS
- The toolbar slot has no consumer today, so this is its first real use. Expect to find gaps in it;
  fixing them is in scope, working around them is not.
- Accessibility: the picker and checkboxes are controls, not decoration — labels, keyboard operation and
  state must be right. Series colour alone must not be the only way to tell which toggle maps to which
  series. `ui_reviewer` should check this specifically.
- Every host inherits the preset; a visible behaviour change beyond jg.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. Selecting a range emits both the range **and** the mapped granularity to the callback — assert the
   granularity, which is the half most likely to be dropped.
2. Toggling a series off removes it from the rendered chart and leaves the others.
3. Toggling **all** series off renders a stable empty chart: no crash, no spinner.
4. The preset renders `ChartFrame`'s empty state for empty data, exactly once.

**Non-vacuity:** test 1 must fail if only the range is emitted. Assert the emitted payload, not that a
callback fired.

## TEST SCOPE FOR THE GATE (orchestrator)
The chart component tests. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; consumer pin bumps are separate.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`, or `develop` if present).
> Work order: `work-orders/CHART-2.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Extends CHART-1, whose `ChartFrame` already has an unused **toolbar slot** — that is where the range
> picker and series toggles go. **Presentational only: the host fetches, this component takes data and
> callbacks.**
>
> The one thing most likely to be half-done: the range picker must emit a **granularity** alongside the
> window. dcm ACT-1 aggregates server-side, and a 1-year range at 4-hour buckets is ~2190 points — a
> picker that widens the window without coarsening the resolution reproduces the unreadable chart this
> WO exists to fix. Test 1 asserts the granularity for that reason.
>
> The series toggles are a real fix, not a preference: jg's two series share one y-axis with different
> units, which is why one of them is invisible today. If you consider a second y-axis instead, decide
> deliberately and say so.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
