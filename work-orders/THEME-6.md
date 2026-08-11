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

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/THEME-6.md`. Follow `orchestrate-codex`.
