# UCM-CHAT-6 — Chat: plain model picker, summary and cost of each reply

## Part A — Envelope (everyone)

**Tier:** 2 — a redesign of the shared model picker and display of new payload fields; which models are available and what they cost is decided on the server (DCM-CHAT-13). **Repository:** `bigler-webapps/ui-core-micha`. **Canonical:** DCM-CHAT-13; starts after its payload is fixed.

### Goal and expected outcome

The model picker today lists providers and interfaces („Claude Code Subscription", „Anthropic API", „OpenAI API", „pay per use") over the full width, and effort as Low/Medium/High/Max. Everyday users do not know what that means or what a reply will cost. The person should see only the models they can use, by their known names, what each is good for, and roughly how many tokens a reply will take; plus on what the assistant relies and what each reply cost.

Expected outcome: a compact, self-explanatory picker; a visible summary; a quiet cost per reply.

### Settled decisions (operator, 2026-10-16)

1. **Compact entry:** a small button next to „Senden" showing model and effort in words („Claude Sonnet · Gründlich ▾"); it opens a compact window (popover, about 360 px wide; bottom sheet on narrow screens).
2. **Only usable models:** the picker lists exactly the entries the server offers for this account and app; nothing greyed out, no provider or interface groups, no „pay per use" chips.
3. **Plain names in three levels:** the entries are ordered under three levels in words, each with a short purpose: „Am gründlichsten · für schwierige Abgrenzungs- und Codierfragen" (Claude Opus), „Ausgewogen · für die meisten Fragen" (Claude Sonnet, GPT-6.1 Sol), „Schnell und günstig · für kurze Nachfragen" (Claude Haiku, GPT-6 Luna). Each entry shows the known model name and „von Anthropic" / „von OpenAI". The level of each model comes from the server catalogue; an empty level is not shown.
4. **Estimate per entry:** „≈ x–y Token pro Antwort" for the chosen effort and the current length of the chat, in the app's token unit (Maana tokens); in apps without tokens a relative cost scale (●○○ to ●●●); for the operator's subscription driver „ohne Token · Claude-Abo".
5. **Effort in words:** „Wie gründlich soll die Antwort sein?" with Schnell, Gründlich, Sehr gründlich, and Maximal only where the model supports it; one line explains that more thoroughness means better answers, longer waiting and (with tokens) more tokens.
6. **Long chat:** a notice in the picker and before sending that older parts will be summarised and a new chat is cheaper, with „Neue Unterhaltung".
7. **Balance** at the bottom of the picker when the app has tokens.
8. „Zusammenfassung bis hier" as a collapsed block at the point of the summary, expandable to its text.
9. Each reply shows its cost quietly (e.g. „6 Token") when the app supplies a token conversion; otherwise nothing.
10. DE, EN, FR.

### Scope and acceptance

The redesigned `ModelPicker`, summary block, per-reply cost and notices in all chat surfaces of the kit, wired to the DCM-CHAT-13 payload.

### Visual specification and replacement authority

**Prototype:** [MAANA-CHAT-1-assistant.html](../../maana/work-orders/assets/MAANA-CHAT-1-assistant.html), coverage paragraph „UCM-CHAT-6": model button next to „Senden", picker window, the prototype bar's „Konto" (Abo mit Token / Betreiberin / App ohne Token) and „Lange Unterhaltung". The estimates there are invented.

**Parity guardrail:** visual and interaction parity with the drawn picker; availability and estimates come from the server.

**Replaces / removes:** the driver group headings, the „pay per use" chips and the full-width Low/Medium/High/Max toggle of the current `ModelPicker`.

**Deliberately keeps:** the picker's controlled API (`selection`, `onChange`, `open`), applying a change from the next turn, popover/bottom-sheet behaviour.

**Token delta:** none.

### Copy list (DE source; EN and FR required)

„Modell für diese Unterhaltung" · „Am gründlichsten" · „für schwierige Abgrenzungs- und Codierfragen" · Ausgewogen · „für die meisten Fragen" · „Schnell und günstig" · „für kurze Nachfragen" · „von {Anbieter}" · „≈ {lo}–{hi} Token pro Antwort" · „ohne Token · Claude-Abo" · „Wie gründlich soll die Antwort sein?" · Schnell · Gründlich · „Sehr gründlich" · Maximal · „Gründlicher heisst bessere Antworten, aber längere Wartezeit und mehr Token." · „Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger." · „Neue Unterhaltung" · „Guthaben {n} Token" · „Zusammenfassung bis hier" · „{n} Token".

### Non-goals and do-not-touch

Which models an account may use, the estimate formula and prices (DCM-CHAT-13, DCM-BILL-1), summarisation itself, chat layout otherwise.

### Risks

An estimate shown as exact would mislead; it is always a range with „≈". Hiding entries must never hide the currently selected model without switching to a valid one.

### Required tests to write or update

Only server entries shown, no groups or chips; names, purpose and estimate per entry; effort options per model; long-chat notice; balance; relative scale without tokens; operator subscription label; selection falls back to a valid entry; summary block; per-reply cost with and without conversion; i18n completeness.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 pending. After DCM-CHAT-13. Seams: `src/chat/ModelPicker.jsx`, `ChatThread.jsx`, `ChatWorkspace.jsx`, the `Chat.*` strings. Tier 2: `reviewer` lenses and `ui_reviewer`. Prototype in scope: rendered 375/1280 side-by-side is a commit gate.
