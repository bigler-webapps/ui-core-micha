# MSG-3b — close the MSG-3 parity and contract gaps

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)
**Binding spec:** `django-core-micha/docs/design/messaging-platform.md`. Extends the landed MSG-3
(published ucm 2.16.0), same convention as `MSG-2b` / `NOTIF-8b`.

---

## Part A — Envelope (Expertenchat, 2026-07-31)

### Goal

Close the gaps a three-way audit found after MSG-3 was marked done: capabilities jg has that ucm never
got, capabilities ucm renders but that cannot work against the real backend, and one whole area
(unread lifecycle) that was never specified and therefore never built.

### Why this WO exists — read before scoping anything

MSG-3 shipped with 139/139 tests green, five per-chunk independent reviews and a clean `ui_reviewer`
pass, and still missed all of the below. Two causes, both structural:

1. **Both sides were tested against themselves.** dcm tested its services; ucm tested its components
   against a mock whose API surface mirrors *the provider*, not *the contract*. An endpoint with no
   caller is structurally invisible to that mock. The seam was never executed.
2. **"No jg feature is lost" was made binding without anyone writing the feature list first**, and the
   deviation list that was supposed to prove parity was authored by the same party doing the work.
   It claimed completeness and was wrong.

This WO fixes both: the checklist below **is** the specification, and a contract-conformance test makes
the seam mechanically checkable.

### Capability checklist — this is the specification

Status as of ucm 2.16.0. `OK` = present, no action. `DEV` = deviation already recorded in
`docs/messaging-deviations.md` and deliberately kept. `MISSING` / `BROKEN` / `PARTIAL` = in scope.
`BLOCKED` = needs dcm work first (see Dependencies).

**Every row not marked `OK` or `DEV` must end this WO either implemented or added to the deviation
list with an explicit rationale. No row may be silently dropped.**

#### Unread lifecycle — never specified in MSG-3, never built

| # | Capability | jg reference | Status |
|---|---|---|---|
| 1 | Selecting a conversation marks it read (server + local count) | `MessagesPage.jsx:159-162` | **MISSING** |
| 2 | Opening a conversation auto-marks read | `Thread.jsx:1581` | **MISSING** |
| 3 | Global unread badge decrements by that conversation's prior count | `MessagingContext.jsx:158-169` | **MISSING** |
| 4 | Opening a reply thread marks the thread read | `Thread.jsx:1464-1465` | **MISSING** |
| 5 | Incoming message raises the unread count, but only for non-active conversations | `MessagingContext.jsx:68-71` | **MISSING** |

Row 5 was initially assessed `OK` and corrected by the independent review — the error direction that
matters, since a false `OK` leaves a real gap unfixed. The truth is worse than rows 1–4 suggested:
ucm's unread state does not live-update **at all**. `applyFrame`'s `message` case
(`MessagingProvider.jsx:107-110`) only reconciles `state.messages` and never touches `state.unread`;
`activeConversationId`/`activeIdRef` (`MessagingProvider.jsx:139-146, 311`) is stored and exposed but
never read to gate anything. The badge is populated solely by `refreshUnread()` at mount and on
reconnect (`154-158, 292, 301-304`).

So the unread badge today neither rises on an incoming message nor falls on reading one — it only ever
reflects whatever the server said at mount. Rows 1–5 are one defect, not five nice-to-haves, and they
are the first thing this WO should fix.

#### Message actions

| # | Capability | jg reference | Status |
|---|---|---|---|
| 6 | Action menu on a message (hover icon desktop / long-press mobile / right-click) | `Thread.jsx:855-894` | **MISSING** |
| 7 | Edit own message — inline field, save, cancel | `Thread.jsx:912-949, 1722-1737` | **MISSING** |
| 8 | Edit auto-cancels if the message is deleted elsewhere | `Thread.jsx:1618-1621` | **MISSING** |
| 9 | Delete message — author **or** moderator (`delete_any`) | `Thread.jsx:1744-1768, 2010` | **MISSING** |
| 10 | Delete confirmation dialog | `Thread.jsx:2438-2450` | **MISSING** |
| 11 | Deleting a message being replied-to/edited clears that composer state | `Thread.jsx:1755-1761` | **MISSING** |
| 12 | Copy message text | `Thread.jsx:1770-1777` | **MISSING** |
| 13 | Reply to a message | `Thread.jsx:2016-2022` | OK |
| 14 | Quick-reaction presets | `Thread.jsx:635-649` | DEV (5 presets vs 6) |
| 15 | Full emoji picker for reactions | `Thread.jsx:650-662` | DEV |
| 16 | No action menu on deleted or poll messages | `Thread.jsx:2074` | follows from 6 |

Note on 7/9: `api.js` already has `patchMessage`/`deleteMessage`; neither has ever had a caller. The
provider's local `patchMessage` is a same-named cache reducer — do not mistake it for the API call.

#### Direct conversations

| # | Capability | jg reference | Status |
|---|---|---|---|
| 17 | Launcher to **start** a DM | `MessagesPage.jsx:202-210` | **MISSING** |
| 18 | Recipient picker over a candidate list | `NewDirectMessageDialog.jsx:22-46,74-83` | **MISSING** |
| 19 | Picker loading + empty states | `NewDirectMessageDialog.jsx:71-72,82` | **MISSING** |
| 20 | Start disabled until a person is chosen / while starting | `NewDirectMessageDialog.jsx:96` | **MISSING** |
| 21 | Policy rejection surfaced as a readable message | `NewDirectMessageDialog.jsx:54-58,85-89` | **MISSING** |
| 22 | Fullscreen dialog on small viewports | `NewDirectMessageDialog.jsx:68` | **MISSING** |

`createDirectConversation` exists in `api.js` with no caller. **The candidate list is host-supplied**
(dcm has no user-directory endpoint; jg feeds it from event memberships) — mirror the existing
`groupLaunchers` prop pattern rather than inventing a discovery call. MSG-2b unblocked exactly this
case in the backend and it currently has no client.

#### Threading and quoting

| # | Capability | jg reference | Status |
|---|---|---|---|
| 23 | Replies group under their root | `Thread.jsx:2108-2146` | **BROKEN** — server sends `reply_to_id`, `Thread.jsx:40,62` reads `reply_to`; every server-loaded reply renders as a root |
| 24 | Quoted preview (sender + snippet) above a reply | `Thread.jsx:571-607` | **MISSING** |
| 25 | Click the quote to jump to the original | `Thread.jsx:1997-2005` | **MISSING** |
| 26 | Quote blanks when its source is deleted | `Thread.jsx:149-157` | **MISSING** |
| 27 | Unread-reply dot on the thread toggle | `Thread.jsx:2128-2137` | **MISSING** |
| 28 | Lazy thread fetch on expand / collapse | `Thread.jsx:1435-1486` | OK |
| 29 | Per-thread reply composer | `Thread.jsx:2197-2229` | DEV |

Row 23 is the highest-value single fix in this WO: it makes an already-built feature actually work.

#### Composer

| # | Capability | jg reference | Status |
|---|---|---|---|
| 30 | Shift+Enter newline, Enter sends | `Thread.jsx:1957-1962` | **PARTIAL** — verify and complete |
| 31 | Staged-image preview strip with per-file remove | `Thread.jsx:507-541` | **MISSING** — only a "N attachments selected" caption today |
| 32 | Upload progress indication | `Thread.jsx:2282-2288` | **MISSING** |
| 33 | Client-side image compression before upload (>2 MB → max 2560 px, JPEG q0.85, silent fallback) | `Thread.jsx:304-350` | **MISSING** |
| 34 | Emoji insertion into the message body at cursor | `Thread.jsx:1682-1687` | **MISSING** |
| 35 | Optimistic send, retry on failure, inline error | `Thread.jsx:1856-1931` | OK |
| 36 | Poll button disabled while images are staged | `Thread.jsx:2340-2347` | minor, follows from 31 |
| 37 | Draft text survives a conversation switch | `Thread.jsx:1549-1582` | **do NOT reproduce** — this is a jg bug (unsent text leaks into the next conversation). Record as deliberate non-parity. |

#### Conversation list

| # | Capability | jg reference | Status |
|---|---|---|---|
| 38 | Last-message preview text | `ConversationList.jsx:155` | **BROKEN / BLOCKED** — reads `conversation.last_message?.body`; dcm never sends `last_message` |
| 39 | Relative timestamp (now / m / h / d, localized) | `ConversationList.jsx:24-36` | **MISSING** |
| 40 | Active-row highlight | `ConversationList.jsx:113` | **MISSING** |
| 41 | Unread badge, bold row when unread | `ConversationList.jsx:121,137` | OK |
| 42 | Distinguish managed *all* vs managed *team* | `ConversationList.jsx:68-71` | **decide** — dcm exposes only `kind: managed`; the distinction lives in `external_key`. Either surface it or record the loss |
| 43 | Per-kind row icon | `ConversationList.jsx:39-83` | DEV (generic icons) |
| 44 | Mute / archive | `Thread.jsx:2057-2061` | OK |

#### Timeline

| # | Capability | jg reference | Status |
|---|---|---|---|
| 45 | Auto-scroll to bottom on a new incoming message | `Thread.jsx:1592-1602` | **MISSING** — verify |
| 46 | Announcement deep-link button on a message carrying `link_target` | `Thread.jsx:1142-1146` | **MISSING** — ucm accepts `link_target` on compose but never renders it as an action |
| 47 | Sender name shown in group/managed, suppressed in 1:1 | `Thread.jsx:996-999` | **PARTIAL** — verify; currently unconditional |
| 48 | Deleted tombstone, `(edited)` marker, timestamp | `Thread.jsx:823-827` | OK |

#### Read receipts

| # | Capability | jg reference | Status |
|---|---|---|---|
| 49 | Read tick on own messages | `Thread.jsx:361-400` | OK |
| 50 | Per-recipient read-status detail, gated moderator **and** non-direct | `Thread.jsx:99-101, 2404-2436` | **PARTIAL** — verify tooltip vs jg's popover list; the DM carve-out must hold |

#### Polls — all gated on dcm

| # | Capability | jg reference | Status |
|---|---|---|---|
| 51 | Render question, options, per-option counts | `Thread.jsx:951-1073` | **BLOCKED** — no `serialize_poll` exists; `PollCard` reads fields no endpoint returns |
| 52 | Per-option voter names | `Thread.jsx:1050-1059` | **BLOCKED** |
| 53 | Closed chip, voting disabled once closed | `Thread.jsx:1014-1022` | **BLOCKED** |
| 54 | Option bounds 2–10 in the composer | `Thread.jsx:80-81` | verify |
| 55 | Vote / close | `Thread.jsx:1796-1834` | OK (write path works; read path blocked) |

#### Live synchronisation — gated on dcm

| # | Capability | jg reference | Status |
|---|---|---|---|
| 56 | Reactions sync live to all viewers | `Thread.jsx:1608-1610` | **BLOCKED** — dcm never emits `reaction`; ucm's handler is dead code |
| 57 | Poll updates sync live | `Thread.jsx:1633-1639` | **BLOCKED** — dcm never emits `poll_updated` |
| 58 | Conversation list reorders + preview updates on new/edited/deleted message | `MessagingContext.jsx:54-109` | **BLOCKED** (needs `last_message`) |
| 59 | New message / edit / delete arrive live | `Thread.jsx:1604-1663` | OK — the only three frames dcm actually emits |

### Dependencies — what must land in dcm first

Rows 38, 51–53, 56–58 cannot be built correctly against dcm 2.36.1. They need a dcm work order
(proposed `MSG-2c`) delivering: a poll read contract (design gap — `messaging-platform.md` specifies no
way to read a poll's question, options or results, so the **design must be amended first**), the
missing realtime frames (`services.py` has three `_publish` call sites for twelve designed frames), and
`last_message` on the conversation payload. Do not stub, fake or work around these client-side; leave
them until dcm ships and say so if the sequencing slips.

Everything else in this WO is buildable against dcm 2.36.1 today.

### Chunk plan — the unblocked scope (staged commits, one independent review per chunk)

**In scope now: 39 rows.** Rows marked `OK` or `DEV` need no work; rows 38, 51-53 and 56-58 are
BLOCKED on `MSG-2c` and stay untouched. Everything else is buildable against dcm 2.36.1 today.

| Chunk | Rows | Content |
|---|---|---|
| 1 | 1-5, plus the contract-conformance test | Unread lifecycle end to end: mark-read on select and on open, thread read, global badge decrement, live increment for non-active conversations. Do this first — it is the one outright broken loop, and the conformance test written here guides every chunk after it. |
| 2 | 23-27 | Threading: fix the `reply_to_id`/`reply_to` mismatch (row 23 makes an already-built feature work), then quoted preview, jump-to-original, quote blanking on delete, unread-reply dot. |
| 3 | 6-12, 16 | Message action menu (hover / long-press / right-click), edit, delete with confirmation, copy, and the state-clearing behaviour when a message under edit or reply is deleted. |
| 4 | 17-22 | DM launcher and recipient picker, candidate list host-supplied via a `groupLaunchers`-style prop. |
| 5 | 30-34, 36, 37 | Composer: Shift+Enter, staged-image previews with per-file remove, upload progress, client-side image compression, emoji insertion at cursor. Row 37 is a **record-only** item — do not reproduce jg's draft leak. |
| 6 | 39, 40, 42, 45-47, 50, 54, plus the corrected deviation list | List timestamp and active-row highlight, the managed all-vs-team decision, auto-scroll, announcement deep-link rendering, sender-name suppression in DMs, read-status detail, poll option bounds. Close with the deviation list rewritten against this checklist. |

Rows 45, 47, 50, 54 and 42 are marked verify/decide: look at the code before calling them done in
either direction, and record the outcome in the deviation list rather than leaving it implicit.

**Conformance-test exemptions.** The test from chunk 1 will flag every `api.js` export without a caller.
After this WO wires `markConversationRead`, `markThreadRead`, `patchMessage`, `deleteMessage` and
`createDirectConversation`, three remain unwired: `createManagedConversation`,
`createObjectThreadConversation` and `getMessage`. Each must either get an explicit, reasoned exemption
entry or be removed — an unexplained allowlist entry reintroduces exactly the blind spot this test
exists to close. The frame side of the test compares handlers against **the design's frame list**, not
against what the backend currently emits, so handlers for `reaction` and `poll_updated` are correct and
must not be deleted while `MSG-2c` is outstanding.

### Required tests to WRITE

- **One test per row above that this WO implements.** A capability with no test is not delivered.
  The checklist is the coverage contract.
- **Contract-conformance test (the systemic fix):** fails when a function exported from
  `src/messaging/api.js` has no caller in the provider or a component, and when a realtime frame type
  handled by the provider is not in the design's frame list (or vice versa). This test, existing
  earlier, would have caught rows 7, 9 and 17 (adapter functions with no caller) and rows 56–58 (dead
  handlers for frames the backend never emits) mechanically. It would **not** have caught row 23 — a
  payload field-name mismatch is a different failure shape, and needs the threading regression below.
  Rows 1–5 need their own coverage too: nothing about a missing capability is detectable from export
  wiring alone.
- **Unread lifecycle:** opening a conversation clears its badge and reduces the global count by exactly
  that conversation's prior unread count.
- **Threading regression:** replies delivered by REST **and** by realtime frame group under their root
  — i.e. the test must use a server-shaped payload (`reply_to_id`), not a locally-constructed one. The
  existing tests pass precisely because they use client-shaped objects.
- **Edit/delete permissions:** author may edit own; moderator may delete any; neither affordance renders
  without the capability.
- **DM launcher:** a first-contact DM against a candidate with no prior conversation succeeds
  (the MSG-2b case); a policy rejection renders a readable message.
- Existing ucm suites stay green.

### Deliverables beyond code

- **`docs/messaging-deviations.md` corrected.** Its "Final parity confirmation" section currently claims
  every jg file is represented by an exported surface or a named deviation. That is demonstrably false
  (edit, delete, DM launcher, mark-read, quoting, copy, image compression). Replace the claim with this
  WO's checklist and its per-row outcome.

### Non-goals / do-not-touch

dcm changes (they belong to `MSG-2c`); host-app concerns per design §ucm surface — routing, page
layout, master/detail, scope pickers, deep-link parsing; jg's own code; the jg data migration (MSG-5);
search; typing; client→server WS; the decomposition achieved in MSG-3 — new capabilities land as new
collaborators or in the component that owns them, **not** by growing `Thread` back toward a monolith
(the ~400 LOC soft trigger and the one-harness-entry-per-component rule stay in force).

### Risks

- **The checklist is long and the temptation is to batch.** Rows that get implemented without their
  test are how this WO reproduces MSG-3's failure at a smaller scale.
- **Blocked rows invite workarounds.** Faking a poll payload client-side or synthesising a `reaction`
  frame would hide the dcm gap instead of closing it.
- **`Thread` regrowth**, per non-goals.
- Row 42 and rows 30/45/47/50/54 are marked verify/decide — they need a look at the code before being
  called done either way, not an assumption.

### Reviews

Independent `reviewer` per chunk plus **`ui_reviewer` at WO end**. The WO-end review must check the
corrected deviation list **against this checklist row by row** — the review that signed off the false
completeness claim is the one this WO exists to correct.

### Preconditions

dcm 2.36.1 published (met). Rows marked BLOCKED additionally require `MSG-2c`. Approval Gate #1 =
operator go on this envelope.

### Release

One version bump + npm publish at WO end.

### Execution directive

Implement through `codex exec` in the background — invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file;
fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit. One
invocation per chunk, each chunk left uncommitted for the orchestrator's independent review.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3b.md` in `ui-core-micha` (main), chunk by chunk. `git pull`
first, read the WO + `django-core-micha/docs/design/messaging-platform.md`, then follow
`orchestrate-codex` (Codex-first per chunk, own review per chunk, `ui_reviewer` at WO end, one publish
at WO end). Rows marked BLOCKED stay untouched until `MSG-2c` ships.

---

## Part B — Implementation map (Orchestrator)

To be filled by the Orchestrator session on `git pull`, within the envelope above.

**This section covers chunk 1 only (rows 1-5 + the contract-conformance test). Later chunks get
their own Part B addendum before their `codex exec` invocation.**

### Chunk 1 — unread lifecycle + contract-conformance test

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root — no
`backend`/`frontend` subdir in this repo).

**Files to change:**

- `src/messaging/MessagingProvider.jsx` — the only file with real logic changes.
- `src/messaging/ConversationList.jsx` — one call site addition (row 1).
- `src/messaging/Thread.jsx` — one call site addition (row 2), plus the existing `toggleReplies`
  function is where row 4 (thread-open marks thread read) belongs.
- New test file(s) under `tests/` (see "Required tests" below) — do not touch existing test files
  except where a shared test helper genuinely needs extending.
- `docs/messaging-deviations.md` — not touched this chunk (the doc gets rewritten once, at chunk 6,
  against the full checklist — do not add partial chunk-1 notes here that chunk 6 would have to
  reconcile).

**Already in place, reuse, do not re-invent:**

- `src/messaging/api.js:40-41` already exports `markThreadRead(rootId, readAt)` and
  `markConversationRead(conversationId, readAt)`. Neither has a caller anywhere in the codebase today
  — that's exactly the gap. Do not write new API functions for this; wire the existing ones.
- `MessagingProvider.jsx`'s `DEFAULT_API` object (line 31-36) and the `api` param destructuring must
  both be extended to include `markConversationRead`/`markThreadRead`, following the exact pattern
  every other adapter function already uses (see `archiveConversation`/`setConversationArchived` at
  lines 186-189 for the closest shape: call the API, then update local state from the result).
- `cache.unread` shape (from `EMPTY_CACHE` at line 30): `{ unread_count, by_conversation: { [id]: n } }`
  — this is also dcm's `GET unread-count/` response shape verbatim (design doc line 75).

**Row-by-row implementation guidance (the "how", not literal code — Codex owns the exact shape):**

- **Row 1 (select marks read) + Row 2 (open marks read):** both end up calling the same new provider
  action, e.g. `markConversationRead(conversationId)`, from two different call sites:
  `ConversationList`'s existing `onClick={() => onOpen?.(conversation)}` (around line 61) and a new
  `useEffect` in `Thread` keyed on `conversationId` (mirroring the existing pattern at
  `MessagingProvider.jsx:292`'s `useEffect(() => { if (active) refresh()... }, [active, refresh])`).
  Calling it from both places on the same conversation is expected and must be idempotent — the
  second call should not double-decrement.
- **Row 3 (badge decrements by that conversation's prior count):** this is the exact bug named in the
  envelope's "why it's worse than rows 1-4 suggest" section — the fix must decrement
  `unread.unread_count` by whatever `unread.by_conversation[conversationId]` held *before* this call,
  not reset the badge to some assumed value and not just zero the per-conversation entry without
  touching the global total. Guard against going negative (`Math.max(0, ...)`, matching the existing
  `toggleReaction` clamp pattern at line 253).
- **Row 4 (opening a reply thread marks the thread read):** wire `markThreadRead` from
  `Thread.jsx`'s existing `toggleReplies` function (line 48-53) — call it when a thread is being
  opened (not on collapse). This does not touch `cache.unread` (dcm's design has no described
  per-thread unread projection distinct from the parent conversation's count) — confirm against the
  design doc before assuming otherwise; if thread-level unread turns out to need its own state, that's
  a scope question to flag, not to quietly invent.
- **Row 5 (incoming message raises unread, only for non-active conversations):** the real defect
  described in the envelope — `applyFrame`'s `message` case (line 107-110) never touches
  `state.unread` at all. Fix requires two things: (a) the reducer needs to know which conversation is
  currently active when a frame arrives — `applyFrame`/`messagingReducer` are pure and don't have
  access to `activeIdRef`, so the `dispatch({ type: 'frame', frame })` call in the `subscribe(...)`
  handler (line 293-300) must pass `activeConversationId: activeIdRef.current` alongside the frame,
  and `applyFrame` must accept and use it; (b) do not increment unread for a message that reconciles
  the current user's *own* pending optimistic send (i.e., a `reconcileMessage` match found an existing
  local entry by `client_request_id`) — only a genuinely new incoming message should bump the badge.
  `reconcileMessage` (line 62-72) already knows whether it matched; the frame handler needs that
  signal surfaced, not silently discarded.

**Realtime frame contract note (feeds the conformance test):** the design doc (`messaging-platform.md`
line 155) names twelve frame types. dcm 2.36.1 only ever emits three (`message`, `message_edited`,
`message_deleted` — row 59). The provider already has handlers for `reaction`/`poll_updated` (dead
code until `MSG-2c`, intentionally kept, do not delete — see the WO's conformance-test-exemptions
section) plus `conversation_upsert`/`conversation_archived`/`participant_changed`. Three design frame
types have **no handler at all** and are legitimately out of this chunk's scope: `attachment_ready`
(reserved/deliberately unemitted per the design doc itself), `delivered`, `read_state`,
`thread_read_state` (no row in this WO's checklist requires them — they're a future receipts-sync
work item, not part of rows 1-5's local-count-based unread lifecycle). The conformance test's
frame-side check must not fail on these three/four — give them the same kind of explicit, reasoned
exemption the WO requires for the `api.js` side, not a silent allowlist.

**Contract-conformance test — shape:** a Node-side static-analysis test (vitest still runs in Node;
`fs`/`path` are available even under the `jsdom` test environment) that:
1. Reads `src/messaging/api.js`, extracts every `export function <name>(` — that's the full adapter
   surface.
2. Reads `src/messaging/MessagingProvider.jsx` and every other `src/messaging/*.jsx` component file,
   and checks each exported api function name appears as `api.<name>(` somewhere in that source text.
3. Fails for any export with zero call sites, **except** an explicit, named, reasoned exemption list
   in the test file itself: after this chunk, `createManagedConversation`, `createObjectThreadConversation`
   and `getMessage` remain genuinely uncalled (per the WO's "Conformance-test exemptions" section) —
   list them with a one-line reason each (row 42's managed/team distinction — chunk 6 — may end up
   calling `createManagedConversation`; if it does, remove it from the exemption list then, don't
   leave a stale entry).
4. Separately, reads the frame types handled in `MessagingProvider.jsx` (every `frame.type === '...'`
   literal) and checks each is one of the twelve types the design doc lists at
   `django-core-micha/docs/design/messaging-platform.md:155` — hardcode that list in the test (or read
   the doc file directly with `fs`, either is fine) with the same explicit-exemption treatment for the
   design-listed types this chunk doesn't handle (`attachment_ready`, `delivered`, `read_state`,
   `thread_read_state`).
5. This test is intentionally source-grepping, not behavioral — keep it in its own file
   (`tests/messagingContractConformance.test.jsx` or similar) so its assertions and exemption lists
   stay easy to find and update as later chunks close gaps.

**Required tests to WRITE (chunk 1 scope):**
- The contract-conformance test above.
- Row 1: selecting a conversation in `ConversationList` calls `markConversationRead` for that
  conversation's id.
- Row 2: mounting `Thread` for a conversation calls `markConversationRead` for that conversation.
- Row 3: a regression test asserting the decrement is by the conversation's *prior* count specifically
  — seed `cache.unread` with `{ unread_count: 5, by_conversation: { 12: 2, 7: 3 } }`, mark conversation
  12 read, assert `unread_count === 3` and `by_conversation[12] === 0`, `by_conversation[7]` untouched.
- Row 4: expanding a reply thread calls `markThreadRead` for that root message id.
- Row 5: dispatch a `message` frame for a non-active conversation and assert the badge rises by one;
  dispatch one for the active conversation and assert it does not; dispatch one that reconciles an
  existing optimistic own-message (matching `client_request_id`) and assert it does not double-count.
- Existing ucm suites (139 tests) stay green.

**Invariants / do-not-break:**
- `applyFrame`/`messagingReducer` stay pure functions — no direct API calls or refs inside them; the
  active-conversation-id must be threaded in as data, not read from a ref inside the reducer.
- Don't touch the `reply_to`/`reply_to_id` field-name mismatch (row 23) — that's chunk 2, out of scope
  here even though it's visible in `Thread.jsx` while you're in this file.
- Don't touch `docs/messaging-deviations.md` this chunk.
- Keep the ~400 LOC soft trigger in mind for `MessagingProvider.jsx` — it's already the largest file in
  the package; if this change pushes it meaningfully past that, flag it rather than silently letting it
  grow (splitting unread-lifecycle logic into a co-located reducer/action-creator module is an
  acceptable, non-monolith-regrowing way to keep it manageable, if needed).

**Progress contract:** emit `PLAN: …` once, then a single-line `PROGRESS: [n/total] <action>` before
every relevant action and `… done` on completion, no gap over ~2 minutes, unbuffered stdout, and a
final `RESULT: DONE` or `RESULT: BLOCKED <reason>` line. Do NOT `git add`/`commit`/`push` — leave the
diff for the orchestrator's review. WRITE the tests listed above and run only those to confirm they
execute and pass — do not run the full suite (the orchestrator runs the affected-areas gate after).

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 1 (Part B above). Follow `orchestrate-codex`.

### Chunk 2 — threading and quoting (rows 23-27)

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root).
Runs after chunk 1 is committed (its `markConversationRead`/`markThreadRead`/unread-frame plumbing
already landed; this chunk does not depend on it beyond that both live in the same
`MessagingProvider.jsx`).

**Files to change:** `src/messaging/Thread.jsx` (root/reply grouping, unread-reply-dot state),
`src/messaging/MessageBubble.jsx` (quoted preview rendering, click-to-jump, quote blanking on
delete), new test coverage under `tests/`. Do not touch `docs/messaging-deviations.md` this chunk
(rewritten once, at chunk 6).

**Row 23 — the confirmed bug, verified against the actual dcm serializer
(`django-core-micha/src/django_core_micha/messaging/serializers.py:75`):**
`serialize_message` emits `"reply_to_id": str(message.reply_to_id) if ... else None` — every
REST-loaded or realtime-delivered message carries `reply_to_id`, never `reply_to`. But
`MessagingProvider.jsx`'s own optimistic-send builder (`sendMessage`, the `optimistic` object) sets
`reply_to: payload.reply_to || null` on the **locally-constructed** row — so client-shaped optimistic
messages use `reply_to` and server-shaped messages use `reply_to_id`. `Thread.jsx:40` (`!message.reply_to`
for roots) and `:65` (`item.reply_to === message.id` for replies) only ever check the client-shaped
name, so every server-loaded or WS-delivered reply silently renders as an unattached root — the exact
defect named in the envelope.

Fix by reading **both** shapes wherever a message's parent is checked (`message.reply_to_id ?? message.reply_to`),
not by changing what field name the optimistic builder writes (that's `MessagingProvider.jsx`'s
`sendMessage`, untouched by this chunk — rewriting it risks reopening chunk 1's just-verified
optimistic-message tests for no benefit, since reading both shapes fixes the bug without it). Two call
sites in `Thread.jsx` (root filter, reply filter); check `MessageBubble.jsx` and anywhere else in
`src/messaging/*.jsx` for a bare `.reply_to` read that should also accept `.reply_to_id`.

**Threading regression test (required, named explicitly in the WO):** must use a **server-shaped**
payload — i.e. construct the test message with `reply_to_id`, not `reply_to` — for both the REST-load
path (`listMessages`/`api.js` mock returning `{ ..., reply_to_id: rootId }`) and the realtime-frame
path (`applyFrame`/`dispatch({ type: 'frame', ... })` with a `message` frame payload carrying
`reply_to_id`). The WO is explicit that the existing tests pass "precisely because they use
client-shaped objects" — do not let the new test repeat that mistake.

**Row 24 (quoted preview) + Row 25 (click-to-jump) + Row 26 (quote blanks when its source is
deleted):** `Thread.jsx:66,68` already passes the full root message object as `MessageBubble`'s
`replyTo` prop when rendering a reply row — so `MessageBubble` already receives everything it needs
(sender, body, deleted_at) without a new fetch. Extend the existing `{replyTo && <Typography ...>}`
block (`MessageBubble.jsx:19`) from a sender-only caption into an actual quoted preview: sender name
plus a short snippet of `replyTo.body`/`replyTo.title` (truncate client-side, no new i18n key needed
beyond what's already there unless you introduce a distinct "quote" string — reuse
`MessagingThread.REPLY_TO` if its copy still fits, otherwise add one translation key in all three
locales, following the existing `messagingTranslations.ts` shape). Row 26: if `replyTo.deleted_at` is
set, render a blanked/deleted placeholder in the quote instead of `replyTo.body` (soft-deleted messages
already have `body`/`title` nulled server-side per the design doc — the placeholder text is what needs
adding, the null-safety is already structurally there). Row 25: make the quote block clickable
(`onClick`/`role="button"` or a `Button`, matching `MessageBubble`'s existing MUI-only convention —
see the ui_reviewer's earlier MSG-3 finding on raw `<button>` usage, do not repeat it) and scroll the
original into view — `Thread.jsx` owns the scroll container (`scrollRef`, line 34); the click handler
needs a way to reach a specific message's DOM node from `MessageBubble`, e.g. an `id`/`data-message-id`
attribute on each bubble's root `Paper` plus a callback prop threaded down from `Thread`
(`onJumpToMessage`) that does `scrollRef.current.querySelector(...)?.scrollIntoView(...)`. Keep this
addition in `Thread`/`MessageBubble` only — no new top-level exported component needed, this is
within an existing component's remit, not new decomposition surface.

**Row 27 (unread-reply dot on the thread toggle) — verify data availability before implementing,
this needs the same care as the WO's explicit verify/decide rows even though it isn't tagged one:**
investigated against dcm — `MessageThreadReceipt` (`root,user,last_read_at`) exists as a model
(design doc line 25) and is written by `POST messages/{root_id}/thread/read/`
(`django-core-micha/src/django_core_micha/messaging/services.py:286-289`), but **no GET endpoint or
message-serializer field currently exposes a thread's `last_read_at` or an unread-reply flag/count to
the client** — `serialize_message` (`serializers.py:60-79`) has no such field, and there is no
"list threads with receipt state" endpoint. A true, cross-device-accurate unread-reply dot is
therefore not buildable against dcm 2.36.1 — this is a real (if narrower and previously-unnoticed) gap
of the same shape as the checklist's explicitly-BLOCKED rows, discovered while implementing, not
assumed in advance.

Do not silently drop it and do not fake server data. Two acceptable outcomes, pick one and record it
explicitly in this chunk's summary (for chunk 6's deviation-doc rewrite to pick up verbatim):
(a) build a **session-local, client-only heuristic** — track locally (e.g. a ref/map keyed by root id)
the last time this provider instance called `markThreadRead` for that root in the current session, and
show the dot when a root has replies (`reply_count`/loaded replies) newer than that local marker or
never marked in this session; test it as exactly that — a session-local approximation, not a synced
read receipt — and the deviation-doc entry must say so plainly (no cross-device/cross-tab accuracy
until dcm exposes thread receipt state), or (b) skip implementation and record it as a straight
`BLOCKED`-shaped deviation alongside rows 38/51-53/56-58, with the one-line reason above. Do not spend
this chunk inventing a third option (e.g. guessing at an undocumented endpoint) — the two above are
the only ones consistent with "do not stub, fake or work around blocked capabilities."

**Required tests to WRITE (chunk 2 scope):**
- The threading regression test described above (REST + realtime, both `reply_to_id`-shaped).
- Quoted preview renders sender + snippet for a reply; blanks correctly when the quoted source is
  deleted.
- Click-to-jump scrolls/focuses the original message (test what's observable in jsdom — e.g. that the
  jump handler is invoked with the right message id / that `scrollIntoView` is called on the right
  node — not literal pixel scroll position).
- Row 27's outcome, whichever of (a)/(b) above: if (a), a test proving the session-local dot
  appears/clears correctly; if (b), no test needed but the decision must still be stated in the
  chunk's own summary text.
- Existing ucm suites (chunk-1-inclusive baseline) stay green.

**Invariants / do-not-break:** don't touch chunk 1's unread-lifecycle code paths; don't touch
`docs/messaging-deviations.md`; keep the fix to reading both `reply_to`/`reply_to_id` shapes rather
than changing what the optimistic builder writes; no new top-level `src/index.js` export needed for
this chunk (quoting/jump/dot are internal `Thread`/`MessageBubble` behavior, not new mountable
surfaces) — if you find yourself wanting one, stop and flag it rather than assuming it's warranted.

**Progress contract / preamble:** identical to chunk 1's (see above) — `PLAN:`/`PROGRESS:`/`RESULT:`
lines, no git operations, write-and-run-only-the-new-tests, leave the diff uncommitted.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 2 (Part B above, after chunk 1 is committed). Follow `orchestrate-codex`.

**Chunk 2 outcome record — row 27 (unread-reply dot), for chunk 6's deviation-doc rewrite to copy
verbatim:** **BLOCKED, not implemented.** Verified against dcm 2.36.1
(`django-core-micha/src/django_core_micha/messaging/views.py:302-307`'s `ThreadReadView.post` only
returns the actor's own just-written `last_read_at` from marking a thread read — there is no GET
endpoint or `serialize_message`/`serialize_conversation` field (`serializers.py:60-79`) exposing a
thread's prior receipt state to the client). No truthful unread-reply dot can be rendered — client or
server — without dcm exposing thread receipt state to read, not just write. This is the same shape of
gap as the checklist's already-BLOCKED rows (38, 51-53, 56-58), discovered during chunk 2 rather than
scoped in advance; row 27 should be treated as `BLOCKED` alongside them for any future `MSG-2c`-style
dcm work, not attempted client-side.

### Chunk 3 — message actions: menu, edit, delete, copy (rows 6-12, 16)

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root). Runs
after chunk 2 is committed.

**Files to change:** `src/messaging/MessageBubble.jsx` (action menu, edit-inline UI, delete
confirmation), `src/messaging/MessagingProvider.jsx` (wire the already-existing, never-called
`patchMessage`/`deleteMessage` `api.js` exports — note the provider already has a same-named **local**
reducer action-creator called `patchMessage` at `MessagingProvider.jsx:247`, which is a cache merge
helper, not an API call; do not confuse the two or silently overload the name — expose the new API
call under a distinct name, e.g. `editMessage`/`removeMessage`, and keep the existing local
`patchMessage` cache helper as-is, used internally the way it already is), `src/messaging/Thread.jsx`
or `Composer.jsx` (row 11 — clearing reply/edit state when the message under edit or reply is
deleted), `src/i18n/messagingTranslations.ts` (new copy — menu labels, edit save/cancel, delete
confirm dialog, copy), new tests under `tests/`.

**Already in place, reuse:** `src/messaging/api.js:35-36` exports `patchMessage(messageId, patch)` and
`deleteMessage(messageId)`, both unwired (the two of chunk 1's three originally-named conformance-test
exemptions this chunk closes — remove `patchMessage`/`deleteMessage` from
`tests/messagingContractConformance.test.js`'s `API_EXEMPTIONS` once wired, per the exemption note
already left there). dcm's actual permission logic (verified against
`django-core-micha/src/django_core_micha/messaging/services.py:167-192`): `edit_message` allows the
sender or anyone with `edit_any` in `moderation_rights(...)`; `soft_delete_message` the same with
`delete_any`; editing a deleted message raises; deletion is idempotent (already-deleted is a no-op,
not an error). The PATCH/DELETE endpoints are `django-core-micha`'s
`MessageDetailView` (`views.py:227-235`) — `PATCH messages/{id}/` (`body`/`title`/`link_target` only,
per the design doc's REST table) and `DELETE messages/{id}/`.

**A real gap found while scoping this chunk, needs a decision, not silent assumption:** `serialize_message`
(`django-core-micha/src/django_core_micha/messaging/serializers.py:60-79`) never includes any
per-viewer capability field (no `can_edit`/`can_delete`/`is_moderator`) — moderator status
(`edit_any`/`delete_any`) is resolved server-side from each app's `MessagingPolicy` hook and never
surfaced to the client in any payload this repo has access to. That matches the design doc's stated
model (`messaging-platform.md`: "Event-manager rights map to moderation/config capabities" — i.e.
moderator-ness is host-app domain knowledge, not a generic messaging-REST fact), and mirrors the
existing `allowAnnouncement`/`linkTarget` pattern in `Composer.jsx` (a host-supplied capability prop,
since the client can't compute it itself).

Implement accordingly: the action menu/edit/delete affordances always render for the message's own
sender (`message.sender?.id === currentUser?.id`, matching the existing `canShowReadTicks` pattern in
`Thread.jsx`) **and** additionally for anyone when a new host-supplied capability prop indicates
moderator rights — thread this down from wherever it naturally enters (e.g. a `canModerateMessages`
boolean prop on `Thread`, passed through to `MessageBubble`, defaulting to `false`). The server remains
the actual enforcement (a 403 from a stale/wrong host-side flag must surface as a readable error, not
crash) — client-side gating is UX-only, not the security boundary. Do not invent a REST call to fetch
moderator status that doesn't exist; do not skip the moderator case entirely either (that would silently
drop row 9's "or moderator" half without recording it) — the host-prop approach satisfies both.

**Row 6 (action menu):** MUI `Menu`/`IconButton` triggered by a hover-revealed icon (desktop) — jg
additionally does long-press (mobile) and right-click; matching the WO's general redesign licence
(interaction may be redesigned, capability may not be lost), a plain always-visible-on-hover icon plus
a right-click (`onContextMenu`) handler opening the same menu is sufficient parity; long-press-to-open
context menu on touch is a reasonable **explicit deviation** to record (desktop hover + right-click
covers the capability; a dedicated long-press gesture handler is disproportionate for a MUI-only
component) rather than something to build a custom touch-gesture library for.

**Row 7 (edit) + Row 8 (edit auto-cancels if deleted elsewhere):** inline edit swaps the message body
for a `TextField` with save/cancel, calling the new `editMessage` provider action; row 8 needs the edit
state to react to a live `message_deleted` frame or `messagePatched`/cache update marking the message
deleted while it's being edited — since edit state is local `useState` in `MessageBubble` (or wherever
you put it), watch `message.deleted_at` becoming true (already reactive via props, since
`MessageBubble` re-renders on cache changes) and close the edit UI when it does, rather than polling.

**Row 9 (delete, author or moderator) + Row 10 (confirmation dialog) + Row 11 (deleting a
message under edit/reply clears that composer state):** a `Dialog` confirm before calling the new
`removeMessage` provider action. Row 11: `Composer.jsx`'s `replyTarget` prop and `Thread.jsx`'s
`replyingTo`/edit-in-progress state need to clear if the specific message they reference becomes
deleted — same reactive-to-`deleted_at` approach as row 8, surfaced via the existing
`onReplyTargetChange` callback `Composer` already accepts.

**Row 12 (copy message text):** `navigator.clipboard.writeText(message.body)` from the action menu; no
special test-environment handling needed beyond mocking `navigator.clipboard` in the test (a common,
already-solved jsdom pattern — check whether any existing test in this repo already mocks clipboard
before adding a new mocking approach).

**Row 16 (no action menu on deleted or poll messages):** the menu trigger must not render when
`message.deleted_at` is set (already implied — nothing to edit/delete/copy on a tombstone) or when
`message.kind === 'poll'` (poll messages have their own `PollCard` mutation surface; the WO frames this
as "follows from 6," i.e. a one-line gate on the menu-render condition, not new logic).

**Required tests to WRITE (chunk 3 scope):**
- Action menu renders for the sender; renders for a non-sender only when the moderator capability
  prop is true; does not render for a non-sender/non-moderator; does not render on a deleted or poll
  message.
- Edit: author can edit own message (calls the API with the right payload); edit auto-closes when the
  message's `deleted_at` flips true mid-edit.
- Delete: confirmation dialog gates the actual delete call; author-delete and moderator-delete (via the
  capability prop) both succeed; a non-author/non-moderator never gets the affordance in the first
  place (so there's nothing to test-block client-side beyond "the button isn't there" — don't invent a
  client-side permission-check unit test for a check the server owns).
- Row 11: deleting a message currently targeted by `replyTarget`/edit-in-progress clears that state.
- Copy: clipboard write is called with the message's exact body text.
- Existing ucm suites (chunks 1-2 inclusive) stay green.

**Deliverable note for chunk 6's deviation-doc rewrite:** record two things explicitly — the
long-press-vs-hover/right-click interaction deviation (row 6), and the moderator-capability
host-supplied-prop mechanism (rows 7/9), including that dcm exposes no server-side capability field so
this is inherently a UX-only gate backed by server enforcement, not a security boundary claim.

**Invariants / do-not-break:** don't touch chunks 1-2's code paths; don't rename/repurpose the existing
local `patchMessage` cache-merge action creator in `MessagingProvider.jsx` — add new, distinctly-named
functions for the API calls; keep `docs/messaging-deviations.md` untouched this chunk; keep the
~400 LOC soft trigger in mind for `MessageBubble.jsx` (already grew in chunk 2) — if the menu/edit/
delete UI pushes it over, consider a small `MessageActions`-style co-located subcomponent rather than
letting one file sprawl, but this does not need to become a new top-level exported/index.js surface
unless it's independently useful outside a bubble (it isn't here).

**Progress contract / preamble:** identical to chunks 1-2's — `PLAN:`/`PROGRESS:`/`RESULT:` lines, no
git operations, write-and-run-only-the-new-tests, leave the diff uncommitted.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 3 (Part B above, after chunk 2 is committed). Follow `orchestrate-codex`.

### Chunk 4 — DM launcher and recipient picker (rows 17-22)

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root). Runs
after chunk 3 is committed.

**Files to change:** a new `src/messaging/DirectMessageLauncher.jsx` (or similar name — a new,
independently-exported, independently-mountable component per the WO's decomposition rule, mirroring
`ConversationLaunchers.jsx`'s existing shape rather than folding this into `ConversationList.jsx`),
`src/messaging/MessagingProvider.jsx` (wire the already-existing, never-called
`createDirectConversation` export), `src/index.js` (new export), `dev/entries.jsx` (new harness
entry — binding requirement, not optional), `src/i18n/messagingTranslations.ts`, new tests.

**Already in place, reuse:** `src/messaging/api.js:21` exports `createDirectConversation(payload)` with
zero callers — the exact chunk-1-named gap. Verified against dcm's actual view
(`django-core-micha/src/django_core_micha/messaging/views.py:131-141`, `DirectConversationView.post`):
payload is `{ target_user_id, scope? }` (`scope` optional — omit for the global scope, matching
`open_direct`'s default in `services.py:79-83`). A policy rejection (e.g. `dm_policy` disallows this
pair) surfaces as a plain DRF `PermissionDenied` → generic `{"detail": "..."}` 403
(`views.py:112-113`) — `extractApiErrorMessage` (already in `MessagingProvider.jsx`) already handles
this shape; no new error-parsing logic needed, just a place to render it.

**The candidate list is host-supplied — do not invent a discovery call.** dcm has no user-directory/
membership-listing endpoint (verified: no such view exists in `messaging/views.py`); jg feeds its
picker from event memberships, which is app-specific domain data outside messaging's remit. Mirror the
existing `groupLaunchers` prop pattern (`ConversationLaunchers.jsx:12`, an array of
`{id, label, payload}` the host constructs from its own data) — this component takes a
`candidates` prop (e.g. `[{id, display_name}, ...]`) the host supplies, plus a `scope` value to pass
through to `createDirectConversation`. Do not add a REST call, a search box hitting a nonexistent
endpoint, or any client-side "list users" logic.

**Row 17 (launcher to start a DM):** a button/affordance opening the picker dialog — same placement
convention as `ConversationLaunchers`' existing broadcast/group buttons (this new component can be
rendered alongside `ConversationLaunchers` by a host, or the host may choose to compose them together
in its own layout — do not merge the two components into one, they have independent host-supplied
data shapes and the WO's decomposition rule favors small, single-purpose collaborators).

**Row 18 (recipient picker over the candidate list) + Row 19 (loading + empty states) + Row 20 (start
disabled until chosen / while starting):** a `Dialog` with a list/autocomplete over the `candidates`
prop (a plain MUI `List`/`ListItemButton` selection is sufficient — an `Autocomplete` is also fine if
it fits better, either is within the existing MUI-only convention); "loading" here means the dialog's
own in-flight `createDirectConversation` call (there's no separate candidate-fetch to show a loading
state for, since candidates arrive as a prop already resolved by the host — don't invent a loading
state for data that isn't being fetched by this component); "empty" is an empty `candidates` array.
The start/confirm button is disabled with nothing selected and while the create call is in flight
(mirror `Composer.jsx`'s `sending`-gated `disabled` pattern).

**Row 21 (policy rejection surfaced as a readable message):** on a `createDirectConversation` rejection,
show `extractApiErrorMessage(error)` in an `Alert` inside the dialog (matching every other
messaging-component error pattern in this repo — `ConversationList.jsx`, `Composer.jsx`, etc.), not a
silent failure or a generic toast.

**Row 22 (fullscreen dialog on small viewports):** MUI `Dialog`'s `fullScreen` prop driven by
`useMediaQuery(theme.breakpoints.down('sm'))` — this repo has essentially no existing
`useMediaQuery`/breakpoint usage (noted as a residual risk in the MSG-3 `ui_reviewer` pass, not a
blocker), so this is a legitimate, WO-required first use, not scope creep; keep it scoped to this one
dialog, don't retrofit other components.

**MSG-2b connection (context, not new work):** the WO's envelope notes MSG-2b already unblocked the
backend first-contact-DM case; this chunk is purely the client wiring — no dcm-side work, no
verification of MSG-2b itself needed beyond the payload shape already confirmed above.

**Required tests to WRITE (chunk 4 scope):**
- The DM launcher opens the picker; picker renders the host-supplied candidate list; empty-candidates
  state renders distinctly.
- Start is disabled with no selection and while the create call is pending; enabled once a candidate is
  chosen.
- Selecting a candidate and confirming calls `createDirectConversation` with the right
  `target_user_id`/`scope` and opens the resulting conversation (mirror `ConversationLaunchers`'
  existing `onOpen` callback convention).
- A policy-rejection response renders a readable error in the dialog, does not close it, and does not
  crash.
- `fullScreen` responds to the small-viewport media query (test via mocking `useMediaQuery` or
  `window.matchMedia`, whichever this repo's existing test setup already supports — check
  `tests/setup`/`vitest.config` for an existing `matchMedia` mock before adding a new one).
- Existing ucm suites (chunks 1-3 inclusive) stay green.

**Deliverable note for chunk 6:** this chunk closes the third of chunk 1's three originally-named
conformance-test exemptions (`createDirectConversation`) — remove it from
`tests/messagingContractConformance.test.js`'s `API_EXEMPTIONS` once wired (mirror how chunk 3 already
removed `patchMessage`/`deleteMessage`).

**Invariants / do-not-break:** don't touch chunks 1-3's code paths; keep
`docs/messaging-deviations.md` untouched this chunk (chunk 6 rewrites it once); this is new
decomposition surface, so it DOES need a `src/index.js` export and a `dev/entries.jsx` harness entry
(unlike chunks 2-3's internal-only changes) — don't skip either.

**Progress contract / preamble:** identical to chunks 1-3's — `PLAN:`/`PROGRESS:`/`RESULT:` lines, no
git operations, write-and-run-only-the-new-tests, leave the diff uncommitted.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 4 (Part B above, after chunk 3 is committed). Follow `orchestrate-codex`.

### Chunk 5 — composer: shortcuts, previews, progress, compression, emoji (rows 30-34, 36, 37)

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root). Runs
after chunk 4 is committed.

**Files to change:** `src/messaging/Composer.jsx` (all six rows land here — it's the composer, not new
decomposition surface, so no new `src/index.js` export or harness entry needed, just editing the
existing mounted component), `src/i18n/messagingTranslations.ts`, new tests. `docs/messaging-deviations.md`
untouched this chunk.

**Row 30 (Shift+Enter newline, Enter sends — currently PARTIAL, verify and complete):** the `TextField`
at `Composer.jsx:94` is a bare `multiline` field with no `onKeyDown` handler at all — Enter currently
just inserts a newline (native textarea behavior), it does not submit. Add an `onKeyDown` that submits
on plain `Enter` (calling the existing `submit()` function) and allows the default newline behavior on
`Shift+Enter` (do not `preventDefault` in that branch). Guard against submitting on IME composition
(`event.nativeEvent.isComposing`) if you want to be thorough, but the WO's minimum bar is the
Enter-sends/Shift+Enter-newline split itself.

**Row 31 (staged-image preview strip, per-file remove — currently only a "N attachments selected"
caption):** replace/extend the `files.length > 0` caption at `Composer.jsx:88` with a horizontal strip
of thumbnails for image files (`file.type.startsWith('image/')` — use `URL.createObjectURL(file)`,
matching the existing revoke-on-cleanup pattern already used in `AttachmentList.jsx:15-25` for
downloaded thumbnails, don't leak object URLs) plus a filename chip for non-image files, each with a
small remove (×) control that splices that one file out of the `files` state array. Keep the existing
"N attachments selected" caption as a fallback/count label if useful, or replace it entirely with the
strip — either is fine, the capability (see what's staged, remove one) is what's required.

**Row 32 (upload progress indication):** `sendAttachments` (`MessagingProvider.jsx`) calls
`api.uploadAttachments(conversationId, formData, {...})`, which goes through `apiClient` (axios) —
axios requests support an `onUploadProgress` callback. Check `src/messaging/api.js:32`
(`uploadAttachments`) and `src/auth/apiClient.jsx` for how request config is threaded through, and
whether adding an `onUploadProgress` option is a small, additive change to `uploadAttachments`'s
signature/config (it should be — axios accepts it in the request config object) versus something that
needs a larger plumbing change. If threading real byte-progress through turns out to require touching
several layers disproportionately, an indeterminate `CircularProgress`/`LinearProgress` shown for the
duration of the upload (already-existing `sending` state) is an acceptable minimum — but attempt real
progress first since the WO names it explicitly and the axios hook is a small addition, not a redesign.

**Row 33 (client-side image compression, >2MB → max 2560px, JPEG q0.85, silent fallback):** verified
against dcm — the server's own limit is 25MB (`django-core-micha/src/django_core_micha/messaging/attachments.py:23`,
`MAX_ATTACHMENT_SIZE`), so this compression is purely a client-side bandwidth/upload-time optimization,
not required for the server to accept anything; a compression failure must silently fall back to the
original file (never block or corrupt the send) exactly as the WO's row text specifies. Implement via
canvas: draw the image onto a `<canvas>` scaled down so its longest edge is ≤2560px (skip entirely if
already smaller), then `canvas.toBlob(callback, 'image/jpeg', 0.85)`, wrap in a promise, and only
apply this to files over 2MB (`file.size > 2 * 1024 * 1024`) and of an image MIME type — non-image
files and images ≤2MB pass through unchanged. Wrap the whole compression attempt in try/catch (or a
promise `.catch`) that resolves to the original `File` on any failure (canvas/image-decode errors,
unsupported format, etc.) — this is the "silent fallback" the WO requires, not optional robustness.

**Row 34 (emoji insertion into the message body at cursor):** an emoji picker button next to the
existing attachment/poll/announcement `IconButton`s in `Composer.jsx:89-93`, inserting the picked
emoji into `body` at the current cursor position (track/read `TextField`'s underlying `<textarea>`
`selectionStart`/`selectionEnd` via a ref, splice the emoji in, then restore focus/cursor position
after the emoji). Row 15 (`ReactionBar.jsx:8`, `QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀']`) already
established this package's precedent of a small fixed emoji set rather than a full picker library
(recorded as an accepted `DEV` deviation from jg's `EmojiPickerButton.jsx` in the existing deviation
doc) — reuse that same small-set convention here for consistency rather than introducing a different
emoji selection UI or a new picker dependency; a `Menu`/`Popover` of the same or a similarly-sized
curated emoji set opened from the new button is sufficient. Don't add a new npm dependency for this.

**Row 36 (poll button disabled while images are staged) — trivial, follows from row 31:** once row 31's
staged-file state exists, add `disabled={pollOpen indicator || files.some(f => f.type.startsWith('image/'))}`-style
gating to the existing poll `IconButton` (`Composer.jsx:92`) — a one-line condition addition, not new
logic; verify against the WO's exact framing (jg disables poll-composing while images are staged,
presumably because a message can't carry both a poll and attachments in one send) before wiring it,
i.e. confirm this is really about mutual exclusivity of poll vs. attachment in a single send (check
`send_message`/`create_conversation` service logic in dcm if the reasoning isn't obvious from the
existing chat-send code path) rather than assume the reason without checking.

**Row 37 (draft text does NOT survive a conversation switch — explicit non-goal, jg bug, do NOT
reproduce):** confirm current behavior already satisfies this (a fresh `Composer` mount per
`conversationId` via React's key/prop change naturally resets local `useState` — check whether the
host's typical usage pattern, e.g. a `key={conversationId}` on `Composer` or equivalent remount, is
already implied elsewhere in this codebase, or whether `Composer`'s `body`/`files` state could
persist across a `conversationId` prop change without a remount). If `Composer` is typically kept
mounted while `conversationId` changes (rather than remounted), add an effect resetting `body`/`files`
when `conversationId` changes, so unsent text never leaks into the next conversation — this is a
one-line fix if needed, not a redesign. No test is required if you confirm the existing remount pattern
already prevents this (document which is true in your chunk summary), but if you add the reset effect,
test it.

**Required tests to WRITE (chunk 5 scope):**
- Row 30: Enter submits (with body present); Shift+Enter inserts a newline without submitting.
- Row 31: staged images render a preview strip; removing one via its control drops it from the
  eventual submitted `FormData`/`files[]` without affecting the others.
- Row 32: an in-flight upload shows progress (whichever form — byte-percentage or indeterminate,
  matching whichever you implemented); test what's actually observable (e.g. an `onUploadProgress`
  callback firing and updating visible state, or the indeterminate indicator rendering during
  `sending`).
- Row 33: a file over 2MB is compressed (mock canvas/`toBlob` — check whether this repo's existing test
  setup already provides a canvas/image mock before adding a new one) before being included in the
  upload's `FormData`; a compression failure still results in the original file being sent, not a
  blocked/broken send.
- Row 34: picking an emoji inserts it into `body` at the cursor position (not just appended to the
  end — construct a test with a non-trivial cursor position to actually prove insertion-at-cursor, not
  insertion-at-end, which would pass a weaker test trivially).
- Row 36: poll button is disabled once an image is staged, enabled again once removed.
- Row 37: either a passing test proving draft state doesn't leak across a `conversationId` change, or
  (if you conclude the existing remount pattern already prevents it) no new test, but state that
  conclusion explicitly in your chunk summary.
- Existing ucm suites (chunks 1-4 inclusive) stay green.

**Invariants / do-not-break:** don't touch chunks 1-4's code paths; keep `Composer.jsx` component
cohesive — if this chunk pushes it meaningfully past the ~400 LOC soft trigger, a small co-located
helper module (e.g. `composerImageCompression.js` for the canvas logic, kept internal/unexported) is an
acceptable way to manage size without violating the no-new-top-level-surface rule (it's not a new
mountable component, just an extracted pure function); flag rather than silently letting one file
sprawl if it happens anyway. No new npm dependency for the emoji picker (row 34) or anything else in
this chunk — everything here is buildable with existing MUI + native browser APIs (canvas, axios
progress hooks).

**Progress contract / preamble:** identical to chunks 1-4's — `PLAN:`/`PROGRESS:`/`RESULT:` lines, no
git operations, write-and-run-only-the-new-tests, leave the diff uncommitted.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 5 (Part B above, after chunk 4 is committed). Follow `orchestrate-codex`.

### Chunk 6 — list polish, timeline polish, receipts, poll bounds, and the deviation-doc rewrite (rows 39, 40, 42, 45-47, 50, 54)

**Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha` (repo root). Runs
after chunk 5 is committed. This is the WO's last content chunk — after it lands, the WO-end
`ui_reviewer` pass and the version-bump/publish are the only remaining steps.

**Files to change:** `src/messaging/ConversationList.jsx` (rows 39, 40, 42), `src/messaging/Thread.jsx`
+ `src/messaging/MessageBubble.jsx` (rows 45, 46, 47), `src/messaging/ReadTicks.jsx` (row 50),
`src/messaging/Composer.jsx` (row 54), `src/i18n/messagingTranslations.ts`, new tests, and finally
**`docs/messaging-deviations.md` — rewritten once, at the end of this chunk**, against the WO's full
checklist (this is the deliverable the WO's envelope calls out as correcting MSG-3's false completeness
claim).

**Row 39 (relative timestamp, localized) + Row 40 (active-row highlight):** `ConversationList.jsx`
currently renders no timestamp at all (`ListItemText`'s `secondary` is the last-message preview only).
Add a relative-time label ("now"/"5m"/"3h"/"2d") next to or under the title, computed from
`conversation.last_message_at`, using the browser-native `Intl.RelativeTimeFormat` (locale-aware,
zero new dependency — this repo has no existing relative-time helper to reuse, don't add a date
library for this). For row 40: `ListItemButton` already sets `selected={conversation.id ===
activeConversationId}` (`ConversationList.jsx:61`) — MUI's `selected` prop does apply a background
highlight by default, so verify in the rendered/test DOM whether this is actually visually
distinguishable (check the applied `Mui-selected` class is present) before assuming it needs new work;
if the existing `selected` wiring already produces a real highlight, this row may already be `OK` and
should be recorded as such rather than reimplemented — don't add redundant styling on top of something
that already works, verify first.

**Row 42 (managed *all* vs. managed *team* — decide, not build):** verified against dcm — the
`Conversation` model has `external_key` (`django-core-micha/src/django_core_micha/messaging/models.py:86`),
which is where jg's all-vs-team distinction lives, but `serialize_conversation_core`
(`serializers.py:106-113`) never includes `external_key` in any REST response. This field genuinely
cannot be surfaced client-side without a dcm change (out of this WO's scope — dcm changes belong to a
future `MSG-2c`-style order). **Decision: record as a deviation, do not attempt to guess the
distinction from `title` text or any other client-visible field.** This is a `decide` row, and the
decision is: not buildable against dcm 2.36.1, closest in shape to the already-BLOCKED rows.

**Row 45 (auto-scroll to bottom on a new incoming message — verify, currently missing):** `Thread.jsx`'s
scroll container (`scrollRef`, line 34) has no effect reacting to new messages arriving in `roots`. Add
one: on a new message appended to the active conversation, scroll to bottom — but gate it on the user
already being near the bottom before the new message arrived (e.g. `scrollHeight - scrollTop -
clientHeight` under some small threshold), so a user scrolled up reading history doesn't get yanked to
the bottom by an unrelated new message. This nuance isn't explicit in the WO's one-line row text but is
standard chat-UI behavior and avoids a real usability regression — implement it, and note the
near-bottom gating as a considered addition in your chunk summary (not silently assumed).

**Row 46 (announcement deep-link button, `link_target` accepted on compose but never rendered as an
action):** `MessageBubble.jsx` has no rendering for `message.link_target` at all currently. Add a
button/link shown when `!deleted && message.kind === 'announcement' && message.link_target` — but the
link's *destination handling* is host-app routing (same reasoning already established for
`resolveLink` on `NotificationBell` elsewhere in this package), so this needs a host-supplied callback
prop threaded `Thread` → `MessageBubble` (e.g. `onAnnouncementLink(linkTarget)`), not a hardcoded
`window.location`/`<a href>` navigation. Without a host callback supplied, render nothing extra (no
broken/no-op link) rather than a non-functional button.

**Row 47 (sender name shown in group/managed, suppressed in 1:1 — PARTIAL, currently unconditional):**
`MessageBubble.jsx:31` (`senderName(message)`) renders unconditionally. `Thread.jsx` already has
`conversation` in scope (line 40) but doesn't pass it to `MessageBubble` — thread it through (a new
`conversation` prop on `MessageBubble`, alongside the existing `replyTo`/`onReply`/etc.) and suppress
the sender-name line when `conversation?.kind === 'direct'` (matches jg's 1:1 convention: in a two-
person DM, whose message it is is already visually implied by side/alignment in most chat UIs, or at
minimum isn't worth repeating every bubble — since this package doesn't currently do left/right
alignment by sender, keep the bubble layout as-is and just suppress the redundant name text for DMs,
which is the capability the row asks for, not a new alignment scheme).

**Row 50 (per-recipient read-status detail, gated moderator + non-direct — PARTIAL, verify tooltip vs.
jg's popover list):** `ReadTicks.jsx` already correctly gates the DM carve-out (`conversation?.kind ===
'direct' ? null : status.recipient_detail`, line 20) — **this part is already correct, do not touch
the gating logic.** What's flagged PARTIAL is the *presentation*: a hover-only MUI `Tooltip` (line 22)
is not touch/keyboard accessible the way jg's popover list is — a moderator on a touch device cannot
see who read a message at all today. Convert to a click-to-open `Popover`/`Menu` showing the recipient
names as a proper list (anchored on the existing `Typography` trigger), keeping the same content
(`detailText`/aggregate `label`) — this is an interaction-fidelity fix, not new data plumbing.

**Row 54 (poll option bounds 2-10 in the composer — verify):** dcm's server-side validation
(`django-core-micha/src/django_core_micha/messaging/serializers.py:27`,
`PollInputSerializer.options`) only enforces `min_length=2`, no maximum — the "2-10" bound is a
client-only UX guard (jg's convention), not a server contract. `Composer.jsx`'s poll dialog
(`pollOptions` state, `setPollOptions((current) => [...current, ''])`) currently allows unlimited
options. Cap at 10: disable/hide the "Add option" button once `pollOptions.length >= 10`, and keep the
existing minimum-2 validation as-is (already correct).

**Deliverable: `docs/messaging-deviations.md` rewritten once, at the end of this chunk.** The WO's
envelope is explicit that the doc's current "Final parity confirmation" section overclaims completeness
and must be replaced with an honest, row-by-row account against this WO's full checklist (all 59 rows,
not just chunks 1-6's 39 unblocked ones) — every row gets one of: `OK` (unchanged from before this WO,
or newly landed), `DEV` (deliberate deviation with rationale — carry forward the existing ones from
chunks 2/3/4/5 plus this chunk's row 6/42/47/50 interaction deviations), or `BLOCKED` (rows 38, 51-53,
56-58, plus row 27's now-recorded BLOCKED outcome from chunk 2, plus row 42's newly-recorded BLOCKED
outcome from this chunk). This is the single most important deliverable of the whole WO per its own
"why this WO exists" framing — do not compress it into a vague summary; go row by row, referencing the
row number from the checklist in `work-orders/MSG-3b.md` Part A.

**Correction from chunk 5's independent review, apply when writing row 36's deviation-doc entry:**
chunk 5's guidance above (row 36 section) speculated the poll-disabled-while-images-staged gate exists
"presumably because a message can't carry both a poll and attachments in one send." That premise is
**not** true — verified against dcm's `services.py`: `send_message` and `create_poll` are always two
structurally separate `Message` rows created via two separate API calls; there is no combined send that
could carry both, so there is no server-side mutual-exclusivity constraint. The gate is real and kept
(it's harmless UX convenience matching jg), but its deviation-doc rationale must say **"UI convenience,
matching jg's composer behavior — no dcm-side constraint requires it,"** not the unverified premise
above. Do not restate the wrong reasoning as fact — this is exactly the failure mode ("claimed
completeness/reasoning without checking the seam") this WO exists to correct.

**Required tests to WRITE (chunk 6 scope):**
- Row 39: relative-timestamp rendering for a few representative ages (just-now, minutes, hours, days).
- Row 40: only if genuinely fixing something (see the verify-first note above) — otherwise state the
  `already OK` conclusion in your summary instead of a padding test.
- Row 45: a new message in the active conversation while scrolled near the bottom triggers a scroll-to-
  bottom call; while scrolled away from the bottom, it does not (assert the scroll call, not real
  jsdom layout, which has no real scroll metrics — mock `scrollHeight`/`scrollTop`/`clientHeight` on
  the container the way this environment's other scroll-adjacent tests already do, if any precedent
  exists, otherwise establish a minimal one here).
- Row 46: the announcement link button renders only when a host callback is supplied and
  `link_target` is present; clicking it calls the host callback with the right value; absent either
  precondition, nothing extra renders.
- Row 47: sender name renders in a group conversation, is suppressed in a direct conversation.
- Row 50: the recipient-detail control is click-openable (not hover-only) and still respects the DM
  carve-out (no detail control rendered/openable at all for a direct conversation, even for a
  moderator) — this is a regression test for existing correct behavior, not just new UI.
- Row 54: the "add option" control disables/hides at 10 options; existing 2-minimum validation stays
  covered by its current test (don't duplicate, just don't break it).
- Existing ucm suites (chunks 1-5 inclusive) stay green.

**Invariants / do-not-break:** don't touch chunks 1-5's code paths beyond the specific additive props
described above (`conversation` on `MessageBubble`, `onAnnouncementLink` threading); don't invent a
managed-all-vs-team distinction client-side (row 42's decision is BLOCKED/deviation, not a guess); keep
the ~400 LOC soft trigger in mind across `Thread.jsx`/`MessageBubble.jsx`/`ConversationList.jsx` — this
chunk touches all three, watch for any of them growing past the trigger and flag rather than silently
letting it happen.

**Progress contract / preamble:** identical to chunks 1-5's — `PLAN:`/`PROGRESS:`/`RESULT:` lines, no
git operations, write-and-run-only-the-new-tests, leave the diff uncommitted.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3b.md` chunk 6 (Part B above, after chunk 5 is committed) — the WO's last content
chunk. Follow `orchestrate-codex`; after this chunk's independent review and commit, run the WO-end
`ui_reviewer` pass (checking the rewritten deviation doc against the full checklist row by row per the
WO's "Reviews" section), then one version bump + npm publish.
