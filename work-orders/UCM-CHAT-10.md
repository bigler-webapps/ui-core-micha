# UCM-CHAT-10 — ChatWorkspace: an app can replace the failed-turn message per error

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`); additive, default unchanged.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumer:** MAANA-CHAT-18.

### Goal and expected outcome

`ChatThread` renders every failed turn with the fixed alert `Chat.answerIncomplete` ("The answer could not be
completed.") and a retry button, whatever the turn's `error_code`. Maana (MAANA-CHAT-16) shows its clear message for
`prompt_too_long` ("Die Freigaben sind zu gross für eine Antwort. Gib weniger Interviews frei.") through
`renderAnswerExtra`, so the person sees two alerts for one failure. The operator decided (2026-10-25) that only the
clear message appears. Expected outcome: a host can supply its own failed-turn message for the error codes it knows;
everything else keeps the generic alert.

### Settled decisions (operator, 2026-10-25)

1. An optional `ChatWorkspace` prop (passed to `ChatThread`), for example `renderTurnError({ turn, chat, retry })`:
   when it returns a node, that node replaces the generic failed-turn alert for this turn; when it returns null or the
   prop is absent, the generic alert shows as today.
2. The host's node receives the retry action so it can offer "Erneut versuchen" where retrying makes sense.
3. Interrupted turns and all other states are unchanged.

### Scope and acceptance

`ChatThread` and `ChatWorkspace`; documented with an example. Accepted when Maana can show only its clear message for
`prompt_too_long` and an app without the prop sees today's alert.

### Non-goals and do-not-touch

Error codes themselves, the retry logic, the compact composer, other chat states.

### Required tests to write

Custom node replaces the generic alert for a matching turn; null falls back to the generic alert; retry is passed and
works; without the prop the generic alert renders exactly as today.

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ChatThread.jsx`, `src/chat/ChatWorkspace.jsx` (prop pass-through and its doc comment) and new
`tests/chatTurnError.test.jsx`. No other file (no README, CHANGELOG, package files, lockfile, register, existing tests,
translations, no new exports in `src/entries/*.js`).

### Seams (verified against `main` at af2b555)

- `src/chat/ChatThread.jsx`: `Answer` (`:28`) computes
  `failed = ['failed', 'cancelled'].includes(turn.state) && turn.error_code` (`:31`) and renders at `:57-61` an
  `<Alert severity="error">` with `Chat.answerIncomplete` and, when `onRetry` is set, a "Chat.retry" button calling
  `onRetry(turn)`. The interrupted chip with its own retry is just above (`:51-56`); leave it unchanged.
- `ChatThread` props at `:70`; it passes `onRetry={readOnly ? undefined : onRetry}` to `Answer` (`:130`).
- `src/chat/ChatWorkspace.jsx:60` props, doc comment above it (`:52-59`); `:442-444` `answerExtra` wraps
  `renderAnswerExtra`; `:446-449` `retry(turn)`; `:516` renders `<ChatThread …>`.

### What to build

- New optional `ChatWorkspace` prop **`renderTurnError({ turn, chat, retry })`**, passed unchanged to `ChatThread` as a
  prop of the same name and on to `Answer`.
- In `Answer`, only where today's generic alert would render (`failed` true): call it when given.
  - A returned node other than `null`/`undefined`/`false` replaces the generic alert for that turn.
  - Otherwise the generic alert renders exactly as today.
- `retry` is `() => onRetry(turn)` when `Answer` has `onRetry` (so it is `undefined` for a read-only or archived thread,
  like today's button), else `undefined`.
- No other state changes: interrupted, generating, completed and the `quota_exceeded` path (`error_code` null) render
  as today, and `renderAnswerExtra` still renders.
- Document the prop in the `ChatWorkspace` doc comment.

### Required tests (maps Part A)

`tests/chatTurnError.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/chatThread.test.jsx`, rendering
`ChatThread` directly is enough; one case through `ChatWorkspace` with its fake socket as in `tests/chatWorkspace.test.jsx`
shows the pass-through):
- A failed turn with `error_code: 'prompt_too_long'` and a `renderTurnError` returning a node for that code shows the
  node and no `Chat.answerIncomplete`.
- The same prop returning `null` for another code shows the generic alert.
- The `retry` it receives calls `onRetry` with the turn, and is `undefined` when `readOnly`.
- Without the prop the generic alert with its retry button renders as today.
- An interrupted turn ignores the prop.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/chatTurnError.test.jsx` from the target directory, once — your ONLY test run; the
Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-25 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release
and report the version.

Mapped by the Orchestrator (Claude) on 2026-10-25 against `main` at af2b555 (4.22.0); prop name `renderTurnError` as
the Envelope suggests. Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Review: lenses envelope,
regression, duplication, tests plus `ui_review`, codex/gpt-6-luna read-only, one round (AGENTS.md → Reviews); no
`sec_review` (no auth surface; the host renders its own node as today with `renderAnswerExtra`). Orchestrator's own
Envelope pass while the lenses run. Verification: the new test, all `chat*` tests, `packageEntries`, tsc; full suite in
`ci.yml` on `ci-test/UCM-CHAT-10`. README chat section, CHANGELOG, minor version by the Orchestrator.
