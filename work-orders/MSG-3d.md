# MSG-3d — the last two blocked rows: unread-reply marker and managed-conversation identity

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)
**Binding spec:** `django-core-micha/docs/design/messaging-platform.md` — §"Thread reply state and
managed-conversation identity" and §Realtime's consumer obligation. Extends the landed MSG-3c
(published ucm 2.18.0), same convention as `MSG-2b` / `MSG-3b` / `MSG-3c`.

---

## Part A — Envelope (Expertenchat, 2026-08-01)

### Goal

Deliver checklist rows **27** and **42** — the last two entries still marked BLOCKED in
`docs/messaging-deviations.md`. dcm 2.38.0 (MSG-2d) shipped the contract they were waiting for, on the
same day MSG-3c closed. After this WO the deviation doc has **zero** BLOCKED entries.

### Verified deliverable against dcm 2.38.0

Checked in `django-core-micha` before this WO was written (`serializers.py`):

| Row | Was blocked on | Present in 2.38.0 |
|---|---|---|
| 27 | no readable thread reply state | `reply_count` + `last_reply_at` on `serialize_message` (viewer-independent), `thread_last_read_at` added REST-only |
| 42 | `external_key` not serialized | `external_key` on `serialize_conversation_core` |

### Expected outcome

**Row 27 — unread-reply marker on the thread toggle.** Render the marker when
`last_reply_at > thread_last_read_at`; a `null` receipt with at least one reply counts as unread; no
replies means no toggle and no marker. `reply_count` gives the toggle its count without expanding the
thread. Opening a thread marks it read and updates the receipt **from the REST response** to
`POST messages/{root_id}/thread/read/` — not from a frame, which cannot carry it.

**Live root update on an incoming reply.** A new reply arrives as a `message` frame carrying *the
reply's* projection — its own `reply_count` is 0 and `last_reply_at` null. Nothing in the frame updates
the **root's** counters, so without explicit handling the marker only appears after the next refetch.
jg updates the root live (`Thread.jsx:1488-1537`: increments `reply_count` and marks the thread unread
when the sender is someone else), so parity requires the same here: on a `message` frame whose
`reply_to_id` names a cached root, increment that root's `reply_count` and advance its `last_reply_at`.
This was a gap in the first draft of this envelope, surfaced by review — do not leave it to discovery.

**Row 42 — distinguish managed conversations.** Surface `external_key` so a host can tell one managed
conversation from another. **ucm must not know what the values mean.** `event_all` and `event_team` are
jg's vocabulary, not the platform's; baking them in would put app-specific code in a consumer-agnostic
package and break the first non-jg adopter. Expose the value and let the host supply label and icon,
mirroring the existing `groupLaunchers` host-supplied pattern.

**Deviation doc.** Rows 27 and 42 move from BLOCKED to delivered. The doc then contains no BLOCKED
entries at all — confirm MSG-3c's version-pin conformance check still passes on an empty set rather
than erroring or vacuously "passing" for the wrong reason.

### The trap this WO walks into — read before writing any merge code

`thread_last_read_at` is **viewer-specific and REST-only**. `reply_count` and `last_reply_at` ride
`serialize_message`, which is embedded verbatim into the `message` and `message_edited` frames. So every
such frame carries a message projection **with** the reply fields and **without** the receipt.

That is precisely the defect shape MSG-3c just fixed three times (`poll_updated`'s `voted_option_ids`,
the `reaction` frame's `reacted` flags, `toggleReaction`'s REST confirm): a viewer-independent
projection replacing a cached object and silently wiping viewer-specific state. This WO introduces a
**fourth field of that shape**, arriving immediately after those fixes. Merge field-wise, preserve
`thread_last_read_at`, never replace the message object wholesale — the contract obligation is now
written into design §Realtime. It has a mandatory test below.

### Non-goals / do-not-touch

Any dcm change. Any app-specific vocabulary in ucm (see row 42). App-side code, the jg migration
(MSG-5), search, typing, client→server WS. The component boundaries from MSG-3 — the marker belongs to
whichever component owns the thread toggle, not to a regrown `Thread`; the ~400 LOC soft trigger and
one-harness-entry-per-component rule stay in force. Do not re-open rows already delivered or already
recorded as deliberate deviations.

### Required tests to WRITE

- **The merge trap (load-bearing):** a `message` and a `message_edited` frame — **server-shaped, copied
  from real `serialize_message` output**, therefore without `thread_last_read_at` — must leave a
  previously-fetched receipt intact. Assert the cached value after the merge, not just that no error
  was thrown.
- **Marker logic:** shown when `last_reply_at > thread_last_read_at`; hidden when the receipt is equal
  or newer; shown when the receipt is `null` and `reply_count > 0`; absent entirely when
  `reply_count == 0`.
- **Read on open:** expanding a thread issues the REST read call and updates the receipt from its
  response.
- **Live root update:** a server-shaped `message` frame carrying a `reply_to_id` for a cached root
  raises that root's `reply_count` and advances `last_reply_at`, and the marker appears without a
  refetch when the sender is not the viewer.
- **Row 42:** two managed conversations with different `external_key` values are distinguishable through
  whatever the host supplies, and **no jg-specific string appears anywhere in `src/`** — assert that
  directly, it is the constraint most likely to be quietly violated.
- **Deviation doc / conformance:** zero BLOCKED entries and the version-pin check still meaningful.
- Existing ucm suites stay green.

**Fixture rule, non-negotiable:** every payload in these tests is copied from actual dcm serializer
output. Two separate defects in this workstream (`reply_to` vs `reply_to_id`, `last_message.body` vs
`.excerpt`) survived only because hand-written client-shaped fixtures agreed with the client's mistake.

### Risks

- **The merge trap**, above — the single most likely way this WO ships a regression, and the reason its
  first test is mandatory rather than nice-to-have.
- **jg vocabulary leaking into ucm** on row 42; it has its own assertion.
- Small WO, low complexity — the risk is complacency, not difficulty.

### Reviews

**Tier 2, not Tier 1 — corrected on review.** The row count is small but the change lands in
`MessagingProvider`'s frame-merge code, which is exactly where MSG-3c's Tier-2 pass found three shipped
bugs, and this WO's own risk section calls its merge trap the most likely way it ships a regression.
That is review-sensitive work by AGENTS.md's definition; size does not lower the tier.

Independent `reviewer` plus **`ui_reviewer`** at WO end: the marker is a visual
affordance and the harness exists to look at it. The `ui_reviewer` must also confirm the deviation doc
reaches zero BLOCKED entries honestly — by delivery, not by deletion.

### Preconditions

dcm 2.38.0 published (met — verified in source, not assumed). Approval Gate #1 = operator go on this
envelope.

### Release

One version bump + npm publish at WO end. **This closes the post-audit remediation**: with rows 27 and
42 delivered, every row of the MSG-3b checklist is either implemented or a recorded deliberate
deviation, and MSG-5 becomes unblocked.

### Execution directive

Implement through `codex exec` in the background — invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file;
fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit. Codex has
been out of workspace credits recently — verify before assuming the fallback, and if the fallback is
used, the orchestrator becomes author and the independent review is mandatory, not routine.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3d.md` in `ui-core-micha` (main). `git pull` first, read the WO
+ `django-core-micha/docs/design/messaging-platform.md` (§"Thread reply state and managed-conversation
identity", §Realtime's consumer obligation), then follow `orchestrate-codex` (Codex-first, own
independent review, `ui_reviewer` at WO end, one publish at WO end).

---

## Part B — Implementation map (Orchestrator)

**Single chunk** (the envelope's own framing: small WO, low complexity — Tier 2 for review rigor, not
for decomposition). **Target repo working directory:** `C:\Users\biglmi\Documents\webapps\ui-core-micha`
(repo root).

**Verified against dcm 2.38.0 while scoping (do not re-derive):**
- `serialize_message` (`django-core-micha/src/django_core_micha/messaging/serializers.py:80-95`) ALWAYS
  includes `reply_count`/`last_reply_at` — annotated-queryset fast path when present
  (`_with_reply_count`, `views.py:39-47`, used by `ConversationMessagesView`/`ThreadView`), a live
  aggregate fallback otherwise (`_reply_stats`, `serializers.py:68-77`). Every `message`/`message_edited`
  frame (built from `serialize_message` via `realtime.py`'s `publish_messaging_event`) therefore always
  carries fresh, viewer-independent reply stats for that specific message.
- `thread_last_read_at` is added **only** by `_message_response`/`_message_page_response`
  (`views.py:50-74`) — REST-only, viewer-specific, from `MessageThreadReceipt`. `_with_reply_count`'s
  list responses (`GET conversations/{id}/messages/`, `GET messages/{root_id}/thread/`) already attach
  it per-row via one bulk query (not N+1) — so a normal `listMessages`/`listThread` load already gives
  roots both their reply stats AND the viewer's own receipt in one response; no extra call needed on
  mount.
- `POST messages/{root_id}/thread/read/` (`views.py:342-347`, already wired as `markThreadRead` in
  `api.js:41`) returns `{"last_read_at": ...}` — **note the field name differs from the cached message's
  own `thread_last_read_at` key** — the provider action must map `last_read_at` from this response onto
  the root message's `thread_last_read_at` cache field, they are not the same key name.
- `serialize_conversation_core` (`serializers.py:107-115` area) now includes `external_key` (`null`
  where the kind doesn't use one).

**The merge trap — investigated, resolved by existing infrastructure, still needs its mandatory test:**
`mergeById`/`reconcileMessage` (`MessagingProvider.jsx:45-79`) already do a **field-wise** merge
(`{...previous, ...incoming}`), and neither the `message` nor `message_edited` `applyFrame` branches
explicitly re-derive or strip `thread_last_read_at` the way the `reaction`/`poll_updated` branches used
to explicitly recompute their own fields — so an incoming frame lacking `thread_last_read_at` (it always
will) does NOT overwrite a previously-cached value through the current code path. This is a genuine
finding from investigation, not an assumption: **do not skip the mandatory merge-trap test on the
strength of this finding** — the WO requires it regardless, and any code added by this WO (the live
root-update below in particular) must preserve this property rather than accidentally break it by
constructing a replacement object that omits the key.

**Row 27 implementation:**
1. `MessagingProvider.jsx`'s `markReplyThreadRead` (currently `:262`,
   `const markReplyThreadRead = useCallback((rootId, readAt) => api.markThreadRead(rootId, readAt),
   [api]);`) fires the REST call and **discards the response** — nothing ever updates the cache, so the
   receipt is never actually stored client-side today. Fix: on success, patch the root message's
   `thread_last_read_at` from the response's `last_read_at` (field-name mapping per above).
2. A marker component/affordance on the thread-toggle button (`Thread.jsx`'s existing
   `toggleReplies`/reply-count button, around where `message.reply_count` is already read at `:93-96`
   for the reply-count label) — show it when `message.last_reply_at > message.thread_last_read_at`, OR
   when `message.thread_last_read_at` is `null`/absent and `message.reply_count > 0`. No marker at all
   when `reply_count === 0` (matches the existing "no toggle button at all when there are no replies"
   behavior — don't add a marker to a control that doesn't render). This belongs in `Thread.jsx` (or a
   small collaborator it owns) — not a new top-level component, per the non-goals' "marker belongs to
   whichever component owns the thread toggle."
3. **Live root update on an incoming reply** — in `applyFrame`'s `message` case
   (`MessagingProvider.jsx:126-143`): after the existing reply message itself is merged via
   `reconcileMessage`, additionally check `message.reply_to_id` (server field name — reuse the pattern
   already established, this is NOT the client-shaped `reply_to` used only by locally-built optimistic
   rows) against `state.messages` for a cached root. If found, bump that root's `reply_count` by one and
   set `last_reply_at` to the incoming message's `created_at`, via a **field-wise merge that explicitly
   preserves the root's existing `thread_last_read_at`** (the exact discipline the merge-trap section
   above is about — do this by spreading the previous root object and only overriding
   `reply_count`/`last_reply_at`, never by constructing a fresh object from the frame's data). Apply this
   unconditionally (regardless of who sent the reply) — `reply_count`/`last_reply_at` are
   viewer-independent facts; do not add sender-based suppression logic that isn't explicitly required
   (the required tests only ask for the "sender is not the viewer" case, the common path — don't invent
   untested self-send special-casing beyond that).

**Row 42 implementation:** `external_key` needs no new plumbing to reach the cache — `mergeById`/REST
responses pass every field through transparently already. What's missing is a way for a host to render
it. Add an optional host-supplied resolver prop to `ConversationList.jsx` (mirrors the existing
`groupLaunchers`/`broadcastLauncher` host-supplied-data pattern already in this file) — e.g.
`resolveManagedLabel(conversation)` — called instead of the existing `titleOf()` fallback specifically
when `conversation.kind === 'managed'` and the prop is supplied; falls back to the existing `titleOf()`
behavior otherwise (unset prop, or non-managed kind). **ucm must not hardcode or reference `event_all`/
`event_team` or any other jg-specific vocabulary anywhere in `src/`** — the resolver receives the raw
`conversation` object (including `external_key`) and the host owns all interpretation.

**Deviation doc + conformance test:** move rows 27 and 42 from `BLOCKED` to their delivered outcome in
`docs/messaging-deviations.md` (describe what was actually built, not a generic note, matching the
established style from MSG-3c's rewrite). This leaves **zero** `BLOCKED` entries — verify
`tests/messagingContractConformance.test.js`'s version-pin check (added in MSG-3c) still passes
meaningfully against an empty set (i.e. `unpinnedBlockedLines()` naturally returns `[]` when there are no
`**BLOCKED**` lines at all — confirm this is actually true of the regex-based approach, not just assumed
because the test happens to pass; the WO's own text calls out the "passing vacuously for the wrong
reason" risk explicitly).

**Required tests to WRITE (all named explicitly in the WO's own "Required tests" section — treat that
section as the checklist, not this paraphrase):**
- The merge-trap test (load-bearing, per the WO: server-shaped `message` and `message_edited` frames,
  copied from real `serialize_message` shape, must leave a previously-fetched
  `thread_last_read_at` intact).
- Marker visibility logic (shown/hidden/null-receipt/no-replies cases, all four named in the WO).
- Read-on-open (expanding a thread issues the REST call and updates the receipt from its response).
- Live root update (server-shaped `message` frame with `reply_to_id` raises the cached root's
  `reply_count`/`last_reply_at`; marker appears without a refetch for the "sender is not the viewer"
  case).
- Row 42: two managed conversations with different `external_key` render distinguishable labels via a
  host resolver; **a direct assertion that no jg-specific string (`event_all`, `event_team`) appears
  anywhere in `src/`** — grep-based, mirroring the style of the existing contract-conformance test.
- Deviation-doc/conformance: zero `BLOCKED` entries; the version-pin check's own logic still behaves
  correctly against that empty set (not just "the real file happens to pass").
- Existing ucm suites stay green.

**Fixture rule (WO's own words, binding):** every payload in these tests is copied from actual dcm
serializer output — this workstream has twice shipped a bug that survived only because a hand-written
client-shaped fixture agreed with the client's own mistake (`reply_to` vs `reply_to_id`,
`last_message.body` vs `.excerpt`). Do not hand-invent a payload shape without checking it against the
serializer citations above first.

**Invariants / do-not-break:** don't touch chunks/rows already delivered; keep the ~400 LOC soft trigger
in mind for `Thread.jsx`/`ConversationList.jsx`/`MessagingProvider.jsx`; no new top-level component for
the marker (lives in `Thread.jsx` or a small collaborator it owns); no new DX-1 harness entry needed
unless a genuinely new independently-mountable component is added (it shouldn't be, per the above).

**Progress contract / preamble:** `PLAN:`/`PROGRESS:`/`RESULT:` lines, no git operations, write-and-run-
only-the-new-tests, leave the diff uncommitted for the orchestrator's review. Codex has been out of
workspace credits recently across the last several WOs in this workstream — verify liveness before
assuming success; if Codex fails (credits, quota, non-zero exit), the orchestrator implements directly
per the fallback rule, which makes the orchestrator the author and independent review mandatory
(not routine) — this has been true for every chunk of MSG-3c and should be expected here too.

**Mini-handover:** repo `C:\Users\biglmi\Documents\webapps\ui-core-micha`, branch `main`, WO
`work-orders/MSG-3d.md` (Part B above, single chunk). Follow `orchestrate-codex`. After the independent
review and commit, run the WO-end `ui_reviewer` pass (per the WO's "Reviews" section — confirm the
deviation doc reaches zero BLOCKED entries honestly, by delivery not deletion, and look at the marker
as a rendered visual affordance via the DX-1 harness), then one version bump + npm publish.
