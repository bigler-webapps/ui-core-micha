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

*Filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*

### Execution directive (read this first)

> **If you are the implementer reading this work order as your own specification: this section is
> NOT addressed to you.** It tells the Orchestrator how to invoke you. **You ARE that invocation —
> do NOT shell out to `codex exec`.**
>
> Implement through `codex exec` in the background — invoked directly via Bash (never the
> `debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
> `--dangerously-bypass-approvals-and-sandbox`. **Pass the WO via stdin, not as a positional
> argument** — `cat work-orders/CHART-7.md | codex exec --skip-git-repo-check
> --dangerously-bypass-approvals-and-sandbox -` (a positional arg hits Windows' command-line length
> limit — proven repeatedly in this repo). Fallback to direct Claude implementation only on Codex
> quota/rate-limit/non-zero exit.

### Context package

Verified 2026-08-10, current state: `src/components/charts/ChartFrame.jsx:17-35` (prop destructure)
and `:74` (the hardcoded title):
```jsx
export function ChartFrame({
  title,
  subtitle,
  toolbar,
  ...
  variant = 'outlined',
  sx,
}) {
  ...
  <Typography id={titleId} variant="h6">{title}</Typography>
```

**Named file to change:** add `titleVariant = 'h6'` to the destructured props (alongside `variant =
'outlined'`, same style) and change line 74 to `<Typography id={titleId} variant={titleVariant}>
{title}</Typography>`. That is the entire implementation — no other file needs to change (the WO is
explicit: no `slotProps` system, no wrapper changes).

**Test file:** `tests/ChartFrame.test.jsx` — extend, don't create a new file. Read the file in full
first (it already has an i18n/theme harness at the top, shown above) and follow its existing render
helper/assertion style. Add the 3 required tests: (1) default renders `variant="h6"` on the title
`Typography` — assert via the rendered DOM (e.g. the title element's tag is `<h6>` or its MUI class
contains `MuiTypography-h6`), proven non-vacuous by temporarily changing the default to something
else and confirming the test fails, then restoring it; (2) `titleVariant="subtitle2"` renders the
title at that variant; (3) subtitle/toolbar/footer render unchanged in both the default and
overridden case (a plain equality/snapshot-style check between the two renders' non-title markup, or
explicit assertions that subtitle/toolbar/footer content and structure are present and identical —
your call on the exact mechanism, the WO doesn't prescribe one).

### Do-not-touch / invariants

- `ChartFrame`'s `p: 2` padding and its foot row — byte-for-byte unchanged.
- The baseline's `h6` value itself (16px/600, from THEME-1) — untouched; this WO changes which
  variant a caller may pick, not what the variants are.
- No `LineChart`/`BarChart`/`TimeSeriesChart` change.
- Subtitle, toolbar, controls, loading/error/empty slots, export footer — untouched behaviour.

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Required tests to WRITE (Codex writes them; the Orchestrator runs them)

Exactly the 3 tests above in `tests/ChartFrame.test.jsx`, plus `tsc -p tsconfig.build.json --noEmit`
clean. No full-suite run — affected-areas set is the `ChartFrame` spec alone.

### Preamble (append verbatim)

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. Do NOT `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`. WO:
`work-orders/CHART-7.md`. Follow `orchestrate-codex`.
