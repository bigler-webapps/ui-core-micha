# SHELL-3 — Promote the mobile bottom navigation into the shared kit

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Version target:** `2.33.0` — minor: a new public component plus additive theme defaults
**Precondition of:** `cockpit/UI-3` and `jg-ferien/NAV-36`
**Visual spec:** `cockpit/work-orders/assets/UI-3-nav-redesign.html` (sections 3 and 4)

---

## A. Envelope

### Goal

Two apps need a mobile bottom navigation. jg-ferien has one
(`frontend/src/components/mobileShell/MobileBottomNav.jsx`, 107 lines) and cockpit is about to
need one. Promote it, so cockpit does not hand-build a second and jg's copy can be deleted.

The API is derived from **both** cases rather than from jg alone — that comparison is what
`DS-6` asked for, and it is documented in the prototype's section 4. Each recorded promotion
blocker in jg's version becomes a declarative field, and in each case cockpit is what proves the
field is genuinely optional rather than a jg quirk.

### Why this is a promotion and not a copy

jg's structure is sound; its **presentation layer is not overridable**. Every value is an `sx`
literal with no prop seam, app route literals drive the special visual treatment, and it depends
directly on a jg-specific messaging hook. A consumer could only fork it. This work order splits
that: **style defaults move into the theme baseline, structure and behaviour into the component,
app specifics into props.**

### Scope — two labelled parts, one release

#### Part 1 — the baseline gains bottom-navigation defaults

Add `MuiBottomNavigation` and `MuiBottomNavigationAction` to `src/theme/tokens.js`'s `components`
block, and register the corresponding surfaces in `src/theme/themeCompleteness.js`.

What the defaults must express, all from existing baseline tokens:

- the bar surface is `background.paper` with a top `divider` border and **no resting shadow**
  (baseline rule: resting surfaces are flat);
- action colour `text.secondary`, selected `primary.main`;
- label `12px` at weight `500` — this is the one value the prototype flagged as a delta, and it
  is resolved **here**, as a component default, not as a new typography token;
- `minWidth: 0` and `maxWidth: 'none'` on the action, so a five-item bar divides evenly at
  375&nbsp;px instead of hitting MUI's default `minWidth: 80`.

**Two hard constraints of this file, both already enforced by existing tests:**

- **Objects only.** No function may appear anywhere in the baseline `components` tree
  (`tests/createAppTheme.test.js` asserts this). MUI's multi-arg deep merge treats a function as
  a leaf in both directions, so a function default silently becomes unoverridable. jg's current
  `zIndex: (theme) => theme.zIndex.drawer + 2` therefore **cannot** move into the theme — it
  stays in the component (see part 2).
- **Palette-first ordering.** Palette resolution happens before palette-aware component objects
  are built, so any default that reads a palette value must follow that existing pattern in
  `createAppTheme.js` rather than being added to the static block.

#### Part 2 — the `MobileBottomNav` component

Exported from `src/index.js`. Keep the name — it matches what jg already calls it, which keeps
`NAV-36`'s migration a swap rather than a rename.

Props:

| Prop | Meaning |
|---|---|
| `destinations` | ordered array of `{ route, label, icon, shortLabel?, emphasis?, badgeCount? }` |
| `activeRoute` | the currently active route; the app derives it, the component does not guess |
| `onNavigate` | called with a destination's `route` |
| `hideAbove` | breakpoint above which the bar renders nothing. Default `'md'` |
| `zIndex` | default `theme.zIndex.drawer + 2`, overridable — SHELL-2 named the hardcoded-zIndex trap and this is the same class |

Field semantics, each with its evidence:

- **`label` is a finished string, not an i18n key.** jg translates inside the component today,
  cockpit outside. Finished strings are what `SHELL-1` and `DS-11` already settled for shared
  components — the kit must not know an app's key namespace.
- **`shortLabel`** is optional and falls back to `label`. **Carry it for jg alone.** An earlier
  draft of the prototype claimed cockpit independently proved the need; that claim was withdrawn
  when Einstellungen moved behind Mehr. One consumer, one reason — do not document it as
  twice-confirmed.
- **`emphasis`** replaces jg's hardcoded check for `/my-registrations`. cockpit sets it on no
  destination, which is what proves it optional.
- **`badgeCount` is per destination.** jg has one badge from a messaging hook; cockpit has two
  from its own data. The second case is what makes per-destination correct rather than a single
  `unreadCount`.

Behaviour the component owns: the fixed positioning, the top border, the breakpoint hide, and
**`padding-bottom: env(safe-area-inset-bottom)`** so a notched phone's home indicator does not
sit on the labels.

Behaviour the component does **not** own:

- **No auth gate.** jg's version returns `null` when there is no user. That is app logic; the app
  decides whether to render the bar at all.
- **No overflow logic.** The app passes the bar's own destination list. jg puts all five of its
  destinations in; cockpit puts four of six plus a `Mehr` destination whose route leads to its own
  page. "Mehr" is an ordinary destination as far as the kit is concerned. This is what keeps the
  component thin, and it was a deliberate decision against an overlay sheet, which would have
  added open/close state, a scrim, a focus trap, Escape handling and a reduced-motion path to a
  shared component on the strength of two consumers.

### Design-agnosticism: what the bar derives from, and what it does not guarantee

**No hex value appears in the component.** The bar is composed entirely from tokens —
`background.paper` for its surface, `divider` for its top edge, `text.secondary` for the label,
`primary.main` for the selected state — so an app with a different surface colour gets a different
bar without touching the kit. A second seam exists above that: an app may override
`MuiBottomNavigation` / `MuiBottomNavigationAction` in **its own** theme. That is not an escape
hatch, it is the mechanism, and it is the reason part 1 puts the defaults in the theme rather than
in the component. Values inside the component are exactly jg's current problem.

Three limits must be stated rather than discovered:

- **Contrast is not guaranteed, and nothing checks it.** `assertThemeComplete`'s contrast surfaces
  are hardcoded to `#FFFFFF` and `background.default`; **`background.paper` is never a contrast
  surface, and `text.secondary` is never checked against anything.** An app with a dark or
  saturated `background.paper` therefore gets a correctly-rendered, unreadable bar and **zero
  findings**. For baseline apps this is comfortable — `#5B6670` on `#FFFFFF` measures 5.87:1 and on
  `#FAFAFA` 5.62:1 (MUI's own `getContrastRatio`) — so this is a limit for deviating apps, not a
  defect in the default. **Do not extend the shared contrast assertion inside this WO**: adding a
  surface changes what every adopting app is measured against, which is a deliberate governance
  decision belonging to `DS-18` (invariant-scoped coverage), not a side effect of shipping a
  component.
- **The separation from the page depends on `background.paper` differing from
  `background.default`.** The bar has no resting shadow by baseline rule, so its edge comes from
  one tonal step (`#FFFFFF` against `#FAFAFA`) plus a 1&nbsp;px divider. In an app where those two
  tokens are the same colour, only the divider carries it and the bar reads as glued to the page.
  That is an acceptable outcome, but it must be a known one.
- **A tooling trap for anyone verifying the above:** MUI's `getContrastRatio` ignores alpha —
  `rgba(0, 0, 0, 0.6)` on white returns `21.00`, the figure for pure black. jg-ferien keeps its own
  `createTheme` and therefore MUI's alpha-based `text.secondary`, so a contrast check against jg's
  theme is meaningless. Verify jg by looking, not by computing.

### Non-goals / do not touch

- **No `AppHeaderMobile` promotion.** jg's is mostly app wiring around already-shared pieces.
- No change to `UserMenu`, `NotificationBell`, `ChartFrame` or any chart wrapper.
- No change to any existing baseline token value. Part 1 **adds** two component keys; it does not
  edit typography, palette, shape, spacing or the `shadows` array.
- No dark-mode work (`DS-12` owns that, on its own trigger).
- No migration of jg-ferien — that is `NAV-36`, deliberately separate.

### Risks

- **No staging net.** A version bump on `main` publishes to npm; the independent review is the
  only gate and cannot be back-filled. Publishing is version-gated, so the release happens when
  `package.json`'s version exceeds the live one — not on every push.
- **Adding assertion surfaces raises the bar for every adopting app.** The values come from the
  baseline, so `assertThemeComplete` stays green for apps built through `createAppTheme` — but
  verify that explicitly rather than assuming it, because a missed surface would turn an unrelated
  app's suite red on its next pin bump.
- **`minWidth: 0` on the action is a deliberate deviation from MUI's default.** It is what makes a
  five-item bar work at 375&nbsp;px; it also means a six-item bar will truncate labels rather than
  scroll. That is the intended failure mode — the prototype's measurement shows six items do not
  fit — but it must be a conscious default, not a surprise.

### Required tests to WRITE

1. `destinations` renders one action per entry, in order, with `label` as the visible text.
2. `activeRoute` marks exactly the matching action selected; a route matching nothing selects
   none and does not throw.
3. `onNavigate` fires with the destination's `route`.
4. `badgeCount` renders on the destination that has it and **not** on the others; a count of `0`
   or `undefined` renders no badge.
5. `shortLabel` is used when present, `label` when absent.
5b. **Theme-agnosticism, asserted rather than assumed.** Render the same bar under two themes whose
   `background.paper`, `text.secondary` and `primary.main` differ, and assert the resolved computed
   values follow the theme in both. This is what proves no colour is baked into the component — the
   single most likely regression, because an `sx` literal looks correct in the app it was written
   for. Include one theme that is **not** built by `createAppTheme`, since jg-ferien is exactly that
   case and `NAV-36` depends on it working.
6. Above `hideAbove` the component renders nothing.
7. `assertThemeComplete(createAppTheme({ palette: { primary: { main: '#0F62FE' } } })).findings`
   stays `[]` with the new surfaces registered — and **prove non-vacuity**: a theme missing the
   new component defaults must produce findings naming them.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — the affected set is the
new component's spec plus `tests/themeCompleteness.test.js` and `tests/createAppTheme.test.js`.

### Verification

The rendered two-width side-by-side per `DS-1`, against the prototype's sections 3 and 4. Add a
harness specimen to `dev/entries.jsx` — no existing specimen has a bottom navigation, and
`CHART-7` set the precedent of adding one rather than declaring the gate unmeetable. Show a
five-item bar with two badges at 375&nbsp;px, and confirm it renders nothing at 1280&nbsp;px.

State in the register note whether real screenshots were obtained or DOM inspection substituted.
**The safe-area padding cannot be verified either way** — a desktop 375&nbsp;px viewport always
reports an inset of zero, the same wall `TPL-1` hit. Specify it, assert the CSS is present, and
record it as unverified rather than done.

### Parity guardrail

For jg-ferien this must be a behavioural no-op once `NAV-36` swaps to it: same destinations, same
active-route derivation, same badge, same raised treatment on its emphasised destination. Two
known differences are intended and belong in `NAV-36`'s note, not here: the German literal
fallback `'Meine'` disappears (the app passes finished strings), and `background.white` — a
jg-only palette extension — is replaced by the baseline surface.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

### Execution directive (read this first)

> **If you are the implementer reading this work order as your own specification: this section is
> NOT addressed to you.** It tells the Orchestrator how to invoke you. **You ARE that invocation —
> do NOT shell out to `codex exec`.**
>
> Implement through `codex exec` in the background — invoked directly via Bash (never the
> `debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
> `--dangerously-bypass-approvals-and-sandbox`. **Pass the WO via stdin, not as a positional
> argument** (a positional arg hits Windows' command-line length limit — proven repeatedly in this
> repo). Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit —
> and note that the fallback flips authorship, so both reviewers stay mandatory either way.

### Context package

**Reference implementation to promote from (read-only, do not edit):**
`C:\Users\biglmi\Documents\webapps\jg-ferien\frontend\src\components\mobileShell\MobileBottomNav.jsx`
(107 lines) — the source of every field/behaviour named in the Envelope. Note its hardcoded
`zIndex: (navTheme) => navTheme.zIndex.drawer + 2` (stays a component default, cannot move to the
theme per the "objects only" constraint), its `/my-registrations` special-case (becomes
`emphasis`), its messaging-hook badge (becomes generic `badgeCount`), and its inline `t()` calls
(become finished-string `label`/`shortLabel` props — do not import `react-i18next` into the new
component).

**Files to change, in ucm:**

1. **`src/theme/tokens.js`** — add to `BASELINE_STATIC.components` (palette-*independent* values
   only; this file is deep-merged as static objects and MUST NOT contain functions —
   `tests/createAppTheme.test.js` asserts this):
   ```js
   MuiBottomNavigation: {
     styleOverrides: {
       root: { borderTop: '1px solid', boxShadow: 'none' },
     },
   },
   MuiBottomNavigationAction: {
     styleOverrides: {
       root: { minWidth: 0, maxWidth: 'none' },
       label: { fontSize: '12px', fontWeight: 500 },
     },
   },
   ```
   Follow the existing `MuiButton`/`MuiChip` entries immediately above as the pattern to match.

2. **`src/theme/createAppTheme.js`** — the *palette-dependent* half (background.paper, divider
   border colour, text.secondary / primary.main action colours) belongs in
   `createPaletteAwareComponents(palette)`, not in tokens.js — this is the existing
   "palette-first ordering" pattern already used there for `MuiDivider`/`MuiButton.outlined`
   (see lines 93-95 and 87-91 of the current file). Add, inside the object that function returns:
   ```js
   MuiBottomNavigation: {
     styleOverrides: {
       root: {
         backgroundColor: palette.background.paper,
         borderColor: palette.divider,
       },
     },
   },
   MuiBottomNavigationAction: {
     styleOverrides: {
       root: {
         color: palette.text.secondary,
         '&.Mui-selected': { color: palette.primary.main },
       },
     },
   },
   ```
   `createAppTheme`'s deep-merge (bottom of the file) already layers this object after the static
   `BASELINE_STATIC.components` block, so both halves land on the same MUI component slot — do not
   duplicate a key across both files.

3. **`src/theme/themeCompleteness.js`** — register the new surfaces in
   `COMPONENT_SURFACES` (around line 90, alongside the existing `MuiChip`/`MuiPaper` entries), using
   the same `componentPath()` / `componentKeyLeaf()` helpers already imported/defined in this file:
   - `componentPath('MuiBottomNavigation', 'styleOverrides.root.borderTop')`
   - `componentPath('MuiBottomNavigation', 'styleOverrides.root.boxShadow')`
   - `componentPath('MuiBottomNavigation', 'styleOverrides.root.backgroundColor')`
   - `componentPath('MuiBottomNavigation', 'styleOverrides.root.borderColor')`
   - `componentPath('MuiBottomNavigationAction', 'styleOverrides.root.minWidth')`
   - `componentPath('MuiBottomNavigationAction', 'styleOverrides.root.maxWidth')`
   - `componentPath('MuiBottomNavigationAction', 'styleOverrides.root.color')`
   - `componentPath('MuiBottomNavigationAction', 'styleOverrides.label.fontSize')`
   - `componentPath('MuiBottomNavigationAction', 'styleOverrides.label.fontWeight')`
   - `componentKeyLeaf('MuiBottomNavigationAction', 'styleOverrides.root', '&.Mui-selected', 'color')`
   These are what test 7 (non-vacuity) exercises: MUI's own `MuiBottomNavigation`/
   `MuiBottomNavigationAction` defaults must differ from every one of these values, or the
   completeness assertion is vacuously green (the existing `sameValue()` check in this file already
   handles the comparison — no new logic needed here beyond registering the surfaces).

4. **New file `src/components/MobileBottomNav.jsx`** (sibling of `src/components/UserListComponent.jsx`
   etc. — this is a shared, non-auth component so it does not belong in `src/auth/`). Structure:
   `Paper`-free — apply the fixed positioning, top-border and `env(safe-area-inset-bottom)` padding
   directly via `sx` on `BottomNavigation` itself (do not rely on `MuiPaper`'s theme entry, which
   already carries an unrelated `borderRadius: 8` default that would need overriding). Props exactly
   as the Envelope's table: `destinations`, `activeRoute`, `onNavigate`, `hideAbove = 'md'`,
   `zIndex = (theme) => theme.zIndex.drawer + 2` — default via a plain JS default parameter *value*
   passed to `sx`, not stored in the theme (this is the one place the WO explicitly keeps a function,
   component-local, matching jg's original). Each destination renders a `BottomNavigationAction` with
   `icon` = `<Icon />` optionally wrapped in `<Badge badgeContent={...} />` when `badgeCount` is
   truthy (`0`/`undefined` must render no `Badge` wrapper at all — a `Badge` with `badgeContent={0}`
   still renders a dot with `showZero` unset only if MUI's default differs; simplest correct
   implementation is to skip the `Badge` wrapper entirely when there is no count). `emphasis` applies
   jg's raised-icon treatment (`backgroundColor: selected ? primary.main : background.paper`, `color`
   inverted, `borderRadius: '50%'`, `transform: translateY(-4px)`) to that one destination's icon only
   — reuse `theme.palette.background.paper`, not jg's `background.white` (a jg-only palette
   extension not present in the ucm baseline — this is the intended parity difference the Envelope
   names). Breakpoint hide: `useMediaQuery(theme.breakpoints.up(hideAbove))` → return `null` (mirror
   jg's `useMediaQuery(theme.breakpoints.down('md'))` inverted for a configurable `hideAbove`).

5. **`src/index.js`** — export `{ MobileBottomNav }` from `./components/MobileBottomNav`, placed in
   the `--- 5. Components ---` section (after `QrSignupManager`, before `--- 6. Charts ---`).

6. **`dev/entries.jsx`** — add one specimen entry, following the existing `NotificationBellEntry`
   pattern (small wrapper function + one line in the `entries` array). Five destinations, two with
   `badgeCount` set, one with `emphasis: true`, mirroring the Envelope's "Verification" section.
   Import `MobileBottomNav` from `'../src/components/MobileBottomNav'` alongside the other `../src/`
   imports at the top of the file.

7. **New test file `tests/MobileBottomNav.test.jsx`** — follow `tests/UserMenu.test.jsx`'s structure
   (jsdom environment pragma, `render`/`screen`/`fireEvent` from testing-library, `afterEach(cleanup)`).
   Wrap the component in `ThemeProvider` with `createAppTheme({ palette: { primary: { main: '#0F62FE' } } })`
   (check `tests/createAppTheme.test.js` for the exact call shape already used elsewhere in this
   suite) since the component's selected-state colour comes from the theme, not inline `sx`. Cover
   the seven "Required tests to WRITE" items from the Envelope verbatim — they are numbered 1-7
   above and map 1:1 to test cases; item 7 (non-vacuity) belongs in
   `tests/themeCompleteness.test.js` or `tests/createAppTheme.test.js` instead, wherever the existing
   "missing surface produces a named finding" pattern already lives (see `themeCompleteness.test.js`
   lines ~15-20 for the shape: `bare.findings.map(({ surface }) => surface)).toContain('...')`) —
   do not duplicate that assertion pattern inside the new component test file.

**Invariants / do-not-touch:** no edits to `BASELINE_PALETTE`, `typography`, `shape`, `spacing`, or
the `shadows` array in `tokens.js` (Envelope non-goal). No edits to jg-ferien (separate `NAV-36` WO).
No new i18n keys — `label`/`shortLabel` are finished strings per-prop, not translation keys.

**Pitfalls already known:**
- A function anywhere in `tokens.js`'s `components` tree fails `tests/createAppTheme.test.js`
  immediately — the palette-aware colours MUST go in `createAppTheme.js`, not `tokens.js`.
- `assertThemeComplete`'s non-vacuity depends on MUI's own `createTheme()` default for
  `MuiBottomNavigation`/`MuiBottomNavigationAction` genuinely differing from the new baseline values
  — verify this holds (MUI's stock action `minWidth` is `80`, not `0`, and stock has no
  `borderTop`/`boxShadow: 'none'` on `MuiBottomNavigation` root, so all listed surfaces should clear
  safely, but confirm rather than assume).
- `env(safe-area-inset-bottom)` cannot be verified as "working" from a desktop viewport (Envelope
  Verification section) — assert the CSS declaration is present, do not assert a computed non-zero
  value.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/SHELL-3.md`. Follow `orchestrate-codex`.
