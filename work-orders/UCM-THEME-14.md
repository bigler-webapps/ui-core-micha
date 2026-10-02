# UCM-THEME-14: Dark mode in `createAppTheme`, from the central token file

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

`createAppTheme({ palette: { mode: 'dark', primary }, ... })` builds a complete dark theme whose
mode-dependent values come from a dark baseline palette in `src/theme/tokens.js`, next to the light
one. `assertThemeComplete` judges a dark theme against its own surfaces. **The light output does not
change by a single value.**

Afterwards an app with a light/dark switch (today only `webshop-guenter`, `WSG-THEME-1`) can compose
both of its themes through the factory.

## Value source

**`docs/DARK-TOKENS.md`, frozen by the operator in `UCM-THEME-13` (2026-10-02, `7330f91`).** Every dark
value in code comes from that sheet. A value the implementation needs that the sheet does not carry is a
stop-and-report. Do not improvise it.

## Decided rules (operator, 2026-10-01 and 2026-10-02; amended into this order 2026-10-02)

1. **Complete baseline.** Every mode-dependent token class has its dark value from the sheet, including
   `ink.*`, `text.*`, `background.default/paper/subtle`, `divider`, `controlBorder.*`, all five status keys
   (`main/light/dark/contrastText` via `withMainShades`, plus `text/fill/fillText/bg`), `dataSeries` and
   `shadow.*`.
2. **Outlined first, as in light.** Resting surfaces keep `shadow.rest: none`. **Overlays get their own,
   lighter surface in dark**: the sheet's overlay surface (`#232A31`) is the paper of `MuiDialog`,
   `MuiMenu`, `MuiPopover` and `MuiDrawer` in dark, with the sheet's overlay shadow; the modal backdrop
   (`MuiBackdrop`) uses the sheet's scrim. Light has no such surface and does not change.
3. **Primary in dark: derived only when it fails.** An app always passes `palette.primary` (the factory
   requires it). In dark, that value is kept if it clears 4.5:1 on the dark page, and otherwise lightened in
   0.05 steps until it does. Its `contrastText` is whichever of `#FFFFFF` and the dark page colour
   contrasts more. This is how "derived unless the app sets its own" is expressed in an API where every
   app sets one: an app that wants a particular dark primary passes one that already clears the floor
   (webshop-guenter `#D49040`, 7.35:1, stays). Worked examples are in the sheet.
4. **Status safety net, the dark counterpart of `UCM-THEME-15`.** On a dark page other than the baseline
   page, a **baseline-supplied** status `main` (and `controlBorder.error`) that would fail against the page or
   its own `bg` is lightened until it passes. App-supplied values are never altered (`UCM-THEME-15` rule 3,
   read per key off `appConfig.palette`). Never throws; capped like the darkening.
5. **Data series follow a rule, not only a list.** In dark, each light series colour is lightened until it
   clears 3:1 on the theme's own `background.paper`. On the baseline paper that yields exactly the sheet's
   list; on an app's own paper (webshop-guenter `#171209`) it adapts.
6. **Contrast surfaces are the theme's own.** In dark, every derivation and `contrastFindings` judge against
   the theme's page and paper, never a fixed `#FFFFFF`. Light keeps today's pair.
7. **Autofill needs no new code path.** The palette-aware block (`src/theme/createAppTheme.js:97-108`)
   already resolves from `background.paper` and `ink.primary` and wins over the static light block in
   `tokens.js`. It is correct in dark once the dark palette is in place; confirm it in a test.

## Context the operator established

- `createAppTheme` (`src/theme/createAppTheme.js`) resolves the palette in three layers: the app's
  palette, then `BASELINE_PALETTE`, then the app's palette again. It then derives
  `controlBorder.focus`, builds the palette-aware component slots, and merges `BASELINE_STATIC`, those
  components and the app config. `palette.mode` is not read anywhere today.
- **Two places assume a white page:**
  - `deriveFocusColour` checks 3:1 against `'#FFFFFF'` and `background.default`, and only ever
    **darkens** the primary. On a dark page it would have to lighten.
  - `contrastFindings` in `src/theme/themeCompleteness.js` checks against a fixed
    `white: '#FFFFFF'` (line 298) plus `page: background.default`.
- `BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS` includes `palette.background.paper` with the reason "The
  canonical surface is deliberately MUI white". That reason is false for a dark theme.
- The palette-aware slots use palette values (for example the autofill inset uses `background.paper`),
  so they follow the resolved palette once it is right. `tokens.js` also carries a static light `autofill`
  block (`#FFFFFF`, `#212529`); it is shadowed by the palette-aware one (measured 2026-10-02).
- `UCM-THEME-15` (3.8.0) added `deriveDarkenedPageColour`/`deriveAlphaPageColour` next to
  `deriveFocusColour`; the dark branch extends those, it does not add a parallel set.
- The kit has components registered against the baseline (`src/theme/kitSxRegistry.js`, `THEME-4`/
  `THEME-5`). A kit component that hard-codes a light value would show that value only in dark mode.

## Scope + non-goals

In scope:
1. `tokens.js`: a dark baseline palette with the sheet's values, and whatever exemption entries a
   dark theme needs, each with a true reason.
2. `createAppTheme`: select the baseline palette by `palette.mode`. Make the focus derivation work in
   both directions against the mode's surfaces. Rules 2 to 6 above: the overlay surface, scrim and overlay
   shadow on the four overlay components in dark; the primary derivation; the status safety net; the
   series rule.
3. `themeCompleteness.js`: contrast checks against the theme's own surfaces, not a fixed white. Mode-
   specific exemptions.
4. Kit components that resolve a hard-coded light value instead of a token: **list** every one.
   Switching one to an existing token is in scope. Anything that needs a new token is a finding.
5. `DESIGN.md` (a dark-mode section), `CHANGELOG.md`, and a **minor** version bump. The change is
   additive: light output is unchanged, and dark is new.

Non-goals:
- No change to any light value or light behaviour.
- No automatic `prefers-color-scheme` switching and no toggle component.
- No consumer adoption. `WSG-THEME-1` does that in its own repo, after its own pin bump.
- No change to chart components beyond reading palette tokens they already read.

## Tier · precondition / gate

- **Tier 3 · tests: light-output regression guard, dark completeness, focus contrast in both modes,
  and the kit's existing theme tests.** A change inside shared-core (`AGENTS.md` -> Tiering).
- Precondition: **`UCM-THEME-13` frozen**, and **`UCM-THEME-15` landed**. 15 generalises the focus
  derivation into page-derived status and border colours on the same surface pair; build the dark
  branch on top of it, not beside it.
- Downstream: `webshop-guenter`/`WSG-THEME-1` waits for this release and for its own pin bump.

## Risks

- **Ten adopted apps consume the light path.** A light regression reaches all of them on their next
  bump. That is why the regression guard is a required test, not a nice-to-have.
- **The three-layer palette merge interacts with augmentation** (the comment at the top of `tokens.js`:
  only the first `createTheme` argument is augmented). A dark status entry missing
  `main`/`contrastText` would silently keep MUI's light hue.
- **Contrast in the other direction.** Light status tints (`bg`) over a dark page, and a focus colour
  derived by darkening, both fail on dark.
- **The `background.paper` exemption reason is currently mode-blind.** Leaving it would record a false
  statement as the reason in every dark theme.
- **Rule 3 cannot keep a dark primary that fails the floor.** An app that deliberately wants one gets it
  lightened. That is intended (an accessibility floor), not a defect.
- **Two sheet values sit close to their threshold** (`controlBorder.main` 3.14:1 on paper, series slot 1
  3.07:1). Build them from the rules, not as literals, so a later paper change re-derives instead of
  silently failing.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

Kit test suite, narrow, next to the existing theme tests:

1. **Light regression guard.** For a fixed light app config, the fully resolved theme (palette,
   typography, shape, components, exemptions) equals the output from before this change. Show that the
   test fails when one light value is altered by hand. A structural test that cannot fail is
   decoration.
2. **Dark completeness.** `assertThemeComplete(createAppTheme({ palette: { mode: 'dark', primary } }))`
   has zero findings, or only exemptions with a true reason. The same check with a primary that has to be
   **lightened** to clear contrast.
3. **Focus contrast.** `controlBorder.focus` clears 3:1 against both page surfaces in each mode.
4. **Status family on dark.** Each status key resolves `main/light/dark/contrastText` from the dark
   baseline, not MUI's defaults.
5. **Primary in dark (rule 3).** On the baseline dark page: `#468AB2` stays, `#2F4F96` resolves to
   `#6D84B6`, `#432CA1` to `#8576C2`, each with `#14181B` as `contrastText`; `#D49040` stays.
6. **Status net (rule 4).** On webshop-guenter's page `#0E0B08` no baseline status colour moves; on a
   page chosen so that one fails, that one is lightened and passes; an app-supplied status `main` that
   fails stays exactly as supplied.
7. **Overlay surface (rule 2).** In dark, the paper of `MuiDialog`, `MuiMenu`, `MuiPopover` and `MuiDrawer`
   resolves to the sheet's overlay surface and `MuiBackdrop` to its scrim; the light theme's values for
   the same slots are unchanged (covered by test 1).
8. **Series rule (rule 5).** On the baseline paper the dark series equal the sheet's list; on
   `#171209` every slot clears 3:1.
9. **Autofill (rule 7).** In dark, the resolved autofill inset is the dark paper and the text is
   `ink.primary`.

Run, do not write: the kit's existing theme and `kitSxRegistry` tests.

## Parity guardrail

No light-mode change of any kind. No behaviour, API or data-contract change beyond the new `mode`
branch.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

Work from this package; do not explore broadly from scratch; open only the named files to verify. If
you must dig deeper, delegate to a read-only Explore sub-agent.

## Target working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`). Never the workspace root.

## Context package

Value source for every dark value: `docs/DARK-TOKENS.md` (read it fully first). Do not invent a value;
one the sheet lacks is `RESULT: BLOCKED <value>`.

**`src/theme/tokens.js`**
- `BASELINE_PALETTE` (l.~52-123) is the light baseline. Add `BASELINE_PALETTE_DARK` next to it with the
  same shape, every key from the sheet: `ink`, `text`, `background`, `divider`, `controlBorder`
  (`main`/`hover`/`error`), the five status keys (use `withMainShades(main, '#14181B')` for
  success/warning/error/info, plus `text`/`fill`/`fillText`/`bg`; `stale` has no `main`, as in light),
  `dataSeries.categorical`. Do NOT hardcode series slots 1 and 5, `controlBorder.main/hover`, or the
  primary as literals: those are rule-derived (see below); the sheet's numbers are the expected OUTPUT.
  The dark `dataSeries` base is the light `SERIES_COLOURS`, lightened by the factory.
- Export a dark overlay surface (`#232A31`), a dark overlay shadow (`0 8px 28px rgba(0,0,0,.45)`) and the
  scrim (`rgba(0,0,0,.55)`) as named constants.
- `BASELINE_STATIC.shadow` (~l.200) carries `rest`/`overlay`; the dark theme needs the dark overlay value
  there. `BASELINE_STATIC.components` has static `MuiDialog.paper`/`MuiDrawer.paper`/`MuiMenu.paper`
  boxShadow `OVERLAY_SHADOW` (~l.340-355): in dark these are overridden, never edited for light.
- The static light `autofill` block (~l.147) is shadowed by the palette-aware one; leave it, confirm by test.
- `BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS` (end of file): the `palette.background.paper` entry says "MUI
  white". Provide the list by mode: in dark, drop that entry (the dark paper differs from MUI's default, so
  no exemption is needed), keep the others. The light list stays byte-identical.

**`src/theme/createAppTheme.js`**
- `createAppTheme` (l.~176): the three-layer `createTheme(app, BASELINE_PALETTE, app)` resolution. Read
  `appConfig.palette.mode`; `'dark'` selects `BASELINE_PALETTE_DARK` and passes `mode: 'dark'` through to the
  theme; anything else is the unchanged light path. Do not read `prefers-color-scheme`.
- `contrastSurfaces = ['#FFFFFF', background.default]` (l.~186): in dark this must be the theme's own
  `[background.default, background.paper]`; light stays exactly `['#FFFFFF', default]`.
- `deriveFocusColour`/`clearsContrast` (l.~48-60) only darken and use MUI `getContrastRatio`. In dark add a
  lightening counterpart (lighten in 0.05 steps, same 0.9 cap) alongside, not a rewrite. Same for
  `deriveDarkenedPageColour`: add a lightened sibling next to it. For dark `controlBorder.main/hover`:
  `rgba(230, 235, 239, a)` from `ink.primary`, `a` = the smallest alpha (0.01 steps) that clears 3:1 on
  page and paper, hover = main + 0.15; the sheet's 0.38 / 0.53 are the expected result.
- Rule 3 (primary), rule 4 (status net: baseline-supplied status `main` and `controlBorder.error`, judged
  against page AND its own `bg`, lightened; per-key check off `appConfig.palette` exactly as the existing
  light loops do), rule 5 (series: each baseline light series colour lightened in 0.05 steps until it clears
  3:1 on the theme's own `background.paper`; app-supplied series untouched, the final merge argument already
  lets them win), rule 6 (own surfaces) are all computed here, dark branch only. Primary `contrastText` =
  whichever of `#FFFFFF` / `background.default` contrasts more. The app may pass `primary` as `{ main }`.
- `createPaletteAwareComponents(palette)` (l.~84): add dark-only overlay slots: `MuiDialog`, `MuiMenu`,
  `MuiPopover`, `MuiDrawer` `paper` -> background colour = overlay surface `#232A31`, `boxShadow` = dark
  overlay shadow; `MuiBackdrop.root` -> scrim. Keep the overlay surface a local constant unless a palette
  key is clearly cleaner and trips no completeness check. Emitted only when mode is dark, so the light
  component tree is untouched.
- Preserve the final merge order (BASELINE_STATIC, palette-aware components, `appConfig`, the dataSeries
  re-merge). The dark theme's `shadow.overlay` = the dark value.

**`src/theme/themeCompleteness.js`**
- `contrastFindings` (l.~268-345): `backgrounds = { white: '#FFFFFF', page: default }` (~l.298). In dark use
  the theme's own page and paper instead of a fixed white. Light keeps the exact same keys
  (`...-on-white`, `...-on-page`) and values; existing tests assert those surface names. For dark name them
  `...-on-paper` / `...-on-page`.
- `assertThemeComplete` (~l.620): `MUI_DEFAULT_THEME` is the light MUI default. Verify a dark theme neither
  produces a false "still MUI default" finding nor a false pass; fix only what is wrong.

**Kit components with hard-coded light values:** `src/components/QrSignupManager.jsx` has an inline CSS
block (l.~225-274: `#f5f7fb`, `#122033`, `#d9e2f2`, `#ffffff`, `#e8f0ff`, `#23408e`, `#f8faff`) and
`bgcolor: '#ffffff'` at l.361. **The l.361 white is a QR quiet zone and stays.** List every hard-coded
light colour under `src/` outside `src/theme/` and tests in your final report. Switching one to an existing
palette token is in scope (check its consumers and `tests/QrSignupManager.registrationContext.test.jsx`
first); a spot that would need a new token is reported, not built. `src/auth/UserMenu.jsx:44` and
`src/components/charts/chartLabels.js` only mention colours in comments.

**Docs / release:** `DESIGN.md` gets a concise dark-mode section (how to opt in, primary rule, status net,
overlay surface, series rule, what an app owns in dark). `CHANGELOG.md` entry. `package.json` version
`3.10.0` -> `3.11.0` (and `package-lock.json` where the version appears for this package).

**Existing tests to follow** (style, imports): `tests/createAppTheme.test.js`,
`tests/createAppThemePageContrast.test.js` (imports `assertThemeComplete`, `createAppTheme` from
`../src/theme`), `tests/themeCompleteness.test.js`. New dark tests go in `tests/createAppThemeDark.test.js`,
the light guard in `tests/createAppThemeLightGuard.test.js`.

**Light regression guard (required test 1):** BEFORE editing any source, capture the output of
`createAppTheme({ palette: { primary: { main: '#0F62FE' } } })` and of one overriding app config (fontFamily,
a custom page background, an app-supplied status main) as a JSON fixture
(`tests/fixtures/light-theme-baseline.json`, stable serialization, functions as strings), from the
unmodified code, and assert equality afterwards. Prove it can fail: one test mutates a light value in a
clone of the snapshot and asserts the comparison reports a difference.

**Invariants / pitfalls**
- Light output byte-identical: no key-order change that alters serialization, no new keys on the light theme.
- Only the first `createTheme` argument is augmented (comment at the top of `tokens.js`): every status
  entry needs explicit `main/light/dark/contrastText`.
- MUI `getContrastRatio` vs the kit's alpha-aware `calculateContrastRatio`: use the kit's for anything with
  alpha, as THEME-15 did.
- Build `controlBorder.main/hover`, the series and the primary from the rules, not literals; the tests
  assert the rules reproduce the sheet's values.
- Do not touch auth, CI, dependencies, `WORK_ORDERS.md`, or `docs/DARK-TOKENS.md` (read-only here).

## Required tests, restated

The nine tests of Part A, in the new files named above. Run only the tests you wrote.

## Preamble

The text above is the COMPLETE spec: the committed WO file's content, not a plan to refine; there is no
separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app
`MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the
spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md`: the register row and the review
verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running
the tests you wrote, nothing else.** Do NOT install dependencies, touch a lockfile (the version line in
`package-lock.json` is the one exception, a plain text edit), run a package manager, or tidy up stray
files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead
of fixing it. Do NOT `git add`/`commit`/`push`: leave every change uncommitted in the working tree for the
orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the
tests you just wrote** to confirm they execute and pass: that is the ONLY test run you do (NOT the
affected/full suite, NOT any review). Run them with `npx vitest run <your test files>`. The orchestrator
re-runs the authoritative set and does the independent review after you finish; those are the gate.

Narrate continuously: a `PLAN: <step1> | <step2> | ...` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `... done` on
completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
`RESULT: DONE|BLOCKED <reason>`. Your final report must also list every hard-coded light colour found under
`src/` outside the theme folder.

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

### Execution directive

Check `.claude/codex-status.md` first (newest-first; read it with `head`). No line for today means use
Codex.

### Review routing

Tier 3: independent `reviewer` (all configured lenses) and `ui_reviewer`, concurrent, one batch,
before the commit. No `sec_reviewer`.

### Verification

Render a kit demo surface in both modes at 375 px and 1280 px (`dev/`), and name the screenshots in
the register Notiz. No prototype is in scope.

### Register + commit + release

Row -> `done` with the review Notiz in the `AGENTS.md` shape. The publish runs on push to `main` when
`package.json`/`src/**` change (`.github/workflows/publish.yml`). Then add a planned row in
`webshop-guenter/WORK_ORDERS.md` for the pin bump to this version, and unblock `WSG-THEME-1`.

### Mini-handover

`Orchestrator: implement work-orders/UCM-THEME-14.md in ui-core-micha (main). git pull first, confirm
UCM-THEME-13 is frozen, read the WO, then follow orchestrate-codex.`
