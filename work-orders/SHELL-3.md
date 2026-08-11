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

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/SHELL-3.md`. Follow `orchestrate-codex`.
