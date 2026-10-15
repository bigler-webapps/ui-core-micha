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
