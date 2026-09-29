# UCM-THEME-15: Derive status and control-border colours against the theme's own page

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

`createAppTheme` already derives one colour against the page it will sit on: `controlBorder.focus`
(`deriveFocusColour`, `src/theme/createAppTheme.js`). Every other page-sensitive baseline colour is
fixed. So an app or site whose `background.default` is not near-white gets baseline status and
border colours that fail WCAG on its own page.

After this order, the **baseline-supplied** status `main` colours and control-border colours are
derived the same way, and only when they would otherwise fail. A theme on the baseline's own page
resolves exactly as today. A theme on a tinted page gets colours that pass on that page.
`assertThemeComplete` then returns zero contrast findings for every baseline-supplied colour on the
estate's real site backgrounds.

**Operator decision (2026-09-29):** option (a) of three. The factory derives the colours. Contrast
findings do **not** become exemptible (option b, which would hide real accessibility failures on
customer sites), and sites do not get their own status colours (option c, new per-customer design
decisions).

## Context the operator established

- **What the check measures** (`src/theme/themeCompleteness.js`, `contrastFindings`): for each status
  key, `main` against `#FFFFFF` **and** `background.default` at **4.5:1**; `controlBorder.main/hover/
  focus/error` against the same two surfaces at **3:1**. The pairs `text`-on-`bg` and
  `fillText`-on-`fill` are self-contained and do not depend on the page. Contrast findings are appended
  after exemption filtering (`themeCompleteness.js:371`), so no exemption can cover them. That stays.
- **The baseline values** (`src/theme/tokens.js`, `BASELINE_PALETTE`): `success.main` `#1B8038`,
  `warning.main` `#976100`, `error.main` `#BF3227`, `info.main` `#01579B` (`stale` has no `main`), each
  built by `withMainShades`. `controlBorder.main` `rgba(33,37,41,.50)`, `.hover` `rgba(33,37,41,.65)`,
  `.error` `#BF3227`. `focus` is derived.
- **Measured on the estate's real site backgrounds (2026-09-29),** baseline colours only:

  | Page `background.default` | Fails | Darkening needed (MUI `darken`) |
  |---|---|---|
  | baseline `#FAFAFA` | nothing | none |
  | `hafen` `#D8E4E1` | success 3.84, warning 4.00, error 4.35; border.main 2.91 | 0.10 / 0.08 / 0.03; border alpha 0.52 |
  | `jg-fegbern` `#eceae2` | success 4.16, warning 4.33; border.main 2.98 | 0.05 / 0.03; alpha 0.51 |
  | `routing` `#E8EAF6` | success 4.18, warning 4.35; border.main 2.98 | 0.05 / 0.03; alpha 0.51 |
  | `uph` `#E6EAF0` | success 4.15, warning 4.32; border.main 2.97 | 0.05 / 0.03; alpha 0.51 |
  | `ygbs` `#E398C7` | success 2.29, warning 2.38, error 2.59, info 3.38; border.main 2.50, border.error 2.59 | 0.40 / 0.38 / 0.34 / 0.21; alpha 0.59 |

  Sites are `survey_app/frontend/src/sites/*/theme.js`; `ygbs` also lives in `survey_contact_app`.
- **Every adopted app already passes.** All ten apps on `createAppTheme` assert
  `assertThemeComplete(theme).findings` equals `[]`, so none of them has a contrast finding today.

## The rule (decided)

1. **Scope of derivation:** `success/warning/error/info.main`, and `controlBorder.main/hover/error`.
   The derived `main` also re-derives its `light`/`dark`/`contrastText` through `withMainShades`, so a
   status entry stays internally consistent. `text`, `fill`, `fillText`, `bg` are untouched.
2. **Only when it fails.** A value that already clears its threshold against both `#FFFFFF` and
   `background.default` is returned **unchanged, byte for byte**. So no theme that passes today moves.
3. **Only baseline-supplied values.** If the app's own config sets a status `main` or a
   `controlBorder` state, that value is the app's decision. It is never altered, and its finding
   stays.
4. **Direction and method:** status `main` and `controlBorder.error` are darkened with MUI `darken` in
   the smallest steps that clear the threshold, as `deriveFocusColour` does. `controlBorder.main/hover`
   keep their ink hue and raise their alpha instead, so they stay a translucent ink.
5. **Same surfaces as the check:** `#FFFFFF` and `background.default`, exactly the two that
   `contrastFindings` uses, just as the existing comment at `deriveFocusColour` insists.
6. **Unreachable stays visible:** if the maximum step does not clear the threshold, the loop stops,
   returns the last value and the finding remains. It never throws and always terminates. Dark pages
   are `UCM-THEME-14`'s subject, not this order's.

## Scope + non-goals

In scope: the derivation in `createAppTheme` (next to `deriveFocusColour`, which may be generalised
into one helper); `DESIGN.md` (one paragraph: which baseline colours are page-derived, and why);
`CHANGELOG.md`; a **minor** release. It is a changed default, but only for themes that currently fail,
and none of the adopted apps does.

Non-goals:
- No change to any baseline token value in `tokens.js`.
- No exemption path for contrast findings.
- No change to `text`/`fill`/`fillText`/`bg`, to `dataSeries`, or to anything the app sets itself.
- No dark-mode handling (`UCM-THEME-14`).
- No consumer change. `survey_app` and `survey_contact_app` adopt it through their own pin bump.

## Tier · precondition / gate

- **Tier 3 · tests: derivation on the six measured pages, byte-identical output on the baseline page,
  app-supplied values untouched, termination; the kit's existing theme tests.** A change inside
  shared-core.
- Precondition: none.
- **Order with `UCM-THEME-14`:** this lands first. Both touch the focus derivation and the surface
  pair, and 14 is waiting on a design round (`UCM-THEME-13`) anyway.
- Downstream: `survey_app`/`SVA-THEME-1` and `survey_contact_app`/`SCA-THEME-1` (site half) wait for
  this release **and** for their own pin bump.

## Risks

- **`ygbs` will look different.** Its status colours darken by up to 40 % (success `#1B8038` becomes
  roughly `#104D22`). That is the price of legibility on a mid-pink page. It is visible on the customer
  site, and the operator sees it in `SVA-THEME-1`'s acceptance.
- **Silent change for a future app on a tinted page.** Expected and intended: the baseline promises a
  passing colour, not a fixed hex. `DESIGN.md` has to say so, or someone will read the hex in
  `tokens.js` and expect it on screen.
- **Rule 3 needs to know what the app set.** The merged palette alone cannot tell baseline from app
  values. Read the app's config (`appConfig.palette`) before deciding, not the resolved theme.
- **`light`/`dark` shades shift with a derived `main`.** Components using `error.dark` for hover move
  with it. Correct, but name it in the changelog.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

Kit test suite, next to the existing theme tests:

1. **Six measured pages.** For each `background.default` in the table, with only `palette.primary`
   given, `assertThemeComplete` has no `contrast.*.main-on-*` and no `contrast.controlBorder.*`
   finding.
2. **No movement where nothing fails.** On the baseline page, the resolved status entries and
   `controlBorder` equal today's values exactly. Show that the test fails when one baseline hex is
   altered by hand.
3. **App values are untouched.** A config that sets `success.main` to a failing colour on a tinted
   page keeps exactly that colour, and the finding remains.
4. **Termination.** A page on which the maximum step cannot reach the threshold (a mid-grey such as
   `#767676`) returns without throwing and keeps the finding.

Run, do not write: the kit's existing theme and `kitSxRegistry` tests.

## Parity guardrail

No change for any theme that passes today. No API change, no new option.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". Do not
dispatch while this placeholder stands.*

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

### Execution directive

Check `.claude/codex-status.md` first (newest-first; read it with `head`). No line for today means use
Codex. Before `git push`, run `git log origin/main..HEAD` and push only if every listed commit is this
order's (parallel sessions share this checkout).

### Review routing

Tier 3: independent `reviewer` (all configured lenses) and `ui_reviewer`, concurrent, one batch,
before the commit. No `sec_reviewer`. Ask `ui_reviewer` specifically about rule 3: can a
baseline-supplied value be told apart from an app-supplied one in every merge path?

### Verification

The contrast values in the Envelope table are the acceptance data: re-derive them from the built
themes and put the derived hex per site in the register Notiz. No prototype is in scope. The visual
consequence is accepted per site in `SVA-THEME-1`, not here.

### Register + commit + release

Row -> `done` with the review Notiz in the `AGENTS.md` shape and the published version. The publish
runs on push to `main` when `package.json`/`src/**` change (`.github/workflows/publish.yml`). Then add
`planned` pin-bump rows in `survey_app/WORK_ORDERS.md` and `survey_contact_app/WORK_ORDERS.md` (from
`2.41.3`; classify each by the dependency-bump test in `AGENTS.md` -> Tiering, reading the changelog
from `2.41.3` on) and unblock `SVA-THEME-1` / `SCA-THEME-1` against them.

### Mini-handover

`Orchestrator: implement work-orders/UCM-THEME-15.md in ui-core-micha (main). git pull first, read the
WO, then follow orchestrate-codex.`
