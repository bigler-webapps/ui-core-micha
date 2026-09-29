# UCM-SHELL-7 — User-menu avatar initials fail contrast

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: the initials in the header avatar are readable.
- Expected outcome: initials reach at least 4.5:1 against the avatar background, using the consuming
  app's theme tokens rather than MUI's default grey.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- `UserMenu` (imported in jg-ferien's `Header.jsx`) renders the MUI default avatar: white initials on
  light grey, **1.83:1**, on every page of the app.

## Scope + non-goals

- In scope: avatar colours in `UserMenu` from theme tokens (e.g. primary surface with its
  contrastText), with a fallback that passes when a consumer defines nothing.
- Explicit non-goals / do-not-touch: no layout change of the user menu.

## Tier · gates

- **Tier 3** — shared-core component (small).
- Reviewer: `ui_reviewer` (no new logic beyond the colour choice).
- **Done means released and jg-ferien's pin bumped.**

## Risks

- `createAppTheme` baseline: if the chosen token is optional, `assertThemeComplete` must require it or
  the fallback must pass on its own.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. With jg-ferien's theme values the avatar pair is at least 4.5:1.
2. With a theme defining nothing extra the fallback pair is at least 4.5:1.

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Context package

- File: `src/auth/UserMenu.jsx`. The avatar is rendered at line 60:
  `<Avatar src={avatarSrc} sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>` — no `bgcolor`/`color`
  is set today, so it falls through to MUI's default grey Avatar styling (1.83:1, the measured
  defect). Only this one JSX element changes; nothing else in the file.
- **Pitfall — do not just reach for `theme.palette.primary.contrastText`.** MUI's own
  `createTheme`/`augmentColor` computes `contrastText` with `contrastThreshold: 3` (tuned for large
  text/graphics, AA), not the 4.5:1 this WO requires for normal-size initials text. A consumer's
  `primary.main` that legitimately passes MUI's own 3:1 threshold can still fail 4.5:1, and nothing
  here re-validates it — so `contrastText` alone is not a fallback that "passes when a consumer
  defines nothing", it is a fallback that USUALLY passes.
- **Design to implement instead** (uses the kit's own exported contrast helper, satisfies both
  required tests meaningfully since both actually depend on the consumer's `primary.main`):
  1. Import `{ calculateContrastRatio }` from `'../theme'` (already exported from
     `src/theme/index.js` → re-exported at `src/index.js`) and `useTheme` from
     `'@mui/material/styles'`.
  2. Inside `UserMenu`, read `const theme = useTheme();`.
  3. Background: `theme.palette.primary.main` (the "primary surface" the Envelope names).
  4. Text colour: compute
     `calculateContrastRatio(theme.palette.background.paper, theme.palette.primary.main) >= 4.5
        ? theme.palette.background.paper : theme.palette.ink.primary`.
     This is not an arbitrary heuristic: for any background colour, the higher of
     (contrast against white) and (contrast against near-black) is mathematically always ≥ √21 ≈
     4.58 — i.e. picking whichever of the kit's own light (`background.paper`, white) or dark
     (`ink.primary`, near-black) ink token has the higher measured contrast against
     `primary.main` is GUARANTEED to clear 4.5:1 for every possible `primary.main`, including one
     a consumer hasn't customised at all (the untouched baseline `primary.main` MUI ships). That is
     what makes this "a fallback that passes when a consumer defines nothing" instead of "usually
     passes".
  5. Apply as `sx={{ ..., bgcolor: theme.palette.primary.main, color: <computed> }}` on the same
     `Avatar` element — keep the existing `width`/`height`/`fontSize` untouched.
  6. Do NOT introduce a new literal hex/rgb anywhere — `theme.palette.background.paper` and
     `theme.palette.ink.primary` are both resolved theme values, and referencing them via
     `theme.palette.<path>` (not writing their hex value as a string literal) keeps
     `reportOffPaletteColours` clean, same as every other component in the kit.
- Test file: new `tests/UserMenu.test.jsx` (none exists yet — check with `Glob` before assuming;
  if a `UserMenu` test already exists under a different name, extend it instead of creating a
  duplicate). Pattern after `tests/StatTile.test.jsx`: `@vitest-environment jsdom`,
  `createAppTheme(...)`, wrap `UserMenu` in the theme provider AND `AuthContext.Provider` (it reads
  `user`/`logout` via `useContext(AuthContext)` at line 32 — a minimal `{ user: { username: 'ab' },
  logout: () => {} }` value is enough to render the avatar).
  1. With a theme built from jg-ferien's actual `primary.main` — `#367964` (measured directly from
     `jg-ferien/frontend/src/theme.js:25`, a mid-brightness teal-green), assert
     `calculateContrastRatio(<resolved avatar text colour>, <resolved avatar bg colour>) >= 4.5`
     by reading the rendered `Avatar`'s computed `backgroundColor`/`color` via
     `window.getComputedStyle` (see `tests/StatTile.test.jsx`'s `accent` border test for the
     `getComputedStyle` pattern) and feeding both into `calculateContrastRatio` directly — do not
     hardcode an expected hex, assert the ratio.
  2. With `createAppTheme({})` (no consumer overrides — MUI's own baseline `primary.main`), assert
     the same ≥4.5 computed-style contrast check.

## Do-not-touch / invariants

- No layout change to the user menu (Envelope non-goal) — only the two `sx` colour values change.
- Do not touch `assertThemeComplete`/`THEME_COMPLETENESS_SURFACES` — this fix reads existing
  required surfaces (`primary.main`, `background.paper`, `ink.primary`), it does not need a new one.

## Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`)

## Preamble — a REQUIRED block IN this file, not something appended at invocation

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register
> row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source
> and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies,
> touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state
> blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT
> `git add`/`commit`/`push` — leave every
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

---

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.**

*(to be filled by the Orchestrator: execution directive; `ui_reviewer`; release; jg-ferien pin bump; register rows here and in jg (`JG-DL-12`).)*
