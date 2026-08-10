# CHART-7 — `ChartFrame` gains a `titleVariant` prop

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 2 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Version target:** `2.32.0` — minor: a new public prop is additive API under semver, consistent with how `SHELL-2` classified `extraTabs` gaining a field
**Precondition of:** `fitness-monitor`'s `FM-12` (DS-10)

Short-form WO: one prop, one default, no design question.

---

## A. Envelope

### Goal

`ChartFrame` hard-codes its title as `<Typography variant="h6">` (`src/components/charts/ChartFrame.jsx:74`)
and exposes no way to change it. Add a `titleVariant` prop, defaulting to `'h6'` so nothing changes for
any existing caller.

### Why this is a kit gap and not one app's problem

A card title and a **panel-grid** title are different typographic jobs. In a dense grid the titles must
recede so they do not compete with the one chart that matters; at `h6` they do not. Concretely:
fitness-monitor renders six body-composition panels next to one hero chart, and its accepted prototype
specifies `13px/600` for those six against `15px/600` for the hero
(`fitness-monitor/work-orders/assets/FM-8-redesign.html:237` vs `:184`). Today all seven render at the
same `h6`, and **six oversized titles beside a hero chart was one of the original "reads heavier and
older" findings** that started this programme.

The app cannot reach it: there is no prop, and `ChartFrame`'s title is not exposed through `slotProps`
either. Any app with a dense panel grid hits the same wall — hram's results tabs are the obvious next
one — so this belongs in the kit rather than being worked around per app.

### Scope

- `ChartFrame` accepts `titleVariant`, forwarded to the title `Typography`. **Default `'h6'`.**
- Keep it minimal: **one prop, not a `slotProps.title` system.** There is one known need; a general slot
  mechanism for one consumer is the speculative generality this estate's promotion discipline rejects.
  If a second, different need appears, that is when the shape gets revisited.

### Non-goals / do not touch

- The subtitle, toolbar, controls, loading/error/empty slots and the export footer — untouched.
- `ChartFrame`'s `p: 2` padding and its foot row: **byte-for-byte unchanged.** 16 panels depend on them.
- The baseline's `h6` value (16px/600). This WO changes *which* variant a caller may pick, not what the
  variants are.
- The chart wrappers. No `LineChart`/`BarChart`/`TimeSeriesChart` change.
- No behaviour, permission or data-contract change.

### Risks

- **`ChartFrame` is the estate's most-used chart primitive** — five of hram's six hand-drawn panels use
  it, plus every wrapper chart. The default must remain `'h6'`; a changed default would silently restyle
  every title in the estate on the next pin bump.
- **No staging net.** A push to `main` touching `src/**` publishes to npm at once; the independent review
  is the only gate and is not back-fillable.

### Required tests to WRITE

Extend the existing `ChartFrame` spec rather than adding a file.

1. With no `titleVariant`, the title renders as `h6` — **prove non-vacuity** by changing the default and
   confirming this fails. This is the regression guard for all 16 existing panels.
2. `titleVariant="subtitle2"` renders the title at that variant.
3. The subtitle, toolbar and footer render unchanged in both cases.

Plus `tsc -p tsconfig.build.json --noEmit` clean.

**No full-suite run.** Affected-areas set is the `ChartFrame` spec.

### Verification

The rendered two-width side-by-side per DS-1, showing a `ChartFrame` at the default and one with an
overridden variant side by side — so the "default unchanged" claim is visible and not only asserted.

### Preconditions

None. `THEME-2` (`2.31.1`) is the current published version.

### Parity guardrail

Purely additive. Every existing caller must render identically — that is what test 1 guards.

---

## B. Implementation map

*To be filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*
