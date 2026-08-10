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

*To be filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*
