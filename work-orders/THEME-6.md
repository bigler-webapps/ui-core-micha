# THEME-6 — An app-side check for `sx` values the theme already gives

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` — mandatory (new logic). **`ui_reviewer` does not apply**: this WO
adds a check and fixes nothing, so no rendered output changes. If that turns out to be false, it
applies after all.
**Version target:** the next **minor** after the published version — a new exported check is additive
API. Read the published version at implementation time.
**Strand:** `DS-18`, the app-side half. Trigger fired when cockpit adopted `createAppTheme` (`UI-6`);
deferred once because cockpit was mid-rebuild in `UI-3`, **which has since landed.**

---

## A. Envelope

### Goal

`THEME-4` made it mechanical that no **kit** component defeats the baseline. Apps have no equivalent:
cockpit alone carries **464 `sx` props across 37 files** (measured 2026-08-11), and nothing checks any
of them against the theme they sit on.

Give apps an exported check they call from their own suite, the way they already call
`assertThemeComplete`.

### This is NOT a port of `THEME-4`, and getting that wrong would flood the app

In the **kit**, an `sx` value that duplicates a baseline default is a bug by definition: the default
becomes inert for every consumer. So `THEME-4` compares **key sets** and demands disjointness.

In an **app**, `sx` beating the theme is **the intended mechanism** — that is how a screen customises
one instance. A key-collision check over 464 props would flag mostly legitimate customisation, get
blanket-exempted, and become the no-op `THEME-4`'s own WO warned about.

**So the app-side rule is different: flag an `sx` value that is *equal* to what the theme already
resolves for that component and property.** Not "you overrode a default" — "you re-stated a value you
already had". That is dead weight which **silently diverges the next time the token changes**, which is
the real failure mode and the one worth a check.

Grounded in cockpit, measured: `borderColor: 'divider'` (×2) and `bgcolor: 'background.paper'` (×3) on
surfaces whose theme already sets exactly that, and `borderRadius: 1` (×3) which resolves to the
baseline's own `shape.borderRadius`. Those are the findings this check exists for.

### Scope

**1. An exported check, source-level.** Same finding contract as its siblings
(`{ findings: [{ surface, reason }] }`), same shape as `reportThemeAdoption` and
`reportOffPaletteColours`: it takes the app's own sources plus its theme, and returns findings. The app
globs its `src/**` in its own test and passes them.

For each `sx` entry it can attribute to a MUI component the theme styles, resolve what the theme gives
for that property and flag **equality**. The attribution comes from the JSX element name in the source
text — `<Paper sx={{ borderRadius: 1 }}>` → `MuiPaper` → compare against
`theme.components.MuiPaper.styleOverrides.root.borderRadius`.

**2. Report-only, with a ratchet.** New findings must not turn a green app red on a pin bump. Ship it
**report-only**, and let each app make it a hard assertion in its own cleanup WO — the same ratchet
`DS-2` used for `assertThemeComplete`, and for the same reason.

**3. Run it against cockpit and report the count. Fix nothing.** cockpit is the first real consumer and
the reason the trigger fired. The cleanup is cockpit's own work order, not this one — bundling an
unbounded app cleanup into a shared-core WO is what `AUTH-4` was split out of `DS-11` to avoid.

### Reuse, do not rebuild — and one gap in the reuse

**The hardcoded-colour half already exists and is already app-callable.**
`reportOffPaletteColours(sources, { palette })` (`themeCompleteness.js:759`) takes sources and an
optional palette, so an app can pass its own files and its own palette today. cockpit's
`bgcolor: '#fff'` (×2) is exactly what it reports. **Do not duplicate it.**

**But its skip pattern assumes ucm's layout.** It skips paths matching `src/theme/` — with a trailing
slash (`:768`). ucm's tokens live in `src/theme/tokens.js`; an app's theme is usually
`src/theme.js`, which **does not match** and therefore gets scanned, so every identity token in it
(cockpit: `#3D5A99`, `#eff2f7`, `#e4e8f1`, …) would be reported as off-palette.

Resolve it **app-side**, not by widening the pattern: the app excludes its own theme file from the
sources it passes. That keeps ucm's behaviour unchanged and puts the knowledge where the layout is
known. Say so in the check's doc comment so the next app does not rediscover it.

### The bound, and it is open

Attribution from source text is a **heuristic**. It will miss `sx` on a variable, spread props, an
aliased import (`import { Paper as Surface }`), a `styled()` component, and a MUI component rendered
through `component={...}`. **Write the bound as open — "unknown attribution gaps remain" — not as a
list.** `THEME-4`'s WO enumerated its limits and the first real miss (shorthand alias spelling) was not
on the list; `THEME-5` was told to phrase it openly and that phrasing then held when the fourth
shadowing layer appeared. An enumeration reads as coverage.

This check is a lower bound on redundancy, and green means "nothing found by this method".

### Non-goals / do not touch

- **No fixes anywhere.** Not in cockpit, not in the kit. This WO ships a check and a count.
- **No change to `reportOffPaletteColours`**, `assertKitSxDisjoint`, `reportKitSxBypasses`,
  `reportThemeAdoption` or `assertThemeComplete` — including no widening of the `src/theme/` skip.
- **Not a hard assertion anywhere yet.** Report-only; the ratchet is each app's own.
- `DS-18`'s remaining half — "which components *can violate* a rule", derived from a
  `grep 'shadows\['` lower bound — stays out and stays without a driver.
- No baseline token, component default or public prop change.

### Risks

- **False positives are the failure mode**, not false negatives. A check that flags legitimate
  customisation gets switched off. That is why it compares values rather than keys, and why it ships
  report-only.
- **The count from cockpit may be large.** 464 props is the denominator. If it is large enough that no
  app could plausibly act on it, that is a finding to report — the check may need a narrower first
  scope (e.g. only the ~23 component keys the baseline actually styles) rather than shipping noise.
- **No staging net.** A version bump on `main` publishes; the independent review is the only gate.
- **Other sessions are frequently active in this repo.** Read `git status` and
  `git log origin/main..HEAD` before reviewing; this strand has had concurrent work in the same files
  throughout.

### Required tests to WRITE

1. **Non-vacuity:** a fixture source with `<Paper sx={{ borderColor: 'divider' }}>` against a theme
   whose `MuiPaper` already sets `borderColor: divider` produces a finding naming the file, line,
   component and property.
2. **The legitimate case produces nothing:** the same fixture with a *different* value
   (`borderColor: 'error.main'`) is **not** flagged. This is the test that keeps the check usable.
3. A component the theme does not style is not flagged at all.
4. The finding shape matches its siblings, so a consumer handles one contract.
5. `reportOffPaletteColours` is unchanged — its existing tests stay green untouched.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — affected set is the theme
module's specs.

### Verification

No rendered surface. The evidence is test 1 plus the cockpit count, reported in the register note with
the exact number and a sample of what it found. A check nobody has run against real code is not
verified, however green its fixtures.

### Parity guardrail

Nothing renders differently. No existing check changes behaviour.

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
> argument.** Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit —
> and that flips authorship, so the independent `reviewer` stays mandatory either way.
>
> **Do NOT edit `WORK_ORDERS.md`.** Before your own review read `git log origin/main..HEAD` and
> `git status`, and check the register row carries no review claim you did not make yourself.

### Context package

**Precondition confirmed:** `SHELL-6` landed and published (`f119b70`/`3b746d4`, `package.json` reads
`2.37.1`). Clean starting tree.

**Reusable primitives already in `src/theme/themeCompleteness.js` — do not rebuild these:**
- `getPath(value, path)` (`:13-15`) and `sameValue(left, right)` (`:17-21`) — exactly what "resolve
  what the theme gives for that property and flag equality" needs; both already handle the
  string/JSON-stringify comparison this check requires.
- `BASELINE_STYLED_MUI_COMPONENTS` (`:484-508`, 23-entry list), `jsxOpeningTag(source, start)`
  (`:510-530`, returns the full `<Tag ...>` text starting at a match) and `topLevelSxValue(tag)`
  (`:532-553`, extracts the raw `sx={...}` attribute text, top-level braces only) — the exact
  tag-scanning machinery `reportKitSxBypasses` (`:560-`) already uses. Reuse the same
  `<(${componentPattern})\\b` regex approach for finding tags; you will need a NEW small parser to
  walk `topLevelSxValue`'s result and extract individual top-level `property: value` pairs from a
  literal object (`{ borderColor: 'divider', p: 2 }` → `[['borderColor', "'divider'"], ['p', '2']]`) —
  this doesn't exist yet, write it narrowly (top-level only, matching the existing lower-bound
  philosophy; do not attempt to parse nested objects, media-query keys, or `theme =>` callbacks).
- `reportOffPaletteColours`'s `normalizedSources`/path-skip pattern (`:747-753`, `:768-769`) — same
  `{ path, source }` input shape, reuse `normalizedSources` directly, do NOT touch or widen its
  `/(^|\/)src\/theme\//` skip (Non-goal, explicit).

**A real discrepancy found while preparing this map, worth resolving deliberately rather than
silently — the WO's own "grounded in cockpit" evidence does not match its own stated attribution
method:** the cited `borderColor: 'divider'` (×2), `bgcolor: 'background.paper'` (×3, one is inside a
`'&:hover'` nested selector), and `borderRadius: 1` (×3) all live in
`cockpit/frontend/src/cockpit/ChatView.jsx:75,82,95`, on **`<Box component="button" sx={{...}}>`** —
verified directly, not assumed. `Box` is not in `BASELINE_STYLED_MUI_COMPONENTS`, and the WO's own
"Scope" section describes attribution purely by JSX tag name (`<Paper sx=...> → MuiPaper`), while its
own "bound" section separately, explicitly lists a component rendered through `component={...}` as a
KNOWN, ACCEPTED GAP. **These two things conflict**: the check as scoped will NOT catch the WO's own
cited grounding examples. Meanwhile, cockpit's actual `<Paper>`/`<Card>`/etc. usages elsewhere
(`HeaderStrip.jsx`, `KnowledgeView.jsx`, `SettingsView.jsx`, and others) mostly use **template-literal**
sx values like `` border: `1px solid ${palette.divider}` `` — a JS expression referencing cockpit's own
imported `palette` object, not a plain string literal — which a source-level literal-value parser also
cannot resolve to "equals the theme's value" without evaluating arbitrary JS.

**Resolve this by NOT expanding scope to chase the cited numbers** (that would be exactly the
"enumeration reads as coverage" mistake the WO warns against, applied to attribution instead of the
bound's phrasing) — implement the check exactly as scoped (tag-name attribution, literal `'string'`/
`"string"`/numeric sx values only, skip anything that isn't a simple literal — a template literal,
identifier reference, or expression is out of scope and simply produces no finding for that property,
same lower-bound philosophy as every sibling check). **Then, when running it against cockpit for the
required count and sample, report what it ACTUALLY finds — which may be zero, or may differ from the
Envelope's cited 2+3+3 — and say so explicitly in the register note as a correction to the Envelope's
own grounding claim**, the same way prior WOs in this strand corrected their own stale counts
(`THEME-4`'s "51 files", `SHELL-4`'s "ten to six"). Do not silently match the cited numbers by quietly
special-casing `component=` or template-literal parsing to make them fit — if the honest run finds
different examples (or none) on properly-attributable tags, that is the real, reportable result.

**Where to add the new export:** same file, `src/theme/themeCompleteness.js`, alongside its siblings.
Suggested name (Codex's call, keep it short and consistent with `reportKitSxBypasses`/
`reportOffPaletteColours`): `reportRedundantThemeValues` or `reportAppSxRedundancy`. Same
`{ findings: [{ surface, reason }] }` contract; `surface` should follow the sibling convention
(`${path}:${line}.${property}` or similar — check `reportOffPaletteColours`'s `${path}:${line}.colour`
shape for the exact precedent). Export it from `src/theme/index.js` and `src/index.js` (follow the
existing export-list pattern in both — this is additive public API, matching the "next minor" version
target).

**Signature, per Scope item 1 + 2:** `reportRedundantThemeValues(sources, { theme })` — takes the
app's own sources (same `{path, source}`/string-array shape as siblings) and a **resolved theme
object** (an app passes its own `createAppTheme(...)` result, or — for ucm's own required tests — a
theme built the same way `assertKitSxDisjoint`'s tests do). For each JSX tag matching
`BASELINE_STYLED_MUI_COMPONENTS`, for each top-level literal `property: value` pair in its `sx`,
resolve `theme.components.Mui<Tag>.styleOverrides.root.<property>` via `getPath` and flag if
`sameValue(parsedValue, themeValue)` — matching value AND matching property AND matching component,
report-only (no exemption arm needed per the WO — this ships report-only with no hard-assertion path
yet, so skip building an exemption contract this round, that's each app's own future ratchet WO).

**Running it against cockpit (Scope item 3, required for the register note):** cockpit's frontend
source lives at `C:\Users\biglmi\Documents\webapps\cockpit\frontend\src` (37 `.jsx` files, confirmed).
Glob it (a small Node script or a throwaway test-like harness is fine — this does not need to be a
committed cockpit-side test, just evidence for the register note) the same way `reportOffPaletteColours`'s
own `'keeps current kit source free of hard off-palette findings'` test globs `src/` — exclude
`cockpit/frontend/src/theme.js` explicitly from the sources passed (per Scope's "resolve it app-side"
instruction — do NOT widen `reportOffPaletteColours`'s or this new check's own skip pattern to do it).
Build the theme via cockpit's own `createAppTheme(...)` call if one exists (check `theme.js` for the
palette it passes), or a reasonable equivalent. Report the exact count and 2-3 sample findings in the
register note, per Verification's explicit requirement — a check nobody has run against real code is
not verified.

**Invariants:** no fix in cockpit or the kit; no change to `reportOffPaletteColours`,
`assertKitSxDisjoint`, `reportKitSxBypasses`, `reportThemeAdoption`, or `assertThemeComplete`; no new
baseline token; no hard assertion anywhere (report-only only).

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/THEME-6.md`. Follow `orchestrate-codex`.
