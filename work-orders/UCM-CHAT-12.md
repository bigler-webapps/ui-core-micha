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

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ModelPicker.jsx`, `src/chat/ChatWorkspace.jsx` (only the `<ModelPicker …>` props), `src/chat/kitSxRegistry.js`
(ModelPicker entries), `src/i18n/chatTranslations.ts`, the existing picker tests `tests/chatPicker.test.jsx` and
`tests/chatPickerLevels.test.jsx`, and new `tests/chatPickerCompact.test.jsx`. No other file (no README, CHANGELOG,
package files, lockfile, register, `ChatThread.jsx`, no new exports in `src/entries/*.js`).

### Visual spec

`work-orders/assets/UCM-CHAT-12-model-picker.html` (open it; the toggle shows 375 and 1280 px). The panel shows:
- a header row with the title "Modell" and a close icon;
- one row per model: the label on the left (selected row: `accent-soft` background, label weight 600; other rows
  regular weight) and one muted cost value on the right;
- the caption "Aufwand", then a full-width segmented group Low · Medium · High · Max (selected: accent text on
  `accent-soft`);
- the balance caption.

On wide viewports it is a popover of about 300 px anchored at the trigger. Below `md` it is the bottom sheet with
rounded top corners. Colours, radius and type come from the theme; there are no new tokens.

### Seams (verified against `main` after UCM-CHAT-11, 4.24.0)

- `src/chat/ModelPicker.jsx`:
  - `:6-13` constants and exported sx (`CHAT_MODEL_ENTRY_SX`, `CHAT_MODEL_EFFORT_SX`, …).
  - `:29-42` `estimateText` (subscription → `Chat.noTokenSubscription`; `unit: 'tokens'` → `Chat.estimateTokens`;
    `unit: 'level'` → dots with `Chat.costScale.<n>` as aria-label).
  - `:44` props: `sheet`, `longChat`, `onNewChat`, `balance`, `shortLabel`, …
  - `:49` `narrow = sheet ?? viewportNarrow`.
  - `:58-59` level grouping.
  - `:62-73` `entryRow`: provider line `Chat.by`, estimate line, `average_cost_usd_micros` line.
  - `:72-82` radio keyboard handler.
  - `:83-111` panel content: title `Chat.pickerTitle`, group headings `Chat.level.*` / `Chat.levelHint.*`, effort
    heading `Chat.effortQuestion`, buttons `Chat.effort.<x>`, hint `Chat.effortHint(Tokens)`, `longChat` Alert,
    balance `Chat.balanceLabel`.
  - `:113-114` trigger, `Drawer` vs `Popover`.
- `src/chat/ChatWorkspace.jsx`: the `<ModelPicker …>` passes `sheet={narrow}` (container-narrow), `longChat` and
  `onNewChat`. The composer's own long-chat notice and the standard-layout `longChat` Alert above the composer stay
  untouched.
- `Chat.effort.*` is also used by the trigger label (`ModelPicker.jsx:113`) and by `ChatThread` captions. The trigger and
  the thread are non-goals, so those keys and their values stay as they are.

### What to build

1. **Flat list.** Drop the group headings and hints. Keep today's order (level order top → best → balanced → fast,
   then entries with an unknown level, catalogue order within each), so keyboard order and visual order stay equal.
2. **One line per model.** The label on the left; one muted, right-aligned cost value. Take the first that applies:
   - `billing === 'subscription'` → new key `Chat.subscriptionShort` (de "Abo", en "Subscription", fr "Abonnement",
     sw "Usajili");
   - token estimate → new key `Chat.estimateTokensShort` ("≈ {{lo}}–{{hi}} Token" / "≈ {{lo}}–{{hi}} tokens", fr
     "jetons", sw "tokeni"; numbers formatted as today);
   - level estimate → today's dots with their aria-label;
   - otherwise nothing.

   No provider line and no average-cost line. The selected row has weight 600; the other rows have regular weight.
3. **Effort.** The heading is the existing `Chat.effortLabel`. The buttons read the fixed provider wording **Low,
   Medium, High, Max** in every language: a constant map in the picker, not the `Chat.effort.*` keys. Show only the
   model's efforts, as today, with no hint line. The group keeps its accessible name (`Chat.effortLabel`).
4. **Balance** caption unchanged.
5. **Title** `Chat.pickerTitle` becomes "Modell" / "Model" / "Modèle" / "Modeli".
6. **Remove** from the picker the `longChat` Alert and the `longChat`/`onNewChat` props. `ChatWorkspace` stops
   passing them.
7. **Popover vs sheet.**
   - The sheet is used only when the viewport is below `md` (`useMediaQuery(theme.breakpoints.down('md'))`), whatever
     the container width.
   - `ChatWorkspace` stops passing `sheet={narrow}`.
   - Keep the optional `sheet` prop as an explicit override for direct users of the exported `ModelPicker`.
   - The popover content is about 300 px wide (`width: 300`, `maxWidth: '100%'`).
8. **Translations.**
   - Add the two new keys.
   - Change the `Chat.pickerTitle` values.
   - Delete `Chat.level.*`, `Chat.levelHint.*`, `Chat.by`, `Chat.effortQuestion`, `Chat.effortHint`,
     `Chat.effortHintTokens`, `Chat.noTokenSubscription` and `Chat.estimatePerAnswer` only after a search of `src/`
     shows no other use (verified at mapping: none outside `ModelPicker.jsx`).
   - Keep `Chat.longChat`, `Chat.newConversation`, `Chat.costScale.*` and `Chat.estimateTokens` if anything else uses
     them; otherwise delete them too, except `Chat.costScale.*`, which the dots keep.
9. **Kit sx.** New or changed sx objects on MUI components are exported constants registered in
   `src/chat/kitSxRegistry.js`. Do not set properties the theme styles (radius, colours outside the palette).

Keep unchanged: the trigger and its label, the radio-group keyboard behaviour (arrows move the choice and the focus,
only the checked row is a tab stop), the close button, the selection and effort fallback, the `onChange` contract and
`aria-haspopup`.

### Required tests (maps Part A)

`tests/chatPickerCompact.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/chatPicker.test.jsx`):
- no group heading text;
- each row shows its label and exactly one cost value (subscription → `Chat.subscriptionShort`; tokens →
  `Chat.estimateTokensShort`; level → dots; none → no value);
- effort buttons read Low/Medium/High/Max, limited to the model's efforts, with no hint text;
- no long-chat alert inside the picker;
- the balance is shown;
- a popover (not a Drawer) when the viewport is wide, even if `ChatWorkspace`'s container is narrow (mock
  `matchMedia`/`useMediaQuery` as the existing tests do), and a Drawer below `md`;
- arrow keys still move the choice and the focus.

Update the existing picker tests only where they assert removed text (group headings, `Chat.by`, effort question, old
effort labels in the picker, the average-cost line); say which assertions you changed and why in your final report.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the tests you wrote or changed — nothing else. Do NOT install
dependencies, touch a lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with
`RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/`push`; leave every change uncommitted. Run only
`node_modules/.bin/vitest run tests/chatPickerCompact.test.jsx tests/chatPicker.test.jsx tests/chatPickerLevels.test.jsx`
from the target directory, once — your ONLY test run; the Orchestrator's run and the independent review are the gate.
Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-25 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce), prototype and copy list included. Tier 3 · Prototyp: all reviewer lenses and `ui_reviewer`; the rendered
375/1280 side-by-side against the prototype is a commit gate. Same files as UCM-CHAT-11 (`ChatWorkspace.jsx`
`sheet` wiring): land UCM-CHAT-11 first. Publish a minor release and report the version.

Gate #1 also given to this Orchestrator directly by the operator on 2026-10-25 ("UCM-CHAT-11 und 12 bitte
implementieren. gate erteilt").

Mapped by the Orchestrator (Claude) on 2026-10-25 after UCM-CHAT-11 (4.24.0).

Decisions within the Envelope:
- Effort wording in the panel comes from a constant map, not `Chat.effort.*`. The trigger and the thread (non-goals)
  keep their localised labels, so the trigger can read "Gründlich" while the panel reads "Medium". This is reported
  to the Expertenchat.
- The token cost uses a short key with today's range.
- `sheet` stays as an explicit override prop for direct `ModelPicker` users.

Execution: codex/gpt-6-luna, one CLI dispatch, banner read back.

Review: lenses plus `ui_review`, one round. The Orchestrator does its own Envelope pass while they run.

Verification:
- the new and changed picker tests, all `chat*` tests, `chatTranslations`, `i18nAggregate`, `checkKitIntegration`,
  `themeCompleteness`, `packageEntries` and tsc;
- the rendered 375/1280 side-by-side against the prototype in the dev harness (commit gate);
- the full suite in `ci.yml` on `ci-test/UCM-CHAT-12`.

README, CHANGELOG and the minor version are written by the Orchestrator.
