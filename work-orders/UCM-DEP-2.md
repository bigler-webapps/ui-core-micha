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
   - `./markdown` — `MarkdownReply` alone;
   - `./chat` — the whole chat surface, because `ChatThread` (and so `ChatWorkspace`) renders
     `MarkdownReply`: `ChatWorkspace`, `ChatList`, `ChatThread`, `ChatComposer`, `ModelPicker`,
     `useChatSocket`, `createChatApi`, `defaultChatApi`. `chatTranslations` stays in `.`.
     (Operator decision 2026-10-15, after the Orchestrator found the `ChatThread` import.)
   - `./qr` — every export that imports `qrcode.react`, subject to the QR rule in point 4.
     (Mapping found `AccountPage` in `.` renders `QrSignupManager`, so under that rule there is no
     `./qr` and `qrcode.react` stays required.)
3. **Decouple the theme.** `createAppTheme` / `theme/index.js` must not reach any module of the
   sub-paths. Today `theme/kitSxRegistry.js` imports SX constants from about 20 component
   modules (including `MFAComponent` and `charts/ChartFrame`); move those constants so the theme's
   import graph contains no charts, chat, QR or markdown module.
4. **Peers.**
   - `@mui/x-charts`, `react-markdown`, `remark-gfm` become optional peers
     (`peerDependenciesMeta`); `react-markdown` and `remark-gfm` leave `dependencies` and serve both
     `./markdown` and `./chat`.
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

### Chunk 2 — decouple the theme, add the sub-path entries, test the split

Chunk 1 is already done in the working tree (native titles); leave it as it is. Part A, amended 2026-10-15 with the operator's decision, puts the whole chat surface on `./chat` and `MarkdownReply` alone on `./markdown`. Do not edit `package.json` or the lockfile (Orchestrator). The `exports` map the Orchestrator will write is: `.` -> `dist/index.js`, `./charts` -> `dist/entries/charts.js`, `./chat` -> `dist/entries/chat.js`, `./markdown` -> `dist/entries/markdown.js`. So the three entry files you create are `src/entries/charts.js`, `src/entries/chat.js`, `src/entries/markdown.js`.

**1. Entry files and the main entry (`src/index.js`).**
- `src/entries/charts.js` exports: `ChartFrame`, `BarChart`, `LineChart`, `TimeSeriesChart`, `ScatterChart`, `ScatterReferenceCurve`, `ScatterReferenceLine`, `scaleBubbleRadius` (the names `src/index.js:72-81` exports today from `components/charts/{ChartFrame,BarChart,LineChart,TimeSeriesChart,ScatterChart}`), plus `CHARTS_KIT_SX_REGISTRY` (point 2).
- `src/entries/chat.js` exports: `ChatWorkspace`, `ChatList`, `ChatThread`, `ChatComposer`, `ModelPicker`, `useChatSocket`, `createChatApi`, `defaultChatApi` (today `src/index.js:128-135` without `MarkdownReply`), plus `CHAT_KIT_SX_REGISTRY`.
- `src/entries/markdown.js` exports `MarkdownReply` (named; the default export of `src/chat/MarkdownReply.jsx`).
- In `src/index.js` delete exactly: the `ChartFrame`, `BarChart`, `LineChart`, `TimeSeriesChart` and `ScatterChart`-group export lines, and the whole "Shared AI chat" block including `MarkdownReply`. Keep in `.`: `getNeutralChartPalette`, `useNeutralChartPalette`, the `formatShort*` helpers, `yearTickInterval`, `formatPercentage`, `formatCompact`, `formatRatio`, `createChartFormatters`, `useChartFormatters` (they import no optional peer), `chartsTranslations`, `chatTranslations`, and everything else.
- Entry files only re-export; they contain no logic and no top-level side effect.

**2. Split the sx registry so `src/theme` reaches no sub-path module.**
- `src/theme/kitSxRegistry.js` (`KIT_COMPONENT_SX_REGISTRY`) keeps only entries of components that stay in `.`. Remove the `ChartFrame.*` entries and imports (`src/theme/kitSxRegistry.js:62` and the entries near the end) and the `ChatList.*`/`ChatThread.*` entries and imports (`:100-101`). `qrcode.react` stays a required peer, so the QR/MFA components and their entries stay.
- Export a small factory from `src/theme/kitSxRegistry.js`: `createKitSxEntry(component, muiComponent, sx, exportName, slots)` returning the same object shape the file's internal `entry()` returns (`{ component, muiComponent, sx, slots, exportName }`); the internal `entry()` may keep working as it does. Do not export it from `src/index.js`.
- Create `src/components/charts/kitSxRegistry.js` exporting `CHARTS_KIT_SX_REGISTRY` (the two former `ChartFrame.root` / `ChartFrame.alert` entries, `MuiPaper` / `MuiAlert`, with `exportName` `'CHART_FRAME_ROOT_SX'` / `'CHART_FRAME_ALERT_SX'`) and `src/chat/kitSxRegistry.js` exporting `CHAT_KIT_SX_REGISTRY` (the four former chat entries: `ChatList.rowAction` `MuiIconButton`, `ChatList.archivedAction` `MuiButton`, `ChatThread.toolChip` `MuiChip`, `ChatThread.notice` `MuiAlert`, with their export names). Both import the sx constants from their component modules and use `createKitSxEntry`.
- Update every consumer of the old combined registry: `tests/themeCompleteness.test.js` (and any other test or script that reads `KIT_COMPONENT_SX_REGISTRY`: search `tests`, `src`, `scripts`) must check the union `[...KIT_COMPONENT_SX_REGISTRY, ...CHARTS_KIT_SX_REGISTRY, ...CHAT_KIT_SX_REGISTRY]` wherever it checked the full set before, importing the two sub-registries from their module paths. The disjointness and bypass checks keep their meaning; nothing may be weakened.

**3. Other importers of moved exports.** Search `dev/**`, `scripts/**`, `tests/**` and `src/**` for imports of `ChartFrame`, `BarChart`, `LineChart`, `TimeSeriesChart`, `ScatterChart`, the chat components and `MarkdownReply` from `../src/index` or `src/index.js` and repoint them at the matching entry file (`src/entries/*`) or the component module. `tests/chatExports.test.js` imports the chat exports from `../src/index`: repoint it at `../src/entries/chat` and `../src/entries/markdown`, and keep asserting `chatTranslations` from `../src/index`.

**4. New tests (Part A's required tests, plus the migration table):**
- `tests/packageEntries.test.js`:
  - Static import-graph test: starting at `src/index.js`, follow every relative import and re-export (`import ... from`, `export ... from`, dynamic `import()` with a string literal) through `.js`/`.jsx` files and collect the bare specifiers; none may start with `@mui/x-charts`, `react-markdown` or `remark-gfm`. Assert the crawl visited more than 100 files so a broken crawler cannot pass vacuously.
  - The same crawl starting at `src/theme/index.js`: no bare specifier among those three, no file under `src/chat/` and none of `components/charts/{ChartFrame,BarChart,LineChart,ScatterChart,TimeSeriesChart,chartDefaults,exportChart}`.
  - The crawl from `src/entries/charts.js` finds `@mui/x-charts`; from `src/entries/markdown.js` finds `react-markdown` and `remark-gfm`; from `src/entries/chat.js` finds `react-markdown` (so the optional-peer story is real).
  - Dynamic check: `src/index.js` imports successfully while `@mui/x-charts`, `react-markdown` and `remark-gfm` (and any `@mui/x-charts/...` sub-path the sources use) are mocked with factories that throw "not installed" (`vi.mock` with a throwing factory; import the entry inside the test).
  - Each entry file exports exactly the names listed in point 1 (assert the sorted export-name lists and that each value is defined).
- Update `tests/themeCompleteness.test.js` as point 2 says; it must stay green.

Keep style and comment density of the surrounding code. No new dependencies.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded at ui-core-micha@b5389c3. Delivered in chunks: chunk 1 helmet -> native title; chunk 2 (written after chunk 1) the decoupling and sub-path entries. Orchestrator owns `package.json`, the lockfile, the version and the release. Verification: scoped tests, then a dispatched `ci.yml` run on `ci-test/UCM-DEP-2`.
