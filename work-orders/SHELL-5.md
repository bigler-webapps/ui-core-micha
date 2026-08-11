# SHELL-5 — Promote the secondary-navigation shell

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — both mandatory, concurrent
**Version target:** the next **minor** after `THEME-5` — a new exported component is additive API.
Read the published version at implementation time; do **not** hardcode a number.
**Prototype:** `work-orders/assets/SHELL-2-account-navigation.html` — the **composition** spec. The
two-width rendered side-by-side is therefore a commit gate.
**Strand:** `DS-11`. **Supersedes `SHELL-2`**, whose row moves to `dropped` — it described a different
shape (inline in `AccountPage`, no promotion) and its measurements are superseded by the ones below.
**Follow-ups, both named now:** `jg-ferien` migrates onto this and **deletes its own drawer**
(operator requirement); the `AccountPage` users table is `AUTH-4`, deliberately not here.

---

## A. Envelope

### Goal

After the primary destinations (the bottom bar, `SHELL-3`) comes the choice *within* a section.
Two apps solve it separately: jg-ferien has `SectionSwitcher` (119 lines, grouped list + bottom
drawer), and ucm's own `AccountPage` uses a horizontal `Tabs` strip that fails on a phone. Promote
jg's shape, make `AccountPage` its first consumer, and let jg's copy be deleted afterwards.

**Look and feel follow jg-ferien, by operator decision.** This is not a redesign — it is a promotion
plus one new consumer.

### The driver, measured 2026-08-11 in cockpit at the current baseline

Re-measured because `SHELL-2`'s numbers were three days old. All figures at **`innerWidth` 411 CSS px**
— the "mobile" preset yields 411, not 375, so **at the real 375 target every number is worse**.

| | measured |
|---|---|
| Sections rendered | **6** — Profile, Security, Users, Invite, Support, Notifications (the last is the app's `extraTab`) |
| Strip container | 327 px |
| Strip content | 566 px → **239 px overflow** |
| Off the visible edge | **3 of 6** — Invite, Support, Notifications |
| Scroll buttons | **none**; not in `variant="scrollable"` |
| Scroller `overflow-x` | `auto` — so it **is** swipeable |
| Desktop 1280 | 566 px used of 1136 px → **570 px headroom, zero overflow** |

**Two corrections to the recorded claim, both from this measurement:**

1. **The sections are not unreachable.** `overflow-x: auto` means a horizontal swipe reaches them. The
   precise defect is that **there is no affordance whatsoever** — no arrows, no edge fade, and no
   scrollbar on a touch pointer. It is a discoverability failure, not an unreachability one. Say it
   that way; the stronger claim would not survive a reviewer.
2. **The desktop is not broken.** 570 px of headroom, and at ~94 px per tab the strip would only fill
   at about **twelve** sections. So the grouped sidebar on desktop is a **structural improvement, not
   a space fix** — it must be argued as organisation and scanability, never as "it does not fit".

**Why a drawer rather than a better strip:** the section count is **not fixed and not knowable at
design time.** `AccountPage` builds it from permissions — Profile and Security always, then Users,
Invite, Support conditionally — plus whatever `extraTabs` the app injects (measured: cockpit 1,
fitness-monitor 1, **jg 3**, so a jg superuser sees up to **eight**). No "fit N tabs" solution can be
correct against a variable, permission-dependent count. That argument, not the 375 px measurement, is
the load-bearing one.

### Scope

#### Part 1 — the component

Export `SectionNav` (name it whatever the kit's convention prefers; the point is that it is one
component with a `mode`, not two). Derived from `jg-ferien/frontend/src/components/EventInfoHub/SectionSwitcher.jsx`,
read at `e551ff7`.

| Prop | Meaning |
|---|---|
| `mode` | `'desktop'` (sticky grouped sidebar) or `'mobile'` (bottom drawer) |
| `groups` | `[{ key, label, items: [{ key, label }] }]` — labels are **finished strings**, as `SHELL-1`, `SHELL-3` and `DS-11` already settled |
| `activeKey` / `onSelect` | the app derives the active key; the component does not guess |
| `open` / `onClose` | drawer only |
| `title` | drawer heading |
| `overviewItem` | **optional** `{ label }` — renders jg's special first entry, selected when `activeKey == null` |
| `rememberedKey` | **optional** — the "last opened" secondary line |
| `headerOffset` | sticky top offset in the desktop mode |
| `zIndex` | drawer only, default `theme.zIndex.drawer + 3` |
| `sidebarWidth` | default `280` |

**Each jg-specific concept becomes optional, and `AccountPage` is what proves it optional** — the same
argument structure that worked in `SHELL-3`:

- **The "Übersicht" entry is hardcoded today** (`SectionSwitcher.jsx:27-30`) as a separate `Paper` with
  one `ListItemButton`, selected when `activeKey == null`. That is jg's event-overview model.
  `AccountPage` has no such concept → `overviewItem`, omitted there.
- **`rememberedKey`** and its "Zuletzt geöffnet" secondary line (`:50-53`) are jg-only.
  `AccountPage` omits it.
- **`APP_HEADER_HEIGHT`** is imported from jg's own `mobileShell/constants` (`:13`, used at `:79` as
  `top: APP_HEADER_HEIGHT + 24`). ucm cannot know a host's header height → `headerOffset`.
- **`zIndex.drawer + 3`** is hardcoded (`:95`). Keep **+3 as the default and document why**: `SHELL-3`'s
  bottom bar sits at `+2`, so the drawer must render above it. The ordering is meaningful, not
  arbitrary — a consumer that lowers it will put the drawer under the bar.
- **The 280 px sidebar and the two-column grid live in the *consumer* today**
  (`EventInfoPage.jsx:1146`, `gridTemplateColumns: { md: "280px minmax(0, 1fr)" }`). **The component
  takes it over** and renders `children` beside the sidebar, so no consumer re-derives the desktop
  layout. This is the one place the promotion widens jg's component rather than copying it.
- **German literal fallbacks go.** `t("EventInfoPage.OVERVIEW", "Übersicht")` and
  `t("EventInfoPage.LAST_OPENED_VIEW", "Zuletzt geöffnet")` disappear with finished-string labels.
  Note `t("SectionSwitcher.TITLE")` at `:75` has **no fallback at all** — in the kit that key must
  exist per the `SHELL-1` pattern (`userMenuTranslations`) or the raw key renders on screen.

Keep from jg unchanged: the `18` px drawer top radius, `78dvh` max height, `p: 2`, and
`pb: max(16px, env(safe-area-inset-bottom))` — the safe-area handling is **already correct there**.

#### Part 2 — the trigger, which is net-new

jg has **no trigger bar** — verified, its trigger sits in the page header. The 56 px trigger bar is
specified only by `SHELL-2`'s prototype. It is therefore the one genuinely new piece, and it is what
supplies the missing affordance the measurement found. Build it as part of this component (a
consumer must not have to invent the thing that makes the drawer discoverable).

#### Part 3 — `AccountPage` as the first consumer

Replace the `Tabs` strip: grouped sidebar at `md` and up, trigger bar plus drawer below it. The
existing `?tab=<value>` query param and every permission gate stay exactly as they are —
`AccountPage` keeps computing which sections exist, the shell only presents them.

**Grouping is a real decision, not a mechanical wrap.** Six to eight flat sections must become named
groups; the prototype's composition is the spec. If it does not cover a section an app injects via
`extraTabs`, those land in a final group — do not invent a name for someone else's tab.

### Non-goals / do not touch

- **The users table** — `AUTH-4`. Measured today: 1053 px inside a 325 px container, the container
  scrolls, and **the document does not overflow**. Six fixed-width desktop columns on a phone is a
  content-density problem with a different fix class, and bundling it here would put an unbounded
  redesign into a promotion. `SHELL-2`'s 1045 px from 2026-08-08 still holds (+8 px) — cell padding is
  already the baseline's `10px 16px`, so `THEME-4`/`THEME-5` did not move it.
- **jg-ferien's migration** — its own follow-up WO, which is what makes this a removal of duplication
  rather than an addition.
- `AccountPage`'s permission logic, its `extraTabs` contract, and every section's content.
- The bottom bar (`SHELL-3`/`SHELL-4`) and `UserMenu` (`SHELL-1`).
- No baseline token change. The shell consumes tokens; it introduces none, so there is **no token
  delta list** — the prototype predates the design language, but `AccountPage` renders against the
  **host** theme, so composition comes from the prototype and every value from the app.

### Risks

- **No staging net.** A version bump on `main` publishes; the two reviews are the only gate.
- **`AccountPage` is mounted by at least ten apps** — bigler-consult, cockpit, fitness-monitor,
  hpc-bridge, hram, innoservice, jg-ferien, kerzenziehen, reimbursements. This changes the account
  screen's navigation everywhere at once. There is no way to stage it; the rendered gate and the
  reviews carry it.
- **The safe-area padding cannot be verified.** A desktop 375 px viewport always reports an inset of
  zero — the wall `TPL-1` hit. jg's value is already correct; assert the CSS and record it unverified.
- **Screenshot capture has failed repeatedly in this estate.** If it fails again, DOM/computed-style
  inspection is the declared substitution — and say so, because it can confirm a token resolved but
  not whether a screen reads well.
- **The trigger bar is the only unproven piece.** Everything else is promotion of running code.

### Required tests to WRITE

1. `groups` renders one section per item, grouped, in order, with finished labels.
2. `activeKey` selects exactly the matching item; a key matching nothing selects none and does not
   throw; `activeKey == null` selects `overviewItem` **when it is supplied**.
3. `overviewItem` and `rememberedKey` omitted → neither renders, no empty `Paper`, no stray secondary
   line. **This is the "AccountPage proves them optional" test.**
4. `onSelect` fires with the item's key; selecting in the drawer closes it.
5. `mode="desktop"` renders the sidebar plus `children` in the two-column grid; `mode="mobile"`
   renders the trigger and no sidebar.
6. The drawer's default `zIndex` resolves **above** `SHELL-3`'s bar (`drawer + 3` vs `drawer + 2`).
7. Theme-agnosticism, per `SHELL-4`'s pattern: render under a `createAppTheme` theme **and** a plain
   `createTheme()` and assert resolved surface/divider values follow each. jg is a non-baseline
   consumer, so this is not hypothetical.
8. `THEME-4`'s shadowing check still returns no findings — any `sx` this component owns must not
   duplicate a baseline `styleOverrides` key.
9. `AccountPage`: all six cockpit-shaped sections reachable at 375 px without horizontal scrolling;
   the `?tab=` param still selects; permission-gated sections still absent when not permitted.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — affected set is the new
component's spec, `AccountPage`'s, and the theme specs touched by test 8.

### Verification

The **two-width rendered side-by-side at 375 px and 1280 px** against
`assets/SHELL-2-account-navigation.html`, per the standing gate. What to look at: at 375 px the
trigger must be visible without scrolling and the drawer must reach every section; at 1280 px the
sidebar and content must sit in the two-column grid with no strip left behind.

Measure, do not eyeball, the one number this WO exists to fix: **the strip's 239 px overflow must
become zero**, and no section may sit outside its container. State whether real screenshots were
obtained or DOM inspection substituted.

### Parity guardrail

Presentation only. No permission, behaviour, data-contract or routing change; `?tab=` keeps working.
Every section that renders today still renders, reached differently.

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
> repo). Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit — and
> note that the fallback flips authorship, so both reviewers stay mandatory either way.
>
> **Read `git log origin/main..HEAD` and `git status`, and re-read this WO's register row, before your
> own review.** Across four ucm work orders the implementer produced an invalid review claim three
> times — twice by self-committing with a self-report, once by writing a **fabricated** verdict into
> `WORK_ORDERS.md` before either reviewer had started. The preamble now forbids editing that file;
> verify it was respected.

### Context package

**Precondition confirmed:** `THEME-5` landed and published (`8df44c5`, `package.json` reads `2.35.0`).
Clean starting tree.

**Reference implementation, read at `e551ff7`** (read-only, do not edit):
`jg-ferien/frontend/src/components/EventInfoHub/SectionSwitcher.jsx` (119 lines, reproduced in full
below for convenience — re-verify against the live file if it has moved) and its consumer
`jg-ferien/frontend/src/pages/EventInfoPage.jsx:1110-1160` (the mode switch + the 280px desktop grid
this WO's component takes over, `gridTemplateColumns: { md: "280px minmax(0, 1fr)" }`).

```jsx
// SectionSwitcher.jsx — current jg source, annotated with what changes per the Envelope:
function SectionSwitcherList({ groupedSections, activeKey, rememberedKey, onSelectSection }) {
  // renders: Paper(Übersicht item) -- ONLY IF overviewItem is supplied, see below --
  //          then one Paper per group: group-head Box + List of ListItemButton(selected, primary=label,
  //          secondary="Zuletzt geöffnet" when item.key===rememberedKey && !selected)
}
export default function SectionSwitcher({ mode, open=false, onClose, groupedSections, activeKey=null,
  rememberedKey=null, onSelectSection, title }) {
  // mode==='desktop': Box{position:'sticky', top: APP_HEADER_HEIGHT+24} wrapping SectionSwitcherList
  // else: Drawer{anchor:'bottom', open, onClose, sx:{zIndex: theme=>theme.zIndex.drawer+3},
  //   PaperProps.sx:{borderTopLeftRadius:18, borderTopRightRadius:18, maxHeight:'78dvh', p:2,
  //   pb:'max(16px, env(safe-area-inset-bottom))'}} containing a title Typography + scrollable list
}
```

**File location:** `src/layout/SectionNav.jsx` — this is page-chrome/navigation-shell, the same
category as `src/layout/PageLayout.jsx`, not a leaf UI widget (`MobileBottomNav`'s placement in
`src/components/` was already slightly inconsistent with this; use your judgement but `src/layout/`
reads as the better fit here since this component, like `PageLayout`, wraps page content).

**Component API — resolving one structural ambiguity the Envelope leaves implicit:** the prop table
lists `open`/`onClose` unchanged from jg ("drawer only"), but jg's drawer was triggered by a button
that lived OUTSIDE `SectionSwitcher` (in jg's own page header), whereas Part 2 requires the new
trigger bar to be built INSIDE this component. A trigger owned by the component needs to be able to
open a drawer whose `open` state jg's original code expected the CONSUMER to own — these two
requirements only reconcile with the standard optional-controlled React pattern (the same shape MUI's
own components use):
```js
const [internalOpen, setInternalOpen] = useState(false);
const isControlled = open !== undefined;
const drawerOpen = isControlled ? open : internalOpen;
const handleTriggerClick = () => { if (!isControlled) setInternalOpen(true); };
const handleDrawerClose = () => { if (!isControlled) setInternalOpen(false); onClose?.(); };
```
`AccountPage` (this WO's consumer) passes neither `open` nor `onClose` — fully uncontrolled, the
trigger manages itself. This also leaves the door open for jg's later migration (a separate WO) to
pass `open`/`onClose` in controlled mode if it turns out to still want its own external trigger
instead of this component's built-in one — not solved here, just not foreclosed.

**i18n split — two different kinds of text, do not conflate them:**
- **Group/item labels are finished strings** the consumer supplies via the `groups` prop (per
  `SHELL-1`/`SHELL-3`/`DS-11`'s settled convention) — the component does not call `t()` on them.
- **The component's own chrome text is NOT consumer-supplied and needs its own i18n keys**, registered
  in a new `src/i18n/sectionNavTranslations.ts`, following `src/i18n/userMenuTranslations.ts`'s exact
  shape (`{ 'SectionNav.KEY': { de, fr, en, sw } }`) and exported from `src/index.js`'s translations
  section (see `export { userMenuTranslations }`). Needed keys: a default drawer `title` (jg's
  `t("SectionSwitcher.TITLE")` **had no fallback at all** — the Envelope calls this out explicitly as
  a trap: in the kit that key must exist or the raw key renders on screen) and the trigger's "Bereich"
  eyebrow label (jg hardcodes this as static JSX text in the prototype, not a translation call today —
  give it one here, e.g. `SectionNav.TRIGGER_EYEBROW`). Both `title` and any future eyebrow-override
  stay optional props with these keys as the default, same pattern as `UserMenu`'s `profileLink`.

**`kitSxRegistry.js` registration is mandatory, not optional — this is new territory `SHELL-3` predates
knowing about:** `THEME-4`/`THEME-5` wired a hard-failing kit-wide check
(`src/theme/themeCompleteness.js`: `assertKitSxDisjoint`, `reportKitSxBypasses`,
`reportOffPaletteColours`) that runs against `src/theme/kitSxRegistry.js`. Any `sx` this new component
owns for a baseline-styled MUI component (check `BASELINE_STYLED_MUI_COMPONENTS` in
`themeCompleteness.js` for the 23-key list — `MuiDrawer`/`MuiPaper` are both on it) **must** be
exported as a top-level `const X_SX = {...}` (follow `MOBILE_BOTTOM_NAV_ROOT_SX`'s exact shape) and
added to `kitSxRegistry.js`'s imports/`SX_EXPORTS`/`KIT_COMPONENT_SX_REGISTRY` — an inline, unexported
`sx={{ borderTopLeftRadius: 18, ... }}` on the `Drawer`'s `PaperProps` would otherwise trip
`reportKitSxBypasses` in the affected-set test run. Also: no colour literal (`SHELL-4`/`THEME-5`'s
`reportOffPaletteColours` scan) — jg's code already uses no hex here (all values are numeric/px/token
strings), so this should be a non-issue if the port is faithful, but verify.

**`zIndex` default:** keep jg's `theme.zIndex.drawer + 3` as the literal default (a plain JS function
default parameter on the component, exactly like `MobileBottomNav`'s `defaultZIndex` — NOT registered
in the theme, since `SHELL-4` established functions cannot live in the static baseline tree). The
Envelope's own reasoning: `SHELL-3`'s bottom bar sits at `+2`, so this must render above it — document
that ordering as a comment, do not silently pick a different offset.

**`AccountPage.jsx` grouping** (`src/pages/AccountPage.jsx`, current flat `tabs` `useMemo` at
`:125-160`, current `<Tabs>`/`<Tab>` block at `:196-206`): the prototype's footer states the fixed
grouping explicitly — **"Mein Konto"** (`profile`, `security`), **"Verwaltung"** (`users`, `invite`),
**"Hilfe"** (`support`), and a trailing **"Weitere"** catch-all for anything else (this is exactly
where `extraTabs` without a named group lands — the prototype's own worked example is cockpit's
"Benachrichtigungen" `extraTab` falling into "Weitere"). No standalone "Übersicht" entry — the
prototype explicitly starts at the first group (panel 1's own caption: `AccountPage` has no overview
page for one to point at) — so **do not pass `overviewItem`**. Group labels need their own i18n keys
(new `Account.GROUP_MY_ACCOUNT` / `Account.GROUP_MANAGEMENT` / `Account.GROUP_HELP` /
`Account.GROUP_MORE` — this repo already has an `Account.*` key family, e.g. `Account.TAB_PROFILE` at
`:130` — follow that naming). Build the `groups` array by mapping the existing flat `tabs` list into
these four buckets by `value`, preserving each tab's already-computed `label`; do not change the
permission logic that produces `tabs` in the first place. `activeKey`/`onSelect` continue to be driven
by the existing `safeTab`/`handleTabChange` — the `?tab=` contract and `activeTabExists` fallback logic
at `:182-188` are unchanged (Non-goal, explicit parity guardrail).

**Mode switching in `AccountPage`:** add `const isMobile = useMediaQuery(theme.breakpoints.down('md'))`
(needs `useTheme`/`useMediaQuery` imports) — same breakpoint jg's `EventInfoPage.jsx:138` uses and the
same one `SHELL-3`'s `MobileBottomNav` defaults `hideAbove` to, so this is the estate's established
mobile/desktop split, not a new number to justify. Desktop: render `<SectionNav mode="desktop">`
beside content in the two-column grid (the component now owns this grid — do not keep
`AccountPage`'s own `gridTemplateColumns` if you add one, the component takes it over per Part 1's
last bullet). Mobile: render `<SectionNav mode="mobile">` (uncontrolled, no `open`/`onClose` passed)
ahead of the tab content — its own trigger renders first per the prototype ("the first thing rendered
on mobile").

**Dev harness:** add one specimen to `dev/entries.jsx` (follow the existing pattern, e.g.
`MobileBottomNavEntry`) exercising both `mode="desktop"` and `mode="mobile"` side by side if
practical, using the same four-group shape as the prototype, so the two-width verification below has
something to point the preview browser at beyond `AccountPage` itself (which needs a full
`AuthContext`/backend-shaped fixture to render meaningfully in the harness).

### Verification procedure

Per `preview-running-app` skill: `ui-core-micha-dev` launch config exists (`.claude/launch.json`,
port 5199) — a prior session in this repo could not get the Browser pane to composite frames at all
(not a rendering bug, the pane itself did not display). Attempt it again fresh; if it fails again,
DOM/computed-style inspection is the declared, accepted substitution per this WO's own Risks section
— state which happened in the register note, and specifically capture the two numbers the WO frames
as the actual deliverable: the strip's now-absent overflow (should be 0, there is no strip anymore)
and confirm every section's item is reachable in the rendered `groups` list at 375px without
horizontal scroll.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/SHELL-5.md`. Follow `orchestrate-codex`.
