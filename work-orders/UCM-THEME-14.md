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

**`docs/DARK-TOKENS.md`, frozen by the operator in `UCM-THEME-13`.** Every dark value in code comes
from that sheet. A value the implementation needs that the sheet does not carry is a stop-and-report.
Do not improvise it.

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
  so they follow the resolved palette once it is right.
- The kit has components registered against the baseline (`src/theme/kitSxRegistry.js`, `THEME-4`/
  `THEME-5`). A kit component that hard-codes a light value would show that value only in dark mode.

## Scope + non-goals

In scope:
1. `tokens.js`: a dark baseline palette with the sheet's values, and whatever exemption entries a
   dark theme needs, each with a true reason.
2. `createAppTheme`: select the baseline palette by `palette.mode`. Make the focus derivation work in
   both directions against the mode's surfaces.
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

Run, do not write: the kit's existing theme and `kitSxRegistry` tests.

## Parity guardrail

No light-mode change of any kind. No behaviour, API or data-contract change beyond the new `mode`
branch.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". Do not
dispatch while this placeholder stands, and not before `UCM-THEME-13` is frozen.*

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
