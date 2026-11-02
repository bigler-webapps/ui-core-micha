# UCM-CHAT-15 — Composer start signal and one catalogue request per shown chat

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`); additive API (a new optional prop) plus a request-pattern
change every consuming app sees.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Builds on:** UCM-CHAT-13 (composer-local draft, 4.26.0), UCM-CHAT-14 (layout isolation, 4.27.0/4.27.1).
**Consumers:** maana (MAANA-WEBPERF-9 waits for it), cockpit, hram, survey_app with their next pin bump.

### Goal and expected outcome

MAANA-WEBPERF-9 moves the assistant's context-size request off chat load: it must be computed "when the person is
about to send", so the "context too large" warning appears before sending, not after a refused send. `ChatWorkspace`
gives the host no moment for that: `getSendContext` runs only at send time, too late to warn, and the draft lives in
the composer since UCM-CHAT-13, invisible to the host. The same WEBPERF-9 analysis found `ChatWorkspace` requesting
the model catalogue twice when a chat opens: a general catalogue at start (`ChatWorkspace.jsx` start effect) and then
the chat's own (`refreshCatalogue(chat.id)`). Expected outcome: the host learns when someone starts composing, and a
shown chat costs one catalogue request.

### Settled decisions (operator, 2026-11-02)

1. **Composer start signal:** a new optional `ChatWorkspace` prop (a callback) tells the host that the person started
   composing in a chat, with that chat's id. It fires when the composer of a chat gains focus and when its draft
   changes from empty to non-empty; it never fires per keystroke. Without the prop, behaviour is unchanged.
2. **Typing stays free:** the signal must not bring back what UCM-CHAT-13 and UCM-CHAT-14 removed: no re-render of the
   workspace or the thread per keystroke, and the composer-local draft stays local.
3. **One catalogue request per shown chat:** when a chat is shown, only that chat's catalogue is requested; the general
   catalogue is requested only while no chat is shown (for example the empty state or a new chat before it exists).
   Refreshing when the model picker opens stays as it is. The protection added with UCM-CHAT-12 stays: a general
   catalogue never drives a chat's stored selection, and a slow answer for a chat that was left never overwrites the
   active one.
4. Maana uses the signal in MAANA-WEBPERF-9 (requests the context size, cached per grants revision); that wiring is
   Maana's order, not this one.

### Scope and acceptance

`src/chat/ChatWorkspace.jsx`, `src/chat/ChatComposer.jsx` (where the focus/draft transition is observed), their
tests; CHANGELOG and README/prop documentation for the new prop; a minor version (additive). Accepted when the tests
below pass, the CHAT-13/14 typing tests stay green, and Maana staging after the pin bump shows one catalogue request
per opened chat.

### Non-goals and do-not-touch

The model picker's appearance and content, `getSendContext` and the send frame, the composer layout and autosize,
host slot APIs other than the new prop, the catalogue endpoint contract (dcm).

### Required tests to write

Signal fires once on first focus and once on an empty-to-non-empty draft change, with the chat id; not on further
keystrokes; again after the draft was cleared (sent or emptied) and composing starts anew; not at all without the
prop. Typing still causes no workspace re-render (existing CHAT-13 test kept). Catalogue: start with a chat to show
-> exactly one catalogue request, scoped to that chat; start without a chat -> exactly one general request; switching
chats -> one request for the new chat; picker open still refreshes; a late answer for a left chat is dropped
(existing test kept).

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ChatWorkspace.jsx`, `src/chat/ChatComposer.jsx` and new `tests/chatComposeStartCatalogue.test.jsx`; you may
adjust existing chat tests only where they assert the old double catalogue request (say which and why in your final
report). No other file (no README, CHANGELOG, package files, lockfile, register, `dev/**`, no new exports in
`src/entries/*.js`).

### Seams (verified against `main` at 1c996ed, 4.27.1)

- `src/chat/ChatWorkspace.jsx`:
  - `:139-153` `refreshCatalogue(chatId)`: newest-request-wins through `catalogueRequest`; `catalogueFor` /
    `setCatalogueChatId` record which chat the catalogue belongs to; a failed chat load clears the catalogue.
  - `:205-238` the parallel start (UCM-CHAT-8): status, a general `api.getCatalogue()` (`:210`) and the lists start
    together; on `available` the start sets `catalogue` from the general answer (`:224-233`).
  - `:240` `useEffect(() => { if (chat?.id !== undefined) refreshCatalogue(chat.id); }, [chat?.id, …])`, the chat's own
    request.
  - `:241` the refresh when the picker opens.
  - `:309` the refresh after a turn frame.
  - `:399-407` the fallback that may store a selection; it only acts when `catalogueChatId === chat.id`, which is the
    "general catalogue never drives a chat's selection" protection.
  - `:525-533` `<ChatComposer …>`; `activeChatId` is a prop (the host's chosen chat; `null` means no chat,
    `undefined` means the workspace chooses).
- `src/chat/ChatComposer.jsx`:
  - the composer-local draft from UCM-CHAT-13 (`internalDraft`, `changeDraft`, the clear after a successful
    `onSend`, `draftRequest`);
  - the input is the MUI `TextField` in both layouts.

### What to build

1. **Start signal.**
   - New optional `ChatWorkspace` prop **`onComposeStart({ chatId })`**. `ChatWorkspace` hands `ChatComposer` a new
     optional prop **`onComposeStart()`**, a stable function that calls the host's latest callback with the shown
     chat's id. Read the host prop through a ref, so neither a new host function nor the signal re-renders the
     workspace.
   - `ChatComposer` calls it:
     - when its input gains focus, once until the draft is cleared again;
     - when its draft changes from empty (after trimming nothing, i.e. `''`) to non-empty.
   - Both triggers re-arm when the draft becomes `''` again (after a successful send or when emptied by the person).
   - Never per keystroke; no calls without the prop.
   - No workspace state is set by the signal, and typing must still not re-render the workspace (UCM-CHAT-13
     performance contract).
2. **One catalogue request per shown chat.**
   - The general catalogue is requested only while no chat is shown.
   - At start: keep the parallel general request only when the host's `activeChatId` is `null`/`undefined` and no chat
     will be opened from it. When `activeChatId` names a chat, skip the general request; the chat's own request at
     `:240` provides the catalogue once the chat is shown.
   - If the requested chat cannot be shown (unloadable), or the shown chat is closed (archived, deleted, `null`
     chosen), request the general catalogue then, once per such period.
   - Keep newest-request-wins, the "left chat's late answer is dropped" protection, the picker-open refresh, the
     after-turn refresh and the selection-fallback guard exactly as they are.

### Required tests (maps Part A)

`tests/chatComposeStartCatalogue.test.jsx` (`// @vitest-environment jsdom`, fake socket and `makeApi` conventions of
`tests/chatWorkspace.test.jsx` / `tests/chatComposerDraft.test.jsx`):
- **Start signal:**
  - first focus calls `onComposeStart` once with `{ chatId }`;
  - the first character calls it once more, and further characters do not;
  - clearing (successful send, or deleting the text) re-arms both triggers;
  - without the prop, nothing is called and nothing breaks;
  - typing with the prop set does not re-render the workspace (render counter on `renderAnswerExtra`/`sidePanel`, as in
    `chatComposerDraft.test.jsx`).
- **Catalogue:**
  - `activeChatId` set at start: exactly one `getCatalogue` call, with `{ chat: <id> }`;
  - no `activeChatId` and no chat shown: exactly one call, general;
  - switching chats: one call for the new chat;
  - the picker opening still refreshes;
  - an unloadable `activeChatId` leads to one general request;
  - the existing late-answer test stays green.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the tests you wrote or changed — nothing else. Do NOT install
dependencies, touch a lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with
`RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/`push`; leave every change uncommitted. Run only
`node_modules/.bin/vitest run tests/chatComposeStartCatalogue.test.jsx` plus any existing test file you changed, from
the target directory, once — your ONLY test run; the Orchestrator's run and the independent review are the gate. Use
explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-11-02 in the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce).
Tier 3: all reviewer lenses, `ui_reviewer` (frontend). Release by push (publish-from-main); report the version to the
Maana Expertenchat, which then lets MAANA-WEBPERF-9 bump the pin and wire the signal.

Mapped by the Orchestrator (Claude) on 2026-11-02 against `main` at 1c996ed (4.27.1).

Choices made within the Envelope:
- prop name `onComposeStart({ chatId })` on `ChatWorkspace`, and `onComposeStart()` on `ChatComposer`;
- the general start catalogue is kept only when no `activeChatId` names a chat.

Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. If the auto-mode classifier refuses the dispatch,
report that to the Expertenchat before implementing as author.

Review: lenses plus `ui_review`, one round. The Orchestrator does its own Envelope pass while they run.

Verification:
- the new test, all `chat*` tests, `packageEntries`, `checkKitIntegration` and tsc;
- the full suite on `ci-test/UCM-CHAT-15`.

README chat section, CHANGELOG, minor version by the Orchestrator.

Launch evidence: 2026-11-02, model gpt-6-luna, reasoning high, session 01a19ccd-a47f-7931-9d1e-89223e53aaaa. The auto-mode
classifier did not refuse this dispatch. `RESULT: BLOCKED`, only because its single test run had 3 expectation
mismatches that it fixed without a rerun. Assigned files only, no commit.

Orchestrator after the implementer:
- fixed one remaining test bug: `findAllByRole` resolved before the second workspace's composer existed;
- review fix: closing a chat whose own catalogue request failed now requests the general catalogue (a `chatWasShown`
  ref replaces the `catalogueFor` check), with a test;
- README, CHANGELOG, version 4.28.0.

Orchestrator's Envelope pass (before the lens results): complete; one side effect is that the general start catalogue
now sets state through `refreshCatalogue` even when the status is not available, which is not visible; nothing
missing.

Review, first pass: 1 raised (envelope R1 = regression R1, deduplicated), 1 accepted, fixed.

Single re-run, which closes the round:
- duplication R1 was not accepted: in the unloadable path the general request starts in the same tick before
  `setChat(null)`; newest-request-wins and the guard make this harmless.
- ui U1 was accepted and carried, deliberately not fixed. While no chat is shown, a change of `api` does not request
  the general catalogue again; for `scope` there is no effect, because the catalogue is not scope-dependent.
