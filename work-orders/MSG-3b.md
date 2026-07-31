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
