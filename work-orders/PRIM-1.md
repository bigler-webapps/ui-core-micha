# PRIM-1 — Promote `StatTile` and `SoftChip` into the shared kit

**Target repo:** `ui-core-micha` (branch `main`)
**Tier:** 3 — shared-core.

New register prefix `PRIM-*`: shared dashboard/data primitives — small presentational components that
are neither chart (`CHART-*`) nor app chrome (`SHELL-*`).

---

## A. Envelope

### Goal

Both components already exist **twice**, built independently, and the second build in each case is an
**inline component inside a page** rather than a file — which is why a filename search misses it:

| Component | First build | Second build |
|---|---|---|
| `StatTile` | `hram/frontend/src/components/ResearchComponents/StatTile.jsx` (36 lines) | `fitness-monitor/frontend/src/pages/BodyHistoryPage.jsx:554-568` |
| `SoftChip` | `hram/frontend/src/components/ResearchComponents/SoftChip.jsx` (67 lines) | `cockpit/frontend/src/cockpit/BoardView.jsx:65-73` (the lane pill) |

Promote both into the kit as the single implementation. The promotion trigger is met on evidence — two
independent builds each, and a third app in view for each.

### The visual spec, and the seven decisions in it

**Prototype:** [`work-orders/assets/PRIM-1-dashboard-primitives.html`](work-orders/assets/PRIM-1-dashboard-primitives.html).
It renders the promoted spec at 375 px and 1280 px, keeps both original builds side by side as the
record of what changed, and computes its contrast ratios in-page against the *blended* fill.

The two builds diverged in seven places. All seven were decided by the operator on 2026-08-12, and the
prototype already reflects them:

| | Decision | Which app changes |
|---|---|---|
| StatTile value size | **`h5` — 18/600** | hram, 16 → 18 |
| StatTile digits | **`tabular-nums`, always** — it is what makes a KPI row read as a row | fitness-monitor |
| StatTile row behaviour | **`flex: 1` with a `minWidth` floor** — one rule covering both existing behaviours, no prop | hram, tiles now share the row |
| StatTile `accent` | **kept** — 2 px `primary.main`; without it fitness-monitor cannot adopt | neither |
| StatTile padding | **responsive `{xs: 1, sm: 1.5}`** | hram, was fixed |
| SoftChip `status` typography | **`overline` — 11/600, uppercase, .4 px tracking** | hram (`passed` → `PASSED`); cockpit drops 700 → 600 |
| SoftChip leading element + border | **dot by default, any icon via prop; border optional** | neither — both adopt unchanged |

**Why `overline` rather than a new variant:** cockpit's build independently arrived at 11-with-uppercase-
and-.4 px-tracking, which is the baseline's `overline` in all but the weight step. So the shared choice
is what the second consumer already made, and it satisfies `THEME-4` **without a baseline change**.

### Token delta list

**One entry** — the rest is drawn from the baseline's own tokens, so there is nothing else to reconcile.

- **`caveat` variant text: 12/500.** The baseline's nearest variant is `caption` at 12/**400**; there is
  no 12/500. **Resolved by the operator as: keep the prototype value, do not add a baseline variant in
  this WO.** It will surface as a `THEME-4` finding on the promoted component and must be **exempted
  with that reason stated** — not silently flattened to 400, and not fixed by extending the baseline
  here. Adding a variant is an app-level decision that does not belong inside a component promotion.

### Scope

1. **`StatTile`** as a kit component, per the decisions above. Props: `label`, `value`, `caption`,
   `accent`, `children`, and a `minWidth` floor with a sensible default.
2. **`SoftChip`** as a kit component. Props: `label`, `tone` (`success`/`warning`/`error`/`info`),
   `variant` (`caveat`/`status`), `icon` (defaulting to the 6 px dot), a border toggle, and `title` for
   the tooltip.
3. **Colour derivation stays as authored** — fill `alpha(main, .12)`, border `alpha(main, .30)`, text and
   dot `darken(main, .3)`, read from `theme.palette[tone]`. **Do not restate any hex.** This is the
   property that makes the component exemplary and the reason its four tones all pass AA (measured in the
   prototype: 7.11 / 7.33 / 7.67 / 9.20).
4. **Keep `enterTouchDelay={0}`** on the tooltip. It is why SoftChip's `title` is reachable on a touch
   pointer — the exact failure `AUTH-4` is blocked on elsewhere. Do not drop it as boilerplate.
5. Exports from the package root, and the README line.

### Non-goals / do not touch

- **The three app adoptions.** hram, fitness-monitor and cockpit each get their own small follow-up WO.
  This WO ships the kit component and nothing in any app.
- **No baseline/theme change.** No new typography variant, no palette edit. See the token delta list.
- **The other primitives in hram's `ResearchComponents/`** — `CardTitle`, `InfoPopover`,
  `ProvisionalChip`, `FieldInfo`. `ProvisionalChip` wraps `SoftChip` and is the obvious next candidate,
  but it has one build and is out of scope here.
- **`SoftChip`'s `caveat` weight.** Left at 12/500 deliberately.
- Any chart wrapper, shell component, or existing kit surface.

### Risks

- **Two apps' visible appearance changes when they adopt** — hram's status chips become uppercase and its
  KPI values grow 16 → 18; cockpit's pills lose a weight step. All three are decided, not accidental, and
  all three land in the *adoption* WOs rather than here. Worth stating in each so nobody reports them as
  regressions.
- **Neither `StatTile` build has a test.** The promoted component's tests are written here from scratch,
  not ported. `SoftChip` has `SoftChip.test.jsx` in hram — read it, but do not assume it covers the
  promoted API.
- **`THEME-4` will flag the `caveat` 12/500.** Expected. Exempt with the reason; an unexplained exemption
  is itself a finding by that check's own design.
- **Version:** this is a new capability area (two new components), so a **minor** — `2.38.0` → `2.39.0`.

### Required tests to WRITE

- **`StatTile`**: renders label/value/caption; omits the value row when `value` is undefined; renders
  `children`; `accent` applies the 2 px border and the default does not; the value carries
  `tabular-nums`.
- **`SoftChip`**: each of the four tones derives fill/border/text from `theme.palette[tone]` rather than a
  literal (assert against the theme object, not against a hex string); `status` vs `caveat` differ in
  radius and typography; the default leading element is the dot and a passed `icon` replaces it; the
  border toggle works; `title` renders a tooltip and `enterTouchDelay` is 0.
- **Do not write a contrast assertion using `getContrastRatio`** — it ignores alpha, so on a 12 % tint it
  answers a different question and would pass while meaning nothing. The prototype computes the real
  ratios; if a contrast test is wanted it must blend the fill first.

Scope the run to these two new specs plus anything the new exports touch. Not the full suite — no
dependency change, no theme change.

### Parity guardrail

Visual and API only. The promoted components must be capable of rendering **both** existing builds'
appearances where a decision preserved them, and exactly the decided appearance where it did not. No
behaviour, permission or data-contract surface exists here.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

---

## C. Orchestrator only

> **STOP — if you are the implementer reading this work order as your own specification, this section is
> NOT addressed to you. Skip it entirely.** It tells the Orchestrator how to invoke you, how the result
> is reviewed, and how it is committed. **You ARE that invocation — do NOT shell out to `codex exec`, do
> NOT spawn reviewers, do NOT run tests beyond your own new ones, do NOT edit `WORK_ORDERS.md`, and do
> NOT `git add`/`commit`/`push`.** Leave the diff in the working tree.

### Execution directive

Check `.claude/codex-status.md` first. **No line for the current date means use Codex.** A line recording
`unavailable` for the current date means skip the attempt, implement directly in Claude, and name the
record and its date — that flips authorship. If the newest confirmation is older than today, make exactly
one probe and write the outcome back either way.

### Review routing

Tier 3: **independent `reviewer`** and **`ui_reviewer`**, concurrent, in one background batch, before the
commit. **No `sec_reviewer`** — no auth, permission, money or schema surface.

Ask `ui_reviewer` specifically whether the `overline` decision reads correctly at both variants, and
whether the `caveat` exemption is stated rather than assumed.

### Verification

**A prototype is in scope, so the rendered side-by-side at 375 px and 1280 px is a commit gate** — see
`AGENTS.md` → Reviews. Note the known constraint: the Browser pane composites only while displayed and
screenshots have not been legibly obtainable in this repo. If capture fails, **declare the substitution
in the register Notiz** and say what was inspected instead (computed styles, DOM) — an undeclared
substitution is a skipped gate, and that fallback cannot see whether a screen reads heavy or dense.

The prototype's own contrast numbers are computed at render time; re-read them rather than restating
these.

### Register + commit

One row, `PRIM-1`, with the `PRIM-*` prefix documented in the register header. `done` only with both
reviewers and their verdicts named, plus the rendered-gate evidence or its declared substitution.

Publishing is a separate step from committing: **a landed commit is not a publish.** If the three
adoption WOs are to follow, `2.39.0` must actually be on the registry first — verify against npm, not
against a commit.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/PRIM-1.md`. Promotes two components whose second builds are inline in
`fitness-monitor/BodyHistoryPage.jsx:554` and `cockpit/BoardView.jsx:65`. Seven divergences already
decided — the table in Part A is the spec, the prototype renders it. Tier 3, both reviewers, rendered
gate applies, minor version `2.39.0`. App adoptions are separate WOs. Follow `orchestrate-codex`.
