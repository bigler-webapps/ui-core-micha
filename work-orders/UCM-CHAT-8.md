# UCM-CHAT-8 — ChatWorkspace starts status, catalogue and chat lists together and takes a preloaded list

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: a chat surface opens one request level earlier, and an app that has already loaded the chat
  list does not load it again. From Tanzania every serial level costs at least ~0.33 s.
- Expected outcome:
  - On mount and on every scope change, `ChatWorkspace` starts the status request, the catalogue
    request and both chat lists (active and archived) at the same time, instead of starting the
    catalogue and lists only after the status has answered
    (`src/chat/ChatWorkspace.jsx`, the effect around the status request and `loadLists`).
  - If the status is not `available`, the catalogue and list answers are discarded and the surface
    shows the unavailable or error state exactly as today; nothing from them is shown.
  - A new optional prop lets the app hand over the active chat list it has already loaded for the
    same scope. When given, `ChatWorkspace` uses it instead of requesting the active list; the archived
    list is still requested. Without the prop, behaviour is today's apart from the earlier start.
  - Activating the host's chosen chat (and everything that follows from it) can therefore begin as
    soon as the status and the lists have answered, one level earlier than today.
  - The prop is documented in the chat section of the README and in the changelog; the release is a
    minor version.

## Background (measured 2026-10-22 from Tanzania, staging-maana)

maana's project page: `assistant/status` (level 3) -> then `assistant/chats/?archived=false` and
`?archived=true` plus the catalogue (level 4) -> then the chat's grants, turns (110 kB) and proposals
(level 5). maana also loads the active chat list itself to find its remembered chat, so the active
list is requested twice. Consumers of `ChatWorkspace`: maana (`qda/assistant/AssistantChat.jsx`) and
cockpit (`cockpit/AssistantPage.jsx`).

## Scope + non-goals

- In scope: the start sequence of `ChatWorkspace`, the preloaded-list prop, README and changelog.
- Decided in the requirements round (2026-10-22): parallel start plus an optional preloaded active
  list; the archived list keeps being requested by `ChatWorkspace`.
- Non-goals / do not touch:
  - the chat protocol, streaming, the composer and every visible part of the surface;
  - the catalogue request for a specific chat after a chat is selected;
  - paging of the lists ("load more") and list refreshes after create, rename, archive, restore or
    delete;
  - any consumer app (maana adopts this in MAANA-WEBPERF-3; cockpit is unaffected unless it opts in).

## Tier · precondition / gate

- Tier 3: change inside shared-core (request order changes for every consumer; the prop is additive).
- Precondition: none.

## Risks

- A scope change while the start requests are in flight must drop every answer of the old scope,
  including the catalogue and a preloaded list that belongs to the old scope.
- Lists requested for an unavailable or misconfigured assistant cost requests that are thrown away;
  they must never be shown, and their errors must not override the status's own state.
- A preloaded list that is stale (the app loaded it long before) would hide a newer chat; it is only
  valid for the same scope and the same start.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- On mount, status, catalogue, active list and archived list are all requested before any of them
  resolves.
- Status `not_configured` or a status error: the list and catalogue answers are discarded and the
  surface shows today's unavailable or error state.
- With a preloaded active list for the scope: no active-list request; the archived list is still
  requested; the host's chosen chat is activated from the preloaded list.
- A scope change during the start: no answer of the old scope reaches the state.
- The existing ChatWorkspace tests pass unchanged.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ChatWorkspace.jsx` (start sequence, `loadLists`, the new prop and its doc comment) and new
`tests/chatParallelStart.test.jsx`. No other file (no README, CHANGELOG, package files, lockfile, register, existing
tests).

## Seams (verified against `main` at 7cc3aa2)

- **Start today.** `src/chat/ChatWorkspace.jsx:164-175`: `getStatus` (with `{ scope }` when a scope is set), then — only
  if `available` — `Promise.all([api.getCatalogue(), loadLists()])`, then `setStatus`, `setCatalogue`,
  `setListsLoaded(true)`; not available → `setStatus(state.status)` + `setUnavailableReason`; any rejection →
  `setStatus('error')`. The `live` flag drops answers after unmount or a dependency change.
- **Lists.** `loadLists` (:151-162) requests active and archived (`{ scope }` / `{ scope, archived: true }`, or without
  arguments when there is no scope), drops answers of an old scope via `scopeVersion` (:147-149, bumped on every scope
  change), sets `chats`, `nextChats`, `archived` and returns both lists. It is also used later (host-chosen chat not
  yet loaded :202, after create :328) — those later uses keep requesting both lists.
- **Activation.** The host's chosen chat is applied in the layout effect (:188-214) once `status === 'available'` and
  `listsLoaded`; nothing changes there.

## What to build

- **Parallel start.** On mount and on every scope change start `getStatus`, `getCatalogue` and both lists at the same
  time. When the status answers `available`, wait for the catalogue and lists and set state as today (one update path:
  status, catalogue, lists, `listsLoaded`). When it is not `available`, or the status request fails, set today's
  state and discard the catalogue and list answers — including their failures: a catalogue or list rejection must
  never turn an unavailable status into an error, nor appear as an unhandled rejection (attach handlers). When the
  status is `available` but the catalogue or a list fails, the result is `error` as today. Answers of an old scope or
  after unmount never reach state (`live` + `scopeVersion`).
- **Preloaded active list.** New optional prop **`preloadedChats`**: `{ scope, results, next }` — the response of the
  active-list request the app has already made, with the scope it was made for (`undefined` when there is no scope).
  It is used only in the start, and only when `preloadedChats.scope === scope` (strict equality); then the active list
  is not requested, the archived list still is, and `chats`/`nextChats` come from it. A preloaded list for another
  scope is ignored (the active list is requested). Later reloads (create, host-chosen chat not loaded, load more) are
  unchanged and request as today. Document the prop in the component's JSDoc next to the other props.

## Required tests (maps Part A)

`tests/chatParallelStart.test.jsx` (`// @vitest-environment jsdom`, conventions and fake socket of
`tests/chatWorkspace.test.jsx` / `tests/chatActiveChat.test.jsx`, deferred promises you resolve by hand): all four
requests start before any resolves; status `not_configured` (and a status rejection) shows today's unavailable (error)
state while the catalogue and lists resolve or reject later without effect and without unhandled rejections; with
`preloadedChats` for the scope there is no active-list request, the archived list is requested, and `activeChatId`
from the preloaded list is activated; a `preloadedChats` with a different scope is ignored; a scope change during the
start drops every old-scope answer (status, catalogue, lists). The existing chat tests must pass unchanged.

Work from this package; do not explore broadly.

## Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/chatParallelStart.test.jsx` from the target directory, once — your ONLY test run;
the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit, no further dispatch.

Mapped by the Orchestrator (Claude) on 2026-10-22 against `main` at 7cc3aa2 (4.18.0 = UCM-BILL-10); prop name and
shape `preloadedChats: { scope, results, next }` chosen by the Orchestrator so a list of another scope cannot be used.
Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Review: lenses envelope, regression, duplication,
tests, codex/gpt-6-luna read-only (no visible change: no `ui_review`; no auth surface: no `sec_review`). Verification:
the new test and all `chat*` tests, `packageEntries`, tsc; full suite in `ci.yml` on `ci-test/UCM-CHAT-8`. README,
CHANGELOG, minor version by the Orchestrator. Origin: the MAANA-WEBPERF-3 re-measurement on 2026-10-22; operator
chose the ucm fix the same day. First consumer: maana MAANA-WEBPERF-3.

Launch evidence: 2026-10-22, model gpt-6-luna, reasoning high, session 01a1637c-4b18-7613-8776-64412ac128da;
`RESULT: BLOCKED` only because its one allowed test run had surfaced a failure it could not re-run under the one-run
rule; `ChatWorkspace.jsx` and the new test only, no commit. Orchestrator: the preloaded list read through a ref (an
inline object must not restart the start), indentation, README, CHANGELOG, version 4.19.0. The existing chatWorkspace
test "does not request catalogue or chat lists when no model is configured" contradicted the Envelope's parallel start
and was changed to assert the unavailable state with no chats shown (the Envelope's "existing tests pass unchanged"
cannot hold for that one test). Two review findings accepted (both test gaps): the unavailable/error test now also
covers catalogue and lists that resolve successfully after the status (first pass); the scope-change test now opens the
new scope's chat and shows that a late old-scope catalogue does not replace the new one (re-review; that last tightening
not re-reviewed).
