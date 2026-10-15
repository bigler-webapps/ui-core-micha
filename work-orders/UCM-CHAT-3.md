# UCM-CHAT-3 — Extension points on the shared chat surface: scope, side panel, per-answer content, composer extra, app frames, compact layout

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Stage 2 of the shared chat: it prepares `maana/MAANA-CHAT-11`. Backend counterpart: `django-core-micha/DCM-CHAT-10`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The shared chat surface from `UCM-CHAT-1` is a closed component: an app mounts it and gets list, thread, composer and picker. maana's chat (`maana/frontend/src/qda/assistant/`) needs domain UI around and inside that surface:
- a permissions panel next to the thread;
- proposal cards and plan steps under an answer;
- a read-scope summary and a context check above the input;
- a compact variant inside the Coding tab;
- chats per project.

Expected outcome: the surface offers optional extension points through which an app adds such UI without copying or forking the surface. An app that uses none of them, such as cockpit, sees no change.

## Operator decisions this Envelope records (2026-10-15)

- maana moves onto the shared surface (`MAANA-CHAT-11`). The extension points are generic; nothing maana-specific lives in ui-core-micha.
- No prototype. The visual reference for the composed result is maana's current chat UI, plus the shared surface's own spec (`work-orders/assets/UCM-CHAT-1-ai-chat.html`).

## Scope

- **Scope:** an optional `scope` prop. The chat list, the creation of chats and the status request use it, following `DCM-CHAT-10`.
- **Unavailable state:** when `status/` reports `unavailable` with a reason, the surface shows its unavailable state. The text comes from the app, through a reason-to-text mapping prop; there is a generic fallback.
- **Side panel slot:** an optional render slot next to the thread. It receives the current chat. At narrow widths, and in the compact layout, it opens as a sheet from a button in the thread bar.
- **Per-answer slot:** an optional render slot under each assistant answer. It receives the turn and the app frames that belonged to that turn. maana uses it for proposal cards and plan steps.
- **Composer slot:** an optional render slot directly above the input. It receives the current chat.
- **App frames:** an optional callback receives every `{"type":"app"}` frame from `DCM-CHAT-10` with its name and payload. Frames are also handed to the per-answer slot of the turn they arrived with.
- **Notices:** the `history_trimmed` notice from `DCM-CHAT-10` shows as a quiet chip in the thread, with the number of left-out turns.
- **Compact layout:** an optional variant for narrow containers, such as maana's Coding-tab panel.
  - The list becomes a drawer, the side panel a sheet, and the picker a sheet.
  - The variant follows the container width, not only the viewport.
- **Strings:** new strings are registered through the existing i18n contract in all four languages.

## Copy list (released with this Envelope)

- The generic unavailable fallback: "The assistant is not available here."
- The history chip: "{count} earlier messages left out", with singular and plural forms.

App-supplied texts, such as maana's unavailable reasons, are the app's copy and not part of this list.

## Token delta list

None. All colours, type and radii come from the consuming app's theme, as in `UCM-CHAT-1`.

## Replaces / removes

Nothing. The extension points are additive.

## Non-goals

- Any maana component (permissions panel, proposal cards, plan steps, context dialog) inside ui-core-micha.
- Changes to the picker, Markdown rendering or the socket protocol beyond the `app` frame and the `history_trimmed` notice.
- Mounting the surface in maana (`MAANA-CHAT-11`).

## Tier

Tier 3: a change inside shared-core.

## Risks

- **Regression for cockpit:** with no new props, the surface must render and behave exactly as 4.0.x. Tests pin this.
- **Slot content and the surface's state:** slot content renders inside the surface but owns its own state. Changing chats remounts it, so one chat's content never shows in another.

## Required tests to write

- Without any new prop, the existing chat surface tests pass unchanged.
- `scope` is sent on list, create and status.
- An `unavailable` status renders the app's reason text, and the fallback renders when no mapping is given.
- The side panel slot renders next to the thread and as a sheet in the compact layout.
- The per-answer slot receives its turn and only that turn's app frames.
- The composer slot renders above the input.
- The app-frame callback receives each `app` frame once.
- The `history_trimmed` chip shows the count.
- Switching chats remounts the slots.
- Every new translation key exists in all four languages.

# B. Implementation map — addressed to the implementer

## Context package

Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). Work from this package; open only the named files. The Orchestrator owns `package.json`, the version, the lockfile and `CHANGELOG.md`; do not touch them. The backend contract is `django-core-micha/work-orders/DCM-CHAT-10.md` (read its Scope once; do not adapt it locally). This is a Tier-3 change inside shared-core: with none of the new props the surface must render and behave exactly as 4.0.x, and every existing chat test must pass unchanged (do not edit an existing chat test except where a new test file cannot live elsewhere; prefer new files).

**Existing code (4.0.1), where the change goes**
- `src/chat/ChatWorkspace.jsx`: `ChatWorkspace({ apiBase, wsUrl, api, scope, sx })`. `scope` is today only sent in `createChat(scope ? { scope } : {})`. `narrow = useMediaQuery(theme.breakpoints.down('md'))` decides the layout. State: `status` (loading|available|not_configured|error), `chat`, `turns`, `problem` (an error code or close reason shown as a notice through `noticeFor()`), `pickerOpen`, `listOpen`. `onFrame(frame, chatId)` handles `history`, `delta`, `tool`, `turn`, `error`. The pending turn is added client-side with id `'pending'` and replaced by the final turn through `settleTurn`. The load effect calls `api.getStatus()`, then `api.getCatalogue()` and `loadLists()` (`api.listChats()` / `api.listChats({ archived: true })`).
- `src/chat/ChatThread.jsx`: renders each turn through the inner `Answer` component (props `turn`, `tool`, `onRetry`); `ChatThread({ turns, tool, notice, hasOlder, olderBusy, onLoadOlder, onRetry, readOnly, sx })`.
- `src/chat/ModelPicker.jsx`: `narrow` comes from `useMediaQuery` inside it.
- `src/chat/api.js`: `createChatApi`; `listChats({ archived, cursor })`, `getStatus()`.
- `src/chat/wire.js`: URL builders and frame constants.
- `src/i18n/chatTranslations.ts` (flat keys `Chat.xxx`, `{ de, en, fr, sw }`; plurals use the `_one` / `_other` suffix as in `src/i18n/messagingTranslations.ts`).
- Existing tests to keep green and to imitate: `tests/chatWorkspace.test.jsx` (fake socket class, `makeApi`, `openChat` helper, `react-i18next` mocked with `t` returning keys), `tests/chatThread.test.jsx`, `tests/chatPicker.test.jsx`.

**Wire additions (from DCM-CHAT-10)**
- `GET status/?scope=<s>` -> `{ status: 'unavailable', reason: <code> }` (alongside today's `available` / `not_configured`). `GET chats/?scope=<s>&archived=&cursor=` lists only that scope. Create sends `{ scope }`.
- Server frames: `{ type: 'app', name, payload }` (before the final `turn` frame of the running turn) and `{ type: 'notice', code: 'history_trimmed', left_out: <n> }`. Error code `unavailable` on a rejected `send`. Put the new constants/names in `src/chat/wire.js`.

**What to build (all optional; props of `ChatWorkspace`, forwarded to the parts where needed)**
1. `scope` (existing prop, extended): when set, `api.listChats({ scope, archived, cursor })` for both lists and load-more, `api.createChat({ scope })` (as today) and `api.getStatus({ scope })`. In `src/chat/api.js` `listChats` and `getStatus` add `scope` to the request params only when given. When `scope` is undefined, call the api exactly as 4.0.x does (`api.listChats()`, `api.getStatus()` with no argument), so existing assertions on call arguments hold.
2. Unavailable state: `status === 'unavailable'` (and a rejected `send` with error code `unavailable`) shows the unavailable state in the place of `not_configured`'s: a centred block with ONE text. The text is `unavailableReasonText` (prop: an object `{ [reason]: text }` or a function `reason => text|undefined`) applied to the server's `reason`; if absent or it returns nothing, the generic fallback `t('Chat.notAvailableHere')`. Keep the `reason` in state (`unavailableReason`).
3. `sidePanel` (prop: `(chat) => ReactNode`), `sidePanelLabel` (prop: string): wide layout renders the panel as an extra column to the right of the thread, only while a chat is open; narrow layout and compact layout render a button in the thread bar (text `sidePanelLabel` or the generic key `Chat.sidePanel`) that opens the panel in a MUI `Drawer` (anchor `right` in the compact container layout, `bottom` on a viewport-narrow layout is also fine; keep one anchor, `right`). The Drawer's content is the same `sidePanel(chat)` output.
4. `renderAnswerExtra` (prop: `({ turn, chat, appFrames }) => ReactNode`): rendered by `ChatThread`'s `Answer` under each assistant answer (after the sources/model line, before the retry chip). `appFrames` is the array of `{ name, payload }` of the `app` frames that arrived while that turn was running. Keep them in workspace state keyed by turn: frames received for the generating (pending) turn are stored on that turn as a client-only field `appFrames`, and `settleTurn` carries them over to the final turn that replaces it. Turns loaded from history have `appFrames: []`. `ChatThread` gets a prop `renderAnswerExtra` and passes `{ turn, chat, appFrames: turn.appFrames ?? [] }`; give `ChatThread` a `chat` prop for this.
5. `renderComposerExtra` (prop: `({ chat }) => ReactNode`): rendered directly above `ChatComposer` while a chat is open (not for the archived read-only hint order: put it above the composer, below the archived hint).
6. `onAppFrame` (prop: `({ name, payload, chatId, turnId }) => void`): called once for each `app` frame, in `onFrame`, with `turnId` the id of the generating turn if any (`'pending'` for the client-side placeholder). Use a ref for the latest callback so a changing prop identity does not re-subscribe anything. Frames of a chat other than the open one are ignored as every other frame already is.
7. `history_trimmed`: a `notice` frame with `code === 'history_trimmed'` sets `trimmed = left_out`; `ChatThread` gets a prop `trimmedCount` and renders, after the last turn and above the notice, a quiet outlined small `Chip` with `t('Chat.historyTrimmed', { count })` (plural keys `Chat.historyTrimmed_one` / `Chat.historyTrimmed_other`). Reset to none when the chat changes. Other `notice` codes stay ignored as today.
8. Compact layout: prop `layout` of `ChatWorkspace`: `'viewport'` (default, exactly today's behaviour), `'container'` (the narrow arrangement is used when the workspace root's own width is below `compactBelow` px, prop, default 720; measure with a `ResizeObserver` on the root element, feature-detected, falling back to the viewport rule when `ResizeObserver` is missing) and `'compact'` (always the narrow arrangement). The narrow arrangement = list in a `Drawer`, side panel as a sheet, model picker as a sheet. `ModelPicker` gets an optional boolean prop `sheet`; `undefined` keeps today's `useMediaQuery` rule, a boolean overrides it. Do not use `useMediaQuery` for the container decision.
9. Remount per chat: the slot outputs (side panel, answer extra, composer extra) are rendered inside elements with `key={chat.id}` so that switching chats remounts them and one chat's slot state never shows in another.

**sx convention (important):** `tests/themeCompleteness.test.js` fails the build on an inline `sx` object on a baseline-styled MUI component (Button, IconButton, Alert, Chip, Dialog, Paper, ...). For any new `sx` on such a component, export a top-level `export const NAME_SX = {...}` from the component module and register it in the sub-path registry `src/chat/kitSxRegistry.js` with `createKitSxEntry(...)`; do not repeat values the theme already sets (button min height, text-transform). `sx` on `Box`/`Stack`/`Typography` is not checked. Run the existing `tests/themeCompleteness.test.js` as part of your scoped tests.

**Strings** (add to `src/i18n/chatTranslations.ts`, all four languages, `{{count}}` kept in the plural keys, nothing else new):
- `Chat.notAvailableHere`: en "The assistant is not available here." (de/fr/sw translated);
- `Chat.historyTrimmed_one`: en "{{count}} earlier message left out"; `Chat.historyTrimmed_other`: en "{{count}} earlier messages left out" (the Envelope's copy);
- `Chat.sidePanel`: en "Details" (fallback label only; one short generic addition beyond the copy list).

**Tests to write** (new file `tests/chatExtensions.test.jsx`, plus additions to `tests/chatTranslations.test.js` and `tests/chatApi.test.js` for the new keys and the scope params): one test per bullet of Part A "Required tests". Imitate `tests/chatWorkspace.test.jsx` (fake socket, `makeApi`). Notes: the neutrality test renders the workspace with none of the new props and asserts the api call shapes (`listChats` / `getStatus` called without arguments) and the unchanged DOM landmarks; for the container layout stub `globalThis.ResizeObserver` with a class whose callback you call with a given `contentRect.width`; assert the sheet by the presence of the drawer paper (`.MuiDrawer-paper`) and the inline panel by its absence there. The per-answer slot test sends frames `app` with names `a`, `b` for one turn, completes it, runs a second turn with frame `c`, and asserts the slot of each turn received only its own frames; the callback test asserts exactly one call per frame.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.


# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Minor release. Can be built against the `DCM-CHAT-10` contract in parallel; `maana/MAANA-CHAT-11` mounts it. Use ucm's own CI (`ci.yml`, UCM-CI-1) on a `ci-test/<ID>` ref for the full suite before publishing.
