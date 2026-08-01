# DX-1 — minimal Vite dev harness for ucm components

Status: done · **Tier 2** (dev-only tooling; **adds devDependencies → approval-gated**) · Target repo: `ui-core-micha` (main)
*Reclassified 2026-08-01: labelled Tier 1 at authoring, but it adds dependencies in a shared-core
repo — two binding Tier-2 surfaces per AGENTS.md's Tiering gate. A named independent `reviewer` did
run (one P2 on the provider's own WebSocket), so only the label was wrong.*

---

## Part A — Envelope (Expertenchat, 2026-07-31)

### Goal

Give `ui-core-micha` a way to **render** its components during development. Today `package.json`
exposes only `build` (tsc) and `test` (vitest): there is no Storybook, no demo app, no dev page. Every
shipped surface — auth, onboarding, notifications, charts — has only ever been verified in jsdom or
after a consuming app pinned it.

Immediate driver: MSG-3 is ~3700 LOC of new UI (jg's parity target: `Thread.jsx` alone is 2470 LOC)
that no app mounts until MSG-5, and the operator granted a redesign licence, which is only iterable
if the result can be looked at. But the gap is not messaging-specific and the harness is not
messaging-specific.

### Expected outcome

- A `pnpm dev` (or equivalent) script starting a Vite dev server that mounts ucm components in a
  browser, with the repo's MUI theme, `react-i18next` and router context wired the way a host app
  wires them.
- A small set of harness entries covering the existing surfaces well enough to prove the harness is
  real: at minimum one notifications surface and one charts surface. Adding an entry for a new
  component must be a few lines, not a framework.
- **A single component must be mountable standalone**, not only a whole assembled surface. MSG-3
  relies on this: it requires one harness entry per named component as its decomposition forcing
  function, so the harness must not assume an entry equals a full page.
- A **mock transport layer** the entries drive: fixture data plus an injectable API/realtime adapter,
  so a surface can be exercised without a backend. Where a component takes its data through a
  provider, the harness supplies a mock provider rather than patching the component.
- Light/dark theme and viewport switching, since responsive and dark-mode correctness is exactly what
  jsdom cannot show.
- Harness code lives outside the published package: not exported from `src/index.js`, excluded from
  `tsconfig.build.json`, and adding **zero** runtime dependencies. `dist/` must be byte-identical in
  content to a build from before this WO.
- `README` (or `CONTRIBUTING`) gains a short section on running the harness and adding an entry.

### Non-goals / do-not-touch

Storybook (deliberately not chosen — a dev page is a fraction of the config surface and this repo has
no story-writing habit to build on; revisit only if the harness proves insufficient); visual
regression / screenshot testing; publishing the harness; any change to component source, exports, or
public API; any change to the existing vitest setup; CI wiring (the harness is a local dev tool, not
a gate).

### Required tests to WRITE

This is dev tooling, so the meaningful assertions are about **not** affecting the product:

- The published barrel (`src/index.js`) is unchanged — the existing exports regression test
  (`tests/notificationsExports.test.js` pattern) must still pass, and no harness module is reachable
  from it.
- A build (`tsc -p tsconfig.build.json`) succeeds and emits no harness files into `dist/`.
- `package.json` `dependencies` and `peerDependencies` are unchanged; additions are confined to
  `devDependencies`.

No component behaviour is under test here — the existing suite covers that and must stay green.

### Risks

- **Dependency addition** is the real cost and the reason this is approval-gated: Vite plus a React
  plugin. Keep it to the minimum; do not pull in a UI-catalog framework.
- **Harness fidelity.** A mock adapter can drift from the real REST/realtime contract and produce
  confidence that does not transfer. Mitigation: fixtures are shaped from the actual dcm contract in
  `django-core-micha/docs/design/messaging-platform.md` §REST/§Realtime, and the harness is a
  development aid — it never replaces the tests or the independent review.
- Scope creep into "a component gallery". The deliverable is a dev page, not a product.

### Preconditions

Operator approval for the devDependency additions — granted 2026-07-31 as part of the MSG-3 scoping
decision. This WO **runs before MSG-3**.

### Execution directive

Implement through `codex exec` in the background — invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file;
fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

### Release

**No version bump, no publish.** Dev-only tooling changes nothing in the package. The next ucm
publish rides whatever WO follows (MSG-3).

### Mini-handover (pastable)

Orchestrator: implement `work-orders/DX-1.md` in `ui-core-micha` (main). `git pull` first, read the
WO, then follow `orchestrate-codex` (Codex-first, own independent review, commit on green, **no
publish**).

---

## Part B — Implementation map (Orchestrator)

### Target repo / working directory

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root; package `@micha.bigler/ui-core-micha`,
current published version 2.15.0 — **unchanged by this WO**, no publish).

### Context package

**Repo conventions to mirror:**
- `package.json` — current `scripts`: `build` (`tsc -p tsconfig.build.json`), `test` (`vitest run`).
  No `dev` script exists yet; add one. `peerDependencies`/`dependencies` must not change;
  `devDependencies` gains Vite + `@vitejs/plugin-react` only (or whatever minimal set a Vite+React+JSX
  dev server needs) — no UI-catalog framework, no Storybook.
- `tsconfig.build.json` — `"include": ["src"]`, `rootDir: "./src"`, `outDir: "dist"`. The harness must
  live **outside** `src/` (e.g. a top-level `dev/` directory) so it is never included by this config
  and never emitted into `dist/`. Confirm after writing: `dist/` from a build with the harness present
  must be byte-identical to a build from before this WO (no new/changed files under `dist/`).
- `src/index.js` — the published barrel. Do not add anything here for the harness itself; the harness
  imports FROM the barrel (or directly from component source, orchestrator's/Codex's call — importing
  from source is likely simpler and avoids a dist rebuild loop during dev) but nothing is added TO it.
- `tests/notificationsExports.test.js` — the existing exports-regression pattern to confirm still
  passes untouched (proves the barrel didn't change).
- `src/notifications/realtime.jsx` — `useRealtimeCore({ active, wsUrl })` returns `{ subscribe }`;
  `RealtimeContext` is the context the mock realtime provider must satisfy so components under it can
  call `useRealtime()` without throwing. The harness's mock realtime adapter should provide a
  `RealtimeContext.Provider` with an injectable `subscribe` (e.g. a manual event-dispatch harness) so
  a harness entry can simulate a WS frame arriving, without opening a real socket.
- `src/notifications/NotificationsProvider.jsx` (read for the provider-wrapping pattern) — a
  representative provider-consuming surface for the "at minimum one notifications surface" harness
  entry requirement.
- `src/i18n/notificationsTranslations.ts` / `src/i18n/chartsTranslations.ts` — the flat i18n key
  pattern; the harness needs `react-i18next` wired with at least these (or a minimal fixture set) so
  mounted components render translated text instead of raw keys.
- Chart components (`ChartFrame`/`BarChart`/`LineChart`, per `tests/ChartFrame.test.jsx` etc.) — the
  "at minimum one charts surface" harness entry.

**Invariants:**
- Zero new runtime dependencies (peer or direct) — Vite/plugin additions are dev-only.
- Harness is not exported, not built, not tested for behavior (only the three "does not affect the
  product" assertions in Required Tests below).
- No change to the existing vitest test setup/config or any existing test file.
- No CI wiring — this is a local dev tool.

### Required tests

Per envelope: extend/confirm the exports-regression test still passes with nothing new reachable from
it; a `build` succeeds and diffing `dist/` before/after shows no harness files and no content change;
inspect `package.json` to confirm `dependencies`/`peerDependencies` are byte-identical and only
`devDependencies` gained entries.

### Progress contract

Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (file opened, file
edited, command/test run) and `PROGRESS: [<n>/<total>] done` on step completion, spaced so no gap
exceeds ~2 min, stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.

### Preamble (must be appended verbatim to the Codex prompt)

The text above is the COMPLETE spec — read nearest `AGENTS.md`, `.codex/skills/<role>/SKILL.md` (if
present), and this repo's `MEMORY.md` only for conventions; stay in scope; do not touch
`peerDependencies`/`dependencies`, only `devDependencies`; do not touch `src/index.js`'s exports; do
not update `MEMORY.md`; do NOT `git add`/`commit`/`push` — leave the change uncommitted in the working
tree for the orchestrator's independent review. WRITE and RUN the three required checks (exports test,
build + dist diff, package.json dependency diff) yourself to confirm — that is your only verification
run: do NOT run the full vitest suite as a "review" and do NOT run any review; the orchestrator does
both after you finish (though re-running `vitest run` in full is harmless and encouraged as a sanity
check since it's the existing test command, just don't treat it as satisfying the review step).
