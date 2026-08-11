# THEME-3 — Add the missing "subtle surface" baseline token

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`; a push touching
`src/**`/`package.json` publishes to npm immediately via `publish.yml`)
**Tier:** 3 — shared-core theme baseline, consumed by every `createAppTheme` adopter.
**Review:** independent `reviewer` **and** `ui_reviewer`, concurrently, both mandatory before commit
(no staging net in this repo — the independent review is the only gate and is not back-fillable).
**Found by:** `cockpit/UI-6` (adopting `createAppTheme` with the frozen `UI-4` token table). The
sheet's canonical token table (section 8, "what cockpit stops owning") lists an *inset surface*
`#F4F5F6` as a baseline-supplied value, replacing `cockpit.surface2` (16 of 195 token reads in that
WO). It does not exist anywhere in the shipped package — confirmed by grepping
`src/theme/tokens.js`/`themeCompleteness.js` for the hex and for any "surface"/"inset" key. The value
was one of the design-language instrument's *own* internal comparison-stack entries
(`cockpit/work-orders/assets/UI-4-design-language.html:681`), never actually wired into
`createAppTheme`. Per this estate's own rule ("a gap in the shared kit discovered mid-adoption is a
`ui-core-micha` work order and cockpit's item waits — not a local workaround"), `UI-6` is blocked on
this landing and publishing first.

---

## A. Envelope

### Goal

Add a third baseline background tier — `palette.background.subtle` — to `createAppTheme`'s shared
palette, for panels/table stripes/excerpt boxes that need to read as slightly recessed from
`background.paper` without a bespoke per-app colour. Register it in the completeness-assertion
surface inventory so every adopter (present and future) gets the same guarantee the other baseline
surfaces already have.

### Scope

1. **`src/theme/tokens.js`** — add `background.subtle: '#F4F5F6'` to `BASELINE_PALETTE.background`
   (alongside the existing `default`/`paper`). This is a **fixed baseline constant**, not
   accent-derived — the same treatment as `default`/`paper`, not the accent-tint derivation used for
   `cockpit.accentTint`.
2. **`src/theme/themeCompleteness.js`** — add `pathSurface('palette.background.subtle')` to
   `THEME_COMPLETENESS_SURFACES`.
3. **Recompute the contrast claim independently** — the frozen sheet's "muted ink on it: 4.81" was
   computed on the sheet's own static comparison canvas, not via this package's
   `calculateContrastRatio`. Recompute `calculateContrastRatio('#5B6670', '#F4F5F6')` (baseline
   `ink.secondary`, the tone most likely to sit on this surface) directly against the shipped
   function before treating the sheet's number as confirmed.
4. Publish (version bump — see Risks for the semver call).

### Non-goals / do not touch

- Renaming or removing any existing palette token.
- `CHART-*`/`SHELL-*`/`AUTH-*` surfaces — unrelated to this addition.
- `fitness-monitor` or any other consuming app's own repo — this WO lands and publishes the token
  only; `cockpit/UI-6` consumes it afterward, in its own repo, as a separate step.
- Any accent-derived tint/shade math — this token is a fixed baseline value, structurally unlike
  `cockpit.accentTint`/`accentLight`/`accentDark`.

### Risks

- **`fitness-monitor` is a real, already-shipped adopter** (`frontend/src/theme.js` +
  `frontend/src/theme.test.js`) that hard-asserts `assertThemeComplete(theme).findings` equals `[]`.
  A new *required* completeness surface must resolve automatically for every adopter with zero
  app-level action — the same guarantee `background.default`/`background.paper` already give,
  **not** an opt-in the app must declare. Concretely: the new key must come from
  `BASELINE_PALETTE` so every real `createAppTheme(...)` output has it defined, and MUI's own
  default theme must never define `background.subtle` itself (a novel key — verify this, don't
  assume it), so `descriptor.get(MUI_DEFAULT_THEME)` returns `undefined` and the "still equals MUI's
  untouched default" branch never fires. If either assumption is wrong, `fitness-monitor`'s CI
  breaks on its next pin bump and this WO must not ship that way.
- **Semver classification** — additive to the factory's *output* (no adopter passes anything new to
  get it), which argues for a patch, mirroring `SHELL-4`'s "narrows the contract, cannot turn
  cockpit red" precedent in the opposite direction (widens the contract, but resolves automatically,
  so it also cannot turn an adopter red). Confirm no adopter needs a code change before treating
  this as settled rather than asserting it.
- **Do not silently rename cockpit's `surface2` in this repo** — this WO adds the baseline token;
  cockpit's own re-point of 16 call sites from `cockpit.surface2` to the new baseline token is
  `UI-6`'s job, in cockpit's repo, not this one's.

### Required tests to WRITE

1. `assertThemeComplete` stays empty-findings for a minimal adopter call —
   `createAppTheme({ palette: { primary: { main: '#0F62FE' } } })` (mirroring `fitness-monitor`'s
   real usage) — proving the new surface resolves with zero adopter action, not just for a theme
   that happens to declare it.
2. `theme.palette.background.subtle` equals `'#F4F5F6'` on an unconfigured `createAppTheme(...)`
   call.
3. `calculateContrastRatio('#5B6670', '#F4F5F6')` (baseline `ink.secondary` on the new surface)
   passes AA (≥ 4.5:1) — computed via the shipped function, not asserted from the sheet's number.
4. Existing `tests/createAppTheme.test.js` and `tests/themeCompleteness.test.js` stay green
   unmodified in intent (only extended where the new surface must appear in an enumeration they
   already assert against, e.g. a surface-count or key-list check if one exists).

### Verification

No visual/prototype gate — this is a token-level palette addition with no rendered specimen of its
own in this repo. The rendered check for what this token actually looks like on real cockpit
surfaces happens downstream, in `cockpit/UI-6`'s own two-width verification.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

### Context package

- **`src/theme/tokens.js`** — `BASELINE_PALETTE.background` currently reads:
  ```js
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
  },
  ```
  Add `subtle: '#F4F5F6'` as a third key. This is the ONLY change needed in this file for the new
  value itself — do not touch `SERIES_COLOURS`, `STATUS_KEYS`, `BASELINE_STATIC`, or the exemptions
  list.
- **`src/theme/themeCompleteness.js`** — `THEME_COMPLETENESS_SURFACES` (around line 155-192) already
  has `pathSurface('palette.background.default')` and `pathSurface('palette.background.paper')` in
  its list. Add `pathSurface('palette.background.subtle')` immediately next to them — same helper,
  same pattern, no new machinery needed.
- **Why this can't collide with an existing adopter (verified, not assumed):** `MUI_DEFAULT_THEME =
  createTheme()` (line 5 of `themeCompleteness.js`) is vanilla MUI with no `background.subtle` key —
  MUI's own palette only ever defines `background.default`/`.paper`. So for every real
  `createAppTheme(...)` output, `descriptor.get(theme)` resolves to `'#F4F5F6'` (defined) while
  `descriptor.get(MUI_DEFAULT_THEME)` resolves to `undefined` — the `sameValue` check in
  `assertThemeComplete` (around line 354) therefore never flags it, with no exemption required. This
  is exactly why `background.default` needs no exemption today; `background.subtle` gets the same
  treatment. `background.paper` is the one that DOES need an exemption, because MUI's own default
  theme also happens to be white — do not copy that exemption pattern here, it does not apply.
- **`calculateContrastRatio` is already exported** from `src/theme/themeCompleteness.js` and
  re-exported from `src/theme/index.js` — use it directly for the required contrast test, do not
  reimplement contrast math.
- **Test file conventions** (read `tests/themeCompleteness.test.js` and
  `tests/createAppTheme.test.js` for the existing style before writing new assertions — minimal
  `createAppTheme({ palette: { primary: { main: '#0F62FE' } } })` is the repo's own established
  "minimal adopter" fixture, already used in both files; reuse it rather than inventing a new one).
- Directive: work from this package; do not explore broadly from scratch; open only the two named
  source files plus the two named test files to verify. If you must dig deeper, delegate to a
  read-only Explore sub-agent (Haiku).

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Preamble

> The text of this whole file is the COMPLETE spec — not a plan to refine; there is no separate plan
> file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and this repo's
> own `DESIGN.md`/conventions ONLY for conventions. Stay in scope; do not touch
> `CHART-*`/`SHELL-*`/`AUTH-*` surfaces or any file outside `src/theme/` and `tests/` unless this
> spec says so; do not update any `MEMORY.md`. Do NOT `git add` / `commit` / `push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review; do NOT bump
> `package.json`'s version yourself — the Orchestrator decides and applies the semver bump after
> review, per the Risks section's still-open patch/minor question. WRITE the tests the "Required
> tests to WRITE" section calls for AND **RUN the tests you just wrote** (plus the two named existing
> spec files, to confirm no regression) to confirm they execute and pass — that is the ONLY test run
> you do (NOT this repo's full suite, NOT any review). The orchestrator re-runs the authoritative set
> + does the independent review after you finish — those are the gate; your own run does not count
> as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

## C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.** You ARE the invocation described
> below; do NOT shell out to `codex exec`.

### Execution directive

Implement through `codex exec` in the background — invoked directly via Bash (never the
`debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`. **Pass the work order via stdin, not as a positional
argument** (this repo's own `THEME-1` row already documents the Windows command-line length limit
hitting this via the npm shim). Fallback to direct Claude implementation only on Codex
quota/rate-limit/non-zero exit — the fallback flips authorship, so both reviewers stay mandatory
either way.

### Review routing

Tier 3: `reviewer` (Sonnet) + `ui_reviewer` (Sonnet), concurrent, same background batch, before
commit. No `sec_reviewer` — no auth/security surface in scope. `ui_reviewer`'s job here is narrow
(no rendered surface to review) — focus it on the completeness-contract and adopter-safety question
rather than visual design.

### Verification

No rendered two-width check — token-only change with no specimen in this repo (per the Envelope).
The authoritative check is: the two new/extended test files pass, `tests/createAppTheme.test.js` +
`tests/themeCompleteness.test.js` stay green, and a direct read of `fitness-monitor`'s
`frontend/src/theme.test.js` assertion confirms it would still pass unmodified against the new
package version (do not just reason about it — actually run `fitness-monitor`'s own scoped theme
test against the locally-built `ui-core-micha` if practical, or explain why not).

### Register + commit

Decide and apply the semver bump (patch, per the Risks section's reasoning, unless the
implementation reveals an adopter needs a code change — then escalate to minor and say why). Update
the `WORK_ORDERS.md` THEME-3 row to `done` with the named review verdicts and version, then commit +
push to `main` on green (this push publishes to npm — confirm everything is green first, there is no
staging net here).

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/THEME-3.md`. **Ready to run** — no preconditions, small well-bounded addition.
Follow `orchestrate-codex`.
