# MSG-3c — deliver the rows MSG-3b left blocked against a stale dcm version

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)
**Binding spec:** `django-core-micha/docs/design/messaging-platform.md`. Extends the landed MSG-3b
(published ucm 2.17.0), same convention as `MSG-2b` / `MSG-2c` / `NOTIF-8b`.

---

## Part A — Envelope (Expertenchat, 2026-07-31)

### Goal

Deliver the seven checklist rows MSG-3b correctly refused to fake — and which became buildable while
MSG-3b was still running, without the session ever learning.

### Why this WO exists

MSG-3b started against dcm **2.36.1** and pinned that version explicitly in every BLOCKED entry of
`docs/messaging-deviations.md`. dcm **2.37.0** (MSG-2c) landed mid-flight and delivered exactly what
those entries said was missing. The WO closed — six chunks, per-chunk reviews, a clean WO-end
`ui_reviewer` row-by-row cross-check — with seven rows recorded as blocked on "a future dcm work order"
that had in fact already shipped.

The WO-end review did not catch it because it cross-checked the checklist against **ucm's** landed code
and took the dependency's state from the WO text. That is the third occurrence of one pattern in this
workstream: a side verified against itself, with the seam assumed rather than read. See §5 of
`notifications-messaging-roadmap.md`.

**Credit where it is due, and the reason this was cheap to find:** MSG-3b wrote the dcm version into
every BLOCKED entry. Without that pin the staleness would have been invisible instead of a two-minute
check. Keep doing it — this WO makes it a rule.

### Verified as deliverable against dcm 2.37.0

Checked in `django-core-micha` at 2.37.0 before this WO was written:

| Row | What MSG-3b recorded | Actual state in 2.37.0 |
|---|---|---|
| 38 | "dcm does not serialize `last_message`" | `serialize_last_message` exists; `last_message` is on the conversation payload |
| 51 | "no poll read serialization" | `serialize_poll` exists, embedded in `serialize_message` for `kind == "poll"` |
| 52 | "per-option voter names absent" | `voters` is in the poll projection (user ids, every conversation kind) |
| 53 | "closed state depends on the absent poll contract" | `closed_at` is in the projection |
| 56 | "dcm 2.36.1 does not emit `reaction`" | emitted (MSG-2c wired 8 frames) |
| 57 | "dcm 2.36.1 does not emit `poll_updated`" | emitted |
| 58 | "reorder/preview need the missing `last_message`" | available per row 38 |

### Expected outcome

The seven rows above delivered per the MSG-3b checklist's original descriptions:

- **38 / 58** — real last-message preview in `ConversationList`, and list reorder plus preview refresh
  on new / edited / deleted messages.
- **51-53** — `PollCard` renders question, options, per-option `vote_count` and `voters`, closed state
  with voting disabled. Read `voted_option_ids` **only** from the three poll REST responses; it is
  deliberately absent from `serialize_poll` and from every realtime frame, so do not look for it there
  and do not reconstruct it from a frame.
- **56 / 57** — the existing `reaction` and `poll_updated` handlers stop being dead code; verify they
  merge correctly now that frames actually arrive, rather than assuming the untested paths are right.
- `docs/messaging-deviations.md` corrected: these seven entries move from BLOCKED to delivered, and the
  closing paragraph stops claiming they need a future dcm WO.

**Still legitimately BLOCKED, do not touch:** rows **27** (no readable thread reply state) and **42**
(`external_key` not serialized). Both are real dcm gaps that MSG-2c did not cover; both are addressed by
dcm `MSG-2d`, and a later ucm WO delivers them. MSG-3b assessed these two correctly.

### The rule this WO adds

**A BLOCKED row is re-verified against the live dependency at WO close, not at WO start.** Concretely:

1. Every BLOCKED entry in `docs/messaging-deviations.md` must name the dependency version it was
   blocked at — MSG-3b already did this; make it explicit policy.
2. Extend the contract-conformance test from MSG-3b chunk 1: it must fail when a BLOCKED entry carries
   no version pin. A test cannot check whether dcm has since shipped — it has no access to it — but it
   can guarantee the pin exists, which is what makes the manual re-check a two-minute job instead of an
   archaeology exercise.
3. The WO-end review instruction changes: cross-check BLOCKED rows against the **dependency repo at its
   current version**, not against the WO text.

### Non-goals / do-not-touch

Rows 27 and 42 (blocked on dcm `MSG-2d`). Any dcm change. Any app-side code. The jg migration (MSG-5).
Search, typing, client→server WS. The decomposition and component boundaries established in MSG-3 and
held through MSG-3b — new rendering lands in the component that owns it, and the ~400 LOC soft trigger
and one-harness-entry-per-component rule stay in force. Do not re-open rows already delivered or
already recorded as deliberate deviations.

### Required tests to WRITE

- **Poll rendering** against a server-shaped payload — the projection as `serialize_poll` actually emits
  it, not a client-constructed object. This is the MSG-3b lesson repeated: the threading tests passed
  for a year of nobody noticing precisely because they used client-shaped fixtures.
- **`voted_option_ids` comes only from REST:** a `poll_updated` frame carrying no such key must not
  clear or invert the viewer's own vote state.
- **`reaction` / `poll_updated` frame merge:** an arriving frame updates the rendered message for a
  viewer who did not cause it; a duplicate `event_id` changes nothing.
- **Last-message preview and reorder:** a new message moves its conversation to the top and updates the
  preview; an edit updates it; a delete empties it.
- **Conformance test extension:** a BLOCKED entry without a version pin fails the build — assert the
  negative case, not only the positive.
- Existing ucm suites stay green.

### Risks

- **The dead handlers were never exercised.** Rows 56/57 are the paths most likely to contain latent
  bugs, because they have never run against a real frame. Treat them as new code under test, not as
  already-working code being unblocked.
- **Fixture shape** — see the poll test above; the single most repeated failure in this workstream is a
  test that passes because it invented its own payload.
- Deviation-doc drift: correcting seven entries by hand while leaving two correct ones intact is exactly
  where an over-eager edit removes a real blocker.

### Preconditions

dcm 2.37.0 published (met). Approval Gate #1 = operator go on this envelope. Rows 27/42 additionally
require dcm `MSG-2d`, which is **not** a precondition for this WO.

### Release

One version bump + npm publish at WO end.

### Execution directive

Implement through `codex exec` in the background — invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file;
fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3c.md` in `ui-core-micha` (main). `git pull` first, read the WO
+ `django-core-micha/docs/design/messaging-platform.md`, then follow `orchestrate-codex` (Codex-first,
own review per chunk, `ui_reviewer` at WO end, one publish at WO end). Rows 27 and 42 stay BLOCKED —
they wait on dcm `MSG-2d`.

---

## Part B — Implementation map (Orchestrator)

To be filled by the Orchestrator session on `git pull`, within the envelope above.
