# THEME-2 — Two defects from the THEME-1/CHART-6 landings: `warning.main` contrast, and `grid` replacing instead of merging

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 2 (shared core — `ui-core-micha` is named in AGENTS.md's Tier-2 forcing list)
**Review:** independent `reviewer` **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Version target:** `2.31.1` (patch — one palette value corrected, one merge bug fixed, one assertion rule added; no API change)
**Decision record:** `webapp-management/DESIGN_SYSTEM_PROGRAM.md` → "Open follow-ups from the two landings"

Short-form WO: both defects are fully diagnosed and measured. There is no design question in either.

---

## A. Envelope

### Goal

Fix the two defects found after `THEME-1` (`96992cf`) and `CHART-6` (`6dedc62`) landed, and in each
case close the **mechanism** rather than only the instance — both are the same failure class as
something already fixed, which is why they recurred.

### Defect 1 — `warning.main` fails AA as a foreground

THEME-1's R1 fix gave every status channel an explicit `main`/`light`/`dark`/`contrastText` (correct
— MUI was otherwise filling its stock hues for `color="success"` and friends). It put the **fill**
tone in `main`. Measured against `#FFFFFF`:

| Channel | `main` | as foreground | |
|---|---|---|---|
| success | `#1B8038` | 5.010 | passes |
| error | `#BF3227` | 5.674 | passes |
| **warning** | `#C08A2C` | **3.038** | **fails AA (4.5)** |

`main`/`contrastText` pairs are all fine (warning 5.078 with dark ink). The failure is only when
`main` is used as a **foreground on a light surface** — `<Typography color="warning.main">`,
`color="warning"` on an icon, and an outlined warning chip, whose border and label both come from
`main`.

**Why warning specifically, and why this is not carelessness:** green and red can serve both roles
with one value. Amber cannot. A legible amber **fill** needs dark text on it and must therefore stay
light; a legible amber **text** must be dark. The two requirements pull in opposite directions.
Warning is the one channel where "one hex for both roles" is impossible in principle — so the
pattern that works for success and error had to break here.

**Fix:** `warning.main` = `#976100` (the text tone already in the same token block, 5.216 on white),
`contrastText` = `#FFFFFF`. The light amber stays available as `warning.fill` for deliberate fill
use, unchanged.

**Accepted visual consequence, stated so nobody treats it as a regression:** a filled
`color="warning"` Button/Chip becomes a darker brown with white text instead of a lighter amber with
dark text. That is the price of one token serving MUI's `main` contract, and it is the operator's
call already recorded in the programme doc.

**Close the mechanism, not just the value:** add an assertion rule that checks **every** status
channel's `main` against `#FFFFFF` and `background.default` at 4.5:1. Without it the next channel
added repeats this exactly — the existing contrast checks were designed before R1 introduced `main`,
which is why they did not catch it.

### Defect 2 — `grid` is replaced, not merged

`LineChart` and `BarChart` declare `grid = { horizontal: true }` as a plain default parameter and
pass it straight through. A caller writing `grid={{ vertical: true }}` — intending to *add* vertical
lines — silently loses the horizontal ones.

This is the same class as the `scaleType` bug the rendered gate caught during CHART-6: **a partial
caller object erases a default.** `xAxis`, `yAxis`, `margin` and `slotProps` all go through merge
helpers; `grid` alone does not.

**Fix:** merge `grid` with the default the way the sibling props already do, so a caller adds to it
rather than replacing it.

**Close the mechanism:** audit the remaining object-valued props the wrappers default or forward
(`slots`, `tickLabelStyle` and anything CHART-6 introduced) for the same replace-instead-of-merge
shape, and state the result — either "all others already merge" or a named list. **Audit and report;
do not refactor beyond `grid`** unless the audit finds another live instance, in which case fix that
too and say so.

### Non-goals / do not touch

- The other status channels' `main` values — success and error measure fine and stay.
- `warning.fill` / `warning.text` / `warning.bg` — unchanged.
- The reference sheet's committed HTML artifact. It is the frozen spec of the accepted baseline;
  `warning.main` is a channel the sheet never depicted (see Verification).
- Anything in `CHART-6`'s scope beyond the `grid` merge and the audit.
- No behaviour, permission or data-contract change.

### Risks

- **A palette value change is visible.** Any app already using `color="warning"` sees a darker
  filled control. No app has an adoption WO yet, so the blast radius today is ucm's own harness — but
  say it in the release note rather than let someone find it.
- **Adding an assertion rule can turn a green suite red.** Safe today by the ratchet: the
  completeness check is a hard failure only for an app whose adoption WO has landed, and none has.
  It must stay that way — the new rule must not become hard for non-adopters.
- **No staging net.** A push to `main` touching `src/**` publishes to npm at once; the independent
  review is the only gate and is not back-fillable.
- **The `grid` merge changes behaviour for any caller who passes a partial `grid` today.** That is
  the point, but it means the rendered check should look at a chart that passes `grid` explicitly if
  one exists.

### Required tests to WRITE

Narrow. Extend the existing files rather than adding new ones.

**`tests/themeCompleteness.test.js`**

1. Every status channel's `main` clears 4.5:1 against `#FFFFFF` **and** against
   `background.default`. **Prove non-vacuity** by restoring `warning.main` to `#C08A2C` and
   confirming this test fails — that is the whole point of the rule.
2. The new rule reports, and does not hard-fail, for a theme belonging to an app without a landed
   adoption WO (the ratchet stays intact).

**`tests/chartDefaults.test.js`**

3. A caller passing `grid={{ vertical: true }}` receives **both** `vertical: true` and the default
   `horizontal: true`. **Prove non-vacuity** by reverting to the plain default parameter and
   confirming the test fails.
4. A caller passing `grid={false}` (or the documented way to switch the grid off entirely) still
   gets no grid — merging must not make the default un-removable.

Plus `tsc -p tsconfig.build.json --noEmit` clean.

**No full-suite run.** Affected-areas set is the two test files above.

### Verification

- The rendered two-width side-by-side per DS-1, **and this time it must cover what changed**: the
  harness needs a specimen row rendering `color="success|warning|error|info"` on **Button, Chip and
  Alert** — the components where `main` actually resolves. It has none today, which is precisely why
  the gate could not catch defect 1 the first time. Adding that row is part of this WO.
- A chart specimen that passes a partial `grid`, to show the merge.

### Preconditions

- `THEME-1` (`2.30.0`) and `CHART-6` (`2.31.0`) landed and published.

### Parity guardrail

No behaviour, permission or data-contract change. One palette value moves deliberately and visibly;
everything else must render identically.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*

### Execution directive (read this first)

> **If you are the implementer reading this work order as your own specification: this section is
> NOT addressed to you.** It tells the Orchestrator how to invoke you. **You ARE that invocation —
> do NOT shell out to `codex exec`.**
>
> Implement through `codex exec` in the background — invoked directly via Bash (never the
> `debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
> `--dangerously-bypass-approvals-and-sandbox`. **Pass the WO via stdin, not as a positional
> argument** — `cat work-orders/THEME-2.md | codex exec --skip-git-repo-check
> --dangerously-bypass-approvals-and-sandbox -` (a positional arg hits Windows' command-line length
> limit on a WO this size — proven on THEME-1/CHART-6). Fallback to direct Claude implementation
> only on Codex quota/rate-limit/non-zero exit.

### Context package

**Preconditions verified 2026-08-10:** `THEME-1` (`96992cf`) and `CHART-6` (`6dedc62`) are both
landed on `main` and published (`2.30.0`, `2.31.0`).

**Defect 1 — exact current state, verified in `src/theme/tokens.js:81-87`:**
```js
warning: {
  ...withMainShades('#C08A2C', '#212529'),
  text: '#976100',
  fill: '#C08A2C',
  fillText: '#212529',
  bg: '#FBF0DC',
},
```
`withMainShades(main, contrastText)` (defined near the top of `tokens.js`) sets `main`/`light`/`dark`/
`contrastText` via MUI's own `lighten`/`darken` at 0.2/0.3 tonal offsets. **Fix:** change the call to
`withMainShades('#976100', '#FFFFFF')` — reusing the existing `text` value as the new `main`, and
`'#FFFFFF'` as `contrastText` (verify this actually clears 4.5:1 — the WO states 5.216 on white
already for `#976100`, and `contrastText` white-on-`#976100` is the same ratio by symmetry). Leave
`text`/`fill`/`fillText`/`bg` untouched — `fill` stays the lighter amber for deliberate fill use
(THEME-1's own `MuiAlert` `standardWarning` styleOverride already reads `palette.warning.text`/`.bg`,
NOT `.main`, so that specimen is unaffected by this change — see the harness note below for why a
NEW specimen is needed to actually exercise `.main`).

**Defect 1's assertion rule — add to `src/theme/themeCompleteness.js`'s `contrastFindings(theme)`
function (~line 249).** Alongside the existing per-status `text`-vs-`bg` and `fillText`-vs-`fill`
loops, add a third: for each `status` in `STATUS_KEYS` (`['success','warning','error','info',
'stale']`, from `tokens.js`) that HAS a `.main` property (**`stale` does not** — it's a custom
augmented namespace, never passed through MUI's `createPalette`/`augmentColor`, so
`theme.palette.stale.main` is `undefined` — skip it, don't push a spurious finding for a channel
that was never supposed to have one), check `calculateContrastRatio(tokens.main, '#FFFFFF')` and
`calculateContrastRatio(tokens.main, theme.palette.background.default)`, both `>= 4.5`, pushing a
`contrast.<status>.main-on-<white|page>` finding (matching the existing naming convention,
`contrast.controlBorder.<state>-on-<surface>`) on failure. This is a REPORT via the existing
`findings` array — `assertThemeComplete` never throws or hard-fails on its own (confirm this by
reading the function; the "ratchet stays a report, not a hard fail for non-adopters" is structural
here, not a flag to add — a consuming app's OWN test suite decides whether to assert
`findings.length === 0`, ucm's export just returns data either way).

**Defect 2 — exact current state, verified in `src/components/charts/BarChart.jsx:26` and
`LineChart.jsx:43`:** `grid = { horizontal: true }` as a bare JS default parameter, then
`grid={grid}` passed straight through (`BarChart.jsx:65`, `LineChart.jsx:88`) — a caller-supplied
`grid` object REPLACES the default wholesale rather than merging per-key, unlike every sibling prop
in this file (compare `withAxisDefaults`'s `tickLabelStyle` merge, `withChartSlotDefaults`'s
`tooltip`/`legend` merge — both spread the default first, caller second, so the caller only
overrides the keys it actually sets). **Fix:** add a `withGridDefaults(grid)` helper to
`src/components/charts/chartDefaults.js` following the SAME pattern (`{ horizontal: true, ...grid }`
— MUI's `grid` prop type is `Pick<ChartsGridProps, 'vertical'|'horizontal'>`, plain optional
booleans, no special `false`/`true` shorthand at the type level, so spreading a caller's object
after the default is sufficient: a caller wanting no grid at all passes
`grid={{ horizontal: false, vertical: false }}` explicitly, which the spread correctly honours since
it's a later key overriding an earlier one — do not add special-casing for a literal `grid={false}`
unless you find MUI's actual runtime prop handling treats a boolean differently from the declared
type, which the WO's own phrasing ("or the documented way to switch the grid off entirely") already
anticipates might not be a literal `false`). Wire it into both `BarChart.jsx` and `LineChart.jsx`
the same way the other `chartDefaults.js` helpers are used.

**Defect 2's audit — read `src/components/charts/chartDefaults.js` in full and check each
object-valued prop the wrappers default or forward against the same replace-vs-merge question:**
- `withAxisDefaults`'s `tickLabelStyle: { fontSize: tickFontSize, ...axis.tickLabelStyle }` —
  ALREADY merges correctly (default first, caller's own `tickLabelStyle` fields win per-key).
- `withChartSlotDefaults`'s `{ ...slotProps, tooltip: {...}, legend: {...} }` — the outer
  `...slotProps` spread preserves any OTHER slot key a caller sets (e.g. `slotProps.axisHighlight`),
  and the `tooltip`/`legend` sub-objects are themselves merged default-first. ALREADY correct.
- `LineChart.jsx`'s `slots={{ mark: FilledMarkElement, ...slots }}` — default first, caller's own
  `slots` spread after, so a caller's own `slots.mark` wins and other slot keys survive. ALREADY
  correct.
- `spaceForRotatedTicks`'s `margin` handling is NOT a "default object caller can partially override"
  shape at all (it only computes `margin.bottom` when rotation is detected AND the caller hasn't set
  one) — not the same bug class, nothing to fix there, but confirm this reading is right by re-reading
  the function rather than trusting this summary.
**Verify each of these four independently rather than trusting this list — this map is a starting
point for the audit, not a substitute for it.** If the audit finds anything actually broken beyond
`grid`, fix it and say so explicitly in the PR/commit, per the WO's "fix that too and say so." If the
audit confirms all four are already correct, state that explicitly too — "audited and confirmed
correct" is a valid, expected outcome per the WO ("either... or a named list").

**Harness — why a new specimen row is required, not optional (verified 2026-08-10):** the current
`ThemeBaselineEntry` (`dev/entries.jsx`) has TWO status-colour specimens today, and NEITHER exercises
`palette.<status>.main`:
1. `StatusChip` (`dev/entries.jsx:71-78`) sets `sx={{ bgcolor: '${tone}.fill', color:
   '${tone}.fillText' }}` directly — bypasses `.main` entirely by design.
2. `<Alert severity="warning">` etc. (`dev/entries.jsx:136-140`) — THEME-1's `MuiAlert`
   `styleOverrides.standardWarning` (`src/theme/createAppTheme.js`'s `createPaletteAwareComponents`)
   already overrides the STANDARD variant's `color`/`backgroundColor` to `palette.warning.text`/
   `.bg` directly, NOT `.main` — so this existing Alert row was already immune to defect 1 and would
   not have caught it even now.
   Add: a row of `<Button color="success|warning|error|info" variant="contained">` (MUI's contained
   Button reads `palette[color].main` for its background and `.contrastText` for its label — this is
   the most direct `.main` exposure in the kit), a row of native `<Chip color="warning">` (not
   `StatusChip` — MUI's own `color` prop on `Chip`, filled variant, also reads `.main`/
   `.contrastText` directly), and an `<Alert severity="warning" variant="filled">` (MUI's `filled`
   Alert variant is NOT covered by THEME-1's `standardWarning`-only override, so it still resolves
   `.main` — confirm this by checking `createPaletteAwareComponents`'s `alertStyles` only sets
   `standard${Status}` keys, never `filled${Status}` or `outlined${Status}`). These three together
   are what the WO's Verification section means by "Button, Chip and Alert — the components where
   `main` actually resolves."

**Chart specimen for the `grid` merge:** the existing "Caller overrides" `LineChart` specimen
(`dev/entries.jsx`, added in CHART-6) already sets `grid={{ horizontal: true, vertical: true }}` — a
COMPLETE object, which happens to already include `horizontal: true`, so it would not visibly
demonstrate the bug even pre-fix. Change it to a genuinely PARTIAL grid, e.g. `grid={{ vertical:
true }}` alone — pre-fix this would have shown ONLY vertical lines (losing the horizontal default);
post-fix it must show both. This is the specimen the WO's Verification section calls for ("A chart
specimen that passes a partial `grid`, to show the merge").

### Named files to change

- `src/theme/tokens.js` — the `warning` entry's `withMainShades(...)` call (line 82).
- `src/theme/themeCompleteness.js` — `contrastFindings` (~line 249), add the `main`-vs-white/page
  loop, skipping any `STATUS_KEYS` entry without a `.main`.
- `src/components/charts/chartDefaults.js` — new `withGridDefaults` export.
- `src/components/charts/BarChart.jsx:26,65`, `src/components/charts/LineChart.jsx:43,88` — wire in
  `withGridDefaults`.
- `dev/entries.jsx` — new Button/Chip/Alert `.main`-exercising specimen row; fix the existing
  "Caller overrides" LineChart's `grid` prop to a genuinely partial object.
- `package.json` — version `2.31.0` → `2.31.1` (patch).
- `tests/themeCompleteness.test.js` — extend with the 2 required tests (main contrast + non-vacuity
  proof by temporarily reverting `warning.main`; ratchet/report-not-hard-fail confirmation).
- `tests/chartDefaults.test.js` — extend with the 2 required tests (partial-grid merge + non-vacuity
  proof by temporarily reverting to the bare default parameter; grid-off-via-explicit-false-object
  still works).

### Do-not-touch / invariants

- `success`/`error`/`info`/`stale` palette values — untouched, they measure fine.
- `warning.fill`/`.text`/`.bg` — untouched.
- The committed reference-sheet HTML artifact (`work-orders/assets/THEME-1-baseline-reference-sheet.html`)
  — frozen spec, never depicted `warning.main` as a foreground, not touched by this WO.
- Anything in CHART-6's scope beyond the `grid` merge and the audit — no new chart-chrome feature
  work here.
- No behaviour, permission, or data-contract change.

### Pitfalls (verified against landed code 2026-08-10)

- `withMainShades` is defined once near the top of `tokens.js` and used for
  `success`/`warning`/`error`/`info` — changing ONLY the `warning` call site, not the helper itself
  (the helper's `lighten`/`darken` derivation logic is correct and unrelated to this bug).
- `STATUS_KEYS` includes `'stale'`, which has no MUI-augmented `.main` — a naive loop over all
  `STATUS_KEYS` reading `tokens.main` will hit `undefined` for `stale`; guard it (`if (!tokens?.main)
  continue`, matching the existing loop's `if (!tokens) continue` pattern one function up).
- Don't confuse this WO's `contrastFindings` addition with `THEME_COMPLETENESS_SURFACES`'s existing
  `STATUS_SURFACES` (`text`/`fill`/`fillText`/`bg` presence-vs-default check) — the new rule is a
  CONTRAST check (numeric ratio), same family as the existing `contrast.<status>.text-on-bg` /
  `contrast.controlBorder.*` findings, not a "surface is deliberately defined" presence check.

### Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha`

### Required tests to WRITE (Codex writes them; the Orchestrator runs them)

Exactly the 4 tests enumerated in Envelope § "Required tests to WRITE" above, extending
`tests/themeCompleteness.test.js` and `tests/chartDefaults.test.js` (no new files), plus
`tsc -p tsconfig.build.json --noEmit` clean. Do not add more, do not run the full suite. Affected-areas
set is exactly those two files.

### Preamble (append verbatim)

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. Do NOT `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`. WO:
`work-orders/THEME-2.md`. Follow `orchestrate-codex`.
