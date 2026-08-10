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

*To be filled by the Orchestrator on `git pull` — see AGENTS.md → "Work Order".*
