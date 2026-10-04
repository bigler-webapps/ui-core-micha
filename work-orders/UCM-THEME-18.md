# UCM-THEME-18: Ship the frozen baseline type scale

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

`createAppTheme` produces the type scale frozen in [`docs/TYPE-SCALE.md`](../docs/TYPE-SCALE.md) (`UCM-THEME-17`,
frozen 2026-10-04), in light and dark. The screen title (h4) steps down one size below the baseline's `sm`
breakpoint. Released as a **minor** version (`3.12.0`), because every adopted app looks different after the bump.

## Decided values (from `docs/TYPE-SCALE.md`, by variant)

| Variant | Before | After |
|---|---|---|
| h1 / h2 / h3 | 32 / 28 / 24 | **36 / 32 / 28** |
| h4 | 20 | **24**, and **23 below `sm`** |
| h5 | 18 | **20** |
| subtitle1 | 15 | **13** |

Unchanged: h6, subtitle2, body1, body2, button, caption, overline; every weight (headings 600, subtitle1 600);
every line height; `letterSpacing`. If this table and `docs/TYPE-SCALE.md` disagree, the sheet wins.

## Context the operator established

- **Typography lives in one block**: `src/theme/tokens.js:223-241`, built with `typeVariant` (`tokens.js:45`).
  `createAppTheme` (`src/theme/createAppTheme.js:379-387`) spreads it unchanged and takes only `fontFamily`
  from the app, so light and dark get the same scale from the same place.
- **Breakpoints**: `tokens.js:250-252`, `sm: 600`. The mobile step means "below `sm`", the same line MUI's
  `breakpoints.down('sm')` draws.
- **`assertThemeComplete`** reads `fontSize`, `fontWeight`, `lineHeight` and `letterSpacing` per variant
  (`src/theme/themeCompleteness.js:38`). A nested media-query key inside h4 is new to it.
- **The light regression fixture** `tests/fixtures/light-theme-baseline.json`, checked by
  `tests/createAppThemeLightGuard.test.js`, contains the typography and changes with this order.
- **The kit's own screens use the variants too** (h6 about 24 times, h4 twice, h5 once in `src/`), so kit
  screens such as the account pages change with the scale. That is intended.

## Scope + non-goals

In scope: the typography values above; the h4 step below `sm`; the fixture's typography entries;
`CHANGELOG.md` naming the visible change for every adopted app; the minor release.

Non-goals:
- No app repo changes. The per-app follow-up (listed below) is written after the release, one order per app.
- No font family, weight or line-height change; no new variant; no change to `breakpoints`.
- No responsive step for any variant other than h4.

## Tier · precondition / gate

- **Tier 3 · tests: the typography values per variant and the h4 step, in light and dark; the light
  regression fixture updated in its typography entries only; the existing `createAppTheme` and completeness
  tests.** A change inside shared-core (`AGENTS.md` -> Tiering).
- Precondition: `UCM-THEME-17` `done` (frozen sheet committed).
- No prototype gate: the instrument is a decision sheet, not a screen to match.

## Risks

- **Every adopted app moves on its next bump.** Intended; the changelog says so in one line an app session can
  act on.
- **An app that overrides h4's size keeps the baseline's 23 px below `sm`**, because a theme merge keeps the
  nested media key. survey_app sets h4 to `2.125rem` today; on mobile it would fall to 23. The per-app
  follow-up handles it; the changelog names it.
- **`assertThemeComplete` may misread the nested key** (as a missing or extra surface). It must neither raise
  a finding for the baseline's own media key nor let an app's h4 override go unnoticed.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

1. For a light and a dark theme from `createAppTheme`: each variant in the table resolves to its decided
   `fontSize`, read from the theme, compared with the value in the table.
2. h4 carries a media-query entry for "below `sm`" with `fontSize` 23px, and that query is derived from
   `breakpoints.values.sm`, not typed a second time. Show the test fails if `sm` changes and the query does not.
3. `assertThemeComplete` on the baseline returns no typography finding.

Run, do not write: `tests/createAppTheme.test.js`, `tests/createAppThemeLightGuard.test.js` (with the fixture's
typography entries updated, and only those), the completeness tests.

## Parity guardrail

No behaviour change; type sizes only. Palette, spacing, components and exports unchanged.

## Downstream (not this order; one order per app after the release)

Measured 2026-10-04 (see `docs/TYPE-SCALE.md` -> "Known consequences"):

| App | What the follow-up does |
|---|---|
| hram | screen titles on 5 pages from h5 to h4; drop the per-level weight 500 |
| jg-ferien | screen titles on 3 pages from h5 to h4 (`DashboardPage.jsx:187`) |
| kerzenziehen | admin screen title from h5 to h4 |
| spesix | 1 page title from h5 to h4; drop per-level weight overrides |
| fitness-monitor | 1 page title from h5 to h4 |
| survey_app | drop the 800/700 weights and the h4 `2.125rem`/400 override; decide the h3 page titles (24 -> 28); closes the held `SVA-THEME-1` typography revert |
| all other adopted apps | bump only |

webshop-guenter (own handoff scale), Kira, Cinevia and Gustav (no MUI heading variants) are unaffected.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". Do not dispatch
while this placeholder stands.*

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

- Check `.claude/codex-status.md` first (newest-first). Before `git push`, run `git log origin/main..HEAD` and
  push only if every listed commit is this order's.
- Review: Tier 3, independent `reviewer` (all configured lenses) and `ui_reviewer`, one batch, before the commit.
- Release `3.12.0`: verify the publish through the job log (`npm view` lags for provenance publishes). Row ->
  `done` with the review Notiz and the version. Then the Expertenchat writes the per-app orders above.

Mini-handover: `Orchestrator: implement work-orders/UCM-THEME-18.md in ui-core-micha (main). git pull first,
read the WO, then follow orchestrate-codex.`
