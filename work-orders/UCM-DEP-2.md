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
