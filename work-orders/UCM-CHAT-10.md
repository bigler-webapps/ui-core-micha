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

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-25 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release
and report the version.
