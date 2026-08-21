# UCM-CHART-9 — `ChartFrame` is a card, not a chart: it must never take a fixed height

- **Repo:** `ui-core-micha`, branch `main` (shared-core; publishes from `main`, no staging step)
- **Tier:** 3 — shared-core, and this is a **live layout regression in a published version**.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx` and its tests. `chartDefaults.js` only if the
  resolver needs a second shape — see below; the preset behaviour is correct and must not change.

> **Why — regression, observed on staging after hram bumped to 2.42.0.** `UCM-CHART-8` wired
> `resolveChartHeight()` through the four chart presets **and through `ChartFrame`**. For the
> presets that is right. For `ChartFrame` it is not, and the difference is what the box contains.
>
> In the `minHeight` alone / no `height` / no `aspect` branch, `resolveChartHeight` returns
> `chartHeight = minHeight`, and `ChartFrame` now applies it:
>
> ```diff
> -          minHeight,
> +          minHeight: wrapperMinHeight,
> +          height: chartHeight,
> ```
>
> **A chart preset's box contains exactly one chart. `ChartFrame`'s box contains a whole card** —
> title, toolbar, the chart, a legend, footnotes, export links. Turning its `minHeight` floor into a
> fixed `height` makes the box shorter than its content, the content overflows, and **adjacent cards
> visibly overlap**: the operator's screenshot shows a card title rendered over the chart of the card
> above it and three sets of "Export SVG / Export PNG" stacked at different offsets.
>
> `UCM-CHART-8`'s own Files note recorded that `ChartFrame` "never destructures `height`" — and the
> implementation then gave it one. The rule was written for presets and applied to a frame.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal

`ChartFrame` stops setting a fixed `height` on its content box. Its `minHeight` goes back to meaning
what its name says — a floor that content can exceed. The four chart presets keep `UCM-CHART-8`'s
three-way resolution unchanged.

### Definition of Done

- [ ] **`ChartFrame` never applies `chartHeight` to its content box.** Its box takes `minHeight` as a
      floor, as it did before 2.42.0. Whether that is done by not calling `resolveChartHeight` at
      all, or by giving the resolver an explicit frame shape, is the implementer's call — but
      `ChartFrame` must not end up with a fixed `height` in any branch.
- [ ] **A `ChartFrame` whose content exceeds `minHeight` grows.** This is the regression, stated as
      the acceptance criterion: content taller than the floor must extend the box, never overflow it.
- [ ] **The four presets are untouched.** `ScatterChart`, `BarChart`, `LineChart`, `TimeSeriesChart`
      keep `UCM-CHART-8` exactly as it landed — including the `aspect` branch that four live call
      sites depend on. This WO narrows one consumer of the resolver; it does not revisit the rule.
- [ ] **`ChartFrame`'s JSDoc is corrected.** 2.42.0 added a paragraph claiming `minHeight`
      "sizes the content box itself" when there is no `height`/`aspect`. That sentence is the bug in
      prose form and must go.
- [ ] **`warnOnHeightMismatch` stays** on `ChartFrame` — a caller passing both is still worth a
      dev-mode note, even though the frame no longer acts on `height`.

### Non-goals

- Do **not** revert `UCM-CHART-8`. Its preset behaviour is correct and is the fix hram needs; only
  the frame's participation was wrong.
- Do not change `resolveChartHeight`'s three-way rule for presets.
- No consumer-side change in this WO.

### Risks

- **`ChartFrame` is used by every Research card in hram and by other consumers.** The change restores
  pre-2.42.0 behaviour for it, so the risk is low in direction — but it is still a shared-core
  publish, and the rendered check below is what proves it.
- 2.42.0 is `latest` on the registry and carries this regression. Publish 2.42.1 promptly; note in
  the register that 2.42.0 should not be adopted by a new consumer.
- **Unresolved, and worth watching:** hram's Detailed Results tab, which crashed with React #185
  before the bump (`HRAM-RES-29` item 1), **stopped crashing after it**. The plausible mechanism is
  that deterministic sizing removed a resize-driven `setState` loop. That is a hypothesis, not a
  finding. If this WO changes `ChartFrame`'s sizing back toward a floor, **re-check whether the crash
  returns** — and if it does, that is a real finding for `HRAM-RES-29`, not a reason to undo this.

### Tests to WRITE — narrow

- **The regression test:** a `ChartFrame` with `minHeight` and no `height`/`aspect`, containing
  content taller than `minHeight`, does **not** receive a fixed `height` on its content box.
- `ChartFrame` with `height` explicitly passed: `height` is still not applied as a fixed box height
  (the frame is not a chart), and no exception is thrown.
- The four presets' existing `UCM-CHART-8` tests stay green **unchanged** — if one of them has to be
  edited, the change has leaked out of `ChartFrame` and that is a stop-and-report.

**Rendered check before the hram pin bump — mandatory, and the reason this WO exists.** The unit
tests for 2.42.0 were 188 green and said nothing about layout, because they cannot. Before hram's pin
moves again, the affected cards are checked rendered at 375 px and 1280 px: Sensitivity, Access,
Access Ladder, Allocation, Optimization. Named in the register note, with the substitution declared
if capture is unavailable.

---

## Part B — Implementation map — ADDRESSED TO THE IMPLEMENTER

### Context package

**Named files to change:**
- `src/components/charts/ChartFrame.jsx` — the fix (below).
- `tests/ChartFrame.test.jsx:215-256` — the `describe('minHeight/height resolution (CHART-8)', …)`
  block. It currently **asserts the bug as correct behaviour** (e.g. `minHeight` alone →
  `style.height` toBe `'300px'`). Rewrite it to assert the fixed behaviour; rename the block to
  `(CHART-9)`.

**Do NOT touch (verified against the landed code):**
- `src/components/charts/chartDefaults.js` — `resolveChartHeight` (lines ~289-298) and
  `warnOnHeightMismatch` (lines ~306-315) keep their exact current contract. If the fix seems to need
  a change here, that means the change has leaked out of `ChartFrame` — stop and report, don't edit.
- `src/components/charts/{BarChart,LineChart,ScatterChart,TimeSeriesChart}.jsx` — all four still call
  `resolveChartHeight({ minHeight, height, aspect })` for their OWN box, unchanged.
- `tests/chartDefaults.test.js:441+` (`describe('resolveChartHeight (CHART-8)', …)`) and the four
  presets' own test files — must stay green **unchanged**. If one needs an edit, stop and report.

**The bug, exactly:** `ChartFrame.jsx:61-62` calls `resolveChartHeight({ minHeight, height, aspect })`
and applies the result to its content box at `:109-125`:
```jsx
sx={{
  width: '100%',
  minHeight: wrapperMinHeight,
  height: chartHeight,
  aspectRatio: aspect,
  ...
}}
```
In the "no `height`, no `aspect`" branch, `resolveChartHeight` returns `chartHeight = minHeight` —
correct for a preset's box (which holds exactly one chart) but wrong for `ChartFrame`'s box (which
holds a whole card: title, toolbar, chart, legend, footnotes, export links). A fixed `height` there
makes the box shorter than its content, and the content overflows into the next card.

**What "restore pre-2.42.0 behaviour" means concretely** — before `UCM-CHART-8` (commit `11d362c`),
`ChartFrame` had no `height` prop at all and its content box was:
```jsx
sx={{
  width: '100%',
  minHeight,
  aspectRatio: aspect,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}
```
i.e. `minHeight` applied raw, straight from props, never touched by any resolver; no `height` was
ever set on the box.

**The fix:** `ChartFrame`'s content box must end up equivalent to that — `minHeight` (raw, from
props) as the box's only height-related sx property besides `aspectRatio`, and nothing ever sets
`height` on the box. The `height` prop stays in `ChartFrame`'s signature (do not remove it — it is
still a documented prop and `warnOnHeightMismatch('ChartFrame', { minHeight, height })` at line 61
must keep firing on a caller passing both `minHeight` and a disagreeing `height`), it is simply no
longer used to size the box. Whether you implement this by dropping the `resolveChartHeight` call
from `ChartFrame` entirely (simplest — matches the pre-2.42.0 shape exactly) or by giving the
resolver a second, frame-specific shape in `chartDefaults.js` that never returns a `chartHeight` is
your call — but per the non-goals below, the existing `resolveChartHeight` export and its three-way
preset contract must not change.

**JSDoc fix:** `ChartFrame.jsx:19-26`'s docblock currently states: *"otherwise (no `height`, no
`aspect`) it sizes the content box itself. Once `height` is set, `height` sizes the box…"* — that
sentence describes the bug as intended behaviour and must be corrected to state that `minHeight` is
always a floor on `ChartFrame`'s box and `height` is never applied to it (only used for the
dev-mode mismatch warning).

**Regression check while you're in there:** hram's Detailed Results tab crashed with React #185
before the 2.42.0 bump and stopped crashing after it (`HRAM-RES-29` item 1, unconfirmed hypothesis:
deterministic sizing removed a resize-driven `setState` loop). This fix moves `ChartFrame` back
toward non-deterministic sizing for that one prop. You are not expected to reproduce or verify the
hram-side crash — the Orchestrator does that separately after your diff lands — but do not add any
new resize-driven effect to `ChartFrame` while touching this code.

Work from this package; do not explore broadly from scratch — open only the named files to verify.
If you must dig deeper, delegate to a read-only Explore sub-agent (Haiku).

### Target repo working directory (absolute)

`C:\Users\Micha Bigler\Documents\webapps\ui-core-micha`

### Preamble — binding, read before doing anything else

The text in this file is the COMPLETE spec — the committed WO content, not a plan to refine; there
is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`,
and this repo's own `MEMORY.md` ONLY for conventions. Stay in scope; do not touch
auth/permissions/deps/schema/CI unless this spec says so; do not update `MEMORY.md`. **Do NOT edit
`WORK_ORDERS.md`** — the register row and the review verdicts are the orchestrator's alone. Do NOT
`git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's
independent review. WRITE the tests the "Required tests to WRITE" section (Part A) calls for AND
**RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do
(NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set
and does the independent review after you finish — those are the gate; your own run does not count
as the gate.

Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
`RESULT: DONE|BLOCKED <reason>`.

---

## Part C — Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this
> line.** Everything below describes what the Orchestrator does AFTER you finish. You do none of it
> — no reviewers, no verification run, no register edit, no commit. You ARE the invocation described
> below; do NOT shell out to `codex exec`.

### Execution directive

Implement through `codex exec` in the background — invoked directly via Bash (never the
`debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, `cwd` = the working directory above (never
`…\webapps`). Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit —
check `.claude/codex-status.md` first per its own rule (no line for 2026-08-22 → use Codex). The
fallback flips authorship, making an independent `reviewer` mandatory even if it already was.

### Review routing (Tier 3, shared-core)

- `reviewer`: **yes**, full context, Sonnet-pinned, background.
- `ui_reviewer`: **yes** (diff touches frontend), full context, background, same batch as `reviewer`.
- `sec_reviewer`: not required — no auth/security surface in this diff.
- Both run concurrently; neither is skippable; commit waits for both clean.

### Verification (the authoritative run — Codex's own run is not the gate)

1. **Test gate:** `npx vitest run tests/ChartFrame.test.jsx tests/chartDefaults.test.js
   tests/BarChart.test.jsx tests/LineChart.test.jsx tests/ScatterChart.test.jsx
   tests/TimeSeriesChart.test.jsx` (adjust filenames to whatever actually exists — the affected-area
   set per AGENTS.md "Test scope": `ChartFrame` itself plus every consumer of `resolveChartHeight`).
   All must pass; the four presets' pre-existing assertions must be **byte-identical**, not just
   green — a changed preset assertion means the fix leaked scope.
2. **Rendered check — this WO's own commit gate, scoped to what this repo can render.** This repo
   has no prototype artifact, so the generic prototype side-by-side gate does not apply; this WO's
   own Envelope names a rendered check instead, and it is honoured here at the scope this repo can
   actually reach:
   - Run `npm run dev` (Vite) and open the dev harness at 375 px and 1280 px. It already contains
     `ChartFrame` "shape check" stories that mirror three of the five named hram cards — "Allocation
     performance", "Access gap", "Optimization results" (`dev/entries.jsx`, search `shape check`).
     Confirm none of them, nor any neighbouring card, show overlapping title/content/export rows at
     either width.
   - Additionally render (ad hoc, in the same dev session — e.g. a temporary story or by editing an
     existing one's children) a `ChartFrame` with a `minHeight` smaller than its actual content, to
     directly exercise the Definition of Done's acceptance criterion: the box must grow to fit the
     content, not overflow it. Revert any temporary dev-harness edit before commit (or keep it only
     if it's a genuine permanent addition worth keeping — your call, but say which in the Notiz).
   - This repo's harness has no "Sensitivity" or "Access Ladder" story, so the **full five-card
     rendered check the Envelope describes ("before hram's pin moves again") is NOT done by this WO**
     — it cannot be, without linking a built `ui-core-micha` into a running hram dev server. Declare
     this explicitly in the register Notiz as a carried-forward precondition on whichever WO next
     bumps hram's pin past 2.42.0, not a silently dropped gate.
   - Declare screenshots-vs-DOM-inspection substitution explicitly if real screenshots aren't taken.

### Register + commit

- `WORK_ORDERS.md` row → `done`, with: the named review verdicts (`reviewer` + `ui_reviewer`, no
  open findings — or the findings and their resolution), the test gate result, the rendered-check
  scope actually achieved (dev harness only, full hram five-card check carried forward), and which
  evidence from `.claude/codex-status.md` was used (or that no fallback was needed).
- Note in the Notiz: **publish 2.42.1 promptly after commit** (per Part A Risks — 2.42.0 is `latest`
  on the registry and carries this regression) and confirm the version bump lands in the same commit
  or a clearly-linked follow-up; the register row must name whichever it was.
- Commit message: single concise English subject line (e.g. `fix(ChartFrame): stop applying a fixed
  height to the card box (CHART-9)`). Push to `main` (this repo publishes from `main`, no `develop`
  step) once review + tests are clean.
