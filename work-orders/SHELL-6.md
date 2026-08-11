# SHELL-6 — A controlled `SectionNav` with no way to open must not render a trigger

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — both mandatory, concurrent
**Version target:** the next **patch** after the published version. A defect fix, no API change, no
consumer relying on the current behaviour. Read the published version at implementation time.
**Unblocks:** `jg-ferien/NAV-37`, currently `blocked` (`c627d7b`)
**Follows:** `SHELL-5` (`2.36.0`)

---

## A. Envelope

### Goal

In `mode="mobile"`, `SectionNav` renders its built-in trigger **unconditionally**
(`src/layout/SectionNav.jsx:246`). In controlled mode `handleTriggerClick` calls `onOpen?.()`
(`:200-206`), so a consumer that drives `open` itself and passes no `onOpen` gets a button that is
**visible, focusable and does nothing**.

Make the trigger render only when it can actually open the drawer.

### This is a defect, not a missing configuration

A control that receives focus and performs no action is wrong on its own terms — it is an
accessibility defect independent of any consumer's wishes. That is why the fix is the **semantics**
rather than a `showTrigger` prop: a prop would make the dead button the default for every controlled
consumer who has not heard of the prop, turning a defect into a configuration option.

**Nothing today relies on the current behaviour.** `AccountPage`, the only shipped consumer, is
**uncontrolled** (it passes no `open`), so its trigger keeps rendering unchanged. `jg-ferien` is the
consumer that hit this and is blocked on it.

### How it shipped, and the rule that follows

`SHELL-5`'s Envelope specified that the component *has* a trigger and never said *when it renders*.
The implementation made it unconditional — correctly, given the spec. `NAV-37` then assumed that
omitting `onOpen` suppresses it; that assumption appears nowhere in `SHELL-5`.

**The uncovered cell and the untested cell were the same cell.** Every existing mobile test is either
uncontrolled (`:192`, `:210`) or controlled *with* `onOpen` (`:161`) — verified. So this fix breaks no
existing test, which is the point: the case was never specified, therefore never tested, therefore
shipped.

**Hence the second deliverable below: write the render matrix down.** A prop table plus a scope
narrative reads complete and is not.

### Scope

**1. The fix.** In the mobile return path, render the `<ButtonBase>` trigger only when a click can do
something: uncontrolled (the component owns `internalOpen`), or controlled **and** `onOpen` supplied.
`children` and the `<Drawer>` keep rendering in every case — `jg-ferien` needs exactly that: its own
triggers, the shared drawer, its content.

**2. The render matrix, in the component's own doc comment.** This is not optional documentation; it
is the artefact whose absence caused the defect.

| `mode` | `open` | `onOpen` | trigger | sidebar | `children` | drawer |
|---|---|---|---|---|---|---|
| `desktop` | ignored | ignored | — | yes | yes, in the grid | — |
| `mobile` | absent (uncontrolled) | ignored | **yes** | — | yes | yes, internal state |
| `mobile` | given | given | **yes** | — | yes | caller-driven |
| `mobile` | given | **absent** | **no** ← this WO | — | yes | caller-driven |

Plus the optional-part cells, all already correct and worth recording so they stay that way:
`overviewItem` absent → no overview entry and no empty `Paper`; `rememberedKey` absent → no secondary
line; `title` absent → `t('SectionNav.TITLE')`; `triggerEyebrow` absent → `t('SectionNav.TRIGGER_EYEBROW')`.

### Non-goals / do not touch

- **No new prop.** Not `showTrigger`, not `hideTrigger`. The operator considered and rejected both:
  they would leave the dead button as the default. A consumer wanting "controlled **with** `onOpen` but
  my own trigger too" has no representation after this WO — that case has no consumer today and adding
  a prop for it is the speculative generality the YAGNI guardrail rejects.
- **The desktop path** — untouched, including the grid, `sidebarWidth` and `headerOffset`.
- The drawer, its `zIndex` resolution, its safe-area padding, `SectionNavList`, and every label or
  i18n key.
- `AccountPage` — no change; it is uncontrolled and keeps its trigger.
- No baseline token change, no `kitSxRegistry` change. `SECTION_NAV_TRIGGER_SX` stays registered:
  `THEME-4`'s check is about key disjointness, not about whether an element renders.

### Risks

- **It is a behaviour change to a shipped component**, which is why "no consumer relies on it" is
  stated above rather than assumed. If a consumer outside this repo passes `open` without `onOpen` and
  wants the trigger, it breaks for them — verified as nobody today.
- **No staging net.** A version bump on `main` publishes; the two reviews are the only gate.
- **The condition must be `onOpen` supplied, not `open` supplied.** Keying it on the wrong prop would
  remove the trigger from the uncontrolled case as well, which is `AccountPage`'s only affordance.
  Test 3 exists for that.

### Required tests to WRITE

Extend `tests/SectionNav.test.jsx`.

1. **The fix, with non-vacuity.** `mode="mobile"` + `open` + **no** `onOpen` → **no** trigger button
   in the DOM, while `children` still render and the drawer still responds to `open`. **This test must
   fail against the current published version** — say so in the WO's landing note, since a fix whose
   test passes before the fix is not a fix.
2. Controlled **with** `onOpen` → trigger renders, clicking calls `onOpen`. (The existing `:161`
   already covers the call; assert the rendering explicitly.)
3. **Uncontrolled** → trigger renders and clicking opens the internal drawer. This is the guard against
   keying the condition on the wrong prop.
4. Desktop is unchanged in all three prop combinations.
5. `THEME-4`'s shadowing check still returns no findings.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — affected set is
`tests/SectionNav.test.jsx` and the theme spec touched by test 5.

### Verification

The change is the **absence** of an element in one prop combination, so the rendered gate has little to
add beyond the tests: assert the DOM, and confirm `AccountPage`'s own trigger still renders at 375 px.
If capture is unavailable, DOM inspection is the declared substitution — and here it is not a
fallback but the appropriate instrument, because "no button" is a DOM fact, not an appearance.

### Parity guardrail

`AccountPage` renders identically. The only intended change is that a controlled consumer without
`onOpen` no longer gets a dead button.

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
> and that flips authorship, so both reviewers stay mandatory either way.
>
> **Do NOT edit `WORK_ORDERS.md`**, and before your own review read `git log origin/main..HEAD` plus
> `git status`. Check the working tree first: `NAV-37`'s rejected CSS workaround lives uncommitted in
> `jg-ferien`, and other sessions have been active in this repo throughout this strand.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/SHELL-6.md`. Unblocks `jg-ferien/NAV-37`. Follow `orchestrate-codex`.
