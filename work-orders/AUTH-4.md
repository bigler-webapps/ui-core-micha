# AUTH-4 — The account user list on a phone

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — both mandatory, concurrent
**Version target:** the next **minor** after `SHELL-5` — the component gains a responsive mode it did
not have, which is a capability rather than a fix. Read the published version at implementation time.
**Prototype:** `work-orders/assets/AUTH-4-user-list-card.html` — the **composition** spec. The
two-width rendered side-by-side is therefore a commit gate.
**Sequencing:** **after `SHELL-5`.** Both are ucm work orders on the same screen; `SHELL-5` changes how
the users section is *reached*, this changes what is *in* it.
**Strand:** split out of `DS-11` by operator decision, because its fix class differs from the
navigation shell's.

---

## A. Envelope

### Goal

`UserListComponent`'s table is right for a desktop and unusable on a phone. Give it a card layout
below `md`. Above `md` **nothing changes**.

### The driver, measured 2026-08-11 in cockpit

All figures at `innerWidth` **411** CSS px — the mobile preset yields 411, not 375, so at the real
target every figure is worse.

| | measured |
|---|---|
| Table width | **1053 px** |
| Container | **325 px** → 728 px of overflow |
| Container `overflow-x` | `auto`; **the document does not overflow** |
| Columns | Email 220, Name 180, New 90, Successful Login 163, Role 180, Actions 220 |
| Cell padding | `10px 16px` — already the baseline's `density.tableCellPadding` |

**This is not a broken layout.** The container scrolls and the page does not. It is a desktop table
shown unchanged on a phone, with Role and Actions — the two things the screen exists for — entirely
outside the view.

**The cheap fix was tested and does not work.** 253 px of that width is `New` (90) and
`Successful Login` (163), both **default-on props an app can switch off today** —
`AccountPage` forwards all of them (`AccountPage.jsx:238-240`), and cockpit simply left the defaults.
But the four remaining columns are Email 220 + Name 180 + Role 180 + Actions 220 = **800 px** against
a 325 px container. **Configuration cannot fix this; only structure can.** That is now established
rather than assumed.

`SHELL-2` measured 1045 px on 2026-08-08 and it is 1053 px today (+8 px), so the number is stable —
`THEME-4`/`THEME-5` did not move the rendered density.

### Why cards and not a scrolling table

The component is **interactive per row**: the role is an inline `Select`
(`UserListComponent.jsx:358-364`), there is a delete action plus app-supplied `extraRowActions`
(`:425-451`), a search field (`:506`), sortable columns (`:541`) and pagination. An administrator
opens this screen to **change a role** or **remove someone**. Any layout that puts those behind
horizontal scrolling defeats the screen's purpose — which is why a sticky-first-column table was
considered and rejected: it makes the defect tolerable instead of fixing it.

### Scope

Below `md`, one card per user. The prototype is the composition spec; **four decisions in it are
load-bearing and must not be quietly re-decided:**

1. **The email is the card title, the name is secondary.** The email is what an administrator
   searches by and the only guaranteed-present field. A user without a name gets a **muted
   placeholder**, not an empty line. Verified in the prototype: a 47-character address wraps to two
   lines via `overflow-wrap: anywhere` without overflowing a 357 px card.
2. **The two boolean columns become labelled chips.** In the table they are icon-only with a
   `Tooltip` (`:187-195`) — and **a tooltip is unreachable on a touch pointer**, so the information is
   effectively absent on the device this work order is about. Chips carry the words. This is a
   deliberate small improvement over strict parity, not drift, and it is why the flags cost vertical
   space instead of being dropped.
3. **Role and delete sit in a footer behind a divider.** They are the actions; separating them keeps
   the card's top half purely identifying. The select fills the remaining width so its value is never
   truncated; delete keeps the full 44 px touch target.
4. **Sorting needs its own control.** A card list has no column headers to click, so the
   sortable-column affordance **disappears with the table**. A compact sort control sits beside the
   search field. Without it the mobile view silently loses a capability the desktop has — the kind of
   regression that is invisible in a diff and that no test would catch unless it is asked for. It is
   asked for here.

**What the app supplies must keep working**, since the column set is app-configurable:

| Input | In the card |
|---|---|
| `extraColumns` | rendered as **label: value** rows below the chips, in the given order. **No new required field** on the column definition — an app that passes columns today keeps working unchanged. |
| `extraRowActions` | join delete in the footer. **Beyond three actions total they must collapse into an overflow menu**, or the footer wraps and the card loses its shape. |
| `showNewColumn` / `showSuccessfulLoginColumn` / `showRoleColumn` | chips (or the role select) when on, **absent** when off — a shorter card, not an empty chip row. |

### Non-goals / do not touch

- **The table above `md`.** Byte-identical. Six columns are scannable at 1136 px and the strip beside
  them has 570 px of headroom.
- **The column defaults.** `New` and `Successful Login` stay default-on. Flipping them would be a
  silent change to the account screen in every app — a separate decision, not a side effect of this
  work order.
- **The delete confirmation dialog**, the invite flow, the role list an app supplies, and every other
  account section.
- **The section navigation** — that is `SHELL-5`.
- No permission, data-contract or API change. No new required prop. No baseline token change: the
  card consumes tokens and introduces none, so there is **no token delta list**.
- No pagination or search redesign; both stay, above the list.

### Risks

- **`AccountPage` is mounted by at least ten apps** — bigler-consult, cockpit, fitness-monitor,
  hpc-bridge, hram, innoservice, jg-ferien, kerzenziehen, reimbursements. The account screen's user
  list changes on a phone everywhere at once, and there is no staging net: a version bump on `main`
  publishes. The two reviews and the rendered gate carry it.
- **Two renderings to keep in step.** From now on a change to a column must be made twice, or the
  card and the table drift. Tests 3 and 4 below are what make the drift visible.
- **A long list of cards is a long scroll.** Mitigated by the existing search and pagination, not by
  this work order — and worth watching in an app with many users rather than asserting it is fine.
- **`extraRowActions` beyond three** is the shape's real limit. The overflow-menu rule is in scope
  precisely so the limit is handled rather than discovered.

### Required tests to WRITE

1. Below `md` the card list renders and no `<table>` is present; at `md` and above the table renders
   and no cards are. **Prove both directions** — a one-sided test passes on a component that never
   switches.
2. A user without a name renders the muted placeholder, not an empty element.
3. `extraColumns` appear as label/value rows in the card, in the given order, and still as columns in
   the table.
4. `extraRowActions`: three or fewer render inline in the footer; **more than three collapse into an
   overflow menu**.
5. Each of the three column toggles set to `false` removes its chip from the card **and** its column
   from the table — no empty chip row.
6. The mobile sort control changes the order, and the sortable column headers still work above `md`.
7. Pagination and search still function in the card mode.
8. `THEME-4`'s shadowing check still returns no findings — any `sx` the card introduces must not
   duplicate a baseline `styleOverrides` key. The card uses `MuiCard`, which the baseline styles, so
   this is a live risk rather than a formality.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — affected set is
`UserListComponent`'s spec, `AccountPage`'s, and the theme spec touched by test 8.

### Verification

The **two-width rendered side-by-side at 375 px and 1280 px** against the prototype, per the standing
gate. Measure, do not eyeball, the number this work order exists to fix: **at 375 px no element may
exceed its container**, and the 728 px of overflow must be gone. At 1280 px the table must be
unchanged — compare it against the prototype's section 3, which exists so that "unchanged" is part of
the spec rather than an omission.

State whether real screenshots were obtained or DOM/computed-style inspection substituted. Capture has
failed repeatedly in this estate; the substitution is declared, not silent.

### Parity guardrail

Presentation only, with the one stated exception: the boolean flags gain visible labels because their
tooltip is unreachable on touch. Every datum the table shows, the card shows. No behaviour, no
permissions, no data contract, no routing.

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
> `WORK_ORDERS.md`. The preamble now forbids editing that file; verify it was respected.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/AUTH-4.md`. **Run after `SHELL-5`.** Follow `orchestrate-codex`.
