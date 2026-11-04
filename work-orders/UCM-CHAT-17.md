# UCM-CHAT-17 — Host can keep a chat without messages listed

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha` chat surface), consumed by every app with the assistant chat.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; consumers pick it up by a pin bump in their own order
(Maana: MAANA-DEP-10, which moves from 4.29.0 to this release).

### Goal and expected outcome

UCM-CHAT-16 (4.29.0) hides a chat that has no turn and lets "New chat" reuse it. The independent review of the Maana pin
bump (MAANA-DEP-10) found that this also catches chats a host app created on purpose before any message: Maana's
one-click release of a passage to the assistant creates a chat with released excerpts but no turn. With 4.29.0 such a
chat disappears from the list after the next list load, and "New chat" reopens it with the old excerpts instead of
creating a fresh chat. No data is lost, but released chats are invisible until their first message, and releasing is a
frequent everyday action.

Expected outcome: a host app can declare that a chat without messages is in use; such a chat stays listed and is never
reused by "New chat". Apps that declare nothing keep the 4.29.0 behaviour.

### Settled decisions (operator, 2026-11-04)

1. The fix comes first, as a patch release 4.29.1; Maana does not pin 4.29.0.
2. The package gets an optional, additive host hook that marks a chat as in use although it has no turn. A chat marked
   in use is listed and is not reused by "New chat".
3. Maana marks a chat in use when it has released excerpts (grants); that wiring is part of MAANA-DEP-10.

### Scope

`ChatWorkspace` (empty-chat detection and reuse), its prop documentation, the release 4.29.1 (`package.json`,
`CHANGELOG.md`).

### Non-goals

The rest of UCM-CHAT-16 (opening position, narrow layout), chat API and persistence on the server (dcm), host app code
(Maana's side is MAANA-DEP-10). The per-chat turns request when the list loads stays as accepted in UCM-CHAT-16.

### Risks

The hook must also hold for a chat that becomes in use while it is open and empty (a release into the open new chat):
"New chat" must then create a fresh chat. Without the hook nothing may change for existing consumers.

### Required tests to write

A chat without turns that the host marks in use is listed and not reused by "New chat"; the same chat without the hook
is hidden and reused as in 4.29.0; a chat that becomes in use while open and empty is not reused.

## Part B — Implementation map (implementer)

Implemented by the Orchestrator as author (operator decision of 2026-11-02, no Luna dispatch); no implementer preamble applies.

- `src/chat/ChatWorkspace.jsx`: optional prop `isChatInUse(chat)` (documented in the component's props comment), read through `inUseRef` at every
  decision: the empty check skips a marked chat, the list and the archived list keep it, `createChat` neither reuses the open chat nor a listed one
  when marked. No prop means 4.29.0 behaviour. The stray space in `CHAT_WORKSPACE_SIDE_PANEL_SX =` from 4.29.0 is fixed on the way.
- Tests: `tests/chatEmptyChats.test.jsx` (no hook = hidden and reused; hook = listed, never read, not reused; marked while open = listed and not reused).
- Release 4.29.1: `package.json`, `CHANGELOG.md`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-11-04 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce), answer "Korrektur zuerst" to the question whether Maana first gets a
shared-core correction 4.29.1. Tier 3: all lenses, `ui_reviewer`. Release as a patch version; verify the published
version with `npm view` before MAANA-DEP-10 pins it.
