# THEME-8 — The select touch target sits on the wrong element and pushes its text off-centre

## Part A — Envelope

**Goal.** Move the baseline's touch-target minimum height for `MuiSelect` from the inner
`select` slot to the input root, so the existing flex centring can do its job. Every
consuming app's select text is currently top-anchored instead of vertically centred.

**Why — measured, not inferred.** `src/theme/tokens.js` sets

```js
MuiSelect: { styleOverrides: { select: {
  minHeight: 40,
  '@media (any-pointer: coarse)': { minHeight: 44 },
} } }
```

`.MuiSelect-select` is the element that carries MUI's variant-dependent padding, and for
the `standard` variant that padding is deliberately top-anchored (`1px 24px 5px 0`). Forcing
a 40/44 px height onto a `display: block` element whose content needs ~26 px puts the whole
surplus below the text, so the text rides high in its box.

Measured live in a consuming app (hram, Administration → Users, a select inside a table
cell), then verified by moving the rule to the root at runtime:

| | space above the text | space below |
|---|---|---|
| today | 0 px | 0 px — inner stretched to 44 px, top-anchored |
| min-height on the root instead | **9 px** | **9 px** |

The root (`MuiInputBase-root`) is already `display: flex; align-items: center`, so it centres
the natural-height inner element for free.

**This is an inconsistency inside the baseline, not a design choice.** Of the six components
that carry a touch target — `MuiButton`, `MuiIconButton`, `MuiSelect`, `MuiCheckbox`,
`MuiFormControlLabel`, `MuiTextField` — **`MuiSelect` is the only one that targets a
non-root slot.** The other five all use `root`.

**Amplified on touch-capable machines.** The `@media (any-pointer: coarse)` branch raises it
to 44 px, and a laptop with a touchscreen matches that query. The operator's machine reports
`any-pointer: coarse`, which is why it looks worse there than on a non-touch machine — the
same defect, 4 px larger.

**Scope.**

1. Move the minimum height off `styleOverrides.select` and onto the root, keeping both the
   base value and the coarse-pointer branch. **Verify which root actually receives it** —
   `MuiSelect`'s `root` slot composes with the underlying input, and the outlined and
   standard variants compose differently; if `MuiSelect.root` does not carry it cleanly for
   both, `MuiInputBase.root` is the alternative. Decide by measuring in a running app, not
   by reading the MUI source.
2. Check the outlined variant does not grow taller than a neighbouring `MuiTextField` after
   the move — `MuiTextField` already carries its own root min-height, so the two must still
   line up in a form row.
3. A test that pins the intent: assert the minimum height is not applied to the `select`
   slot (or, better, assert the rendered inner element's natural height is preserved). A
   test that only checks "44 px somewhere" would pass on the broken version too.

**Non-goals / do-not-touch.** Do not change the touch-target *value* (40 / 44) — the size is
correct, only its anchor is wrong. Do not touch the other five components; they are already
correct. No colour, typography or density changes. Do not "fix" this per-app with an sx
override in a consumer — that is what this baseline exists to prevent.

**Tier 3** — shared-core surface. `reviewer` mandatory. Every consuming app's selects change
appearance (for the better), which is exactly why it belongs here rather than in one app.

**Tests to write.** The intent test above, plus whatever existing theme/completeness suite
covers component overrides. Keep it small; the real proof is the rendered measurement.

**Risks.**
- **Estate-wide visual change.** Every app using the baseline gets subtly taller-looking
  select rows or re-centred text. That is the fix, but it will be visible in apps nobody is
  currently working on — name it in the release notes rather than letting it surprise someone.
- Moving a min-height between slots can change how a select aligns next to a text field in
  the same row. Scope item 2 exists for that; check it in a real form, not in isolation.
- The coarse-pointer branch means a reviewer on a non-touch machine sees 40 px and a milder
  version of the defect. Say which machine the verification ran on.

**Delivery is not done at publish.** A version bump alone does not fix any app. The
consuming apps still need their pin bumped and a look at their own forms — hram in
particular, where this was found. Track the consumer bumps rather than closing this WO at
the npm publish.

## Part B — Implementation map — ADDRESSED TO THE IMPLEMENTER

### Context package

**Named file to change:** `src/theme/tokens.js`, the `MuiSelect` block, currently:

```js
MuiSelect: {
  defaultProps: { variant: 'outlined' },
  styleOverrides: {
    select: {
      minHeight: 40,
      boxSizing: 'border-box',
      '@media (any-pointer: coarse)': { minHeight: 44 },
    },
  },
},
```

(around `src/theme/tokens.js:255-264`). The shared coarse-pointer helper used by every other
component sits just above it:

```js
const coarseHitArea = {
  '@media (any-pointer: coarse)': {
    minHeight: 44,
    minWidth: 44,
  },
};
```

(`src/theme/tokens.js:135-140`). The five correct comparators, for the target shape (all use
`styleOverrides.root` and the shared `coarseHitArea` spread):

- `MuiButton` — `src/theme/tokens.js:233-245` (`root: { minHeight: 40, ..., ...coarseHitArea }`)
- `MuiIconButton` — `:249-251`
- `MuiCheckbox` — `:265-267`
- `MuiFormControlLabel` — `:268-273`
- `MuiTextField` — `:334-337`

Also relevant: `MuiOutlinedInput` already sets `root: { minHeight: 40, ...coarseHitArea }`
(`:338-346`) — since `MuiSelect` with `variant: 'outlined'` (the default here) composes with
`MuiOutlinedInput`'s root, moving `MuiSelect`'s own min-height onto `MuiSelect.styleOverrides.root`
must not double up with that existing rule for the outlined variant. Measure both variants
(`outlined` default, and `standard` where used) in a running app before deciding whether the
target is `MuiSelect.styleOverrides.root` or `MuiInputBase.styleOverrides.root` — the Envelope
already flags this as a measure-don't-read decision.

**Second file:** `src/theme/themeCompleteness.js` references the old path and must move with it:

```
75:  componentPath('MuiSelect', 'defaultProps.variant'),
76:  componentPath('MuiSelect', 'styleOverrides.select.minHeight'),
77:  componentKeyLeaf('MuiSelect', 'styleOverrides.select', '@media (any-pointer: coarse)', 'minHeight'),
```

Update lines 76-77 to point at wherever the min-height actually lands (`styleOverrides.root...`
or `styleOverrides.select` removed entirely if the property is dropped from that slot) — keep
line 75 (`defaultProps.variant`) as is, it is unrelated. This file drives the baseline's own
completeness assertion; a stale path here makes the completeness suite pass against dead code.

**Existing test suite for reference:** `tests/themeCompleteness.test.js` — no existing test
references `MuiSelect` by name today, so the new intent test (Envelope scope item 3) is net new,
not a modification of an existing case.

**Invariants / do-not-touch:** the touch-target *value* stays 40 / 44 — only the slot changes.
Do not touch `MuiButton`, `MuiIconButton`, `MuiCheckbox`, `MuiFormControlLabel`, `MuiTextField`,
or `MuiOutlinedInput` beyond what's needed to avoid the double-application noted above. No
colour/typography/density changes anywhere in this diff.

Directive: work from this package; do not explore broadly from scratch; open only the named
files to verify. If you must dig deeper, delegate to a read-only Explore sub-agent (Haiku).

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Preamble — REQUIRED, addressed to the implementer

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine;
> there is no separate plan file. Read the nearest `AGENTS.md`, the relevant
> `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope;
> do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update
> `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md`** — the register row and the review verdicts are
> the orchestrator's alone. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in
> the working tree for the orchestrator's independent review. WRITE the tests the "Required
> tests" section (Part A) calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any
> review). The orchestrator re-runs the authoritative set + does the independent review after
> you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

## Part C — Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this
> line. Everything below describes what the Orchestrator does AFTER you finish. You do none of
> it — no reviewers, no verification run, no register edit, no commit.** You ARE the invocation
> described below; do NOT shell out to `codex exec`.

## Execution directive

Implement through `codex exec` in the background — invoked directly via Bash (never the
`debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`. Fallback to direct Claude implementation only on
Codex quota/rate-limit/non-zero exit — the fallback flips authorship, so an independent
`reviewer` becomes mandatory (already required at Tier 3, so no incremental change there).

## Review routing

`reviewer` mandatory (Tier 3); `ui_reviewer` too, since the visible result is a layout change
across every consumer. Both spawned in the same background batch, Sonnet-pinned (Tier 3), diff
inline, pointed at this WO's Envelope only.

## Verification

The package's own suite (`tests/themeCompleteness.test.js` plus the new intent test), plus a
**rendered check in a consuming app**: a select in a table row and a select beside a text field,
both re-measured for equal space above and below the text. State which machine (coarse or fine
pointer) the measurement ran on.

## Register + commit

Advance the THEME-8 row with the named reviewer verdicts and the measured before/after numbers.
Then track the consumer pin bumps (hram first) — this WO is not done at npm publish.
