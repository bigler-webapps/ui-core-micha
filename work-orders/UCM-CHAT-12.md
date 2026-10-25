# UCM-CHAT-12 — Compact model picker: flat list, provider effort wording, no explanations

## Part A — Envelope (everyone)

**Tier:** 3 — a frontend change inside shared core (`src/chat/ModelPicker.jsx`) visible in every consuming app.
**Prototype:** [assets/UCM-CHAT-12-model-picker.html](assets/UCM-CHAT-12-model-picker.html) — the visual spec at 375
and 1280 px.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumers:** maana, cockpit, hram, survey_app (next pin bump each; Maana's is routed by the Maana Expertenchat).

### Goal and expected outcome

The model picker explains far more than its users need: quality groups with a description sentence, "by Anthropic",
a second and third line per model, a question as effort heading with an explanatory sentence, and a long-conversation
banner. On a wide window with a narrow chat pane it also opens as a full-width bottom sheet. The operator decided
(2026-10-25) that people know the models and need no or minimal description. Expected outcome: a small panel with the
model names, one short cost value each, the effort levels in the providers' own wording, and the balance.

### Settled decisions (operator, 2026-10-25)

1. **Flat list:** no quality group headings and no group descriptions; models in today's order (by level, then
   catalogue order).
2. **One line per model:** the model's label on the left, one short cost value right-aligned and muted. No provider
   line ("by Anthropic"), no further lines. Cost value, first that applies: subscription billing → "Abo" /
   "Subscription"; token estimate → today's token range; level estimate → today's dots; else nothing. The per-answer
   average cost is no longer shown in the picker.
3. **Effort:** heading "Aufwand" / "Effort" (existing `Chat.effortLabel`); the levels in the providers' wording
   **Low · Medium · High · Max**, the same in every language; only the levels the model supports, as today. No
   explanatory sentence below.
4. **Balance** stays as today's caption.
5. **Long-conversation banner** is removed from the picker; the composer's own long-conversation notice is unchanged.
6. **Title** "Modell" / "Model".
7. **Popover vs. sheet:** the panel is a compact popover (about 300 px) anchored at the trigger whenever the viewport is
   wide; the bottom sheet is used only on a narrow viewport (below `md`), regardless of the chat container's width.

### Replaces / removes

Group headings and hints (`Chat.level.*`, `Chat.levelHint.*` in the picker), the provider line (`Chat.by`), the
average-cost line in the picker, the effort question (`Chat.effortQuestion`) and the effort hints
(`Chat.effortHint`, `Chat.effortHintTokens`), the `longChat` Alert inside the picker, the long subscription text
(`Chat.noTokenSubscription`) in the picker. Remove a translation key only where nothing else uses it.

### Deliberately keeps

The trigger and its label in the context row, radio-group keyboard behaviour (arrows move choice and focus, one tab
stop), close button, selection and effort fallback logic, `onChange` contract, the catalogue data, the composer's
long-conversation notice, the balance.

### Copy list (released with Gate #1)

"Modell" / "Model"; "Aufwand" / "Effort" (existing); "Abo" / "Subscription"; "Low", "Medium", "High", "Max" (all
languages); balance caption as today. FR and SW follow the same choices.

### Token delta list

None — drawn from the theme (accent, accent-soft, secondary, line, subtle; 8 px radius).

### Parity guardrail

Visual/UX only: no change to the selection contract, the catalogue, billing or any data passed to the host.

### Non-goals and do-not-touch

The trigger label format, the chat thread, the composer, the server catalogue and estimates.

### Required tests to write

Flat list without group headings; each row shows the label and exactly one cost value (subscription, token range,
dots, none); effort buttons labelled Low/Medium/High/Max limited to the model's efforts, no hint text; no long-chat
alert inside the picker; balance shown; popover on a wide viewport even when `sheet`-narrow container, sheet on a
narrow viewport; keyboard radio behaviour unchanged.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 pending: the operator approves the prototype and the copy list in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3 · Prototyp: all reviewer lenses and `ui_reviewer`; the rendered
375/1280 side-by-side against the prototype is a commit gate. Same files as UCM-CHAT-11 (`ChatWorkspace.jsx`
`sheet` wiring): land UCM-CHAT-11 first. Publish a minor release and report the version.
