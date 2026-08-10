# THEME-1 — Shared MUI theme baseline: `createAppTheme` factory + completeness assertion

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 2 (shared core — `ui-core-micha` is named in AGENTS.md's Tier-2 forcing list)
**Review:** independent `reviewer` (Sonnet, full) **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Value source (accepted spec):** [`work-orders/assets/THEME-1-baseline-reference-sheet.html`](assets/THEME-1-baseline-reference-sheet.html) — its **canonical token table** carries every decided value
**Decision record:** `webapp-management/DESIGN_SYSTEM_PROGRAM.md`, decisions 1–23 (DS-2)
**Version target:** `2.30.0` (currently 2.29.2)

---

## A. Envelope

### Goal

Ship `createAppTheme()` from `ui-core-micha`: a shared MUI theme baseline that closes **every**
visual default surface, an exported **completeness assertion** each app calls from its own test
suite, and the reference sheet as a **living harness page**.

Expected outcome: a consuming app's `theme.js` shrinks to the two things that are genuinely its
own — its palette and its font — and everything else comes from the baseline instead of from
MUI's defaults.

```js
// what an adopting app's theme.js becomes
import { createAppTheme } from '@micha.bigler/ui-core-micha'
export default createAppTheme({
  palette: { primary: { main: '#0F62FE' } },
  typography: { fontFamily: "'DM Sans', sans-serif" },
})
```

### Why

MUI's `createTheme` has no "unset" state: whatever an app does not specify, MUI fills with its
own default, and those defaults are Material Design 2014 — 16px body, 20px `h6`, elevation
shadows, 4px radius, uppercase buttons. Every unspecified property therefore pulls the design
backwards, systematically rather than randomly.

The second-order effect is the one that matters: the estate's standing rule *"derive from the
theme, don't hardcode"* is correct **only when the token was set deliberately**. hram's `SoftChip`
derives from `theme.palette` and looks right; fitness-monitor followed the identical rule and got
MUI's untouched `#2e7d32`. The rule does not need abolishing — its precondition needs
establishing. That is this WO.

### Measured evidence (2026-08-08/09, five verification passes)

- **All apps run MUI `7.3.11`** — the default baseline being overridden is identical everywhere.
- **Not one app sets a typography `fontSize`.** All set weights and letter-spacing only;
  `subtitle1`, `subtitle2`, `caption` and `overline` are untouched in every app surveyed. The
  whole type scale is MUI's.
- **No app overrides `shadows`, `spacing` or `transitions`.** Only spesix sets
  `shape.borderRadius`.
- **`MuiButton` is overridden in 7 of 7 app themes, `MuiTableCell` in 6 of 7** — with identical
  values (`textTransform: 'none'`, `borderRadius: 3`, `padding: '3px 8px'`, no contained
  elevation). A house style enforced by copy-paste across independent files.
- **The leak surface is measurable.** Heavily rendered components with *no* override anywhere in
  the estate: `Box` (494 files), `Typography` (449), `Stack` (236), `CircularProgress` (151),
  `IconButton` (101), `Divider` (93), `FormControlLabel` (74), `Checkbox` (72), `Tooltip` (56),
  `Select` (54), `Container` (49).
- **14 consumers, all pinning exact versions**, 7 still on 2.4.5, spread up to 2.29.2. All 14
  already have a runnable `vitest` script, so the exported assertion runs everywhere with zero
  consumer-side setup.

### Scope

#### A. The factory

- `createAppTheme(appConfig)` returning `createTheme(BASELINE, appConfig)` — MUI's own
  multi-argument deep merge does the combining; **no custom merge logic**.
- **Palette-first ordering invariant (decision 20).** The factory merges the **palette first**
  (baseline + app input) and computes component values from the *final* palette afterwards.
  Without that order, pre-computed values are silently wrong for every app that overrides
  `primary` or `success` — which is the entire purpose of the factory. This is the most breakable
  thing in the WO.
- **Throws without `palette.primary` (decision 21)**, with a message naming what is missing. The
  baseline defines no accent; an app without a deliberately chosen one is an error, not a default.
  Same contract the chart wrappers already use for required axis labels.
- **Objects only in overridable `styleOverrides` slots (decision 20)** — never functions. MUI's
  deep merge treats functions as leaf values, so a function in the baseline would be silently
  displaced by any app that touches the same slot.
- **Throws on a function in the app's `styleOverrides` (decision 20)**, naming the slot and
  pointing at the object/`variants` idiom. The trap has two directions and this closes the second.
  Verified 2026-08-10: **zero** function overrides across all seven app themes *and* survey_app's
  runtime builder, so this costs nothing today. MUI 7's `variants` syntax expresses
  prop-/state-dependent styles as data objects — jg-ferien already uses it (`theme.js:120`, `:168`).
- **Runtime-callable.** survey_app builds a theme **per site at runtime**
  (`survey_app/frontend/src/site-runtime/buildThemeFromSiteConfig.js`). The factory must accept
  arbitrary palette input at call time, not only as a module-level constant, and two calls with
  different palettes in one process must yield two independent themes.
- **Mode-capable API, light tokens only in v1 (decision 17).** Dark mode is DS-12 and is not built
  here; the API must not have to change when it arrives.

#### B. The baseline token surfaces — this list *is* the definition of "complete"

Values come from the reference sheet's canonical token table. This Envelope fixes the
**surfaces**; the sheet fixes the **numbers**. Where the two disagree, the sheet is the one to fix.

| Group | Surfaces the baseline must set |
|---|---|
| Palette — status | `success` · `warning` · `error`/critical · `info`, each as a **text tone** *and* a **fill tone with its own `contrastText`** |
| Palette — ink | three opaque tiers: primary, secondary, muted |
| Palette — surfaces | `background.default` (page) · `background.paper` |
| Palette — borders | `divider` (decorative, 1.4.11-exempt) **and** `controlBorder` with rest / hover / focus / error |
| Palette — required from the app | `primary` (throws if absent) |
| Augmented namespaces | `stale` freshness semantic · **two-tier radius** (control + card) · **data-series ramp** |
| Typography | `fontFamily` plus, for h1–h6, subtitle1/2, body1/2, button, caption, overline: `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` |
| Shape / spacing / breakpoints | `shape.borderRadius` · `spacing` unit · `breakpoints` |
| Shadows | rest = **none** (`MuiPaper` `elevation: 0`, `variant: 'outlined'` as default); weight only on Dialog / Drawer / Menu / Tooltip |
| Transitions | four durations (`fast` / `base` / `overlay` in+out / `chart`), the easing assignment (enter `easeOut`, exit `easeIn`, state `easeInOut`), and the reduced-motion collapse to **`0.01ms`, not `0`** |
| Components | `MuiButton` · `MuiTableCell` (the 7/7 and 6/7 consensus) plus the measured leak surface: `MuiIconButton` · `MuiDivider` · `MuiTooltip` · `MuiSelect` · `MuiCheckbox` · `MuiFormControlLabel` · `MuiContainer` · `MuiPaper` · `MuiCard` · `MuiChip` · `MuiTextField`/`MuiOutlinedInput` · `MuiDialog` · `MuiAlert` |
| Autofill | `:-webkit-autofill` **and** the standard `:autofill` — MUI styles neither, and the same field rendered yellow in Chromium, dark grey in Opera and dark blue in Firefox |
| Font loading | DM Sans 400/500/600, self-hosted via `@fontsource` — never a CDN |
| Touch | 44px is an **internal principle**, not WCAG AA (that floor is 24×24, 2.5.8; 44 is 2.5.5 AAA). Visual size may stay smaller; the **hit area** must reach 44px, gated by `@media (any-pointer: coarse)` — `any-pointer`, so hybrid devices are covered |

The enumerated list is **versioned in ucm** and is what the assertion checks. Adding a surface
later is a deliberate, reviewed change to that list.

#### C. The completeness assertion

- An **exported check** each app calls from its own `vitest` suite — the pattern this estate
  already uses for S112 (`assert_all_consumers_secure`). Fails in CI, blocks nothing locally.
- **The exemption arm is required (decision 5).** An app that deliberately wants a value equal to
  MUI's default declares it **with a reason**. Without the arm the check is gamed by
  pseudo-deviations (radius 4 → 5) and measures nothing. An exemption *without* a reason is itself
  a finding.
- **Contrast is an assertion surface.** Each status **text** tone against **its own tint** — not
  against white. Checking the wrong surface is exactly what hid a real AA failure during review:
  warning measured 4.10:1 on `#FBF0DC` while passing 4.63 on white. `controlBorder` against both
  white and the page background.
- **Adoption is reported as a number, never gated** — inline-hex count, theme-bypass paths.
  "Complete" is definable; "adopted" is not, so it is measured and printed, not enforced.
- **Hardness is a ratchet, not a retrofit.** The completeness check is a **hard failure only for
  an app whose adoption WO has landed**; for every other app it reports numbers. No consumer goes
  red because its maintainer has not had capacity yet.
- **Baseline invariant test (decision 20):** assert that no function appears anywhere in the
  baseline's `components` tree, so a later edit cannot reintroduce the trap.

#### D. Series-colour transition

`useNeutralChartPalette` today derives the categorical palette from
`theme.palette.{primary,secondary,info,success,warning}` — which means **`success` and `warning`
are used as series colours**, the thing `DESIGN.md` #2 explicitly forbids. The baseline's ramp
fixes an existing violation rather than creating one.

- The hook **reads the ramp from the theme when present** and **falls back to today's derivation**
  when it is not (decision 22). An adopter gets the ramp; a non-adopter sees **no change on a pin
  bump**. Without the fallback this would recolour every chart in the estate unasked.
- The public exports `getNeutralChartPalette` / `useNeutralChartPalette` stay — no break, minor
  version. Accepted cost: the name becomes historical, since the ramp is no longer a neutral
  derivation.

#### E. The reference sheet as a harness page

Decision 18: one page in ucm's existing dev harness rendering every surface — buttons, cards,
tables, chips, form controls, charts. It is how the baseline itself gets a **rendered acceptance**
instead of being a value list, and it is the object decision 11's theme-bump pass runs against.
The committed HTML artifact remains the frozen spec; the harness page is the living version.

#### F. Version

`2.30.0` — minor, because `createAppTheme` and the assertion are new public exports and nothing
is removed. DS-4 (chart prop defaults) follows separately as `2.31.0`; see Risks for why they are
not bundled.

### Non-goals / do not touch

- **Dark mode** — DS-12. The API stays mode-capable; no dark tokens ship here.
- **Chart prop defaults, the legend default, the fm→ucm hoists** — DS-4, `2.31.0`.
- **The section-navigation shell** — DS-11.
- **Migrating any consuming app.** Adoption is one WO per app. **innoservice stays untouched**
  by operator decision.
- **spesix's Google-Fonts CDN link** — DS-14 — and its parallel `DESIGN` token object, which is
  cross-file refactoring and its own WO.
- **hram's `dataViz` / `results` / `facilityTiers`** — the app-level data-colour layer stays
  exactly where it is, governed by hram's own `theme/COLOR-CONCEPT.md`.
- **The six hand-drawn hram plots** — DS-7/8/9.
- **Demonstrating motion.** The tokens are declared; timing cannot be judged from a static sheet,
  and the harness page is where it first becomes visible.
- **No behaviour, permission or data-contract change** anywhere in this WO.

### Replaces / removes

1. **`useNeutralChartPalette`'s status-derived palette as the effective series source for
   adopters.** The `DESIGN.md` #2 violation (status hues used as series colours) goes away for any
   app that adopts. The exports and the non-adopter behaviour stay — see scope D.
2. **`ui-core-micha/DESIGN.md` #1 must be rewritten as part of this WO.** It currently states that
   every app owns its own tokens and that ucm deliberately ships no theme. This WO contradicts
   that, and the operator accepted the policy change (decision 1). It must be rewritten, **not
   silently contradicted** — a stale principle next to a shipped factory is exactly the kind of
   contradiction this programme exists to remove.
3. **`DESIGN.md` #2's "the concrete data palette is per-app"** becomes "the data palette is a
   separate layer **with a shared default** that apps override". The separation stays; it becomes
   structural instead of conventional.

### Deliberately keeps

- **Per-app `palette.primary` and `fontFamily` as overrides.** App identity is a legitimate reason
  to deviate, and the baseline says so.
- **hram's `dataViz`/`results`/`facilityTiers` modules**, unchanged and in place.
- **The public exports** `getNeutralChartPalette` and `useNeutralChartPalette`.
- **`ChartFrame`'s `p: 2` padding and its foot row** — 16 panels depend on them byte-for-byte.
- **jg-ferien's `variants:` usage** — it is the sanctioned replacement idiom, not a deviation.
- **Every consumer's current rendering until it chooses to bump.** All 14 pin exact versions.

### Token delta list

**Not applicable here, stated explicitly rather than omitted.** The delta list exists to resolve a
prototype's values against a *host app's* theme. `ui-core-micha` has no theme of its own, and the
reference sheet's canonical token table **is** the value source. Per-app deltas arise in the
adoption WOs, one per app, where an app's existing values meet the baseline.

### Risks

- **No staging net.** A push to `main` touching `src/**`, `package.json`, `pnpm-lock.yaml` or
  `tsconfig.build.json` publishes to npm immediately via `.github/workflows/publish.yml`. The
  independent review is the **only** gate and is not back-fillable.
- **The palette-first ordering is the single most breakable invariant.** Get it wrong and every app
  that overrides `primary` or `success` receives silently wrong component values — a failure of
  exactly the class this programme exists to eliminate, one level down. Test 4 is its guard and
  must be proven non-vacuous.
- **`shadows` is an array, not an object.** MUI's deep merge does not combine arrays
  element-wise the way it combines objects. The baseline must supply the full 25-entry array or
  deliberately accept MUI's — decide and state which, do not discover it.
- **14 consumers inherit the baseline on their next pin bump**, and a theme-touching bump is a
  **visual verification event** (decision 11), not a dependency line. The harness page is what
  that pass runs against.
- **DS-2 and DS-4 are deliberately not bundled** (decision 23). If a consumer sees something odd
  after a combined bump, it is unclear which of two independent surfaces caused it.
- **Host-merged translation bundles.** New ucm translation bundles are host-merged (the SHELL-1
  pattern, no inline defaults). The factory is expected to ship **no** user-facing strings; if it
  ships any — an assertion message is developer-facing and does not count — that bundle belongs on
  the bump checklist.

### Required tests to WRITE

Narrow per AGENTS.md → "Test scope". Written as part of implementation; **run only by the
Orchestrator**. ucm's existing `vitest` setup has 51 spec files, and
`tests/chartsPalette.test.js` already synthesises light/dark themes, so there is a precedent to
extend rather than scaffold.

**`tests/createAppTheme.test.js`** (new)

1. A minimal call (`palette.primary` only) returns a theme in which every enumerated surface is
   non-default — the positive case of the assertion.
2. Throws without `palette.primary`, with a message naming what is missing.
3. Throws on a function in `components.*.styleOverrides`, with a message naming the slot.
4. **Palette-first ordering:** an app overriding `palette.success` receives component values
   computed from **its** success, not the baseline's. **Prove non-vacuity** by reversing the
   computation order and confirming this test fails.
5. Deep merge: an app's object override merges property-wise with the baseline object, and
   baseline properties the app did not mention survive.
6. Two calls with different palettes in one process return two independent themes — survey_app's
   per-site runtime case.
7. No function appears anywhere in the baseline's `components` tree (the baseline invariant).

**`tests/themeCompleteness.test.js`** (new)

8. The exported assertion returns findings for a theme built with a bare `createTheme()` and none
   for one built with `createAppTheme`.
9. An exemption **with** a reason suppresses exactly that surface and no other.
10. An exemption **without** a reason is itself a finding.
11. Contrast: every status **text** tone clears 4.5:1 against **its own tint**, and
    `controlBorder` clears 3:1 against both white and the page background.

**`tests/chartsPalette.test.js`** (extend the existing file)

12. `useNeutralChartPalette` returns the theme's ramp when the theme carries one.
13. It falls back to today's derivation when the theme carries no ramp — **a non-adopter sees no
    change**. **Prove non-vacuity** by removing the fallback and confirming this test fails.

Plus `tsc -p tsconfig.build.json --noEmit` clean, per the SHELL-1 precedent.

**No full-suite run.** The affected-areas set is the three files above; the promotion gate is not
in play because this repo has no `develop`.

### Verification

- The **harness page** renders every surface — the baseline's rendered acceptance.
- The Orchestrator runs the **two-width rendered side-by-side** against the committed reference
  sheet before commit; it is a hard gate per DS-1, and the two screenshots are named in the
  register Notiz. Evidence-based, not independence-based, so it holds even though the Orchestrator
  may be the author in a Codex fallback.
- The assertion runs green in ucm's own suite.
- **Known limitation to state at `done`:** motion is declared but not demonstrated.

### Preconditions

- **DS-1 landed** — `webapps@8bd4553` (AGENTS.md, CLAUDE.md, `ui_reviewer`, `frontend-design`,
  `preview-running-app`, `.codex/frontend-engineering`) and `ui-core-micha@e7cb320` (`DESIGN.md`
  #10).
- **Reference sheet accepted by the operator, 2026-08-10.**
- No dependency on DS-4 or DS-11. DS-4 follows as `2.31.0`.

### Parity guardrail

The reference sheet is the visual spec. **No behaviour, no permission, no data-contract change.**
The hard condition specific to this WO: **ucm's existing components must render identically for a
consumer that has not adopted the factory.** Test 13 is that guard for charts; the exact-version
pins are the guard everywhere else.

### Decisions binding this WO

`webapp-management/DESIGN_SYSTEM_PROGRAM.md`: **1** (factory + assertion, policy change accepted) ·
**5** (assertion via each app's own suite) · **11** (theme bump is a visual verification event) ·
**17** (mode-capable, light-only v1) · **18** (reference sheet is a deliverable) · **20**
(objects-only, palette-first, function throw, invariant test) · **21** (throws without palette) ·
**22** (series-colour transition with fallback) · **23** (`2.30.0`, DS-2 before DS-4). Plus the
operator decisions of 2026-08-09 on the assertion ratchet, same-file wart cleanup, and innoservice
staying untouched.

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
> `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file.
> (Fallback to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.)

### Context package

**Repo layout relevant here:** `ui-core-micha` is a flat package — no `frontend/` subdir. `src/`
ships to npm (`tsconfig.build.json` → `include: ["src"]`, `rootDir: "./src"`); `dev/` is the vite
dev harness (not shipped); `tests/` is vitest, not shipped. Current version `2.29.2` in
`package.json:3`.

**Value source — read this file's canonical token table before writing any token:**
`work-orders/assets/THEME-1-baseline-reference-sheet.html`, section `#canonical-baseline-tokens`
(~line 1166–1285). Every numeric value below is transcribed from there; if this map and that table
ever disagree, the table wins (per the Envelope). Key transcribed values, so you don't have to
re-derive them:

- **Typography** (fontSize/fontWeight/lineHeight; letterSpacing only where the sheet sets one —
  everywhere else use `0` explicitly, don't leave it unset, since MUI's own defaults are non-zero
  and unset would silently inherit them):
  `h1` 32px/600/1.2 · `h2` 28px/600/1.22 · `h3` 24px/600/1.25 · `h4` 20px/600/1.3 ·
  `h5` 18px/600/1.3 · `h6` 16px/600/1.35 · `subtitle1` 15px/600/1.4 · `subtitle2` 13px/500/1.4 ·
  `body1` 14px/400/1.55 · `body2` 13px/400/1.55 · `button` 14px/500, `textTransform:'none'`,
  `letterSpacing:0` · `caption` 12px/400/1.4 · `overline` 11px/600, `textTransform:'uppercase'`,
  `letterSpacing:'0.4px'`.
  `fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"` — this is the
  baseline's OWN fontFamily default (an app's `typography.fontFamily` override replaces it, per the
  factory example in the Envelope Goal).
- **Palette — ink:** `primary #212529` · `secondary #5B6670` · `muted #6A7178` (4.6:1 target, not
  the app's own colours — these are baseline-owned, not overridable-by-convention).
- **Palette — surfaces:** `background.default #FAFAFA` (MUI `grey[50]`) · `background.paper #FFFFFF`.
- **Palette — borders:** `divider: 'rgba(33,37,41,.10)'` (decorative, exempt from 1.4.11).
  `controlBorder` is NOT a MUI palette key — it is an **augmented namespace** (`palette.controlBorder`)
  with `{ main: 'rgba(33,37,41,.50)', hover: 'rgba(33,37,41,.65)', error: '#BF3227' }` plus **`focus`
  computed from the final `primary.main`**, darkened via MUI's `darken()`/`getContrastRatio()` until
  it clears 3:1 against `background.paper` — this is the one baseline value that is a *function of
  app input*, so it must be computed inside `createAppTheme` after the palette merge (see the
  palette-first ordering invariant below), not stored as a static token.
- **Status tokens** (each is `{ text, fill, fillText, bg }`, all under an augmented
  `palette.<status>` — `success`/`warning`/`error`/`info` reuse MUI's palette slots for `main`/
  `contrastText` but the baseline ALSO needs the four-part shape the sheet defines; decide whether
  `text`/`fill`/`bg` live as extra keys on the same palette entries (`palette.success.text` etc.) or
  a parallel `palette.status.success.*` — the sheet's token names (`success.text`, `success.fill`,
  `success.fillText`, `success.bg`) suggest keying directly on `palette.success.*` so
  `theme.palette.success.text` / `.fill` / `.fillText` / `.bg` all resolve, alongside MUI's own
  `.main`/`.light`/`.dark`/`.contrastText` which stay untouched for compatibility):
  - success: text `#35794A` · fill `#1B8038` / fillText `#FFFFFF` · bg `#E5F4E9`
  - warning: text `#976100` · fill `#C08A2C` / fillText `#212529` · bg `#FBF0DC`
  - critical (maps to MUI's `error` palette key): text `#BF3227` · fill `#BF3227` / fillText
    `#FFFFFF` · bg `#FBEAE8`
  - info: not itemized with new values in the table — MUI's own `info` stays as-is per the "no new
    hue" pattern used for `stale`; only add `text`/`fill`/`fillText`/`bg` shape for consistency if
    cheap, otherwise state the omission in the completeness assertion's exemption list with a reason.
  - `stale` (new augmented namespace, `palette.stale`, no MUI precedent): text/fill `#5B6B7D`,
    fillText `#FFFFFF`, bg `#EAEDF1`.
- **Radius:** `shape.borderRadius: 3` (MUI's own single knob covers `radius.control`) — but
  `radius.card: 8` is a SECOND radius MUI has no slot for, so it must be an augmented token
  (`theme.radius.card` or similar) consumed by the `MuiPaper`/`MuiCard`/`MuiDialog`
  `styleOverrides` rather than by `shape`.
- **Shadows:** `shadows` is the 25-entry MUI array — per the Risk section, either supply the full
  array or explicitly keep MUI's; the sheet's rule is **rest = none** (`elevation:0`,
  `variant:'outlined'` default on `MuiPaper`) and only Dialog/Drawer/Menu/Tooltip get
  `shadow.overlay = '0 8px 24px rgba(20,26,31,.16), 0 2px 8px rgba(20,26,31,.08)'` — the simplest
  correct reading is: don't touch the `shadows` array at all (keep MUI's default 25 entries, since
  nothing here reads `theme.shadows[n]` by index other than via the two named component overrides),
  and apply `shadow.overlay` directly as a literal boxShadow string in the four component
  `styleOverrides`, with `MuiPaper` defaulting to `elevation: 0`/`variant: 'outlined'`. State this
  choice explicitly in the PR/commit — the Risk section calls it out as something to decide, not
  discover.
- **Density:** `control.height: 40` (44 under `@media (any-pointer: coarse)`) ·
  `table.cellPadding: '10px 16px'` · `chip: { height: 32, radius: 16, fontSize: 13 }`.
- **Transitions:** `motion.fast 120ms` (hover/focus/border/colour) · `motion.base 180ms`
  (expand/collapse) · `motion.overlay` 220ms in / 180ms out (Dialog/Drawer/Menu/Tooltip) ·
  `motion.chart 300ms` (kept as MUI's `standard`) · easing: enter `easeOut`, exit `easeIn`, state
  `easeInOut` (MUI's own curve constants, only the assignment is new) · reduced-motion: ALL
  durations collapse to `'0.01ms'` (a string, not `0`) under `prefers-reduced-motion: reduce` —
  implement via `transitions.create`'s duration overrides is not enough since that's static; this
  needs either a CSS `@media` global override in a `MuiCssBaseline` styleOverride, or a documented
  runtime hook — read the sheet's motion section (`grep -n "prefers-reduced-motion"` in the HTML)
  for how it demonstrates this, and match that mechanism.
- **Spacing/breakpoints:** `spacing: 8` (MUI's default unit — confirm it's actually 8 today, i.e.
  this may be a no-op) · `container.gutter: 24px, 32px ≥1200px` via `MuiContainer` styleOverrides.
- **Components — the 7/7 and 6/7 consensus plus the measured leak surface** (exact values from the
  Density/Radius/Shadow tokens above, applied via `styleOverrides`, OBJECTS ONLY per decision 20 —
  never a function):
  `MuiButton` (height 40, radius 3, textTransform none, no contained elevation) ·
  `MuiTableCell` (padding `10px 16px`) · `MuiIconButton` · `MuiDivider` (uses `divider` token) ·
  `MuiTooltip` (overlay shadow, motion.overlay) · `MuiSelect` (height 40, controlBorder) ·
  `MuiCheckbox` (controlBorder box) · `MuiFormControlLabel` · `MuiContainer` (gutter) ·
  `MuiPaper` (elevation 0, outlined variant default, radius.card) · `MuiCard` (radius.card) ·
  `MuiChip` (height 32, radius 16, fontSize 13) ·
  `MuiTextField`/`MuiOutlinedInput` (controlBorder rest/hover/focus/error, height 40, autofill) ·
  `MuiDialog` (radius.card, overlay shadow) · `MuiAlert` (status bg/text tones).
- **Autofill:** target BOTH `&:-webkit-autofill` and the standard `&:autofill` inside
  `MuiOutlinedInput`/`MuiFilledInput`/`MuiInput` `styleOverrides.input`, using a `box-shadow` inset
  trick (`box-shadow: 0 0 0 100px <bg.surface> inset`) plus `-webkit-text-fill-color: <ink.primary>`
  — the standard estate pattern for suppressing browser-native autofill colouring; there is no app
  precedent to copy from since this is a measured gap (sheet's `control.autofill` row), so implement
  from the description in the table plus standard MUI/CSS practice.
- **Data-series ramp:** `series.1`…`series.6` =
  `['#3D5A99', '#3E80B8', '#2E8F8A', '#7A5FA8', '#9C4F86', '#8A7355']`. Marker/dasharray/pattern
  variants are DS-13, **opt-in and out of scope** — do not implement them, the ramp colours only.
  Expose this as e.g. `theme.chartPalette` or `theme.palette.dataSeries` (pick one, document it,
  and use the SAME key in the `useNeutralChartPalette` fallback wiring below).
- **Font loading:** `@fontsource/dm-sans` weights 400/500/600, self-hosted, never a CDN. All 14
  consumer apps already depend on `@fontsource/dm-sans` in their own `package.json` (verified
  2026-08-10) — so the safest approach is for `createAppTheme`'s module (or a sibling module it
  imports) to `import '@fontsource/dm-sans/400.css'` etc. as a side effect, AND for `ui-core-micha`
  to gain its OWN `dependencies` entry `"@fontsource/dm-sans": "^5.2.8"` (matching the version every
  consumer already pins) in `package.json` — this is a new dependency, but it is explicitly named in
  this WO's scope (Envelope § B, "Font loading" row), so it carries the WO's approval per AGENTS.md
  and does not need a separate approval round. A duplicate import in an app that also imports the
  font itself is harmless (same CSS, same `@font-face`, browser dedups by URL).
- **Touch target:** 44px hit area gated by `@media (any-pointer: coarse)` on `MuiButton`/
  `MuiIconButton`/`MuiSelect`/`MuiCheckbox` etc. — visual `control.height` stays 40, only the
  clickable/touch area grows under the coarse-pointer query (commonly via `minHeight`/padding, not
  a visual box-size change at 40px).

### Named files to create / change

**New:**
- `src/theme/createAppTheme.js` — the factory. `export function createAppTheme(appConfig = {})`.
  Steps inside: (1) throw if `!appConfig?.palette?.primary` with a message naming what's missing;
  (2) throw if any function is found in `appConfig.components.*.styleOverrides` (walk the object,
  name the offending slot in the message); (3) build a first-pass theme merging
  `BASELINE_PALETTE` with `appConfig.palette` ONLY (via `createTheme({ palette: {...} })` or a plain
  object merge — palette-first) to get the FINAL resolved palette (primary, success, etc. as the app
  set them); (4) compute palette-derived values from that final palette — `controlBorder.focus`
  (darken `primary.main` until ≥3:1), and anything else in the components tree that depends on
  `success`/`warning`/`error` colours; (5) call MUI's `createTheme(BASELINE_STATIC, appConfig,
  { palette: computed additions })` or equivalent multi-arg merge, being careful that the
  computed/palette-derived pieces are merged AFTER the palette but BEFORE/alongside `appConfig`'s
  own component overrides — re-read the palette-first invariant (Envelope § A) and design the merge
  order so Test 4 (reversing the order must fail) is provable. This is the single most important
  piece of code in the WO — do not guess at MUI's deep-merge semantics without checking `mui/material`
  `createTheme`'s documented multi-arg behavior (later args win, plain-object deep merge, arrays
  replace not concatenate).
  Import `@fontsource/dm-sans/400.css`, `/500.css`, `/600.css` here as side-effect imports.
- `src/theme/tokens.js` (or inline in `createAppTheme.js` if smaller) — `BASELINE_PALETTE` /
  `BASELINE_STATIC` constants holding the values transcribed above, one place, referenced by both
  the factory and (for baseline-invariant testing) the completeness assertion.
- `src/theme/themeCompleteness.js` — the exported assertion. Shape (design freely, but must satisfy
  Envelope § C and the required tests): a function like
  `assertThemeComplete(theme, { exemptions = [] } = {})` returning `{ findings: [...] }` (array of
  `{ surface, reason? }`), where a `findings.length === 0` result is "complete". Compares the given
  theme's enumerated surfaces (typography variants, palette tokens, component overrides, shadow
  rule, etc.) against MUI's OWN untouched `createTheme()` output for the same surfaces — a surface
  equal to the default is a finding UNLESS present in `exemptions` with a `reason` (no reason on an
  exemption is itself a finding — decision 5). Also export a **contrast-checking** helper (or reuse
  one if MUI/`polished`/similar is already a devDependency — check `package.json` first; if nothing
  suitable exists, implement WCAG relative-luminance contrast inline, it's ~15 lines) used both by
  the assertion (status text-vs-own-tint, `controlBorder` vs white/page) and by test 11.
  Also export an **adoption-reporting** helper (inline-hex count, theme-bypass paths) — Envelope
  says "reported as a number, never gated"; keep this simple (e.g. count of raw hex literals in a
  given source-string set, or just document the intended API surface if a full static-analysis pass
  is out of proportion for this WO — narrow test scope, don't over-build).
- `src/theme/index.js` — re-exports `createAppTheme`, `assertThemeComplete` (+ whatever helper
  names you settle on) for `src/index.js` to pull from.
- `tests/createAppTheme.test.js`, `tests/themeCompleteness.test.js` — per Required tests below.

**Change:**
- `src/index.js` — add exports for `createAppTheme` and the completeness assertion near the top
  (a new numbered section, e.g. "0. Theme", or alongside an existing section — match the file's
  existing numbered-comment convention).
- `src/components/charts/palette.js:7-19` (`getNeutralChartPalette`) — add the ramp-first branch:
  if `theme.palette?.dataSeries` (or whatever key `createAppTheme` settles on above — MUST match)
  is present and has both `categorical`-shaped data, return it (or derive `categorical` from it,
  `sequential` can keep deriving from ink/primary as today unless the sheet specifies a sequential
  ramp too — it doesn't, only categorical `series.1..6` is enumerated); ELSE fall back to the
  existing derivation unchanged (decision 22 — a non-adopter theme has no `dataSeries` key and must
  see byte-identical output to today).
- `tests/chartsPalette.test.js` — extend with tests 12–13 (ramp present → used; ramp absent →
  today's derivation, proven non-vacuous by temporarily removing the fallback branch and observing
  the test fail, then restoring it — this is a proof step during development, not something to leave
  removed).
- `package.json` — version `2.29.2` → `2.30.0`; add a `"dependencies"` block (currently absent —
  only `peerDependencies`/`devDependencies` exist) with `"@fontsource/dm-sans": "^5.2.8"`.
- `DESIGN.md:9` (principle 1) — rewrite to reflect the policy change (decision 1): ucm now ships a
  shared theme baseline via `createAppTheme`; apps still own their identity (`palette.primary`,
  `fontFamily`) as deliberate overrides, but the baseline (not each app from scratch) is the source
  of everything else. Don't delete the "match first, then elevate" sentiment — it still governs
  what an app's OWN overrides should look like — but the "every app owns its own tokens... ucm ships
  no theme" framing is now false and must go.
- `DESIGN.md:22` (principle 8, the "concrete data palette is per-app" clause) — reword per Envelope
  § "Replaces/removes" item 3: the data-colour layer is now "a separate layer **with a shared
  default** that apps override" rather than purely per-app.
- `dev/entries.jsx` — add a new harness entry rendering the baseline's surfaces (buttons, cards,
  tables, chips, form controls; a chart via the existing `BarChart`/`ChartFrame` to show the ramp).
  This is decision 18's "living harness page" — it does not need to reproduce the full 1352-line
  reference sheet, just render enough real MUI components under `createAppTheme` for the Orchestrator
  to do the two-width visual comparison against the reference sheet. Reasonable scope: one entry,
  e.g. `id: 'theme-baseline'`, composing `Button` (contained/outlined/text), a `Paper`/`Card` pair,
  a `TableCell`-based table, `Chip` (default + status colours), `TextField`/`Select`/`Checkbox`, an
  `Alert` per status (including `stale` if you added it to the palette), and the existing `BarChart`
  to show the series ramp.
- `dev/main.jsx:32` — the harness currently does `createTheme({ palette: { mode } })` directly;
  add a way to switch the harness's OWN theme to `createAppTheme({ palette: { primary: {...} } })`
  for the new entry (or just always use `createAppTheme` if it stays backward compatible with a
  bare mode toggle — check whether dark mode is requested elsewhere in the harness; the WO is
  light-only v1, so if switching the whole harness to `createAppTheme` breaks the dark-mode toggle
  for OTHER entries, keep the two paths separate instead of forcing one factory globally).

### Do-not-touch / invariants

- **No behaviour, permission, or data-contract change** anywhere (parity guardrail).
- **`ChartFrame`'s `p: 2` padding and its foot row** stay untouched — 16 panels depend on them.
- **`getNeutralChartPalette`/`useNeutralChartPalette` exports** stay, same signature, same names.
- **jg-ferien's `variants:` usage** is not in this repo — irrelevant here, just don't introduce a
  function anywhere in `BASELINE_STATIC.components.*.styleOverrides`.
- **innoservice, and every other consumer** — do not touch any other repo. All 14 consumers pin
  exact versions and are unaffected until they bump.
- Dark mode tokens: do not add any — the API must stay mode-capable (i.e. don't hard-code
  `mode: 'light'` inside the factory in a way that would need a breaking signature change later;
  simplest: don't set `palette.mode` at all in `BASELINE_PALETTE`, let `appConfig`/MUI's default
  handle it, and only ship light-token values).

### Pitfalls (verified against landed code 2026-08-10)

- `getNeutralChartPalette` is called in existing tests with a **plain object**, not a real MUI
  theme (`tests/chartsPalette.test.js:11-23`) — so the new ramp-lookup branch must not call any
  MUI-only API (e.g. `useTheme()`) inside `getNeutralChartPalette` itself; keep it a pure function
  of the `theme` object passed in, exactly as today.
- `src/index.js` has a duplicate `// --- 9. ... ---` comment (two "9"s, messaging and onboarding) —
  pre-existing, not yours to fix; just don't compound it, pick a header that doesn't collide.
- The dev harness (`dev/main.jsx`) is NOT part of the shipped package (`tsconfig.build.json` only
  includes `src`) — safe to add whatever's needed there without touching the npm build surface.
- MUI's `shadows` theme key is a 25-element ARRAY; passing a partial array in a `createTheme()` arg
  REPLACES the whole array (arrays don't deep-merge index-wise) — this is why the map above says
  "don't touch `shadows` at all" rather than trying to override two entries.

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Required tests to WRITE (Codex writes them; the Orchestrator runs them)

Exactly the 13 tests plus `tsc` check enumerated in Envelope § "Required tests to WRITE" above —
`tests/createAppTheme.test.js` (7 tests), `tests/themeCompleteness.test.js` (4 tests),
`tests/chartsPalette.test.js` extension (2 tests), plus `tsc -p tsconfig.build.json --noEmit`
clean. Do not add more, do not run the full suite.

### Preamble (append verbatim)

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so (the ONE new dependency, `@fontsource/dm-sans`, IS in scope — see "Font
> loading" above); do not update `MEMORY.md`. Do NOT `git add`/`commit`/`push` — leave every change
> uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the
> `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
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
`work-orders/THEME-1.md`. Follow `orchestrate-codex`.
