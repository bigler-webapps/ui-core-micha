# THEME-5 — Hold the kit to its own baseline

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` **and** `ui_reviewer` — both mandatory, concurrent. `ui_reviewer`
applies because rendered colours change in a screen **ten apps mount**; see "Blast radius".
**Version target:** the next **minor** after `THEME-4` — a new exported check is additive API. Read the
published version at implementation time; do **not** hardcode a number from this file.
**Strand:** `DS-18` follow-ups, both named in `THEME-4`'s landing notes

---

## A. Envelope

### Goal

Two gaps left open by `THEME-4`, and they belong together because both are the same embarrassment:
**the kit is not fully on the baseline it exists to enforce.**

1. `THEME-4`'s shadowing check normalises **spacing** shorthands only. Other MUI `sx` aliases —
   `bgcolor` above all — still compare as raw strings and would miss a collision.
2. The kit carries **off-palette colour values**. No app palette reaches them.

### Part 1 — finish the alias normalisation

`SPACING_SHORTHAND_LONGHANDS` (`src/theme/themeCompleteness.js:383`) covers `p*` and `m*`. Extend the
map to every MUI `sx` alias that can land on a property the baseline sets — `bgcolor` →
`backgroundColor` is the one with a real near-term risk.

**Verified state, so nobody hunts for a bug that is not there yet:** `MFA_ACTIVE_CARD_SX =
{ bgcolor: '#f0fdf4' }` is registered against `MuiCard` (`kitSxRegistry.js:190`), and the baseline
sets `borderRadius`, `boxShadow` and `borderColor` on `MuiCard` — **not** `backgroundColor`. So there
is **no live collision today**. This is a latent gap whose trigger is near: `THEME-3` has just shown
the surface-token set still grows, and the day a `backgroundColor` default lands on `Paper` or `Card`
the miss becomes silent.

**Write the bound as an open one.** `THEME-4`'s WO named its own limits as a list — nested and
conditional `sx` — and the first real miss was something not on that list (alias spelling). Say
"unknown normalisation gaps remain" rather than enumerating, because an enumeration reads as
completeness.

### Part 2 — an off-palette colour scan, and fix what it finds

A new exported check, same finding contract as the others (`{ findings: [{ surface, reason }] }`),
scanning `src/**` for colour values that are not baseline tokens. Wire it as a hard failure in ucm's
own suite.

**Three classes, and a hex-only scan catches just the first:**

| Class | Example | In scope |
|---|---|---|
| Hex literal | `bgcolor: '#f5f5f5'` | **yes** |
| Named CSS colour | `bgcolor: 'white'` (`MFAComponent.jsx:231`) | **yes** — same defect, invisible to a hex scan |
| MUI default-ramp reference | `bgcolor: 'grey.50'` (`QrSignupManager.jsx:340`) | **report only, do not fix** |

The third class routes through the theme, so it is not off-palette in the same way — but it points at
MUI's untouched grey ramp rather than at anything the estate decided. Report it as its own category
and leave the decision for later; folding a judgement call into a cleanup would be scope creep.

**Excluded from the scan, by operator decision:** the **generated print document** in
`QrSignupManager.jsx:185-240`. It is not app UI — it is a standalone HTML string with its own `body`,
`@media print` rules and `font-family: Arial`, rendered outside the React tree where **no theme is
available**. Its ten values (`#f5f7fb`, `#d9e2f2` ×3, `#e8f0ff`, `#f8faff`, `#ffffff` ×3, `#122033`,
`#23408e`) cannot take tokens. Excluding it is a correctness requirement, not a preference: scanning it
would produce ten permanent false positives, and exempting those one by one is exactly the
mass-exemption that `THEME-4` warned turns a check into a no-op. **Exclude the region and state the
reason in the code.** Making the printed poster follow each app's identity is a genuine idea and a
separate work order — not this one.

### The mappings, decided and each verified against `tokens.js`

Five values in `MFAComponent.jsx`:

| Where | Today | Target | Why |
|---|---|---|---|
| `:25` `MFA_ACTIVE_CARD_SX` background | `#f0fdf4` | `success.bg` (`#E5F4E9`) | light green tint marking the active factor |
| `:231` border | `1px solid #eee` | `divider` | it is a border |
| `:231` background | `bgcolor: 'white'` | `background.paper` | the named-colour case |
| `:244` background | `bgcolor: '#eee'` | `background.subtle` (`#F4F5F6`) | **a fill, not a border** |
| `:303` background | `bgcolor: '#f5f5f5'` | `background.subtle` (`#F4F5F6`) | near-exact match |
| `:314` border | `1px solid #ddd` | `divider` | it is a border |

**`#eee` appears in two different roles** — a border at `:231` and a **fill** at `:244`. A blind
find-and-replace would put a translucent border colour (`rgba(33,37,41,.10)`) into a filled box, which
is semantically wrong and visually lighter than intended. Map by role, not by value.

### Blast radius, and the operator's decision on it

No app imports `MFAComponent` directly — it is reached transitively: `AccountPage` renders
`SecurityComponent` (`AccountPage.jsx:223`) which renders `MFAComponent`, and **at least ten apps
mount `AccountPage`** — bigler-consult, cockpit, fitness-monitor, hpc-bridge, hram, innoservice,
jg-ferien, kerzenziehen, reimbursements. This is live, widely-mounted code, not a dead corner.

**Operator decision: map the values, and do not add a rendered gate for it.** The targets are near
neighbours of the values they replace, and the estate has no prototype for this screen to compare
against. **Do not re-add the two-width check** — but every changed value **must be listed in the
register note**, so a shift that lands unseen is at least recorded. That listing is the substitute for
looking.

### Non-goals / do not touch

- **The print document** (above). Excluded, unchanged.
- **`grey.*` references.** Reported, not fixed.
- **`DS-18`'s second half** — "which components can violate a rule". Still without a driver, and
  `THEME-4` is now a cautionary data point for it: a check whose set comes from a heuristic can be
  green while missing real cases.
- **App-side scanning.** An app's own components shadowing the baseline stays a follow-up; it wants
  cockpit's adoption first so there is a real consumer to test against.
- No baseline token change. Part 2 consumes tokens; it does not add any.
- No change to `assertThemeComplete`'s surface registry, `createAppTheme`'s signature, the
  `kitSxRegistry` entries, or any component's public props.
- `chartLabels.js`'s hex values are **baseline tokens** — leave them; if the scan flags them, the scan's
  allowlist is wrong, not the file.

### Risks

- **A visual change in ten apps, published without a staging net.** A push to `main` touching `src/**`
  publishes; the independent reviews are the only gate. The mitigation is the mandatory value listing,
  plus `ui_reviewer` reading the diff against the mapping table above.
- **Mapping by value instead of by role** — the `#eee` trap. The table above exists so this is a
  checkable instruction rather than a matter of care.
- **An over-eager scan.** `src/theme/` legitimately contains every token's hex definition, and
  `chartLabels.js` consumes them. A scan without a correct allowlist floods the suite and gets
  disabled, which is worse than no scan.
- **Wrong allowlist shape.** The allowlist must be derived from the palette rather than hand-listed, or
  it goes stale the next time a token lands — `THEME-3` added one three days into this strand.

### Required tests to WRITE

1. **Non-vacuity for the scan:** a fixture source containing `bgcolor: '#123456'` produces a finding;
   the same source using a palette token produces none.
2. **The named-colour class:** `bgcolor: 'white'` is flagged. This is the case a hex-only scan misses,
   and it exists in the code today.
3. **The exclusion holds:** the print-document region produces **no** findings, and the exclusion is
   scoped — a hex added elsewhere in `QrSignupManager.jsx` **is** still flagged.
4. **The allowlist is palette-derived:** adding a token to the palette makes a source using that value
   pass, without editing the check.
5. **Part 1:** a fixture whose `sx` uses `bgcolor` collides with a baseline `backgroundColor` default
   and is reported. Prove non-vacuity — this must fail before the map is extended.
6. `MFAComponent`'s existing spec stays green, and `THEME-4`'s shadowing check still returns no
   findings for the kit.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — affected set is the theme
module's specs plus `MFAComponent`'s.

### Verification

No rendered gate, per the operator decision above. What replaces it: the mapping table is the spec, and
the register note must list **every value changed, from and to**. If the implementation deviates from
the table for any of the six rows, that is a stop-and-report — the roles were resolved by reading the
code, and a different target means the reading was wrong.

### Parity guardrail

Six values change in one component; everything else in the kit renders identically. No behaviour, no
props, no permissions, no data contract.

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
> **Read `git log origin/main..HEAD` and `git status` before your own review.** On `SHELL-3` and
> `SHELL-4` Codex committed its own change and wrote a self-reported review into `WORK_ORDERS.md`;
> `THEME-4` was the first of the three where it did not. An implementer commit is a blocker to
> surface, and a register row naming a review the Orchestrator did not itself start is invalid.

### Context package

**Precondition confirmed:** `THEME-4` is landed and published (`c64e024`, register row `done`,
`package.json` reads `2.34.0`). Clean starting state, no implementer commit on top.

**Note on the WO's own arithmetic:** the Envelope's "Five values in `MFAComponent.jsx`" heading is
followed by a table of **six** rows (`:25`, `:231`×2, `:244`, `:303`, `:314`) — the register's own
summary already says "the six values it finds", so treat the table (six rows) as authoritative, the
heading as stale, consistent with two prior stale-count mismatches in this strand (`SHELL-4`'s
"ten to six", `THEME-4`'s "51 files").

**A likely seventh value the table omits — verify before assuming the table is exhaustive:**
`src/components/MFAComponent.jsx:313` has `bgcolor: 'white'` in the *same* sx object as the WO's row 6
(`:314`, `border: '1px solid #ddd'` → `divider`) — a recovery-code chip box, structurally identical in
role to row 3 (`:231`'s `bgcolor: 'white'` → `background.paper`, the QR-code box). If the new scan (Part
2) flags `:313` and it is not in the six-row table, this is not a table deviation to stop-and-report —
it is the same white-box-fill role already established at `:231`, map it identically to
`background.paper` and list it in the register note as a seventh, table-omitted finding the scan
caught. Confirm this reading against the actual code before implementing; do not assume the six-row
table is exhaustive just because the Envelope calls it "decided".

**Current file state (verified, so Codex works from real line numbers, not the WO's possibly-drifted
ones):**
```
src/components/MFAComponent.jsx:25   export const MFA_ACTIVE_CARD_SX = { bgcolor: '#f0fdf4' };
src/components/MFAComponent.jsx:231  <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid #eee' }}>
src/components/MFAComponent.jsx:244        bgcolor: '#eee',              (inside a multi-line sx, role: fill)
src/components/MFAComponent.jsx:303  <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
src/components/MFAComponent.jsx:313        bgcolor: 'white',             (inside a multi-line sx -- the omitted 7th)
src/components/MFAComponent.jsx:314        border: '1px solid #ddd',
```
All six table rows' line numbers matched exactly on inspection — no drift.

**Token values to map to, confirmed against `src/theme/tokens.js`:**
- `divider: 'rgba(33,37,41,.10)'` (`tokens.js:69`)
- `background.paper: '#FFFFFF'` / `background.default: '#FAFAFA'` (`tokens.js:65-66`)
- `background.subtle: '#F4F5F6'` (`tokens.js:67`, landed by `THEME-3`)
- `success.bg: '#E5F4E9'` (`tokens.js:80`)
These are accessed in a component via `theme.palette.<path>`, i.e. `sx={{ bgcolor: 'divider' }}` /
`sx={{ bgcolor: 'background.subtle' }}` / `sx={{ bgcolor: 'success.bg' }}` (MUI resolves a dotted
palette-path string in `sx`) — this is the same string-token-reference pattern already used and
proven in `SHELL-4`'s `borderColor: 'divider'` fix. Do **not** import raw hex constants.

**Part 1 — extend `SPACING_SHORTHAND_LONGHANDS` (`src/theme/themeCompleteness.js:383`,
`expandShorthandProperty` at :402):** add a `bgcolor` → `['backgroundColor']` entry (and, while
touching this, consider whether `color`/other MUI palette-path aliases need the same treatment — the
WO names `bgcolor` as "the one with a real near-term risk", so that is the required minimum; do not
expand the alias table beyond what's verifiably a real MUI `sx` shorthand, to avoid the "write the
bound as an open one" instruction turning into an unbounded audit). Required test 5 (non-vacuity):
a fixture registry entry with `sx: { bgcolor: '#fff' }` against a MUI key whose baseline
`styleOverrides` sets `backgroundColor` must be flagged — construct this as a **fixture-only** test
(pass a custom `registry` + a fixture theme/component config to `assertKitSxDisjoint`, following the
existing fixture pattern already in `tests/themeCompleteness.test.js`'s `'kit sx disjointness'`
describe block, e.g. the `FixtureBottomNav`/`FixtureChip`/`FixtureButton` entries) since, per the
Envelope, there is genuinely no live `backgroundColor` collision in the real kit today — do not invent
one in the real registry just to exercise the code path.

**Part 2 — the off-palette colour scan.** New exported function in
`src/theme/themeCompleteness.js` (same file, same `{ findings: [{ surface, reason }] }` contract as
`assertThemeComplete`/`assertKitSxDisjoint`/`reportKitSxBypasses` — name it something like
`reportOffPaletteColours`, Codex's call). Reuse the existing hand-rolled brace/quote-aware source
scanning approach already proven in `reportKitSxBypasses` (`themeCompleteness.js`, functions
`jsxOpeningTag`/`topLevelSxValue` and the `sources.map(...)` normalisation shape shared with
`reportThemeAdoption`) rather than inventing a second scanning mechanism.

**Two known false-positive traps for the colour regex, found while preparing this map — test against
both explicitly:**
1. `src/components/charts/chartLabels.js:3-4` has a comment referencing GitHub issue numbers
   `mui-x#18768` and `#18399` — a naive `/#[0-9a-f]{3,8}/i` pattern matches `#18768` as a false "hex
   literal" (all five characters `1,8,7,6,8` are valid hex digits). The scan must not flag comment
   text, or must otherwise be precise enough to skip this. This is exactly the "over-eager scan...
   gets disabled" risk the Envelope names — verify the scan is blind to this file/line before calling
   Part 2 done.
2. `src/theme/createAppTheme.js:45` has a comment mentioning `'#FFFFFF'`, and `:188` has a genuine
   `'#FFFFFF'` string literal used for contrast-ratio computation (not a component style) — per the
   Envelope's own risk note, `src/theme/` legitimately contains token hex definitions and must be
   excluded from the scan's target set entirely (scan `src/components/`, `src/messaging/`,
   `src/notifications/`, `src/pages/`, `src/auth/`, `src/layout/`, `src/onboarding/` — i.e. component
   source, not `src/theme/` itself).

**The palette-derived allowlist (required test 4):** build the allowlist by walking
`BASELINE_PALETTE`/`BASELINE_STATIC` (or the fully-resolved output of `createAppTheme(...)`) and
collecting every hex/rgba string value found in it, rather than hand-listing values — this is what
required test 4 (adding a token to the palette should make a source using that value pass, without
editing the check) actually proves. `THEME-3` is cited in the Envelope as evidence a hand-listed
allowlist goes stale fast (a new baseline token landed three days into this strand).

**Named-CSS-colour detection (required test 2):** `bgcolor: 'white'` must be flagged same as a hex
literal — CSS named colours are a small, fixed, enumerable set (`white`, `black`, `red`, `grey`,
etc. — the 16 basic CSS colour keywords are the practical minimum; do not attempt to support the full
147-name X11/CSS list unless a real instance demands it, per the WO's own anti-gold-plating stance).

**The `grey.*` report-only class (required, do not fix):** `src/components/QrSignupManager.jsx:340`
has `bgcolor: 'grey.50'` — this is a **dotted MUI theme-path string**, not a hex/named-colour literal,
so it needs its own detection branch (match `/^[a-z]+\.\d+$/i`-shaped sx string values referencing
MUI's stock palette ramps, distinct from both the hex/named-colour findings and the
divider/background.subtle/success.bg *baseline* token-path strings this same WO is busy introducing
elsewhere — do not let the scan flag the very token references Part 1's own fixes create). Report it
under a distinct `reason` wording (e.g. "uses MUI's untouched grey ramp, not a baseline token — review,
do not auto-fix") so a consumer of the findings can filter report-only from must-fix.

**The print-document exclusion (required test 3):** exclude the template-literal region inside
`QrSignupManager.jsx`'s `printWindow.document.write(\`...\`)` call — currently spans roughly
`:178`-`:266` (verify exact bounds by locating the `printWindow.document.write(` call and its
matching closing backtick+paren, not by trusting these line numbers, since the WO's own `:185-240`
estimate was already off by several lines against the current file). The exclusion must be scoped
narrowly enough that a hex literal added elsewhere in the same file (outside that one template
literal) still gets flagged — required test 3's second half.

### Invariants / do-not-touch

No change to `assertThemeComplete`'s surface registry, `createAppTheme`'s signature, `kitSxRegistry`
entries structure, or any component's public props. No baseline token added (Part 2 consumes existing
tokens only). `chartLabels.js`'s own values are not colours to fix (see trap above) — if the finished
scan flags anything in `src/theme/**`, that is a scan-scope bug, not a file to edit.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/THEME-5.md`. Follow `orchestrate-codex`.
