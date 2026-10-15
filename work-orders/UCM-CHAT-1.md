# UCM-CHAT-1 — Shared AI chat surface: chat list, streaming thread, sources, model and effort picker

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Backend counterpart and transport contract: `django-core-micha/DCM-CHAT-1`. First consumer: `cockpit/CP-CHAT-4`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

`django-core-micha/DCM-CHAT-1` adds a shared AI chat core with a fixed WebSocket and REST contract. This order adds the matching surface to ui-core-micha, so that an app shows a complete chat by mounting one component. maana's chat UI (`maana/frontend/src/qda/assistant/`) is the functional template, without its proposals, grants and plan views.

Expected outcome: ui-core-micha exports a chat workspace that lists the user's chats (with archive), streams answers into a thread, renders Markdown safely, shows the sources each answer used, and lets the user pick model and effort per chat. The parts are also exported individually so that an app can arrange them differently.

## Visual spec

Prototype: [`work-orders/assets/UCM-CHAT-1-ai-chat.html`](assets/UCM-CHAT-1-ai-chat.html), drawn in cockpit's theme as the first consumer. It shows:
- at 1280 px, the main working state;
- at 375 px, the thread, the chat list drawer and the model picker sheet;
- a 1280 px gallery of the edge states.

The prototype declares its coverage at the top. The built components take every colour, type and radius from the consuming app's MUI theme, never from literals.

**Parity guardrail:** the prototype governs the look and the interaction only. Behaviour, permissions and the data contract come from `DCM-CHAT-1` and are not changed by anything drawn here.

## Operator decisions this Envelope records (2026-10-15)

- Several persistent chats per user, in a list. Each chat can be renamed, archived and deleted. Archived chats sit behind an "Archived" entry with a count, open read-only, and can be restored.
- Model and effort are chosen per chat, from the app's catalogue. The picker groups the entries by driver and marks pay-per-use entries. A change applies from the next turn, and the thread marks where the model changed.
- The sources of each answer appear as chips under it. A chip shows the source's short label, and the full reference appears on hover.
- A prototype was requested and is the visual spec.

## Scope

- **Workspace component.** At wide widths it has a list column and a thread column. At narrow widths the list becomes a drawer and the picker a bottom sheet; the prototype shows the 375 px arrangement.
- **Chat list:**
  - new chat;
  - select a chat;
  - per-row overflow menu with Rename, Archive and Delete;
  - Delete asks for confirmation inside the UI;
  - the archived section with its count;
  - restore an archived chat.
- **Thread:**
  - user messages;
  - assistant answers rendered as Markdown, streamed live from `delta` frames;
  - a typing indicator before the first delta;
  - a tool-activity chip while a tool runs, labelled with the tool's own label from the `tool` frame;
  - source chips once the turn completes;
  - a quiet model and effort line under each answer;
  - a divider where the model changed between turns;
  - older turns loaded by cursor when scrolling up.
- **Composer:** a multi-line input and Send. Stop appears next to Send while a turn runs. Send stays disabled while a turn runs, while the chat is archived, and while the connection is down.
- **Model and effort picker:** a popover at wide widths and a bottom sheet at narrow widths.
  - Entries come from the catalogue endpoint, grouped by driver, with the billing tag on pay-per-use entries.
  - Effort is a segmented control with the four normalised levels. Levels the selected entry does not allow are disabled.
  - The current selection shows in the thread bar as "model · effort".
- **Edge states, as drawn:**
  - a new chat with no messages;
  - the usage limit reached, with "Change model";
  - an interrupted answer with an "Interrupted" chip and Retry;
  - connection lost, with a "Reconnecting" chip;
  - no model configured on this server;
  - an archived chat opened.
- **Socket hook:** one WebSocket per open chat, reconnecting with backoff and no automatic resend. It parses the frames listed in `DCM-CHAT-1`, and on close codes 4401, 4403 and 4429 it stops reconnecting and surfaces the matching state.
- **API client:** a default implementation of every REST call in `DCM-CHAT-1`. The default set is exported, and a consumer can override single functions while the others keep their defaults.
  - This avoids the `MessagingProvider` limitation described in `webapp-management/SHARED_CAPABILITIES.md`: there, passing any `api` prop replaces the whole default set.
- **Markdown rendering** uses `react-markdown` with `remark-gfm`, configured like maana's `MarkdownReply.jsx`: no raw HTML, no images, and links rendered as text. Both packages are new dependencies of this repository. They are approved with this order.
- **Strings:** all strings are registered through ui-core-micha's i18n contract in a new translations module, in German, English, French and Swahili like the existing modules.
- **Documentation:** a row in `webapp-management/SHARED_CAPABILITIES.md` for the chat surface, as a small companion change in that repository.

## Copy list (released with this Envelope)

Hint and state texts beyond control labels, verbatim from the prototype:
- "Usage limit reached for {model}. Choose another model or try again later."
- "The answer could not be completed."
- "Chat is not available"
- "No language model is configured on this server."
- "pay per use" (catalogue billing tag)
- Chips: "Interrupted", "Reconnecting", "Archived".

The tool-activity text, for example "Searching the knowledge base", is not ui-core-micha copy. It is the label each app gives its tool.

## Token delta list

None. Drawn from the theme.

## Replaces / removes

Nothing. This is a new surface. The existing `messaging` components stay unchanged.

## Non-goals

- Proposals, plans, grants, context inspection, or anything else from maana's domain UI.
- Credential entry for own logins or API keys (stage 4, `django-core-micha/DCM-CHAT-3`).
- Search across chats, sharing, attachments, voice input.
- Mounting the surface in any app. cockpit does that in `CP-CHAT-4`.
- Changes to `messaging/`, `notifications/` or the theme factory.

## Tier

Tier 3: a new shared-core surface with new dependencies.

## Risks

- **Markdown as an injection path:** answers can echo text from retrieved documents. The renderer must never interpret raw HTML or load images or links automatically. The allow-list configuration above is the control.
- **Contract drift:** the component is built against the transport contract of `DCM-CHAT-1` before that module is published. Any deviation found later is a change to that contract, not a local adaptation here.
- **Theme coupling:** literal colours copied from the prototype would make the component look like cockpit in every app. Colours must come from the theme.

## Required tests to write

- Socket hook:
  - deltas append to the streaming answer;
  - the `turn` frame replaces it with the final text and sources;
  - reconnect without resending;
  - 4401, 4403 and 4429 stop reconnecting and show their state.
- Thread:
  - Markdown renders a list and a table;
  - raw HTML in an answer is shown as text and not executed;
  - an image reference is not loaded;
  - source chips show the label, with the reference on hover;
  - the model-change divider appears between turns with different selections.
- Picker:
  - entries are grouped by driver;
  - a pay-per-use entry shows its tag;
  - effort levels the entry does not allow are disabled;
  - a change calls the update-selection endpoint.
- Chat list:
  - rename, archive, restore and delete call their endpoints;
  - delete asks for confirmation first;
  - an archived chat disables Send.
- Edge states: the usage-limit, interrupted and not-configured states render from their error codes.
- API client: overriding one function keeps the defaults for all others.
- Translations: every key of the new module exists in all four languages.

# B. Implementation map — addressed to the implementer

## Context package

Work from this package; do not explore broadly. Open only the files named here to verify. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Dependencies `react-markdown` 10.1.0 and `remark-gfm` 4.0.1 are already installed in `package.json` and the lockfile; do not touch either.

**Templates to read (maana, read-only, do not edit):** `maana/frontend/src/qda/assistant/` (sibling directory of this repo under the workspace root) — `useAssistantSocket.js` (reconnect with backoff, per-chat socket, close-code mapping), `MarkdownReply.jsx` (the allow-list renderer: copy its approach, but take the table/code region labels from this repo's i18n and colours only from the theme), `ChatThread.jsx`, `ChatList.jsx`, `ChatComposer.jsx`, `ChatWorkspace.jsx` (frame handling around line 118), `assistantApi.js`. Take the structure, not maana's proposals, grants, plans, context dialog or project id. Visual spec: `work-orders/assets/UCM-CHAT-1-ai-chat.html` — read it first; it governs look and interaction, with every colour, radius and type size taken from the MUI theme (palette tokens such as `primary.main`, `text.secondary`, `divider`, `action.hover`, `success/warning/error`), never a literal.

**Repo conventions to match (verify in place):**
- Source is `.jsx`/`.js` under `src/`, tests in `tests/*.test.jsx` (vitest + @testing-library/react + jsdom); look at `tests/Thread.test.jsx`, `tests/ConversationList.test.jsx` and `tests/MessagingProvider.test.jsx` for how a component is tested here (MUI icons are `vi.mock`ed per test file).
- HTTP goes through `src/auth/apiClient` exactly like `src/messaging/api.js` (default export `apiClient`, each function returns `response.data`).
- Strings: `useTranslation()` with keys in a new bundle `src/i18n/chatTranslations.ts` that exports exactly one const `chatTranslations`, entries `{ de, en, fr, sw }`, key prefix `Chat.` (check no key collides with another bundle). Register it in three places: `src/i18n/uiCoreTranslations.js` (spread), `src/index.js` (public export next to `messagingTranslations`), and `tests/i18nAggregate.test.js` (`PUBLIC_BUNDLES` plus its import list). German uses the formal variant.
- Public exports are added to `src/index.js` in a block next to the messaging block (line ~113). Do not edit `src/messaging/**`, `src/notifications/**` or `src/theme/**`.

## Wire shape (binding on this order; the Orchestrator pinned it from maana's implementation because DCM-CHAT-1 is not published yet)

The Envelope fixes WHICH frames and endpoints exist; the field names below are the working assumption and must be isolated in ONE module (`src/chat/wire.js`: URL builders, frame/field names, the three close codes) so a later contract change touches one file.

- **WebSocket** per chat: URL from a `wsUrl(chatId)` option, default `${ws|wss}://${location.host}/ws/assistant/chats/${chatId}/`. Client frames `{type:"send", message}` and `{type:"stop"}`. Server frames: `{type:"history", turns:[turn…]}` on connect; `{type:"delta", text}`; `{type:"tool", phase:"start"|"end", name, label, sources:[{label, reference}]}`; `{type:"turn", turn}`; `{type:"notice", code, text?}`; `{type:"error", code}` with `code` one of `quota_exceeded`, `provider_error`, `timeout`, `prompt_too_long`, `invalid_output`, `security_violation`, `not_configured`, `rate_limited`, `invalid_selection`, `archived`, `turn_active`, `invalid_frame`. Close codes 4401 -> `session_ended`, 4403 -> `access_lost`, 4429 -> `rate_limited`: no reconnect, state surfaced. Any other close -> reconnect with backoff (1 s, 2 s, 4 s, then stop and show the "connection lost" state with a manual Retry), **never resend a message automatically**; ignore malformed JSON frames.
- **REST**, base path from an `apiBase` option (default `/api/assistant/`): `GET catalogue/` -> `{entries:[{id, driver, model, label, efforts:["low"|"medium"|"high"|"max"…], billing:"subscription"|"pay_per_use"}], default:{entry, effort}}`; `GET chats/?archived=<bool>&cursor=` -> `{results:[chat…], next}`; `POST chats/` body `{scope?}` -> chat; `PATCH chats/{id}/` body any of `{title, archived, selection:{entry, effort}}` -> chat; `DELETE chats/{id}/`; `GET chats/{id}/turns/?cursor=` -> `{results:[turn…], next}` (newest page first, `next` = cursor for older); `GET status/` -> `{status:"available"|"not_configured"}`.
- **chat** = `{id, title, archived_at|null, selection:{entry, effort}, updated_at}`. **turn** = `{id, seq, user_text, assistant_text, state:"generating"|"completed"|"failed"|"cancelled"|"interrupted", sources:[{label, reference}], driver, model, effort, error_code|null}`.

## Named files to create (all new; owns `src/chat/**`, `src/i18n/chatTranslations.ts`, `tests/chat*.test.*`, and the three registration edits above)

- `src/chat/wire.js` — constants and URL builders above.
- `src/chat/api.js` — `createChatApi(overrides = {}, { apiBase })` and the exported `defaultChatApi`: one function per REST call (`getCatalogue, listChats, createChat, updateChat, deleteChat, listTurns, getStatus`) returning `response.data`; `{...defaults, ...overrides}` so overriding one function keeps every other default (the point of this design; contrast `MessagingProvider`).
- `src/chat/useChatSocket.js` — the hook: `(chatId, {wsUrl, onFrame, onOpen, onClose})` -> `{status, connected, send, reconnect}`. State machine as above. Pass the chat id with every delivered frame so a late frame of a left chat is never applied (maana does this).
- `src/chat/MarkdownReply.jsx` — allow-list renderer. Allowed elements as maana, `unwrapDisallowed`, links render as text (label plus address when different), images never fetched (alt text or address as text), raw HTML shown as text (no rehype-raw), tables and code in focusable scroll regions, a very long reply falls back to plain text (constant `MARKDOWN_LIMIT`). Styling through `sx` with theme tokens only.
- `src/chat/ChatThread.jsx` — turns, streaming answer, typing indicator before first delta, tool-activity chip (label from the `tool` frame), source chips (short `label`, full `reference` as tooltip), the quiet "model · effort" line under each answer, a divider between turns whose driver/model/effort differ, older turns loaded by cursor on scroll up/"load older", state chips ("Interrupted" + Retry, "Reconnecting"), and the error states.
- `src/chat/ChatList.jsx` — new chat, select, per-row overflow menu (Rename, Archive, Delete), Delete confirmation inside a MUI Dialog, "Archived" entry with count, restore of an archived chat, load more.
- `src/chat/ChatComposer.jsx` — multi-line input, Send, Stop while a turn runs; Send disabled while a turn runs, while the chat is archived, and while the connection is down. Enter sends, Shift+Enter newline.
- `src/chat/ModelPicker.jsx` — popover (wide) / bottom `Drawer` sheet (narrow, via `useMediaQuery(theme.breakpoints.down('md'))`), entries grouped by driver, "pay per use" tag, effort `ToggleButtonGroup` with levels the entry does not allow disabled; a change calls `updateChat(id, {selection})`; the thread bar shows "model · effort".
- `src/chat/ChatWorkspace.jsx` — composes list + thread + composer + picker. Props: `apiBase`, `wsUrl`, `api` (partial overrides, merged), `scope`, `sx`. Wide: two columns. Narrow: list in a `Drawer`. Loads status/catalogue, owns the active chat, the streaming state and the edge states: new chat empty state, usage limit (`quota_exceeded` -> "Usage limit reached for {model}. Choose another model or try again later." + "Change model"), interrupted/failed ("The answer could not be completed." + Retry, which re-sends that turn's `user_text` as a new `send` only on the user's click), connection lost ("Reconnecting" chip), `not_configured` ("Chat is not available" / "No language model is configured on this server."), archived (read-only, "Archived" chip, Restore).
- No `src/chat/index.js`; export from `src/index.js`: `ChatWorkspace, ChatList, ChatThread, ChatComposer, ModelPicker, MarkdownReply, useChatSocket, createChatApi, defaultChatApi, chatTranslations`.
- `src/i18n/chatTranslations.ts` — every string of the Envelope's copy list verbatim in English, plus control labels, aria-labels and the Markdown region labels; all four languages.
- Tests (names are guidance): `tests/chatSocket.test.jsx`, `tests/chatThread.test.jsx`, `tests/chatPicker.test.jsx`, `tests/chatList.test.jsx`, `tests/chatEdgeStates.test.jsx`, `tests/chatApi.test.js`, `tests/chatTranslations.test.js`, plus a one-line export check in the style of `tests/messagingExports.test.js`. The socket tests use a fake `WebSocket` class and fake timers.

## Invariants, pitfalls, do-not-touch

- No raw HTML, no image fetch, no auto-loading links anywhere in answers; no `dangerouslySetInnerHTML`. User message text is rendered as plain text.
- No literal colours, radii or font sizes copied from the prototype; theme tokens and spacing units only. Light and dark themes must both work.
- Accessibility: the streaming answer sits in a polite live region that is not re-announced on every delta (`aria-busy` while generating), icon buttons have aria-labels, the picker and menus are keyboard operable, touch targets at least 40 px at narrow width.
- Do not edit `src/messaging/**`, `src/notifications/**`, `src/theme/**`, `package.json`, the lockfile, `README.md`, `CHANGELOG.md` or the register. Docs and the version bump are the Orchestrator's.
- Package build is `tsc -p tsconfig.build.json` (allowJs, `src` only): new files must compile; `tests/packageTreeShaking.test.js` and `tests/checkKitIntegration.test.jsx` exist: do not introduce a top-level side effect in the new modules.
- The working tree contains unrelated foreign changes (`WORK_ORDERS.md`, `work-orders/UCM-DEP-1.md`, `package.json`, `pnpm-lock.yaml`): leave them alone.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.


# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Can start against the `DCM-CHAT-1` contract in parallel; publish as a new minor version. Prototype in scope: ucm has no host app of its own, so the rendered side-by-side at 375 px and 1280 px runs where the surface is first mounted, in `cockpit/CP-CHAT-4`, and is that order's commit gate; a deviation it finds in the shared components is fixed here and republished.
