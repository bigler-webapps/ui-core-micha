# UCM-CHAT-7 — Compact chat composer: context row with model choice, full-width input, one-line notices

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`), consumed by Maana; existing consumers must keep working.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Prototype:** [MAANA-CHAT-1-assistant.html](../../maana/work-orders/assets/MAANA-CHAT-1-assistant.html), composer of
the chat panel, addition of 2026-10-22 (see "Umfang und Grenzen" in the prototype frame).

### Goal and expected outcome

In Maana's chat panel the composer takes too much height and wraps: the context, two links, a long-conversation
alert, the input, the model button, Stop and Send compete for space (`ChatComposer` lays the input, actions, Stop and
Send out in one wrapping row; `ChatWorkspace` puts the long-chat `Alert` and the host's composer extra above it).
Expected outcome: the composer is two rows — a context row with what the host added plus the model choice at its end,
and a full-width input row — and notices in the composer are one line and dismissible.

### Settled decisions (operator, 2026-10-22)

1. **Context row:** one line above the input. The host supplies its content (in Maana: the excerpts added to the
   chat); the model choice sits at the end of this row. The row never wraps; host content is cut with an ellipsis
   before the model choice shrinks.
2. **Input row:** the input uses the full width. Enter sends, Shift+Enter inserts a line break (as today). Send is an
   icon button inside the input row; while a turn runs it is replaced by Stop in the same place. The input grows up to
   a few lines.
3. **Model choice label** is short: model family and effort without the vendor prefix (for example "Sonnet ·
   Gründlich"); the picker itself is unchanged.
4. **Notices in the composer area** (today the long-conversation alert) are one line, carry their action ("Neuer
   Chat") and a close button, and once closed stay closed for that chat. No explanatory second sentence.
5. **Compatibility:** consumers that do not opt into the new layout keep today's composer unchanged; the new layout
   is an explicit option. The existing `renderComposerExtra` keeps working.

### Scope and acceptance

`ChatComposer`, the composer part of `ChatWorkspace`, `ModelPicker`'s button label, the long-chat notice; DE and EN;
desktop and phone. Accepted when the prototype's composer states render equivalently at 375 and 1280 px (empty
context, one and several added items, running with Stop, notice shown and closed) and existing consumers are
unchanged without the option.

### Non-goals and do-not-touch

Maana's context content and links (MAANA-CHAT-15), the model picker's content and catalogue, chat history and
streaming, grants, the side panel, other apps.

### Risks

A shared component used by several apps: the old layout must stay the default. Closing a notice must not hide a
different, later notice.

### Required tests to write

Two-row layout with host content and model choice in one non-wrapping row; Enter sends and Shift+Enter breaks a line;
Send becomes Stop while running and back; notice closes per chat and stays closed after re-render, a new chat shows it
again; default layout unchanged for a consumer without the option; short model label.

### Visual specification

Prototype above, composer only. **Token delta:** none. **Copy:** "Lange Unterhaltung: ältere Teile werden
zusammengefasst." with "Neuer Chat" (replaces the current two-sentence long-chat text), "Antwort stoppen" as the Stop
label; English equivalents.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-22 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; 375/1280 comparison
against the prototype's composer. Publish a minor release; report the version back so MAANA-CHAT-15 can adopt it.
No consumer pin changes.
