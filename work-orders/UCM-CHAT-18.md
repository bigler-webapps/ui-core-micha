# UCM-CHAT-18: Host can hide the model line under replies

## Part A - Envelope

**Goal.** `ChatWorkspace` (and `ChatThread`) accept an optional `showReplyCaption`, default `true`. With `false` the line under each finished reply (model, effort and, where the host converts usage, the token count) is not rendered. Everything else in the thread is unchanged.

**Why.** jg-ferien JG-AI-10 acceptance criterion PS-C02: "No status or model line appears under the replies; the model is visible only in the picker below the input." The shared chat prints that line for every reply; the operator decided on 2026-11-15 to change the chat kit.

**Scope.** `src/chat/ChatWorkspace.jsx` (prop and pass-through), `src/chat/ChatThread.jsx` (prop, condition on the caption), one test in `tests/chatReplyCost.test.jsx`, README and CHANGELOG, minor version 4.37.0 (purely additive).

**Non-goals.** No change to the default (every existing app keeps the line), to the model picker, to the token cost caption's logic, or to any other part of the thread.

**Tier 3** (a change inside shared-core). **Tests:** the reply-caption test.

## Part C - Orchestrator only (stop here, implementer)

Implemented by the Orchestrator (a six-line additive prop; no implementer dispatch). Review: Tier 3 lenses on the small diff. Consumer: jg-ferien pins this version and passes `showReplyCaption={false}` in `PageAssistantPanel`.
