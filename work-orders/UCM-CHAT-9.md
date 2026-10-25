# UCM-CHAT-9 — ChatWorkspace: limit state, clickable links, stored tool steps, model estimates

## Part A — Envelope

### Goal and expected outcome

`ChatWorkspace` gains the generic pieces hram's assistant (HRAM-AI-2) needs and other apps can use. In 4.20.0 the composer cannot be disabled at a cost limit (there is only a `quota_exceeded` notice with "Change model"), links in answers render as plain text "label (href)", and tool steps are shown only while a turn is generating.

After this order:

1. **Limit state.** With the period usage, limit and reset date from dcm (DCM-CHAT-16), the composer shows a usage meter; at the limit the composer is disabled and shows the reset date. Without limit data the composer behaves as today.
2. **Clickable links.** Markdown links in answers are links. Links into the app go through an app-provided navigation callback (so an app keeps its router and the panel stays open); external links open in a new tab. Unsafe schemes are not rendered as links.
3. **Tool steps per answer.** The tool steps stored with a turn (DCM-CHAT-16) are shown on the answer after reload, as they are while generating.
4. **Model estimates.** The model picker shows the estimated cost per answer when the catalogue provides one, and nothing otherwise.

Charts stay app-specific through the existing `renderAnswerExtra`; this order adds no chart rendering.

### Decision taken (operator, 2026-10-25)

Generic chat UI pieces belong in ucm; charts in the consuming app.

### Scope

1. `ChatWorkspace`, `ChatComposer`, `ChatThread`, `MarkdownReply`, `ModelPicker` for the four points.
2. Chat translations for the new strings; `CHANGELOG.md`, a minor version bump.

### Copy list

"<used> of <limit> USD", "Monthly limit reached" / "Daily limit reached" (by period), "Resets <date>", "≈ <cost> USD per answer".

### Non-goals

- Chart rendering, app-specific answer extras.
- Changing the full-page chat layout beyond these points.

### Risks

- Link handling is an injection surface: only http(s) and app-relative links become links; everything else stays text.
- Apps without limit data or estimates must see no change.

### Required tests to write

1. At the limit the composer is disabled and shows the reset date; below it the meter shows usage; without limit data nothing changes.
2. An app-relative link calls the navigation callback; an external link opens in a new tab; a `javascript:` link renders as text.
3. Stored tool steps render on a reloaded answer.
4. The model picker shows an estimate when present and none when absent.

## Part B — Implementation map — addressed to the implementer

**Not dispatch-ready.** The Orchestrator fills the verified context package before dispatch.

**Target working directory:** `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.

### Named orientation files

- `src/chat/ChatWorkspace.jsx`, `ChatComposer.jsx`, `ChatThread.jsx`, `MarkdownReply.jsx`, `ModelPicker.jsx`, `api.js`, `wire.js`
- the chat translations module

### Preamble

> Part A is the complete scope. Do not edit WORK_ORDERS.md; do not install dependencies, change lockfiles or tidy foreign changes. Do not git add/commit/push, self-review or treat your own run as the gate. Stop and report an out-of-scope cause. The Orchestrator supplies the progress contract and runtime-specific preamble.

## Part C — Orchestrator-only

**STOP — this section is for the Orchestrator, not a dispatched implementer.**

- Tier 3 (a change inside shared-core; link rendering is a security-relevant surface): all reviewers incl. `sec_reviewer` and `ui_reviewer`.
- After DCM-CHAT-16 (consumes its response shapes). Release per ucm's publish-from-main topology; hram bumps in HRAM-AI-2.
