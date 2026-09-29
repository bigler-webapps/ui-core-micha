# UCM-THEME-13: Freeze a dark-mode baseline token set

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

The central token file `src/theme/tokens.js` has one light baseline palette and no dark one. This order
produces the **decided** dark token set as a committed reference sheet, `docs/DARK-TOKENS.md`. The
operator freezes it before `UCM-THEME-14` puts those values into code. The output is a document. No
source file changes here.

Operator decision (2026-09-29): dark mode gets its own work order in the kit, rather than one app keeping
a raw `createTheme` for it.

## Context the operator established

- **One consumer today: `webshop-guenter`.** It has a light/dark switch (`frontend/src/App.jsx:96`)
  and a hand-built `darkTheme` from its operator design handoff (background `#0E0B08`, paper
  `#171209`, primary `#D49040`, secondary `#A88868`). Its adoption, `WSG-THEME-1`, is blocked on this
  order and on `UCM-THEME-14`. No other app in the estate renders a dark theme (measured 2026-09-29).
- The light baseline covers: the palette (primary is app identity; secondary, the status family
  `success/warning/error/info/stale` with `main/light/dark/contrastText` plus `text/fill/bg`,
  `background.default/subtle/paper`, the text inks, `divider`, `controlBorder`), `dataSeries` (six
  categorical colours) and `shadow.rest/overlay`. Typography, radii, spacing, density and motion do not
  depend on the mode.

## Scope + non-goals

In scope: `docs/DARK-TOKENS.md` with a value for every **mode-dependent** light token class listed
above, each with a one-line reason, and a contrast table: every text/fill pair and every
`main`-on-surface pair at 3:1 or better against the dark `background.default` and `background.paper`.
Follow the `design-language` skill's process: inventory first, then a structural round, then values
decided in an instrument, then the freeze.

Non-goals:
- No change to any light value.
- No code, no tests. `UCM-THEME-14` implements.
- No per-app dark identity. An app's dark primary stays that app's own, just as its light one does.
- No automatic switching (`prefers-color-scheme`) and no toggle component. Apps own their switch.

## Tier · precondition / gate

- **Tier 2 · tests: none (document only).** It decides the future content of shared-core, but it does
  not change shared-core. The code change is `UCM-THEME-14`, which is Tier 3.
- Precondition: none.
- Gate: **the operator freezes the sheet**, and the sheet itself says so with a dated section. Until
  then `UCM-THEME-14` does not start.

## Risks

- **A dark palette drawn from a single app's handoff becomes that app's palette for everyone.**
  webshop-guenter's values are one input to the inventory, not the answer. It keeps its own values as
  identity in any case (`WSG-THEME-1`).
- **Status tints (`bg`) are the class that breaks first on dark.** A light tint over a dark page fails
  contrast in the other direction.

---

# B. Implementation map

*Not applicable. This is an Expertenchat document order, authored in-session with the operator.*

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this: STOP.** There is no implementer for this order.

Register: row -> `done` with the commit of the frozen sheet. Downstream: `UCM-THEME-14` unblocks.
