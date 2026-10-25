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

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ChatWorkspace.jsx`, `src/chat/ChatComposer.jsx` and new `tests/chatComposerDraft.test.jsx`; you may adjust
existing chat tests only where they assert the old wiring (say which and why in your final report). No other file (no
README, CHANGELOG, package files, lockfile, register, no new exports in `src/entries/*.js`).

### Seams (verified against `main` at 3f6e0ff, 4.25.0)

- `src/chat/ChatWorkspace.jsx`:
  - `:93` `const [draft, setDraft] = useState('')` and `:94` `composerInputRef`.
  - `:277` `setDraft('')` in the per-chat reset (`useLayoutEffect` on `chat?.id`).
  - `:317-329` host prefill: `lastPrefillId`, waits for the requested chat, then `setDraft(composerPrefill.text)`,
    `focusPending.current = true`, `setFocusRequest((count) => count + 1)`.
  - `:363-372` the focus effect runs after the render that carries the prefilled text. It focuses
    `composerInputRef.current` and moves the caret to the end. It waits while the input is disabled.
  - `:445` `send = () => { if (startTurn(draft)) setDraft(''); }`. `startTurn(message)` (`:420-429`) returns whether the
    frame was sent; a refused send keeps the text.
  - `:525` `<ChatComposer value={draft} onChange={setDraft} onSend={send} … inputRef={composerInputRef} usageLimit=… />`.
    Nothing else in the workspace reads `draft`.
- `src/chat/ChatComposer.jsx:100-137`: controlled by `value`/`onChange`. `canSend` depends on `value.trim()`;
  Enter/Shift+Enter in `handleKeyDown`; compact and standard layouts; `blocked` covers archived, disconnected and
  limit-reached.

### What to build

- **Composer-owned draft.** `ChatComposer` keeps its own draft state when it is used uncontrolled (no `value` prop),
  and stays fully controlled when `value`/`onChange` are given. This keeps direct host use and its existing tests
  working.
  - In uncontrolled mode it calls `onSend(text)` with its current text and clears the draft only when `onSend` returns
    `true`.
  - In controlled mode the existing `onSend()` contract stays unchanged.
- **Workspace.** Remove the workspace `draft` state. `ChatWorkspace` renders `ChatComposer` uncontrolled:
  - `onSend={(text) => startTurn(text)}`, returning the boolean;
  - the chat-switch reset clears the composer's draft, for example by keying the composer on `chat.id` or another
    explicit reset;
  - the host prefill reaches the composer through a new optional composer prop **`draftRequest`**
    (`{ seq, text }`). When `seq` changes, the composer replaces its draft with `text`. `seq` is a counter, so the same
    text twice applies and focuses twice.
  - The focus effect must still run after the render that shows the prefilled text: keep `focusPending` and the
    counter, but run the focus in a way that sees the new text. The composer can report "applied" through a callback,
    or the workspace can focus on the next frame once the composer has rendered. Whichever you choose, the caret ends
    at the end and a disabled input stays pending as today.
- **No other behaviour changes:** Enter/Shift+Enter, Stop, compact and standard layouts, the blocked and usage-limit
  states, `renderComposerContext` / `renderComposerExtra` / `sidePanel` / `renderAnswerExtra` arguments, the model
  picker, the long-chat notices.
- **Performance contract.** A keystroke must not re-render `ChatWorkspace`. Typing must therefore not set any
  workspace state, call any workspace callback that sets state, or change a context the workspace reads. Do not
  debounce or defer the visible text.

### Required tests (maps Part A)

`tests/chatComposerDraft.test.jsx` (`// @vitest-environment jsdom`, fake socket and `makeApi` conventions of
`tests/chatWorkspace.test.jsx`):
- Typing 20 characters one at a time (`fireEvent.change` per character): spy functions for `sidePanel`,
  `renderAnswerExtra` (with at least one turn), `renderComposerContext` (compact layout) and `renderComposerExtra` are
  not called again after the first keystroke. A render counter on a stub `renderAnswerExtra` stays constant (it
  re-renders only with the thread).
- The typed text is sent exactly (the `send` frame on the fake socket) and the input clears after a successful send.
  When the socket refuses (closed), the text stays.
- `composerPrefill` fills and focuses the input. The same text twice focuses twice. A prefill with `activeChatId`
  switching to another chat fills only the new chat.
- A chat switch clears the draft.
- Direct controlled `ChatComposer` use (`value` + `onChange` + `onSend`) still works.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the tests you wrote or changed — nothing else. Do NOT install
dependencies, touch a lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with
`RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/`push`; leave every change uncommitted. Run only
`node_modules/.bin/vitest run tests/chatComposerDraft.test.jsx` plus any existing test file you changed, from the
target directory, once — your ONLY test run; the Orchestrator's run and the independent review are the gate. Use
explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-26 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer
lenses and `ui_reviewer`; no `sec_review`. Measure before/after in a consumer (keystroke render time on a long Maana
chat) and record it. Publish a minor release and report the version; Maana bumps its pin.

Mapped by the Orchestrator (Claude) on 2026-10-26 against `main` at 3f6e0ff (4.25.0). Contract chosen within the
Envelope: `ChatComposer` is uncontrolled when `value` is absent (`onSend(text)` returns whether it sent); the prefill
arrives through the new optional prop `draftRequest` (`{ seq, text }`).

Execution: codex/gpt-6-luna, one CLI dispatch, banner read back.

Review: lenses plus `ui_review`, one round. The Orchestrator does its own Envelope pass while they run.

Verification:
- the new test, all `chat*` tests, `packageEntries`, `checkKitIntegration` and tsc;
- the CI full suite on `ci-test/UCM-CHAT-13`.

Measurement:
- Before and after in ucm: a harness keystroke benchmark (50 turns, heavy side panel and answer extras) through React
  Profiler render counts and duration, recorded here.
- The consumer measurement on a long Maana chat after the pin bump belongs to the Maana QDA session. The baseline on
  Maana staging (4.25.0) is a median of 780 ms and a maximum of 1,140 ms per keystroke.
