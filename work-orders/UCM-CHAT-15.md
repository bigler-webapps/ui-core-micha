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

Placeholder — filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-11-02 in the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce).
Tier 3: all reviewer lenses, `ui_reviewer` (frontend). Release by push (publish-from-main); report the version to the
Maana Expertenchat, which then lets MAANA-WEBPERF-9 bump the pin and wire the signal.
