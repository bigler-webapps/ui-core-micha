# SHELL-4 — Give each bottom-nav property exactly one home

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Version target:** `2.33.1` — patch. See "Why patch" below.
**Precondition of:** `jg-ferien/NAV-36`, which is `blocked` on this
**Follows:** `SHELL-3` (`2.33.0`) and its fix `586ac9c`

---

## A. Envelope

### Goal

`SHELL-3` shipped `MobileBottomNav` with **all** visible styling in the theme layer and only
position, `zIndex` and safe-area padding in the component. For an app that has adopted
`createAppTheme` that is correct and renders as specified. For an app that has **not**, the bar
arrives structurally broken — and jg-ferien, the migration consumer the promotion exists for, is
exactly that app.

Fix the layer split so the component works on any theme, without reintroducing the shadowing bug
that `586ac9c` removed.

### How this happened, because the reasoning matters more than the diff

`SHELL-3`'s `ui_reviewer` found the component duplicating `borderTop` and `borderColor` inline in
`sx` — the same properties the same work order had just registered as theme defaults. Inline `sx`
beats `styleOverrides`, so the new defaults were inert. The fix removed the component's copies.

**That resolved the duplication by deleting the wrong copy.** The defect was the *duplication*, not
the *location*. For a property a component needs in order to function on an arbitrary theme, the
component is the correct home — and the fix moved exactly those into a layer that only baseline apps
have.

### What a non-baseline consumer loses today

Read against MUI's installed source, not assumed. Every item below currently lives **only** in the
baseline theme:

| Property | MUI's default | Consequence |
|---|---|---|
| `MuiBottomNavigationAction` `minWidth: 0` | **`minWidth: 80`** | **layout break** — see below |
| `maxWidth: 'none'` | `maxWidth: 168` | actions cannot fill a wide bar |
| `MuiBottomNavigation` `borderTop: '1px solid'` | MUI sets **no border** | the bar has no top edge |
| `borderColor: palette.divider` | — | same |
| label `fontSize: '12px'` + the `&.Mui-selected` pin | `12px`, **`14px` when selected** | the label jumps on tap |
| label `fontWeight: 500` | unset | thinner |
| label `lineHeight: 1.2` | unset | taller label row |
| action `padding: '0 2px'`, `gap: '2px'` | MUI's own | looser density |
| icon `22px` | MUI's `24px` | slightly larger icons |

`backgroundColor` and the action/selected colours are **not** losses — MUI sets equivalents itself.

**The first row is not cosmetic.** jg has five destinations: `5 × 80 = 400px` against a 375&nbsp;px
viewport, and `min-width` overrides `flex-shrink`, so the container overflows. jg's current code sets
`minWidth: 0` explicitly for exactly this reason. **Computed from MUI's source, not rendered** —
confirm it in the rendered check rather than trusting the arithmetic.

### The rule to apply

**Each property gets exactly one home, chosen by who needs it:**

- **The component owns what keeps it functional on any theme.** These are deliberately *not*
  theme-overridable, and that is a feature: overriding them breaks the bar.
- **The theme owns what makes it look like this estate.** These stay overridable per app, which is
  what makes the component design-agnostic.

**And the distinction that was missed the first time:** a **token reference** in the component's `sx`
(`borderColor: 'divider'`) is not the same thing as a hex literal and not the same thing as a
duplicate. It resolves against *whatever* theme is mounted — every app still gets its own divider
colour — while a duplicate of a theme default silently shadows it. Reference without duplication is
the correct pattern; "contains no hex values" is the wrong test for it.

### Scope

**Move into the component, and delete from `tokens.js`:**

- `MuiBottomNavigationAction`: `minWidth: 0`, `maxWidth: 'none'`
- `MuiBottomNavigation`: `borderTop: '1px solid'`, and `borderColor: 'divider'` as an `sx` token
  reference (delete `borderColor: palette.divider` from `createAppTheme.js`'s palette-aware block)

**Leave in the theme, unchanged:** the label `fontSize` / `fontWeight` / `lineHeight` and its
selected pin, the action and selected `color`, `backgroundColor`, `boxShadow: 'none'`, `padding`,
`gap`, and the icon size. A bar with MUI's density and 24&nbsp;px icons still works; a bar with
`minWidth: 80` does not.

**Deregister the four moved surfaces** from `themeCompleteness.js`:
`components.MuiBottomNavigation.styleOverrides.root.borderTop`, `…root.borderColor`,
`components.MuiBottomNavigationAction.styleOverrides.root.minWidth`, `…root.maxWidth`. Six of the ten
`SHELL-3` surfaces remain. **This cannot turn any app red**: the assertion validates that each
declared exemption names a surface and a reason, and then ignores exemptions that match no
registered surface — verified in `themeCompleteness.js`, not assumed.

**Add an `sx` prop to the component**, merged **after** its own defaults. This is the honest
mitigation for the properties that just became theme-unoverridable: a call site that genuinely needs
a different edge can still get one, without the theme layer being the escape route.

### Non-goals / do not touch

- **No new props beyond `sx`.** `destinations`, `activeRoute`, `onNavigate`, `hideAbove`, `zIndex`
  and the destination field shape stay exactly as `SHELL-3` shipped them.
- **No visual change for baseline apps.** The values are identical; only their layer moves. If a
  baseline app renders differently, that is a defect in this WO.
- No other component, no other baseline token, no palette or typography change.
- No change to `emphasis`, `badgeCount`, `shortLabel` semantics.
- No migration of jg-ferien — that stays `NAV-36`.

### Risks

- **Reintroducing the shadow.** The whole point is that a property lives in one layer. Deleting from
  `tokens.js` and adding to the component must happen together; doing half leaves either a shadow or
  a gap. The test below makes this checkable rather than a matter of care.
- **No staging net.** A version bump on `main` publishes to npm; the independent review is the only
  gate and cannot be back-filled.
- **A property moved into `sx` is no longer theme-configurable**, which is a real capability
  reduction for the four moved properties. Accepted deliberately: three of the four break the
  component when changed, and the `sx` prop covers the fourth.

### Why patch, not minor

No new capability: this relocates existing values and adds one escape-hatch prop. Baseline apps
render byte-identically. The narrowed assertion contract asks adopting apps for **less**, not more.
Per the estate's rule that a version bump follows scope rather than novelty, that is a patch.

The one argument for minor — a capability reduction, since four properties stop being
theme-overridable — is noted and rejected: `MobileBottomNav` is one release old with **no** consumer
yet on any published version, so no app can be relying on that override path.

### Required tests to WRITE

Extend `tests/MobileBottomNav.test.jsx` and `tests/themeCompleteness.test.js`.

1. **The non-baseline case, which is the whole point.** Render under a plain `createTheme()` and
   assert the bar has a top border and its actions resolve `minWidth: 0` — the two failures that
   block `NAV-36`. Prove non-vacuity: this test must fail against `2.33.0`'s arrangement.
2. **No property lives in two layers.** Assert the intersection of the component's own `sx` keys and
   the baseline's `MuiBottomNavigation` / `MuiBottomNavigationAction` `styleOverrides` keys is
   **empty**. This is the mechanical guard for the regression class `SHELL-3` hit, and it is the
   reason to prefer it over a reviewer noticing.
3. `sx` passed by the caller wins over the component's own defaults.
4. Baseline rendering is unchanged: the same assertions `SHELL-3`'s spec makes about a
   `createAppTheme` theme still hold, including test 5b's cross-theme colour resolution.
5. `assertThemeComplete(createAppTheme({ palette: { primary: { main: '#0F62FE' } } })).findings`
   stays `[]` with six surfaces registered instead of ten.
6. An exemption naming one of the four deregistered surfaces produces **no** finding — the
   forward-compatibility claim above, asserted rather than trusted.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — the affected set is those
two specs plus `tests/createAppTheme.test.js`.

### Verification

The rendered two-width side-by-side per `DS-1`. `SHELL-3` added a bottom-nav specimen to
`dev/entries.jsx`; extend it with **a second instance mounted under a plain `createTheme` theme**
side by side with the baseline one. That comparison is the actual deliverable of this WO made
visible: both bars must have an edge and evenly divided actions, and they may legitimately differ in
label size and density.

State in the register note whether real screenshots were obtained or DOM inspection substituted.
`SHELL-3`'s session could not composite frames and fell back to computed-style inspection — if that
recurs, the computed `min-width` and `border-top-width` on the plain-theme instance are the two
values that carry this WO's claim.

### Parity guardrail

Byte-identical rendering for baseline apps. The only intended change is that a non-baseline
consumer's bar gains its edge and its evenly divided actions.

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
>
> **`SHELL-3` note for the Orchestrator:** on that WO Codex committed its own change and marked the
> register row `done` with a self-reported review. That is a breach (`AGENTS.md`: author ≠ reviewer,
> a spawned implementer never commits). Read `git log origin/main..HEAD` before your own review and
> treat any implementer commit as a blocker to surface, not something to build on.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/SHELL-4.md`. Follow `orchestrate-codex`.
