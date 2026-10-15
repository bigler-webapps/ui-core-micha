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

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Can start against the `DCM-CHAT-1` contract in parallel; publish as a new minor version. Prototype in scope: ucm has no host app of its own, so the rendered side-by-side at 375 px and 1280 px runs where the surface is first mounted, in `cockpit/CP-CHAT-4`, and is that order's commit gate; a deviation it finds in the shared components is fixed here and republished.
