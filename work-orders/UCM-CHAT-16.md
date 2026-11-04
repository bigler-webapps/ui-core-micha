# UCM-CHAT-16 — Chat opens at its end, no empty chat entries, usable thread on narrow screens

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha` chat surface), consumed by every app with the assistant chat.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; consumers pick it up by a pin bump in their own order
(Maana: MAANA-DEP-10).

### Goal and expected outcome

Final acceptance of Maana on staging (2026-11-03, Imara_v1, 1280 and 375 px) found three chat issues whose code lives in
this package (`src/chat/ChatThread.jsx`, `src/chat/ChatWorkspace.jsx`, `Chat.longChatShort`); they were moved here from
MAANA-QDA-53 items 3, 13 and 16:

1. **Opening position.** The stated rule is that a chat opens at its bottom (`ChatThread.jsx`, pinned on `chat?.id`).
   A long chat (about 86 000 px of turns, older turns paged) opened at about 16 000 px instead — the reader saw an old
   part of the conversation, not the latest answer.
2. **Empty chat entries.** The chat list showed several "New chat" entries without any message.
3. **Narrow screens (375 px).** The thread area was about 250 px high (composer, banner and header took the rest) and
   the "Long conversation" banner was cut mid-word ("Long conversation: older pa…").

Expected outcome: every chat opens showing its latest turn; the list does not fill with empty chats; on a phone the
conversation stays readable.

### Settled decisions (operator, 2026-11-03)

1. A chat opens at its end (the existing rule), including long chats with paged older turns and turns that take their
   real height late (content-visibility). The fix keeps the existing behaviour of keeping the position when older turns
   are loaded and of following the stream only while the reader is at the bottom.
2. "New chat" creates no listed entry until its first message; pressing "New chat" while an empty chat is open reuses
   it. Existing empty chats are not shown in the list.
3. At 375 px the thread area takes at least half the viewport height; the long-conversation banner wraps instead of
   truncating, its action stays reachable.

### Scope

`ChatThread`, `ChatWorkspace`, `ChatList` and their translations; the release (minor version) of the package.

### Non-goals

Composer layout (UCM-CHAT-15), model picker, chat API and persistence on the server (dcm), host app code; the Maana pin
bump is MAANA-DEP-10.

### Risks

Every consuming app gets the change with its next pin bump. Hiding empty chats must not hide a chat whose first message
is still streaming or failed.

### Required tests to write

Thread: a long chat with paged older turns and late-growing turns ends scrolled to the bottom after mount and after
switching chats; prepending older turns keeps the position. List: an empty chat is not listed; "New chat" twice yields
one chat; a chat with a failed first turn stays listed. Narrow layout: banner text not truncated (where the package has
layout tests, otherwise none).

## Part B — Implementation map (implementer)

Implemented by the Orchestrator as author (the operator decision of 2026-11-02 for the Maana work orders: no Luna dispatch); no implementer preamble applies.

- `src/chat/ChatThread.jsx`: `ownTop` remembers the scroll position the thread set (`scrollToEnd`, the `scrollIntoView` effect); `onScroll` pins
  when near the bottom and unpins only for a scroll that is not its own; `CHAT_THREAD_SCROLL_SX` gets `overflowAnchor: 'none'`.
- `src/chat/ChatWorkspace.jsx`: `emptyIds` / `emptyChecks` / `markUsed`; a check effect reads the first page of turns of default-titled chats; the list
  gets `chats.filter(not empty)`; `createChat` reuses an empty chat; `startTurn` lists the chat; narrow thread `minHeight: '45vh'`, header 44 px.
- `src/chat/ChatComposer.jsx`: `CHAT_COMPOSER_NOTICE_TEXT_SX` wraps below `sm`. The `ChatList` component itself is unchanged (it lists what it gets).
- Tests: `tests/chatLayoutIsolation.test.jsx`, `tests/chatEmptyChats.test.jsx` (new), `tests/chatActiveChat.test.jsx` (the created chat is no longer a list row).
- Release 4.29.0: `package.json`, `CHANGELOG.md`. Invariant: no prop or API change; a chat with a message behaves as before.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Scope approved by the operator 2026-11-03 in the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce)
as part of the final-acceptance follow-ups ("alle Dinge ... im Register ablegen und dann mit den WO beginnen"); moved
from MAANA-QDA-53 because the code is shared-core. Gate #1 for this Tier-3 order: approved by the operator on
2026-11-04 in the same session ("ja"). Tier 3: all lenses, `ui_reviewer`. Release as a minor version; verify the published version with `npm view`
before MAANA-DEP-10 pins it.
