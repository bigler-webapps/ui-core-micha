# UCM-CHAT-13 — Chat composer: typing re-renders only the composer

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`); no visible or contract change for hosts.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumers:** maana (where it was found), cockpit, hram, survey_app with their next pin bump.

### Goal and expected outcome

Typing in the chat lags heavily in Maana (operator, 2026-10-26). Measured on Maana staging (ui-core-micha 4.25.0, a
chat with about 50 turns and the permissions side panel open): each keystroke costs a median of 780 ms and a maximum
of 1,140 ms of synchronous rendering. The draft lives in `ChatWorkspace` state (`ChatWorkspace.jsx` l.93,
`value={draft} onChange={setDraft}` l.525), so every keystroke re-renders the whole workspace: the thread with every
turn, every host `renderAnswerExtra`, `renderComposerContext`, `renderComposerExtra` and the host's `sidePanel(chat)`
(l.535). A mutation trace of one keystroke shows about 100 attribute updates on the side panel's switches and
checkboxes, which are unrelated to typing. Expected outcome: a keystroke re-renders the composer only; typing stays
immediate however long the chat or heavy the host's slots are.

### Settled decisions (Expertenchat, within the operator's report)

1. **The draft is owned at the composer level**, so a keystroke does not re-render `ChatWorkspace`, `ChatThread`, the
   side panel or any host render prop. The workspace reads the text when it sends.
2. **Every existing behaviour stays:** the host prefill (`composerPrefill`, l.321-326) including chat switching and
   the focus counter (l.363), clearing after a successful send (l.445), the reset on chat switch (l.277), Enter/
   Shift+Enter, stop, the compact and standard layouts, the blocked states, the usage-limit state.
3. **No public prop is removed or renamed.** If `ChatComposer` is used directly by a host as a controlled component,
   it keeps working (controlled when `value`/`onChange` are given).
4. No debounce or deferral of the visible text: the input itself stays fully responsive and exact.

### Scope and acceptance

`src/chat/ChatWorkspace.jsx`, `src/chat/ChatComposer.jsx`, their tests; CHANGELOG, a minor version. Accepted when a
render counter on the thread, a `renderAnswerExtra`, `renderComposerContext` and `sidePanel` stays unchanged while
typing 20 characters, and every listed behaviour is unchanged.

### Non-goals and do-not-touch

The thread, Markdown rendering, the socket, the model picker, the host slots' APIs.

### Required tests to write

Typing 20 characters: `sidePanel`, `renderAnswerExtra`, `renderComposerContext` and `renderComposerExtra` are not
called again, the thread does not re-render; the typed text is sent exactly and cleared after a successful send, kept
after a refused send; host prefill fills and focuses (twice for the same text), also across a chat switch; chat
switch clears the draft; direct controlled `ChatComposer` use still works.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-26 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer
lenses and `ui_reviewer`; no `sec_review`. Measure before/after in a consumer (keystroke render time on a long Maana
chat) and record it. Publish a minor release and report the version; Maana bumps its pin.
