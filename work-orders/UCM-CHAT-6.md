# UCM-CHAT-6 — Chat: plain model picker, summary and cost of each reply

## Part A — Envelope (everyone)

**Tier:** 2 — a redesign of the shared model picker and display of new payload fields; which models are available and what they cost is decided on the server (DCM-CHAT-13). **Repository:** `bigler-webapps/ui-core-micha`. **Canonical:** DCM-CHAT-13; starts after its payload is fixed.

### Goal and expected outcome

The model picker today lists providers and interfaces („Claude Code Subscription", „Anthropic API", „OpenAI API", „pay per use") over the full width, and effort as Low/Medium/High/Max. Everyday users do not know what that means or what a reply will cost. The person should see only the models they can use, by their known names, what each is good for, and roughly how many tokens a reply will take; plus on what the assistant relies and what each reply cost.

Expected outcome: a compact, self-explanatory picker; a visible summary; a quiet cost per reply.

### Settled decisions (operator, 2026-10-16)

1. **Compact entry:** a small button next to „Senden" showing model and effort in words („Claude Sonnet · Gründlich ▾"); it opens a compact window (popover, about 360 px wide; bottom sheet on narrow screens).
2. **Only usable models:** the picker lists exactly the entries the server offers for this account and app; nothing greyed out, no provider or interface groups, no „pay per use" chips.
3. **Plain names in four levels:** all models the server offers are listed (nobody has to use the expensive ones), ordered under four levels in words, each with a short purpose: „Höchste Qualität · für besonders anspruchsvolle Auswertungen" (Claude Fable, GPT-6 Astra), „Hohe Qualität · für schwierige Abgrenzungs- und Codierfragen" (Claude Opus), „Ausgewogen · für die meisten Fragen" (Claude Sonnet, GPT-6.1 Sol), „Schnell und günstig · für kurze Nachfragen" (Claude Haiku, GPT-6 Luna). Prompt caching is never shown; it only enters the estimate. Each entry shows the known model name and „von Anthropic" / „von OpenAI". The level of each model comes from the server catalogue; an empty level is not shown.
4. **Estimate per entry:** „≈ x–y Token pro Antwort" for the chosen effort and the current length of the chat, in the app's token unit (Maana tokens); in apps without tokens a relative cost scale (●○○ to ●●●); for the operator's subscription driver „ohne Token · Claude-Abo".
5. **Effort in words:** „Wie gründlich soll die Antwort sein?" with Schnell, Gründlich, Sehr gründlich, and Maximal only where the model supports it; one line explains that more thoroughness means better answers, longer waiting and (with tokens) more tokens.
6. **Long chat:** a notice in the picker and before sending that older parts will be summarised and a new chat is cheaper, with „Neue Unterhaltung".
7. **Balance** at the bottom of the picker when the app has tokens.
8. „Zusammenfassung bis hier" as a collapsed block at the point of the summary, expandable to its text.
9. Each reply shows its cost quietly (e.g. „6 Token") when the app supplies a token conversion; otherwise nothing.
10. A new chat starts on the level „Ausgewogen" (default from the server).
11. DE, EN, FR.

### Scope and acceptance

The redesigned `ModelPicker`, summary block, per-reply cost and notices in all chat surfaces of the kit, wired to the DCM-CHAT-13 payload.

### Visual specification and replacement authority

**Prototype:** [MAANA-CHAT-1-assistant.html](../../maana/work-orders/assets/MAANA-CHAT-1-assistant.html), coverage paragraph „UCM-CHAT-6": model button next to „Senden", picker window, the prototype bar's „Konto" (Abo mit Token / Betreiberin / App ohne Token) and „Lange Unterhaltung". The estimates there are invented.

**Parity guardrail:** visual and interaction parity with the drawn picker; availability and estimates come from the server.

**Replaces / removes:** the driver group headings, the „pay per use" chips and the full-width Low/Medium/High/Max toggle of the current `ModelPicker`.

**Deliberately keeps:** the picker's controlled API (`selection`, `onChange`, `open`), applying a change from the next turn, popover/bottom-sheet behaviour.

**Token delta:** none.

### Copy list (DE source; EN and FR required)

„Modell für diese Unterhaltung" · „Höchste Qualität" · „für besonders anspruchsvolle Auswertungen" · „Hohe Qualität" · „für schwierige Abgrenzungs- und Codierfragen" · Ausgewogen · „für die meisten Fragen" · „Schnell und günstig" · „für kurze Nachfragen" · „von {Anbieter}" · „≈ {lo}–{hi} Token pro Antwort" · „ohne Token · Claude-Abo" · „Wie gründlich soll die Antwort sein?" · Schnell · Gründlich · „Sehr gründlich" · Maximal · „Gründlicher heisst bessere Antworten, aber längere Wartezeit und mehr Token." · „Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger." · „Neue Unterhaltung" · „Guthaben {n} Token" · „Zusammenfassung bis hier" · „{n} Token".

### Non-goals and do-not-touch

Which models an account may use, the estimate formula and prices (DCM-CHAT-13, DCM-BILL-1), summarisation itself, chat layout otherwise.

### Risks

An estimate shown as exact would mislead; it is always a range with „≈". Hiding entries must never hide the currently selected model without switching to a valid one.

### Required tests to write or update

Only server entries shown, no groups or chips; names, purpose and estimate per entry; effort options per model; long-chat notice; balance; relative scale without tokens; operator subscription label; selection falls back to a valid entry; summary block; per-reply cost with and without conversion; i18n completeness.


## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). The Orchestrator owns `package.json`, the version, the lockfile, `CHANGELOG.md`, `README.md` and the register; do not touch them. Another order (UCM-BILL-3) works in `src/billing/**` at the same time: do not touch `src/billing/**`, `src/i18n/billingTranslations.ts`, `tests/billing*` or `src/theme/kitSxRegistry.js` (use `src/chat/kitSxRegistry.js` for chat sx entries). The Envelope's "Replaces / removes" list authorizes removing the old picker behaviour, so the existing tests that assert it MUST be rewritten or deleted by you: `tests/chatPicker.test.jsx`, `tests/chatDriverNames.test.jsx`, and every assertion in `tests/chat*.test.*` that depends on the removed driver groups, the "pay per use" chip, the old effort toggle, or the model button in the thread bar (search with `grep` for `Chat.driver`, `payPerUse`, `effortLabel`, `Sonnet ·`). Keep every other existing chat test green.

**DCM-CHAT-13 payload (django-core-micha 3.5.0, `docs/design/assistant-chat.md`; isolate names in `src/chat/wire.js`):**
- `GET catalogue/?chat=<id>` (the `chat` parameter is optional) -> `{ default: { entry, effort } | null, entries: [ { id, driver, model, label, provider, level, efforts, billing, default, estimate } ] }`. `id` is `"<driver>:<model>"`; `provider` is `anthropic` | `openai` | `claude_code`; `level` is `top` | `best` | `balanced` | `fast` (may be empty or unknown); `efforts` is a subset of `low|medium|high|max`; `billing` is `subscription` | `pay_per_use`; `estimate` maps each supported effort to `{ min, max, unit }`, `unit` is `tokens` (the app converts cost to its token unit) or `level` (a relative scale 1 to 3). The estimate already accounts for the chat's current length.
- A chat object has `selection: { entry, effort } | null` (null when the stored model is no longer offered).
- `GET chats/<id>/turns/` first page also carries `summary: { up_to_seq, text, created_at } | null`. WebSocket: the `history` frame carries `summary` too; a `notice` frame `{ code: 'summarised', up_to_seq }` announces a new summary (fetch it again by reloading the first turns page). A turn has `usage: { input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd_micros, context_tokens }` (all integers).

**What to build:**
1. `src/chat/api.js`: `getCatalogue({ chat } = {})` sends `params: { chat }` only when given (existing call shape without it stays).
2. `ModelPicker` (`src/chat/ModelPicker.jsx`) redesign, props `entries`, `selection`, `onChange`, `disabled`, `open`, `onOpenChange`, `sheet` (existing, same meaning, controlled API kept: `onChange({ entry, effort })`, `open`/`onOpenChange`), plus `balance` (number or null), `longChat` (bool), `onNewChat` (function). Visual reference: `maana/work-orders/assets/MAANA-CHAT-1-assistant.html` (CSS lines 45-62 `.model-btn`, `.model-pop`, `.mp-*`; markup and behaviour in the script around lines 160-185 `renderModelPicker`, `mpCost`, `mpLabel`); read it. Build with MUI, theme tokens only, never the prototype's literals.
   - The trigger is a small rounded button (about 32 px high, secondary text) labelled "<model name without a trailing version> · <effort word> ▾" (strip a trailing version such as " 5.5" or " 5.1" from `label`; the caret is decorative).
   - It opens a `Popover` about 360 px wide, anchored above the button, with a modal-free look; below `md` (or when `sheet` is true) a bottom `Drawer` sheet. Title "Modell für diese Unterhaltung" (`Chat.pickerTitle`) with a close button (`Chat.close`). Escape closes and returns focus to the trigger (MUI does); the list is a `role="radiogroup"` labelled by the title.
   - Entries are grouped under four level headings in this order: `top` "Höchste Qualität" + hint "für besonders anspruchsvolle Auswertungen", `best` "Hohe Qualität" + "für schwierige Abgrenzungs- und Codierfragen", `balanced` "Ausgewogen" + "für die meisten Fragen", `fast` "Schnell und günstig" + "für kurze Nachfragen" (keys `Chat.level.<level>` and `Chat.levelHint.<level>`). A level with no entries is not shown; entries whose level is empty or unknown come last under no heading. NO provider or interface groups, NO "pay per use" chip, nothing greyed out: exactly the entries in `entries`.
   - Each entry is a radio row: the entry's `label` (bold), "von {provider}" (`Chat.by`, provider shown as Anthropic for `anthropic` and `claude_code`, OpenAI for `openai`), and the estimate text on the right. Estimate for the shown effort (the selected effort when the entry supports it, else the entry's first effort): `billing === 'subscription'` -> "ohne Token · Claude-Abo" (`Chat.noTokenSubscription`); `unit: 'tokens'` -> "≈ {lo}–{hi} Token pro Antwort" (`Chat.estimateTokens`, numbers formatted for the language with `Intl.NumberFormat`); `unit: 'level'` -> a three-dot scale (`●●○`, filled dots = `min` rounded into 1 to 3) with an accessible name "Kosten niedrig/mittel/hoch" (`Chat.costScale.1/2/3`); no estimate -> nothing. Never show a precise number without the "≈" and the range. Picking a row calls `onChange({ entry, effort })`, keeping the current effort if the new entry supports it, otherwise its first effort (as today).
   - Below the list: "Wie gründlich soll die Antwort sein?" (`Chat.effortQuestion`) and a segmented control (`ToggleButtonGroup`, exclusive) with only the efforts the selected entry supports, words Schnell (low), Gründlich (medium), Sehr gründlich (high), Maximal (max) (`Chat.effort.low/medium/high/max`: REPLACE the old texts "Niedrig/Mittel/Hoch/Maximum" in all four languages), and the hint "Gründlicher heisst bessere Antworten, aber längere Wartezeit und mehr Token." (`Chat.effortHintTokens`) when any entry's estimate unit is `tokens`, otherwise the same sentence without "und mehr Token" (`Chat.effortHint`).
   - When `longChat` is true: a warning notice "Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger." (`Chat.longChat`) with a link-styled button "Neue Unterhaltung" (`Chat.newConversation`) calling `onNewChat` (the button only renders when `onNewChat` is given).
   - When `balance` is a finite non-negative integer: a footer "Guthaben {n} Token" (`Chat.balanceLabel`).
   - Selection fallback inside the picker: the effective selection is `selection` if its entry is in `entries` and its effort is supported, else `default`-flagged entry (`entry.default`), else the first entry, with a supported effort; the trigger label and the checked row use the effective selection. An empty `entries` renders the trigger disabled with `Chat.chooseModel`.
   - Remove the exports/keys `driverName`, `EFFORT_LEVELS` only if nothing else uses them (search first); delete the keys `Chat.driver.*` and `Chat.payPerUse` from `src/i18n/chatTranslations.ts`.
3. `src/chat/ChatComposer.jsx`: new optional prop `actions` (a node) rendered between the text field and the Send/Stop buttons, same row, vertically aligned to the input's bottom edge; nothing else changes.
4. `src/chat/ChatWorkspace.jsx` (see the existing props and effects; keep all existing behaviour and props):
   - Remove the `ModelPicker` from the thread bar and pass it to `ChatComposer` as `actions` (disabled while a turn runs or the chat is archived; the thread bar keeps title, chips and buttons).
   - New optional props: `tokenBalance` (number|null, shown in the picker footer), `usageToTokens(usage) => number | null` (token conversion for per-reply cost), `longChatTokens` (default 40000; a value of 0 or less turns the long-chat notice off). The long-chat state: the `usage.context_tokens` of the latest turn that has usage is at least `longChatTokens`.
   - Catalogue: `api.getCatalogue({ chat: chat.id })` when a chat is shown (re-fetched when the chat changes, when a turn completes, and each time the picker opens, so the estimates follow the chat's length); without a shown chat the plain call as today. Keep the previous catalogue on screen while a refresh runs; a failed refresh keeps the previous catalogue.
   - Selection fallback: when the shown chat's `selection` is null or its entry is not in the catalogue or its effort is not supported, call `updateChat(chat, { selection: <effective selection> })` once per chat id so the server never keeps an invalid selection; the effective selection is the catalogue `default` or the first entry as in the picker.
   - A "Neue Unterhaltung" action for the picker and the notice calls the existing `createChat`.
   - Long-chat notice also above the composer, before sending (a quiet `Alert`, same text and the "Neue Unterhaltung" action; reuse the strings).
   - Summary: keep `summary` (`{ up_to_seq, text }` or null) per shown chat; set it from the first turns page, from the `history` frame (`frame.summary`), and re-load the first turns page when a `notice` with code `summarised` arrives (replace the summary only, keep the turns the surface already shows); reset it when the chat changes. Pass `summary` and `usageToTokens` to `ChatThread`.
5. `src/chat/ChatThread.jsx`: (a) the summary block: before the first turn whose `seq` is greater than `summary.up_to_seq` (at the end when there is none) render a collapsed disclosure "Zusammenfassung bis hier" (`Chat.summaryUntilHere`, a button with `aria-expanded` and a caret; expanded it shows the summary text as plain text with preserved line breaks, NOT as Markdown or HTML). Render nothing when `summary` is null or its `text` is empty. (b) per-reply cost: when `usageToTokens` is given and returns a finite non-negative integer for `turn.usage`, the quiet caption under a finished reply becomes "<model> · <effort word> · {n} Token" (`Chat.replyTokens`); without the conversion, or for a turn without usage, the caption is as before (model and effort word).
6. `src/i18n/chatTranslations.ts`: add every key above (`{ de, en, fr, sw }`, `{{placeholders}}` identical in all four); German source copy is the Envelope's copy list verbatim; write natural en/fr/sw (en: "Highest quality", "High quality", "Balanced", "Fast and cheap", effort words Quick / Thorough / Very thorough / Maximum). The registered bundle and its tests stay as they are.
7. sx convention: `tests/themeCompleteness.test.js` fails on an inline `sx` object on a baseline-styled MUI component (Button, Alert, Paper, Chip, Dialog, ToggleButton, ...). Export a top-level `export const NAME_SX = {...}` from the component module and register it in `src/chat/kitSxRegistry.js` with `createKitSxEntry(...)`; do not repeat values the theme already sets (button min height, text transform). `sx` on `Box`, `Stack`, `Typography` is not checked. Run `tests/themeCompleteness.test.js`.

**Tests to write (rewrite `tests/chatPicker.test.jsx`; new files `tests/chatPickerLevels.test.jsx`, `tests/chatSummary.test.jsx`, `tests/chatReplyCost.test.jsx`; imitate the existing chat tests: mocked `react-i18next` returning keys, or a real i18next with `chatTranslations` as `tests/chatDriverNames.test.jsx` did):** only the server's entries are listed, no groups by driver, no pay-per-use chip, nothing disabled; level order and headings, an empty level hidden, unknown level last; name, "von {provider}", estimate per entry for the selected effort (tokens range with "≈", relative scale with its accessible name, subscription text, none); effort options only those the entry supports and the words; picking an entry keeps or falls back the effort; hint with and without tokens; long-chat notice with and without `onNewChat`; balance footer; label without version and with effort word; fallback of an invalid selection (picker label and the one `updateChat` call from the workspace per chat); controlled `open`; bottom sheet when narrow; workspace: the picker sits in the composer row, the catalogue is requested with the chat id and refetched on open and after a turn, a failed refresh keeps the old catalogue, the long-chat notice above the composer from `usage.context_tokens` and `longChatTokens`, "Neue Unterhaltung" creates a chat; summary block collapsed by default, position before the first newer turn, expands to plain text (HTML in the text is shown as text), appears from the turns page and the history frame, reloaded on the `summarised` notice, absent when null; per-reply cost with and without `usageToTokens`, invalid values ignored; i18n completeness for the new keys. Update the existing tests that the removal breaks (listed above).
Run `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and `tests/chat*.test.*`; nothing else.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator 2026-10-16 (in the Maana Expertenchat, session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). After DCM-CHAT-13 (landed in django-core-micha 3.5.0, `8bffe06`). Tier 2: `reviewer` lenses (envelope, regression, duplication, tests) and `ui_reviewer`, one review on the final combined diff, repeated after any fix to code. Prototype in scope: the rendered 375 px and 1280 px side-by-side against the prototype is a commit gate (dev harness `pnpm dev` of this repository, entry "Chat"; the harness may need a chat entry with the DCM-CHAT-13 payload). Evidence: a dispatched `ci.yml` run on `ci-test/UCM-CHAT-6`. Minor release by push to main (4.6.0 after UCM-BILL-3's 4.5.0), register row, report to the Expertenchat (summary and cost caption need `usage`; the picker needs `tokenBalance` and `usageToTokens` from the app; `longChatTokens` default 40000 mirrors the server's summary limit).
