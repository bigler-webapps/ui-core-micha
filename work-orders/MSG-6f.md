# WORK ORDER MSG-6f (ui-core-micha) — the host title resolver is never called for broadcasts, and the read ticks claim a delivery that does not exist

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Both defects were found by **verifying the landed MSG-6e /
MSG-7 / MSG-8 / MSG-10 work in a running app** (jg-ferien local, flag on, ucm 2.21.3, dcm 2.39.5,
2026-08-03). Both are cases of "the other side shipped its half; ucm still renders the old behaviour".

## TIER
Tier 2 — shared-core, consumed by every app. Independent `reviewer` mandatory. `ui_reviewer` for
scope B (it changes what a user believes about message delivery).

## SCOPE

**A. `titleOf` never calls the host resolver for a broadcast — jg's fix is dead code.**

`ConversationList.jsx` `titleOf()` gates the host callback on kind:

```js
if (conversation.kind === 'managed' && resolveManagedLabel) {
  const label = resolveManagedLabel(conversation);
  if (label) return label;
}
```

jg-ferien MSG-10 correctly taught its `resolveManagedConversationLabel` to handle
`kind === 'broadcast'` — but ucm never calls it for that kind, so the branch is unreachable from the
list and the row still falls through to `t('MessagingList.UNTITLED')`.

**Verified live after MSG-10 landed:** the same conversation (`kind: "broadcast"`,
`external_key: "broadcast"`, `title: null`) renders **"Unbenannte Unterhaltung"** in the list and
**"Event-Ankündigungen"** in the open thread header — the thread header works only because jg's own
`resolveConversationTitle` calls the resolver directly, with no kind gate.

**The fix: stop gating on kind.** Call `resolveManagedLabel` for **every** conversation and let the
host decide — a `null` return already means "I have no label", which is exactly the delegation contract,
and the comment directly above `titleOf` already describes the label as host-supplied. Gating on kind
inside ucm duplicates a decision that belongs to the host and will break again for the next kind.

Check `resolveDirectUserName`'s gate (`kind === 'direct' && other_user_id != null`) in the same pass and
state whether it has the same problem. Do not change it blindly — a direct conversation is the one kind
where the id-based lookup is genuinely required.

**B. The read ticks assert a delivery that the platform does not track.**

Operator report, 2026-08-03: *"die Häkchen geben das Gefühl, dass jede Nachricht sofort zugestellt ist,
auch wenn das Browserfenster geschlossen ist."* Correct, and it is now strictly worse than when it was
written:

- dcm MSG-7 scope C **removed `delivered_count`** from the `read-status` response — verified live, the
  response now carries only `all_read` and `recipient_detail`.
- `ReadTicks.jsx` still renders
  `t('MessagingReadTicks.DELIVERED', { count: renderedStatus.delivered_count || 0 })`. With the field
  gone, `undefined || 0` produces the **identical** label as before. Verified live: every own message
  shows `aria-label="Zugestellt an 0"`.

So the UI states "Zugestellt an 0" — simultaneously claiming a delivery and reporting that it reached
nobody — on a single outlined check that reads as WhatsApp's delivered-tick. There is no delivery
signal behind it at all.

**Resolution (operator-directed, 2026-08-03): show a read PROPORTION in group and broadcast, keep a
two-state tick in DMs.**

The operational need in a camp is *"did a relevant share of the group read this?"* — a leader posting
"bus leaves at 14:00" to forty participants needs a number, not a checkmark. `all_read` is the wrong
measurement, not a useless feature: in any group it is essentially never true, so a boolean pins the
indicator to its first state precisely where the information matters most.

Operator decision, 2026-08-03:

| Conversation kind | Viewer | Display |
|---|---|---|
| `direct` | sender | two-state tick — `DoneOutlinedIcon` **light grey** "Gesendet" → `DoneAllOutlinedIcon` **dark blue** "Gelesen" |
| `group`, `broadcast`, `managed` | team member | a **ratio**: "18/40" (read / members). Numeric, no icon ladder. |
| `group`, `broadcast`, `managed` | ordinary participant | **nothing** — render no indicator at all |
| per-recipient detail | team member | unchanged — already correctly gated (see below) |

**The contrast between the two DM states must be clearly stronger than today.** Currently
`color={status.all_read ? 'primary' : 'inherit'}`, and `inherit` inside the meta `Stack` resolves to
`text.disabled` — the two states are barely distinguishable. Use an explicit light grey and an explicit
dark blue rather than `inherit`/`primary`, and verify the difference is obvious at the rendered
`1rem` icon size in both light and dark theme. The icon shape already differs (`Done` vs `DoneAll`), so
the distinction does not rest on colour alone — keep it that way.

**"nothing" for an ordinary participant in a group is deliberate, not an oversight.** A permanently
grey tick — which is what `all_read` would produce in any real group — is the "looks stuck" failure this
scope exists to remove. No indicator is better than a misleading one.

**No client-side permission logic.** dcm MSG-9 returns the counts only to viewers holding
`read_receipt_detail`, so the rule is purely shape-driven: *counts present → ratio; else `direct` →
tick; else → render nothing*. Do not branch on roles or capabilities in ucm.

**The server already has the number and throws it away.** `read_status` (`services.py:344-347`) computes
`all_read` from exactly the queryset that yields the count:
`participants.filter(last_read_at__gte=message.created_at).count()` — the same shape as the
`delivered_count` that had no writer. **A `read_count` + `recipient_count` pair is the counter
`delivered_count` should have been.**

Adding them is a `django-core-micha` change, not ucm's: **this scope is blocked on a dcm WO that adds
`read_count` and `recipient_count` to the `read-status` response.** Keep `all_read` — the DM branch
still uses it. Do not compute the ratio client-side from `recipient_detail`: that field is
manager-gated, so an ordinary sender would get no ratio at all.

Retire `MessagingReadTicks.DELIVERED` and its `{{count}}` regardless — the new ratio string is a
different key with different semantics, and reusing "Zugestellt" would carry the false claim forward.
Also stop reading the now-always-`null` `last_delivered_at` out of `recipient_detail`.

**Per-recipient detail stays as it is.** `services.py:340` already gates it on
`kind != DIRECT and "read_receipt_detail" in rights` (in jg: `MANAGER_RIGHTS`), and DMs never expose it
even to moderators — a documented design invariant. This WO does not touch that; the popover keeps
working for managers.

**Why not implement delivery tracking as well** (wiring `mark_delivered` from a client ack, technically
possible since dcm MSG-8 made WS frames arrive): in a browser app "delivered" can only mean "a tab had
the socket open at that moment". For a recipient who is simply not online it would sit at the first
state indefinitely — replacing "looks always delivered" with "looks permanently stuck", plus a write per
received message. It only becomes meaningful with guaranteed device-level push. A read ratio answers the
real question without that ambiguity. **If the operator wants delivery too, it is a feature WO.**

**C. The read signal misses the most attentive reader — fix this or the ratio understates.**

What `read_count` actually measures must be stated plainly, because it is weaker than "read":
`mark_read` (`dcm services.py:288-294`) sets `ConversationParticipant.last_read_at` to *now*, and after
MSG-6e scope D there is exactly **one** caller — `Thread.jsx:58`, a `useEffect` keyed on
`[conversationId, markConversationRead]`. So the recorded fact is **"opened this conversation"**, and
`read_count` counts participants who opened it at some point after the message was posted.

It is not tab-open, not socket-connected, not per-message interaction, not viewport visibility.

Two asymmetries follow. The first is acceptable, the second is a defect:

1. Opening a conversation marks its **entire** history read in one stroke. Someone who opens it and
   leaves immediately counts as having read a 200-message backlog. This is the universal convention
   (WhatsApp behaves the same) — accept it, do not try to fix it here.
2. **A participant already sitting in the open conversation when the message arrives is NOT counted.**
   The effect is keyed on `conversationId`, so it does not re-fire when a new message lands. The person
   who saw it in real time is recorded as not having read it, until they navigate away and back.

Asymmetry 2 is newly common and newly consequential: before dcm MSG-8 no frame was ever delivered, so
no thread ever updated live and this case did not arise. Now it is the *normal* case for anyone
actually paying attention — and it biases the ratio **downward**, which is the wrong direction for a
leader deciding whether to chase people about the bus time.

**Fix: re-mark read when a new message arrives in the conversation currently open.** Trigger on the
incoming `message` frame for the active conversation, not on a timer. Guard it: do not fire for the
viewer's **own** send (dcm already excludes the sender from the fan-out, so no frame arrives — verify
rather than assume), and do not fire when the thread is mounted but the document is hidden
(`document.visibilityState`), or a background tab would report reads nobody performed. `mark_read` is
already idempotent — it only writes when the new timestamp is later (`services.py:291`) — so a
redundant call is cheap, but a *wrong* one is not.

**Known cost, do not silently ignore:** `Thread` mounts `ReadTicks` per own message and each instance
fires its own `read-status` request — O(n) for a sender with many messages in a thread, which is exactly
the broadcast-heavy leader this feature serves. A batch endpoint (message ids → counts) is the natural
answer and belongs in the same dcm WO. Do **not** fold the counts into `serialize_message` instead:
`views.py:50-54` documents why viewer-specific read state must stay out of it — it would leak into the
`message`/`message_edited` realtime frames, the same trap `thread_last_read_at` was kept out of.

## NON-GOALS / DO NOT TOUCH
- Do not reintroduce `delivered_count` on either side.
- Do not change `all_read`'s semantics or how `read_state` frames update the cached receipt (that is
  MSG-6e scope C, already landed — leave it working).
- No change to `isOwn`/`senderName`/`canShowReadTicks`; the `sender` object from dcm 2.39.4 fixed those
  and they are **verified working** (all server-loaded messages now render `own` with a tick).
- Do not touch jg-ferien. Its `resolveManagedConversationLabel` is already correct and must stay as it
  is — scope A is what makes it reachable.

## RISKS
- **A changes behaviour for every host app**, including any that relies on `resolveManagedLabel` being
  called only for `managed`. A host returning a non-null label for an unexpected kind would newly see
  it win over `conversation.title`. Check the ordering in `titleOf` after the change: a host label
  should still lose to nothing it previously lost to, apart from the intended new case.
- B changes a user-facing claim. Getting it wrong in the other direction (removing the indicator
  entirely) loses the "did my message go out" affordance — hence two states, not zero.
- The retired i18n key may be referenced by host apps' tests. Grep before deleting and note any hits.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. **A:** a conversation with `kind: 'broadcast'`, `title: null`, and a host `resolveManagedLabel` that
   returns a string renders **that string**, not `MessagingList.UNTITLED`. This must **fail against
   today's code** — prove it.
2. **A:** a host resolver returning `null` still falls through to the existing chain unchanged
   (regression guard for the delegation contract).
3. **A:** the existing `managed` / `event_all` / `event_team` behaviour is unchanged.
4. **B:** `direct` renders the two-state tick and the two states use visibly different explicit colours (assert the resolved colours differ, not just that a colour prop is set); a `group` WITH counts renders the ratio; a `group` WITHOUT counts renders **no** indicator. Assert no label containing "Zugestellt" is produced anywhere in `ReadTicks`.
   that **no** label containing a `{{count}}`-derived number is produced anywhere in `ReadTicks`.
5. **B:** `all_read` still renders the double check in `primary` with the unchanged label.

**Non-vacuity:** tests 1 and 4 must fail on the current code. Test 1 is the one that matters — jg
shipped a fix for this exact symptom that did nothing, because the test asserted on the wrong side of
the boundary. Assert on the **rendered list row**, not on the resolver function in isolation.

## TEST SCOPE FOR THE GATE (orchestrator)
`ConversationList` and `ReadTicks` test files plus the messaging i18n tests. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow. jg's pin bump is a separate step; jg needs it to close its own MSG-9
finding 4/12, which cannot be fixed from jg at all.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
