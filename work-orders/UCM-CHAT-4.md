# UCM-CHAT-4 — The host app can choose which chat the shared surface shows

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Correction to `UCM-CHAT-3`, found while implementing `maana/MAANA-CHAT-11`. It is also used by `survey_app/SVA-AIB-45`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The shared `ChatWorkspace` (ui-core-micha 4.1.0, `src/chat/ChatWorkspace.jsx`) decides on its own which chat is open, and a host app cannot change that. maana's one-click passage release in the Coding tab needs two steps: create a chat when none is open, then show it. Today the host can create the chat through the API but cannot bring it into view. `UCM-CHAT-3` missed this flow.

Expected outcome: a host can tell the surface which chat to show, and learns when the user switches chats. Without the new props, the surface behaves exactly as in 4.1.x.

## Operator decisions this Envelope records (2026-10-15)

- Controlled selection through props, not an imperative ref handle.

## Scope

- **`activeChatId` (optional):** when set, the surface shows that chat.
  - If the chat is not in the loaded list yet, for example because the host has just created it, the surface loads it and adds it to the list.
  - A chat that cannot be loaded (missing or foreign) leaves the surface in its normal no-chat state. It is not an error page.
- **`onActiveChatChange(chatId)` (optional):** called whenever the shown chat changes, whether the user selected it, created it, archived it or deleted it.
- Without `activeChatId`, selection stays internal, as in 4.1.x. The callback may be used on its own.

## Non-goals

- A single-chat mode without a list.
- Any change to the API client, the socket or the slots from `UCM-CHAT-3`.
- Mounting changes in maana or survey_app.

## Tier

Tier 3: a change inside shared-core.

## Risks

- **Loops:** a host that echoes `onActiveChatChange` back into `activeChatId` must not cause repeated loads or remounts.
- **Regression for cockpit:** with none of the new props, the existing chat tests must pass unchanged.

## Required tests to write

- Setting `activeChatId` to a chat already in the list opens it.
- Setting it to a chat not yet in the list loads it, adds it and opens it.
- An unloadable id leaves the no-chat state, without an error page.
- `onActiveChatChange` fires once per change, for user selection, creation, archive and delete.
- A host that echoes the callback into the prop causes no repeated requests.
- Without the new props, the existing chat surface tests pass unchanged.

# B. Implementation map — addressed to the implementer

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Minor release. `maana/MAANA-CHAT-11` waits on it for its frontend chunk. Use ucm's `ci.yml` on a `ci-test/<ID>` ref before publishing.
