# UCM-CHAT-11 — Remove the "earlier messages left out" chip from the chat thread

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`) that removes a visible element in every consuming app.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumers:** maana, cockpit, hram, survey_app (they pick it up with their next pin bump; Maana's bump is routed by
the Maana Expertenchat).

### Goal and expected outcome

When the server trims a chat's history it sends a `notice` frame `history_trimmed` with `left_out`, and `ChatThread`
shows a chip "N earlier messages left out" above the thread (UCM-CHAT-3). The operator found it on Maana staging and
decided (2026-10-25) to drop it everywhere, in line with the earlier decision that hints in the chat be clearly reduced.
Expected outcome: no chip in any app; the history is still trimmed by the server exactly as today, only not announced.

### Settled decisions (operator, 2026-10-25)

1. The chip is removed for all apps, not made optional.
2. The server-side trimming and the `history_trimmed` frame are unchanged (django-core-micha is not touched); the
   frame is simply ignored by the workspace.

### Scope and acceptance

`src/chat/ChatThread.jsx` (chip, `trimmedCount` prop, `CHAT_THREAD_TRIMMED_SX`), `src/chat/ChatWorkspace.jsx`
(the `trimmedCount` state and the `history_trimmed` frame handling), the `ChatThread.trimmed` entry in
`src/chat/kitSxRegistry.js`, the two `Chat.historyTrimmed_*` keys in `src/i18n/chatTranslations.ts`, and the tests
that assert them. Keep `CHAT_NOTICE_CODES` in `src/chat/wire.js` only if something else still uses it; otherwise
remove it. Accepted when a `history_trimmed` frame renders nothing and causes no error, and the other notices and
frames behave as today.

### Non-goals and do-not-touch

The server trimming, other notice codes, the `onAppFrame` path, the composer, all other chat states.

### Risks

`CHAT_KIT_SX_REGISTRY` is a public export (`src/entries/chat.js`); removing the `ChatThread.trimmed` entry changes
it. Check the consuming apps' kit-sx or theme completeness tests for a reference to that entry before release and
name any in the release note.

### Required tests to write

Replace the chip test in `tests/chatExtensions.test.jsx` with: a `history_trimmed` frame renders no chip and no text
and the thread stays usable. Remove the two key assertions in `tests/chatTranslations.test.js`.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-25 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; no `sec_review` (no auth
surface). Publish a minor release and report the version.
