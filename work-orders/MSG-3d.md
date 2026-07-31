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

To be filled by the Orchestrator session on `git pull`, within the envelope above.
