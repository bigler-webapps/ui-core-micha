# UCM-DEP-2 — ui-core-micha 4.0.0: required peers only for what every consumer uses

Part of the estate dependency reduction decided 2026-10-15 (operator + Expertenchat). This order
and `django-core-micha` `DCM-DEPS-3` land and release first; every app then has its own order that
bumps to these releases (`<TOKEN>-DEP(S)-<n>` in each app repo).

# A. Envelope

## Goal & expected outcome

- Ziel: a consumer installs only the peers of the ucm features it actually imports, and nothing
  depends on the unmaintained `react-helmet` any more.
- Expected outcome: `@micha.bigler/ui-core-micha` **4.0.0** published with an `exports` map; the
  main entry resolves with only the required peers installed; charts, QR and markdown live on
  sub-paths whose peers are optional; the CHANGELOG carries a consumer migration table (old import
  -> new sub-path, peer -> required/optional).

## Scope

1. **Drop `react-helmet`.** The seven pages that use it (`AccountPage`, `LoginPage`,
   `PasswordChangePage`, `PasswordInvitePage`, `PasswordResetRequestPage`, `SignupConfirmPage`,
   `SignUpPage`) each render one `<Helmet><title>`; replace each with a native React 19 `<title>`
   element. Remove the peer. Tests that mock `react-helmet` assert the rendered title instead.
2. **Sub-path exports.** Add a package.json `exports` map:
   - `.` — everything that stays in the main entry;
   - `./charts` — every export that imports `@mui/x-charts` (`BarChart`, `LineChart`,
     `ScatterChart`, `TimeSeriesChart` and their chart-only helpers);
   - `./markdown` — every export that imports `react-markdown`/`remark-gfm` (`MarkdownReply`);
   - `./qr` — every export that imports `qrcode.react`, subject to the QR rule in point 4.
3. **Decouple the theme.** `createAppTheme` / `theme/index.js` must not reach any module of the
   three sub-paths. Today `theme/kitSxRegistry.js` imports SX constants from about 20 component
   modules (including `MFAComponent` and `charts/ChartFrame`); move those constants so the theme's
   import graph contains no charts, QR or markdown module.
4. **Peers.**
   - `@mui/x-charts`, `react-markdown`, `remark-gfm` become optional peers
     (`peerDependenciesMeta`); `react-markdown` and `remark-gfm` leave `dependencies`.
   - `qrcode.react` becomes optional **only if** no export that remains in the main entry renders a
     `qrcode.react` component (e.g. MFA setup reached from `AccountPage`). If one does, it stays a
     required peer, the MFA parts stay in `.`, and the CHANGELOG says so. Account/auth pages are not
     moved to a sub-path to make this work.
   - `@mui/icons-material` is used at runtime by ~19 src files but declared only as a devDependency:
     add it as a required peer with the same range as `@mui/material`.
   - `i18next` peer range tightened to what the declared `react-i18next` accepts (>= 26.2.0).
   - `axios` stays a required peer.
5. **Publish only the build.** Add a `files` field so the package contains `dist` plus README,
   CHANGELOG and LICENSE, not `src`, tests, docs or `WORK_ORDERS.md`.
6. **Release 4.0.0** with the migration table.

## Non-goals / do-not-touch

- No consumer repo changes — each app has its own order.
- No component behaviour or visual change beyond the title mechanism (titles stay identical).
- No TypeScript declarations, no change to `@fontsource/dm-sans` handling, no move of `axios` into
  `dependencies`, no support for `@mui/x-charts` 9 (the charts peer range covers what ucm's chart
  components are tested with today).

## Tier · precondition / gate

- Tier 3: a change inside shared-core with a breaking export change for every consumer.
- Precondition: none. Ordering: published before any app order of this reduction starts.
- No prototype: no visual change.

## Risks

- An export lands on the wrong side of the split: consumers' builds fail on missing optional peers
  (if it stays in `.` while needing an optional peer) or on a missing export.
- Native `<title>` hoisting differs from Helmet when two pages render titles at once (nested
  layouts); title shown in the browser tab could change on such screens.
- The theme decoupling moves constants that apps may import directly; such imports must keep
  working from `.`.

## Required tests to WRITE

- Main entry without optional peers: importing `.` in an environment where `@mui/x-charts`,
  `react-markdown`, `remark-gfm` (and `qrcode.react` if it became optional) cannot be resolved
  succeeds (extend `tests/packageTreeShaking.test.js` or a new test; it must resolve peers rather
  than mark every bare specifier external).
- Each sub-path resolves and exports the components the migration table lists.
- Theme graph: the module graph of `createAppTheme` contains no module from `./charts`, `./qr` or
  `./markdown`.
- Titles: for each of the seven pages, the rendered document title equals today's title text.

# B. Implementation map — addressed to the implementer

## Orchestrator decisions taken while mapping (Part A stays as written)

- `qrcode.react` stays a REQUIRED peer: `AccountPage` (main entry) renders `QrSignupManager`, which renders a `qrcode.react` component. No `./qr` sub-path (QR rule, point 4).
- All of `src/components/charts/*` that needs `@mui/x-charts` (directly or through `ChartFrame` -> `exportChart`, `BarChart`, `LineChart`, `TimeSeriesChart`, `ScatterChart`, `chartDefaults`) goes to `./charts`. The pure helpers `palette`, `chartLabels`, `formatters`, `yearTickInterval` import no optional peer and stay exported from `.`.
- The chat surface imports `MarkdownReply`, so it cannot stay in `.` while `react-markdown` is optional. Working decision (option A, pending the Expertenchat's answer): a `./chat` sub-path holds the whole chat surface; `./markdown` holds `MarkdownReply` alone; `chatTranslations` stays in `.`.
- The Orchestrator owns `package.json` (the `exports` map, peers, `files`, version) and the lockfile. The implementer does not touch them.

## Context package

Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). The WO is delivered in chunks; each chunk below is a separate dispatch, and only the chunk named in your dispatch is yours.

### Chunk 1 — replace `react-helmet` with native React 19 `<title>`

Files: `src/pages/AccountPage.jsx:238`, `LoginPage.jsx:285`, `PasswordChangePage.jsx:38`, `PasswordInvitePage.jsx:140`, `PasswordResetRequestPage.jsx:44`, `SignUpPage.jsx:161`, `SignupConfirmPage.jsx:83`. Each has `<Helmet><title>…</title></Helmet>` and `import { Helmet } from 'react-helmet';`.

- Remove the import and the `<Helmet>` wrapper; render the `<title>` element in the same place.
- React warns when a `<title>` has several children (`{t('App.NAME')} – {t(...)}` is three). Build ONE string child per page with a template literal, keeping the exact text of today, for example `<title>{`${t('App.NAME')} – ${t('Auth.PAGE_LOGIN_TITLE')}`}</title>`. The separator is the en dash with a space on each side, as in the source. Keep the same translation keys and default texts (AccountPage: `${t('Account.PAGE_TITLE', 'Account')} – ${user.email}`; SignupConfirmPage keeps its `'Confirm your registration'` default; PasswordInvitePage uses `t(pageTitleKey)`).
- Tests: `tests/loginPageErrorResolution.test.jsx:20`, `tests/PasswordInvitePage.test.jsx:13`, `tests/SignUpPage.test.jsx:15` mock `react-helmet`; delete those mocks. Add `tests/pageTitles.test.jsx`: for each of the seven pages, render it the way the neighbouring tests do (reuse their providers/mocks; `react-i18next` is mocked with `t: (key, fallback) => fallback ?? key` style or the real keys as the neighbour does) and assert the rendered document title equals today's text for that page (`document.title`, since React 19 hoists `<title>` into the document head; query `document.querySelector('title')` if `document.title` is not updated in jsdom). If a page needs heavy context to render, assert on the `<title>` element's text found in `document.head` after render. Titles must be byte-identical to the previous Helmet output.
- Do not change anything else in these pages. No other file imports `react-helmet` (verify with a search of `src` and `tests`).

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded at ui-core-micha@b5389c3. Delivered in chunks: chunk 1 helmet -> native title; chunk 2 (written after chunk 1) the decoupling and sub-path entries. Orchestrator owns `package.json`, the lockfile, the version and the release. Verification: scoped tests, then a dispatched `ci.yml` run on `ci-test/UCM-DEP-2`.
