# CHART-1 — Shared chart kit: themed `ChartFrame` + MUI X-Charts Bar/Line presets

- **Repo:** `ui-core-micha` (`@micha.bigler/ui-core-micha`), branch `main` (library, publish-from-main; no `develop`)
- **Tier:** 2 (new shared-library public API + a dependency change + governance-anchored contract)
- **Status:** planned
- **Workstream:** `CHART-*` (chart / data-viz kit)

> This file has two halves. **Part A (Envelope)** below is authored by the Expertenchat and is the
> authoritative WHAT/WHY — changing it is a scope change that returns to the operator. **Part B
> (Implementation map)** is filled by the Orchestrator on `git pull` from repo knowledge, refined
> against the landed code, without altering Part A.

---

## Part A — Envelope (authoritative WHAT/WHY)

### Goal (Ziel)

Build the **shared chart kit** that this stack's governance already references as a not-yet-existing
dependency (`.codex/skills/frontend-engineering/SKILL.md` §"Charts / data-viz": *"use the shared
chart kit (a themed `ChartFrame` + MUI X-Charts primitives) once it exists"*; `ui_reviewer`
checklist mirrors it). Today every hram Results/Research panel re-implements the same
`Paper + title + toolbar + loading/error/empty + fixed-height box + export buttons` scaffolding
(~20 panels, ~200 lines of boilerplate each), and there is no reusable frame. This WO delivers the
reusable estate-wide primitives so charts stop being the recurring quality trap.

### Expected outcome

A new additive, barrel-exported (`src/index.js`) chart module in `ui-core-micha`, published as an
additive **minor** version bump (`2.12.0 → 2.15.0`, publish-from-main per the dcm/ucm publish
topology), providing exactly:

1. **`ChartFrame` — the chart-type-agnostic scaffolding.** This is the primary value; it wraps *any*
   chart body via `children` (an MUI X-Charts primitive **or** a bespoke raw-`<svg>` body), so it
   serves all ~20 hram panels including the SVG specialists. It owns:
   - a `Paper` container (default `variant="outlined"`, matching hram's Research panels),
   - `title` (required) + optional `subtitle`,
   - a `toolbar` slot (`ReactNode`, rendered in the header row — for the panels' `ToggleButtonGroup`/
     selectors),
   - mutually-exclusive state rendering with precedence **loading → error → empty → children**:
     `loading` (spinner), `error` (`Alert severity="error"`), `isEmpty` + `emptyMessage`
     (`Alert severity="info"`),
   - a **responsive, container-sized** chart area (governance: *"container-sized, not fixed px"*),
     with an optional `minHeight`/`aspect` fallback so migrated panels don't reflow unexpectedly,
   - optional **Export SVG / Export PNG** controls in the footer (consolidating the per-panel export
     hram already hand-rolls), shown only when export is enabled, operating on the rendered chart
     container,
   - basic **a11y** (frame `title`/`aria-label`, `role="img"` or equivalent on the chart region).
   All of ChartFrame's own user-facing strings (empty/error defaults, export button labels) go
   through `react-i18next` — no hardcoded copy.

2. **`BarChart` preset** — a thin wrapper over MUI X-Charts `BarChart` that bakes in the governance
   chart contract so callers cannot forget it: **axis labels on both axes (with units)** required via
   props, **legend auto-shown only when >1 series**, **tooltip on**, **theme-token colours** (accepts
   a caller palette / per-series colours, defaults to the kit's neutral palette — never hardcoded
   hex), **responsive container**. Must cover the variants hram actually uses: single-series, grouped
   (multi-metric), and stacked (incl. the dual-axis case in `GenericAnalysisPlot`).

3. **`LineChart` preset** — same contract, for multi-series time-series (covers
   `ResultsTimelinePanel` / `ExpertTimelinePanel`).

4. **Neutral palette + locale-aware formatter helpers** — a theme-aware (light **and** dark)
   categorical + sequential palette and number formatters (percentage, compact, ratio) that the
   presets default to and that apps may pass through. The kit provides the **neutral default and the
   pass-through seam only**; domain palettes and domain labels stay in the consuming app (see
   non-goals).

**Acceptance = the `ui_reviewer` chart checklist is satisfiable by construction:** any chart built
with the presets has axis labels (both axes), a legend when multi-series, a tooltip, theme-token
colours, container-sized responsiveness, i18n-able labels, and empty/loading states + basic a11y
from the frame.

### Scope

- New chart module (e.g. `src/components/charts/`), exported from `src/index.js` (additive only).
- `ChartFrame`, `BarChart`, `LineChart`, and the neutral palette/formatter helpers.
- Add `@mui/x-charts` as a **`peerDependency`** (see Precondition — this is the one approval-gated
  item). Peer, not a direct dep, so the consuming app owns the version and there is no double-bundle;
  hram already depends on `@mui/x-charts` and satisfies the peer.
- Kit-owned strings wired through the existing ucm `react-i18next` setup (`src/i18n`).
- Additive minor version bump + publish (`2.15.0`).

### Non-goals / do-not-touch (explicit)

- **No SVG chart primitives in v1.** No generic scatter/bubble, tornado, heatmap, confidence-interval,
  or Pareto-frontier component. hram's bespoke SVG panels keep their own `<svg>` **body**, rendered
  **inside `ChartFrame`** (so they gain the shared frame + export). This is a **deliberately surfaced
  partial state**, not a silent half-solution: retiring the raw SVG by lifting these into MUI
  X-Charts / kit primitives is a tracked future **CHART-2**, gated separately. (Governance's
  "extend the kit, don't hand-roll" is the direction; v1 intentionally does not yet cover these.)
- **No geo/maps** — `react-leaflet` stays app-side.
- **No tables** — MUI `Table` stays app-side.
- **No domain palettes or domain labels** — hram's `dataViz` palette (coverage/dalys/cost/…) and its
  `Results.*` i18n keys stay in hram; the kit ships only the neutral default + pass-through seam.
- **Do not migrate hram in this WO.** hram adoption (pin bump + panel migration) is a separate
  follow-on WO in the `hram` repo, gated on `2.15.0` being published (see Precondition).
- Do not touch auth, CI, or any existing ucm export beyond additively adding the chart exports.

### Precondition / execution-gate / ordering

1. **Dependency-change approval (blocking):** adding `@mui/x-charts` as a `peerDependency` is a
   dependency change → **explicit operator approval required before the Orchestrator adds it**
   (AGENTS.md "Require explicit approval before touching: dependency changes").
2. **Publish before adoption:** the kit lands + publishes as the **next free additive minor**. At
   authoring, `2.13.0` (NOTIF-13) and `2.14.0` (NOTIF-12) are already claimed, so the target is
   `2.15.0` — but the registry is the source of truth (publish-from-main; the ucm `version_check`
   compares against it). The Orchestrator confirms the next free minor against the registry at
   publish time and adjusts if the NOTIF workstream has advanced further; then confirms it is live
   before any consumer pins it (per the dcm/ucm publish-topology note).
3. **hram adoption is gated** on `2.15.0` published; its follow-on WO pins `ui-core-micha >= 2.15.0`.

### Risks

- **API-fit risk (primary):** ChartFrame's props must let all ~20 hram panels — including the
  SVG-bodied ones — slot in as `children` without escape hatches; if the frame is too opinionated the
  migration fights it. Mitigation: frame stays deliberately thin and children-based; the presets, not
  the frame, own chart specifics.
- **Responsive vs. fixed height:** governance wants container-sized; hram currently hardcodes
  `height: 300`. The frame defaults responsive but must offer a `minHeight`/`aspect` fallback so the
  later migration doesn't silently reflow every panel.
- **Export consolidation:** hram hand-rolls per-panel SVG/PNG export. A generic export from a
  container ref must handle both an MUI X-Charts body (SVG under the hood) and a raw-`<svg>` body.
  **Reuse hram's existing export mechanism / a stdlib-level approach; do NOT add a heavy new
  dependency for PNG rendering without separate approval** (that would be another dependency gate).
  If a clean generic export can't be done without a new dep, ship the SVG-serialize path and defer
  PNG — surface the choice, don't silently drop it.
- **Theme/dark-mode:** the neutral palette must resolve correctly in both light and dark MUI themes.
- **i18n:** no hardcoded user-facing strings in the kit; all through ucm's `react-i18next`.

### Required tests to WRITE (narrow — component-level, scoped to this change)

Written as part of implementation (the implementer writes the test code); **run only by the
Orchestrator**. Use ucm's existing frontend test setup (Vitest + React Testing Library, per prior
ucm WOs). Scoped to the new components — not the ucm full suite.

- **ChartFrame:** renders `title`/`subtitle`; `loading` shows the spinner and hides children;
  `error` shows an error Alert; `isEmpty` shows `emptyMessage`; **state precedence
  loading → error → empty → children** holds; the `toolbar` slot renders; export controls appear
  only when export is enabled and invoke the handler / produce output; a11y `title`/`aria`/role
  present on the chart region.
- **BarChart preset:** axis labels render on **both** axes; **legend appears only when >1 series**;
  tooltip is enabled; colours come from theme tokens / passed palette (assert **no hardcoded hex**);
  container is responsive (not a fixed px width); single, grouped, and stacked variants each render.
- **LineChart preset:** multi-series renders; both-axis labels; legend when multi-series; tooltip on.
- **Palette + formatters:** neutral palette resolves in both light and dark theme; number formatters
  are locale-aware (percentage + compact) across at least two locales.
- **i18n:** the kit's own strings resolve via i18n, not hardcoded (missing-key / alternate-locale
  check).

(Do **not** run the ucm full suite for this WO — that is the promotion gate's job. Run only the new
components' scoped tests, once, as the per-WO gate, alongside the single independent review on the
full assembled diff.)

---

## Part B — Implementation map (filled by the Orchestrator on `git pull`)

**Dependency approval:** operator explicitly approved adding `@mui/x-charts` as a `peerDependency`
(2026-07-30, in-chat). Cleared to proceed.

**Target version:** current `package.json` `version` is `2.14.0` (NOTIF-12 already published) →
next free additive minor is **`2.15.0`**, matching the Envelope's target. Confirm still free against
the npm registry immediately before publish.

### Named files to change

- `src/components/charts/ChartFrame.jsx` — new. Frame component (Paper/title/toolbar/state
  precedence/export/a11y).
- `src/components/charts/BarChart.jsx` — new. Preset over `@mui/x-charts` `BarChart`.
- `src/components/charts/LineChart.jsx` — new. Preset over `@mui/x-charts` `LineChart`.
- `src/components/charts/palette.js` — new. Neutral theme-aware categorical + sequential palette,
  resolved from the active MUI theme (light/dark), NOT hardcoded hex in consumer-visible API.
- `src/components/charts/formatters.js` — new. Locale-aware number formatters (percentage, compact,
  ratio) built on `Intl.NumberFormat`, driven off `i18next.language`.
- `src/components/charts/exportChart.js` — new. Generic SVG/PNG export util operating on a container
  `ref`, mirroring hram's `XMLSerializer` → `Blob` → (PNG: `canvas` 2x-scale) → anchor-download
  pattern (see hram `AllocationPerformancePanel.jsx` `handleExportSvg`/`handleExportPng`, no new
  dependency).
- `src/index.js` — add barrel exports for `ChartFrame`, `BarChart`, `LineChart`, palette/formatter
  helpers, additive only, alongside the existing "Components" export block (~lines 1-72).
- `src/i18n/chartsTranslations.ts` — new namespace, mirrors the existing
  `notificationsTranslations.ts` shape (`{ 'ChartFrame.KEY': { de, fr, en, sw } }`); register it
  wherever `notificationsTranslations`/`onboardingTranslations` are aggregated into the i18n bundle.
- `package.json` — add `"@mui/x-charts": "^8.0.0"` (or the loosest range compatible with hram's
  pinned `8.28.2`) to `peerDependencies`; bump `"version"` to `2.15.0` (confirm free at publish time
  per above); add `@mui/x-charts` to `devDependencies` too (peer deps aren't auto-installed, tests
  need it present).
- `tests/ChartFrame.test.jsx`, `tests/BarChart.test.jsx`, `tests/LineChart.test.jsx`,
  `tests/chartsPalette.test.js` (or similar) — new, in the existing `/tests/` root dir (not
  co-located), `@vitest-environment jsdom` pragma, Vitest + RTL per `tests/NotificationSettings.test.jsx`
  conventions.

### Architecture/contract slice

- **Component style:** plain `.jsx` (no TypeScript, no PropTypes — JSDoc only), MUI `sx` prop for
  styling, functional components with hooks. Mirror `src/components/ProfileComponent.jsx`.
- **i18n:** `useTranslation()` from `react-i18next`; keys namespaced `Category.KEY_NAME` (e.g.
  `ChartFrame.EXPORT_SVG_LABEL`, `ChartFrame.EMPTY_DEFAULT`). Translation objects are flat
  `{ key: { de, fr, en, sw } }` dictionaries per `src/i18n/notificationsTranslations.ts` — follow
  that exact shape for `chartsTranslations.ts`, all four locales required.
- **Barrel export:** `src/index.js` groups exports by category with comment headers (Auth Context,
  API/Services, Layouts, Pages, Components, Translations, Notifications, Onboarding) — add a
  `// Charts` section, export components + `chartsTranslations` alongside the others.
- **Theme:** no centralized theme file exists in ucm today (components rely on the MUI default
  theme via `sx` and `useTheme()`). The palette module must read `theme.palette.mode` via
  `useTheme()` to select light/dark variants — do not assume a specific app theme shape beyond
  standard MUI.
- **Peer deps:** current `peerDependencies` list (`@mui/material ^7.3.11`, `react ^19.2.6`, etc.) —
  add `@mui/x-charts` alongside, do not touch existing entries.
- **hram reference (adoption target, NOT touched in this WO):** `hram/frontend/src/components/
  OutputComponents/Results/ResultsTimelinePanel.jsx` and `ExpertTimelinePanel.jsx` show the
  Paper→Typography(h6)→toolbar(ToggleButtonGroup)→loading/error/empty(Alert)→chart→footer skeleton
  ChartFrame must replicate structurally; `AllocationPerformancePanel.jsx` (~lines 198-238) has the
  reference export functions; `hram/frontend/src/.../theme.js` `dataViz` palette (~lines 20-30) is
  the domain palette that stays app-side — the kit's neutral palette is a separate, generic
  categorical/sequential set, not a copy of `dataViz`.

### Key snippets (for the implementer to mirror, not copy verbatim)

hram's existing Paper/title/toolbar/state scaffolding (`ResultsTimelinePanel.jsx`/
`ExpertTimelinePanel.jsx`):
```jsx
<Paper variant="outlined" sx={{ p: 2 }}>
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <Typography variant="h6">{t("...")}</Typography>
    <ToggleButtonGroup exclusive size="small" ...>...</ToggleButtonGroup>
  </Box>
  {loading && <CircularProgress />}
  {error && <Alert severity="error">...</Alert>}
  {isEmpty && <Alert severity="info">...</Alert>}
  {!loading && !error && !isEmpty && children}
</Paper>
```
hram's export pattern (`AllocationPerformancePanel.jsx`): `XMLSerializer().serializeToString(svgRef.current)`
→ `Blob(['image/svg+xml'])` → anchor download for SVG; for PNG, load the SVG blob into an `Image`,
draw to a 2x-scaled `<canvas>` with a white background fill, then `canvas.toBlob()` → anchor download.
`exportChart.js` should generalize this to accept a container ref (find the first `<svg>` descendant)
so it works for both an MUI X-Charts body and a raw-`<svg>` body.

### Invariants / do-not-touch / pitfalls

- Additive exports only — do not modify or remove any existing `src/index.js` export line.
- `@mui/x-charts` is a **peerDependency**, never a direct `dependency` (hram supplies its own
  installed copy; ucm must not double-bundle it).
- No hardcoded hex/palette values in the public API surface — palette resolves from
  `useTheme().palette.mode`; tests must assert this (e.g. render under both a light and dark MUI
  theme, assert different resolved values).
- Container-sized/responsive by default — do not hardcode chart pixel width; offer `minHeight`/
  `aspect` as an opt-in fallback only.
- Every user-facing string in the kit goes through `t('ChartFrame....')` — no literal English
  strings in JSX.
- Do not touch hram, `dataViz`, or any hram i18n keys — this WO is ucm-only.
- State precedence is strict: `loading` beats `error` beats `isEmpty` beats `children` — write the
  test asserting this order, not just each state individually.
- No new heavy dependency for PNG export (e.g. no `html2canvas`/`dom-to-image`) — reuse the
  serialize+canvas approach; if a clean generic path is not achievable without a new dep, ship
  SVG-export only and explicitly note PNG deferred in the `RESULT:` — do not silently drop it.

### Progress contract

Codex must emit: one `PLAN: <step1> | <step2> | …` line up front; a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every file/edit/step and `… done` on
completion, spaced so no gap exceeds ~2 min; exactly one final `RESULT: DONE|BLOCKED <reason>`.
stdout unbuffered.

### Execution directive

Implement through `codex exec` in the background, invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers), with **both** `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument read from this
committed file (`"$(cat work-orders/CHART-1.md)"`). cwd = `ui-core-micha` repo root (this repo),
**never** the workspace root `…/webapps`. Fall back to direct Claude implementation only on Codex
quota/rate-limit/non-zero exit. Codex WRITES the required tests but MUST NOT RUN them and MUST NOT
run any review or `git add`/`commit`/`push` — leave the working tree uncommitted for the
Orchestrator's independent review, which runs after Codex finishes.

---

## Pastable mini-handover (for the fresh Orchestrator session)

> Orchestrator: implement `work-orders/CHART-1.md` in `ui-core-micha` (branch `main`). `git pull`
> first, read the WO, then follow the `orchestrate-codex` skill (Codex-first, fill Part B, run your
> own independent review + scoped tests, commit on green). NOTE the blocking precondition: adding
> `@mui/x-charts` as a `peerDependency` is a dependency change needing explicit operator approval
> before it is added.
