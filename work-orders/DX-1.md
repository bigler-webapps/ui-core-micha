# DX-1 — minimal Vite dev harness for ucm components

Status: planned · Tier 1 (dev-only tooling; **adds devDependencies → approval-gated**) · Target repo: `ui-core-micha` (main)

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

To be filled by the Orchestrator session on `git pull`, within the envelope above.
