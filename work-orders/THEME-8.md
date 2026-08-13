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

## Part B — Implementation map (implementer)

PLACEHOLDER — Orchestrator fills this on `git pull`: context package with `path:line`
anchors (`src/theme/tokens.js` around the `MuiSelect` block and the five correct
comparators), the absolute working directory, the progress contract and the preamble. Not
dispatchable while this placeholder stands.

## Part C — Orchestrator only

**STOP — addressee guard.** If you are the implementer reading this file as your own spec:
this part is not addressed to you. It tells the Orchestrator how to invoke you; you ARE that
invocation — do not shell out to `codex exec`. Stop reading at this line.

- **Execution.** Codex first per the tier rule, unless the status record says otherwise.
- **Review routing.** `reviewer` mandatory; `ui_reviewer` too, since the visible result is a
  layout change across every consumer.
- **Verification.** The package's own suite, plus a **rendered check in a consuming app**:
  a select in a table row and a select beside a text field, both re-measured for equal space
  above and below the text. State which machine (coarse or fine pointer) the measurement ran
  on.
- **Register & commit.** Advance the THEME-8 row with the reviewer verdict and the measured
  before/after numbers. Then track the consumer pin bumps — this WO is not done at publish.
