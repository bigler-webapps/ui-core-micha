# UCM-CHAT-4 — The host app can choose which chat the shared surface shows, prefill its input, and send from an answer

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Correction to `UCM-CHAT-3`, found while implementing `maana/MAANA-CHAT-11`. It is also used by `survey_app/SVA-AIB-45`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The shared `ChatWorkspace` (ui-core-micha 4.1.0, `src/chat/ChatWorkspace.jsx`) decides on its own which chat is open, and a host app cannot change that. maana's one-click passage release in the Coding tab needs two steps: create a chat when none is open, then show it. Today the host can create the chat through the API but cannot bring it into view. `UCM-CHAT-3` missed this flow.

Expected outcome: a host can tell the surface which chat to show, and learns when the user switches chats. Without the new props, the surface behaves exactly as in 4.1.x.

**Added 2026-10-15 (operator decision, scope change during implementation):** survey_app's AI builder (`survey_app/SVA-AIB-45`) needs two more things from the host side.
- Its live preview, outside the surface, puts text into the chat's input and focuses it ("edit this question with AI", "hand this comment to the chat").
- A suggestion chip under an answer sends the suggestion as the next message with one click.

Expected outcome for this part: a host can prefill and focus the input, and content in the per-answer slot can send a message.

## Operator decisions this Envelope records (2026-10-15)

- Controlled selection through props, not an imperative ref handle.
- Input control and sending from the per-answer slot are part of this order, not a separate one. maana's frontend chunk waits correspondingly longer.

## Scope

- **`activeChatId` (optional):** when set, the surface shows that chat.
  - If the chat is not in the loaded list yet, for example because the host has just created it, the surface loads it and adds it to the list.
  - A chat that cannot be loaded (missing or foreign) leaves the surface in its normal no-chat state. It is not an error page.
- **`onActiveChatChange(chatId)` (optional):** called whenever the shown chat changes, whether the user selected it, created it, archived it or deleted it.
- Without `activeChatId`, selection stays internal, as in 4.1.x. The callback may be used on its own.
- **Input prefill (optional):** the host can put a text into the composer of the shown chat and focus it.
  - The text replaces the current input. The user still sends it.
  - The same text requested twice is applied twice; a request carries its own identity, for example a counter.
  - With no chat shown or an archived chat, the request is ignored.
- **Sending from the per-answer slot:** `renderAnswerExtra` additionally receives `send(text)`, which sends the text as the next message of that chat, exactly as if the user had typed and sent it. While a turn is running, or for an archived chat, `send` does nothing; its availability is visible to the slot, so it can disable its controls.

## Non-goals

- A single-chat mode without a list.
- Any change to the API client or the socket.
- Changes to the `UCM-CHAT-3` slots other than the added `send`.
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
- Prefill:
  - a prefill request fills the composer and focuses it;
  - the same text requested twice applies twice;
  - a request without a shown chat or on an archived chat is ignored.
- `send` from the per-answer slot:
  - it sends exactly one message;
  - it is unavailable while a turn runs and on an archived chat.
- Without the new props, the existing chat surface tests pass unchanged.

# B. Implementation map — addressed to the implementer

## Context package

Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Work from this package; open only the named files. The Orchestrator owns `package.json`, the version, the lockfile and `CHANGELOG.md`; do not touch them. Do not edit existing tests; add a new test file. With none of the new props the surface must behave exactly as in 4.1.x.

**Existing code:** `src/chat/ChatWorkspace.jsx` (`ChatWorkspace({ apiBase, wsUrl, api, scope, sx, ... })`). State: `chat` (the shown chat object, set through `setChat`), `chats` and `archived` (the two loaded lists), `status` (`loading|available|...`). `loadLists` is a `useCallback` that fetches page 1 of the active and the archived list for the current `scope`, drops the result when `scopeVersion` changed, and otherwise sets `chats`/`archived`/`nextChats`. The status effect calls `loadLists()` once when the status is `available`. `selectChat(next)` sets the chat; `createChat`, `updateChat`, `deleteChat` call `setChat` as well (delete sets it to `null`; archiving the shown chat keeps it shown, read-only). An effect keyed on `scope` resets the chat to `null`. The api client has no "get one chat" call and must not get one (non-goal): a chat that is not in the lists is found by reloading page 1 of the lists, where a freshly created chat sits at the top.

**What to build (two optional props of `ChatWorkspace`):**
1. `onActiveChatChange(chatId)`: called with the new id (or `null`) whenever the id of the shown chat changes: user selection, creation, deletion (-> `null`), and a change driven by `activeChatId`. Not on mount (a surface that starts with no chat has not changed), and not when only the chat object is replaced with the same id (renames, archive of the shown chat keep it shown, so no call). Implement with one effect on `chat?.id` and a ref holding the last reported id; keep the latest callback in a ref so a changing prop identity never re-fires it.
2. `activeChatId`: `undefined` (default) = selection stays internal as today. A value = show that chat. `null` = show no chat. Apply it only when the prop value changes (not on every render and not when lists change), so a host that does not follow the user's later selection is not overridden, and a host that echoes `onActiveChatChange` back into the prop causes no extra work. Rules, once `status === 'available'` and the first list load has finished (track that with a state flag set after the status effect's `loadLists()` resolves and reset on a `scope` change):
   - id equal (compare as strings) to the shown chat's id: nothing to do;
   - id found in `chats` or `archived`: `setChat(thatChat)`;
   - id not found: reload the lists once for that id (`loadLists()`, have it return the combined list of both pages, or `undefined` when the response was dropped as stale), look again, `setChat(hit)` if found; if still not found, give up for that id (no error, no retry, the surface stays in its normal no-chat state). Guard against a second reload for the same id and against applying a result after the prop changed again (keep the latest wanted id in a ref);
   - `null`: `setChat(null)`.
   Use refs (`appliedId`, latest wanted) rather than effect dependencies on `chats` so that list refreshes do not re-run the logic.
3. Keep the code readable in the surrounding style (small named helpers, no one-line dense blocks), and keep hooks unconditional.

**Tests to write** (new file `tests/chatActiveChat.test.jsx`; imitate `tests/chatWorkspace.test.jsx`: fake socket class, `makeApi`, `react-i18next` mocked to return keys, `@mui/icons-material` mocked for `MoreVert`). One test per bullet of Part A "Required tests": prop id already in the list opens it (assert the thread bar shows its title and the composer is present); prop id not in the list loads it through a second `listChats` call that now contains it, adds it to the list and opens it; an unloadable id (lists never contain it) leaves the no-chat state (the "select a chat" text from `Chat.selectChat`, no alert) and issues exactly one reload; `onActiveChatChange` fires once per change for user selection, creation (`createChat` mock returns a new chat), and deletion (confirm dialog) with the right ids, and does NOT fire for archiving the shown chat (it stays shown) nor on mount; a host component that echoes the callback into the prop (`useState`) leaves the number of `listChats` calls unchanged after settling (assert exact counts); `null` clears the shown chat. Also run the existing `tests/chatWorkspace.test.jsx` and `tests/chatExtensions.test.jsx` untouched to confirm they stay green.

**sx convention:** do not add `sx` on baseline-styled MUI components; this change needs no new `sx` and no new strings.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.


# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Minor release. `maana/MAANA-CHAT-11` waits on it for its frontend chunk. Use ucm's `ci.yml` on a `ci-test/<ID>` ref before publishing.
