# UCM-CHAT-5 — The host app can attach a client context to every send and send a message on its own

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Follows `UCM-CHAT-4` (4.2.0). Counterpart of `DCM-CHAT-11` (django-core-micha 3.3.0). Requested by `survey_app/SVA-AIB-45` (Part C deviations).

# A. Envelope — addressed to everyone

## Goal and expected outcome

`django-core-micha` 3.3.0 accepts an optional `context` object on the `send` frame (`{"type":"send","message":...,"context":{...}}`). The core validates it through the app hook `DCM_ASSISTANT_CLIENT_CONTEXT`, bounds it by `max_client_context_bytes` (default 65536, measured as compact UTF-8 JSON) and passes it to the per-turn context hook. `ChatWorkspace` cannot fill it, so survey_app derives its context server-side from the saved draft and misses unsaved browser state.

survey_app's live preview, outside the surface, also needs to send a message without an answer slot (remove-question / remove-group). Since 4.2.0 `send(text)` exists only inside `renderAnswerExtra`, so the preview can only prefill the composer.

Expected outcome: a host can attach a client context to every message the surface sends, and can ask the surface to send a message. Without the new props the surface behaves exactly as in 4.2.0.

## Decisions this Envelope records (2026-10-15, overridable by the operator)

- Pull, not push: the host passes a function, the surface calls it at send time, so the context is never stale.
- Host sending follows the `composerPrefill` pattern (a request object with its own identity), not an imperative ref handle, as decided for `UCM-CHAT-4`.
- The surface does not interpret or size-check the context. The core is the authority (`invalid_frame` on a bad or oversized context); the surface only guarantees a plain JSON object goes on the wire.
- Release: minor version, additive (4.3.0).

## Scope

- **`getSendContext` (optional prop, function, no arguments, synchronous):** called once per `send` frame, immediately before it is sent. It covers every route that sends: the composer, `send(text)` from the per-answer slot, the host `sendRequest` below, and the retry of a failed turn.
  - A plain object: sent as `context` on the frame.
  - `undefined` or `null`: the frame carries no `context` (identical to 4.2.0).
  - Anything else (array, string, number, function) or a thrown error: nothing is sent, the draft stays in the composer, and the surface shows its existing generic action-error notice. No frame without the context the host meant to send.
  - If the core answers `invalid_frame` (bad or oversized context), the surface shows its existing handling of that code; no new text is needed unless none exists for it today.
  - The context is never added to the displayed turn text and never persisted by the surface.
- **`sendRequest` (optional prop, `{ id, text }`):** the surface sends `text` as the next message of the shown chat, exactly as if the user had typed and sent it, including `getSendContext`. Each new `id` is handled once (the same text twice, if asked twice).
  - Ignored, like the slot's `send`, when no chat is shown, the chat is archived, the socket is not connected, a turn is running, or the text is blank.
  - A request sent together with an `activeChatId` switch waits for the requested chat, as `composerPrefill` does. While `activeChatId` is `null` it is ignored.
  - **`onSendRequestHandled({ id, sent })` (optional callback):** called once per request with whether it was sent, so the host can enable or disable its own controls and can fall back to `composerPrefill` when `sent` is false.
- Public docs (README / CHANGELOG entry 4.3.0) describe both props and the contract with `DCM-CHAT-11`.

## Non-goals

- Any change to the socket, the API client or the wire protocol (`useChatSocket` passes through an extra key on the frame only if it must; no new frame types).
- Enforcing `max_client_context_bytes` or the context shape in the browser.
- Changing `composerPrefill`, `activeChatId` or the answer-slot `send` / `canSend`.
- Mounting changes in survey_app (its own follow-up work order once this is released).
- Any change in django-core-micha.

## Tier

Tier 3: a change inside shared-core.

## Risks

- **Stale or heavy context:** the function runs on every send; a host returning a large object delays sending. Not guarded here (the core bounds size).
- **Double send:** a `sendRequest` effect must not fire twice on re-render or when the host echoes state back (React strict mode, a changing `chat`, an `activeChatId` switch).
- **Regression for cockpit and maana:** with none of the new props the existing chat tests pass unchanged.

## Required tests to write

Scoped to `ChatWorkspace` (same files and fake-socket approach as the `UCM-CHAT-4` tests):

- Without `getSendContext` the `send` frame is exactly `{type, message}`.
- With `getSendContext` returning an object, the frame carries it as `context`, for the composer send, the slot `send(text)`, a `sendRequest`, and a retry; the function is called once per frame and reads the latest host state each time.
- `undefined` / `null` result: no `context` key on the frame.
- Invalid result (array, string) or a throwing function: no frame is sent, the draft is kept, an error notice is shown.
- The context does not appear in the displayed turn text.
- `sendRequest`: sends once per `id`; a new `id` with the same text sends again; ignored (and `onSendRequestHandled` reports `sent: false`) while a turn runs, for an archived chat, when disconnected, for blank text, with no chat shown, and while `activeChatId` is `null`; with an `activeChatId` switch it waits for that chat; a re-render with the same request does not send again.
- `onSendRequestHandled` fires exactly once per request `id`.

# B. Implementation map — addressed to the implementer

## Context package

Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Work from this package; open only the named files. The Orchestrator owns `package.json`, the version, the lockfile, `CHANGELOG.md` and `README.md`; do not touch them. Do not edit existing tests; add a new test file. With none of the new props the surface must behave exactly as in 4.2.0.

**Existing code in `src/chat/ChatWorkspace.jsx` (4.2.0):**
- `startTurn(message)` (about line 264) is the ONE place that sends: `socket.send({ type: 'send', message })`, then `setProblem(null)` and adds the pending turn; it returns `true`/`false`. Every send route goes through it: the composer (`const send = () => { if (startTurn(draft)) setDraft(''); }`), the answer slot (`sendFromSlot`, which checks `canSendRef.current` and closes it after a send), and `retry(turn)` (which currently removes the failed turn from `turns` first and then calls `startTurn(turn.user_text)`).
- `canSendFromSlot` / `canSendRef`: availability (`chat && !isArchived && socket.connected && !running`), the ref is updated during render.
- `composerPrefill` effect (about line 205): the pattern to copy for host requests: `lastPrefillId` ref; `activeChatId === null` consumes the request; a request that arrives with an `activeChatId` switch waits (`wanted !== null && String(chat?.id) !== wanted && !unloadableIds.current.has(wanted)` returns without consuming); otherwise the id is recorded and the request applied. Effects declared before `startTurn` may call it (it is only called after render).
- `problem` state with `setProblem('action_error')` already renders the generic notice text `Chat.actionError` through `noticeFor()`; the error code `invalid_frame` from the server already marks the running turn failed (`failGenerating`) and shows the answer-incomplete alert; do not add text.
- Wire frame: `{ type: 'send', message }` over `src/chat/useChatSocket.js` (`send(frame)` JSON-stringifies whatever object it gets; no change needed there).

**What to build (optional props of `ChatWorkspace`, nothing else changes):**
1. `getSendContext` (function, no arguments, synchronous). Keep the latest prop in a ref (`getSendContextRef.current = getSendContext` during render) so a changing identity never matters and the function always reads current host state. Add one small named helper in the module, for example `buildSendFrame(message, getContext)` returning `{ frame }` or `{ error: true }`:
   - no function, or it returns `undefined`/`null`: frame is exactly `{ type: 'send', message }`, no `context` key;
   - it returns a plain object (prototype `Object.prototype` or `null`) that `JSON.stringify` can serialise: `{ type: 'send', message, context }`;
   - anything else (array, string, number, boolean, function, class instance, a value that cannot be stringified, e.g. circular) or a thrown error: `{ error: true }`.
   `startTurn(message)` calls the helper ONCE, then: on `error` it does not touch the socket, calls `setProblem('action_error')` and returns `false` (so the composer keeps the draft); otherwise it sends the built frame and continues as today. The function is therefore called exactly once per send frame, for the composer, the slot's `send(text)`, host requests and retry alike. The context is never added to the pending turn's `user_text` and never stored.
2. `retry(turn)`: do not remove the failed turn before the send succeeded. Order: `startTurn(turn.user_text)`; only when it returned `true`, remove the old turn from `turns` (keep the existing `socket.connected` guard). A failing `getSendContext` must leave the failed turn on screen.
3. `sendRequest` (`{ id, text }`) and `onSendRequestHandled({ id, sent })`: a new effect modelled on the `composerPrefill` effect, with its own `lastSendRequestId` ref (so the same `id` is handled once, also across re-renders, `chat` changes and React strict mode; a new `id` with the same text is handled again):
   - `sendRequest == null` or id already handled: do nothing;
   - `activeChatId === null`: consume the request, `onSendRequestHandled({ id, sent: false })`;
   - the request arrives together with an `activeChatId` switch (wanted id differs from the shown chat's and is not in `unloadableIds`): wait, do not consume (like the prefill);
   - otherwise consume it and decide: `sent` is `true` only when `canSendRef.current` is true (a chat is shown, not archived, socket connected, no turn running) and `text` is a non-blank string, and then `startTurn(text)` returned `true`; in every other case `sent` is `false` and nothing is sent (no chat shown, archived, disconnected, a turn running, blank text, failing context). After `startTurn` succeeded close `canSendRef.current` as `sendFromSlot` does.
   - Call the callback (kept in a ref) exactly once per consumed request, after the decision.
   - `canSendRef.current` is set during render, so the effect sees the latest availability; list the dependencies the effect really needs (`sendRequest`, `chat`, `activeChatId`, `socket.connected`, `running`) so it re-runs when a waiting request can proceed, but guard on the id ref so it never sends twice.
4. Keep hooks unconditional and the code readable in the surrounding style (small named helpers, no dense one-liners). No new strings, no new `sx` on baseline-styled MUI components.

**Tests to write** (new file `tests/chatSendContext.test.jsx`; imitate `tests/chatHostInput.test.jsx` and `tests/chatActiveChat.test.jsx`: fake socket class that records `sent` frames, `makeApi`, `react-i18next` mocked to return keys, `@mui/icons-material` mocked for `MoreVert`). One test (or a tight group) per bullet of Part A "Required tests". Notes: for the retry route render a failed or interrupted turn from `listTurns` (state `interrupted`, `user_text` set) and click the Retry button (`Chat.retry`); for the slot route use `renderAnswerExtra` with a button calling `send('x')`; for the composer route type into the textbox (`Chat.message`) and click `Chat.send` after opening the fake socket. Assert the exact frame objects (`toEqual`), that the context function was called once per frame with `mockFn.mock.calls.length`, that its second call returns updated host state, that an invalid result or a throw leaves `socket.sent` empty, keeps the draft text in the textbox, and shows the `Chat.actionError` notice, and that the failed turn is still on screen after a failing retry. For `sendRequest`: the ignore cases each assert `onSendRequestHandled` was called once with `{ id, sent: false }` and no frame; the happy path asserts `{ id, sent: true }` and one frame; a re-render with the same request object sends nothing more; a new id with the same text sends again; with an `activeChatId` switch the request waits for that chat (the frame is sent for the new chat's socket). Run the existing `tests/chatWorkspace.test.jsx`, `tests/chatExtensions.test.jsx`, `tests/chatActiveChat.test.jsx` and `tests/chatHostInput.test.jsx` untouched to confirm they stay green.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 recorded at ui-core-micha@ec29e2c. Orchestrator owns the version (4.3.0), CHANGELOG and README, the review on the final combined diff, the dispatched `ci.yml` run on `ci-test/UCM-CHAT-5`, the push and the release. Consumer: `survey_app/SVA-AIB-47`.
