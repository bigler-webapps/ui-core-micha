# DX-2 — Declare `sideEffects` so consumers can tree-shake the kit

**Target repo:** `ui-core-micha` (branch `main`)
**Tier:** 3 — shared-core, and it changes what every consumer's bundler is permitted to discard.

---

## A. Envelope

### Goal

`package.json` declares **no `sideEffects` field**. Without it a bundler must assume every module in the
package can have an import side effect and therefore cannot drop unused exports. **Twelve consumers ship the
whole kit regardless of what they import.**

This is not a theory. `hram/THEME-2` switched hram from three named translation bundles to the full
`uiCoreTranslations` aggregate and measured the built-size delta at **−11 bytes** — not the increase everyone
expected, because the three-bundle import was already pulling all seven.

### Why this is worth a Tier-3 change

Two decisions currently rest on a number that this defect makes meaningless:

- **`I18N-1` measured `+28,943 B` raw / `+7,327 B` gzip** for an auth-only app switching to the aggregate.
  That measured a real difference in *source* reachability which the build never realises. As a decision input
  it is void.
- **`I18N-2` is `blocked` on exactly this.** It was framed as a bundle-size optimisation via
  self-registration, and its stated input is a size delta that cannot be measured until the package can
  tree-shake at all. **This WO is its unblocker**, and it is a far smaller change than reworking how twelve
  consumers resolve strings.

### Scope

1. **Prove it first, per module.** Walk every module reachable from the package root and establish that
   importing it has **no** side effect: no top-level statement with an observable effect, no polyfill or
   registry mutation, no `import './x.css'` or equivalent, no module-scope singleton creation whose existence
   something depends on. **This is the work**; the field is one line.
2. **`package.json`** — add `"sideEffects": false` if step 1 holds for everything. If it does **not** hold for
   some module, add the array form listing exactly those files rather than the blanket `false`.
3. **Re-measure the delta `I18N-1` got wrong**: the built size of an auth-only app importing only
   `authTranslations` versus the full aggregate, against a package that can now tree-shake. Report the number.
4. Update `I18N-2`'s register note with that number, so it is either authorable or droppable on evidence.

### Non-goals / do not touch

- **No `exports` map.** It would allow subpath imports and give a further size win, but it changes which
  import paths resolve at all — a breaking-change risk for twelve consumers in the same commit. Separate
  decision, and this WO's measurement is its input.
- **No component, theme, chart or i18n change.** Nothing in `src/` is edited for its own sake; the only source
  changes permitted are ones step 1 proves are needed to make a module genuinely side-effect-free, and each
  must be reported rather than folded in silently.
- **No consumer pin bumps.** Apps pick this up when they next bump.
- **`I18N-2` itself.** This unblocks it; it does not implement it.

### Risks

- **The real failure mode is a false `sideEffects: false`.** If a module *does* have an import side effect and
  the field says otherwise, a bundler silently drops it and the consuming app breaks at runtime in a way no
  test here will catch. That is why step 1 is the scope and the field is an afterthought. **If any module is
  uncertain, use the array form and list it** — a partial declaration that is true beats a blanket one that is
  nearly true.
- **`side effect` includes the theme.** `createAppTheme`, the token module and the registry are the places to
  look hardest: a module that builds an object at import time is fine, but one that *registers* itself
  somewhere is not.
- **Every consumer's bundle changes shape**, even though no source behaviour changes. That is the intent, and
  it is why this is Tier 3 rather than a chore.

### Required tests to WRITE

- **A test asserting the field matches reality** is not really possible in-repo — a bundler is what enforces
  it. So instead: **one build-level check** that the package builds and its entry points still resolve after
  the declaration, plus the measurement in scope item 3 recorded as a number in the register note.
- If step 1 finds a module needing a source change to become side-effect-free, that change gets a test.
- Otherwise **no new unit tests** — and saying so is the correct answer for a `package.json` field.

Scoped run: the existing suite, to confirm nothing regressed. Not a full-estate exercise.

### Parity guardrail

No API, behaviour or visual change. Every currently-working import must keep working; what changes is only
what a consumer's bundler may discard.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

**Repo root:** `ui-core-micha` (this is the package root — `package.json` lives here, `src/index.js` is
the package entry per `"main"`/`"module"`). Build: `pnpm run build` (tsc, `tsconfig.build.json`,
`rootDir: src` → `outDir: dist`). Tests: `pnpm test` (vitest run), config likely under `tests/` or
`vite.config.mjs`.

**Entry point to walk:** [`src/index.js`](../src/index.js) — every export re-exported from here is a
module the audit must cover. Rough module groups, in the order they're exported: `theme/` (7 exports),
`auth/` (AuthContext, UserMenu, apiClient, authApi, authService), `layout/` (PageLayout, SectionNav),
`pages/` (7 page components), `components/` (12 components incl. charts subtree), `i18n/` (7 translation
bundle modules, pure data objects), `notifications/` (7 exports incl. a `realtime` module — check for
WebSocket/EventSource construction at module scope, not just component-body), `messaging/` (13 exports,
same realtime-connection caution), `onboarding/` (8 exports).

**Known non-trivial finding — do not silently "fix" this, report it:**
[`src/theme/createAppTheme.js:1-3`](../src/theme/createAppTheme.js) has three top-level
`import '@fontsource/dm-sans/400.css'` (+ `/500.css`, `/600.css`) — these ARE import-level side effects
(CSS injected into the document on import, unconditionally, regardless of whether `createAppTheme` is
even called). This module must be **excluded** from a blanket `sideEffects: false` — either list
`src/theme/createAppTheme.js` explicitly in the array form, or (better, since it's a source-level fix
consistent with the WO's "no false negatives" risk framing) move the three font-CSS imports into a
separate module (e.g. `src/theme/fonts.css.js` or inline at the one leaf that needs them) so the rest of
`theme/` stays tree-shakeable and only that one file is excluded. Whichever path is taken, it must be
**reported explicitly** in the WO's audit output, not folded in silently (Envelope: "each must be
reported rather than folded in silently").

**Areas most likely to hide further side effects (audit these hardest, per the Envelope's own risk
note):** `theme/` (registry singletons — `KIT_COMPONENT_SX_REGISTRY` is exported as a value; confirm it's
a plain object literal built at import with no external registration call), `notifications/realtime.js`
and `messaging/` (anything opening a socket/listener at module scope rather than inside a hook/effect),
`auth/apiClient.js` (axios instance creation is fine — a side-effect-free object build — but check for
any `axios.interceptors.*.use(...)` called at module scope outside a factory function, which would be a
real side effect since it mutates a shared axios default instance).

**Do-not-touch:** no `exports` map in `package.json` (Envelope non-goal). No component/theme/chart/i18n
behaviour change — only source edits that make a module genuinely side-effect-free, each reported.

**Progress contract:** emit `PLAN: …` first, then `PROGRESS: [n/total] <module-group>` before auditing
each group above and `… done` after, and a final `RESULT: DONE` or `RESULT: BLOCKED <reason>`. No gap
> ~2 min. Work from this package — open files only to verify specific claims, not a blind full-repo read.

## Preamble

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is
no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and
the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md`** — the register row
and the review verdicts are the orchestrator's alone. Do NOT `git add`/`commit`/`push` — leave every
change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the
"Required tests to WRITE" section calls for AND **RUN the tests you just wrote** to confirm they execute
and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The
orchestrator re-runs the authoritative set + does the independent review after you finish — those are
the gate; your own run does not count as the gate.

Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
`RESULT: DONE|BLOCKED <reason>`.

---

## C. Orchestrator only

> **STOP — if you are the implementer reading this work order as your own specification, this section is NOT
> addressed to you. Skip it entirely.** It tells the Orchestrator how to invoke you. **You ARE that
> invocation — do NOT shell out to `codex exec`, do NOT spawn reviewers, do NOT edit `WORK_ORDERS.md`, and do
> NOT `git add`/`commit`/`push`.**

### Execution directive

Check `.claude/codex-status.md` first. **No line for the current date means use Codex.** A dated `unavailable`
line for today means skip the attempt, implement directly in Claude and name the record — that flips
authorship. Otherwise one probe, outcome written back either way.

### Review routing

Tier 3: **independent `reviewer`** — mandatory, and the substantive one here: ask it to **independently
re-check the side-effect audit**, module by module, rather than accept the implementer's list. That audit is
the entire safety argument. **No `ui_reviewer`** — nothing renders. No `sec_reviewer`.

### Verification

Nothing renders, so no gate. The verification is the audit plus the re-measured delta, both reported as
findings rather than assertions.

**A push to `main` here IS the npm publish** — `publish.yml` triggers on `push: branches: [main]` with `paths`
covering `package.json` and `src/**`, and npm publishes cannot be undone. So decide the version deliberately
before pushing: this is a **patch** by scope (no new capability, no API change), and it will go out the moment
it lands.

### Register + commit

One row, `DX-2`. `done` only with the independent reviewer and verdict named, plus the measured delta.
Update `I18N-2`'s note in the same commit — that cross-reference is half the point of this WO.

### Mini-handover

Repo: `ui-core-micha`, branch `main`. WO: `work-orders/DX-2.md`. The one-line field is trivial; **the
per-module side-effect audit is the work**, and a wrong `false` breaks consumers silently at runtime. Use the
array form if anything is uncertain. Re-measure the aggregate delta and write it into `I18N-2`. Tier 3,
`reviewer` mandatory and asked to redo the audit. **Pushing to main publishes.** Follow `orchestrate-codex`.
