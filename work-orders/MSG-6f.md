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

**Recommended resolution (needs the operator's confirmation before implementing):** keep two states and
make the vocabulary honest.

| State | Icon | Label |
|---|---|---|
| not yet read by everyone | `DoneOutlinedIcon` | **"Gesendet"** |
| `all_read` | `DoneAllOutlinedIcon`, `primary` | "Von allen gelesen" (unchanged) |

Retire the `MessagingReadTicks.DELIVERED` key and its `{{count}}` interpolation entirely — it has no
data source. That also removes the last un-pluralised `{{count}}` string MSG-6e scope E had to leave in
place pending this decision.

**Why not implement real delivery tracking instead** (wiring `mark_delivered` from a client ack, now
technically possible since dcm MSG-8 made WS frames actually arrive): in a browser app "delivered" can
only ever mean "a tab had the socket open at that moment". For any recipient who is simply not online
the indicator would sit at the first state indefinitely — replacing "looks always delivered" with
"looks permanently stuck", plus a write per received message. It only becomes meaningful with
guaranteed device-level push. **If the operator wants it, it is a feature WO, not this one.**

Also drop `last_delivered_at` from what `ReadTicks` reads out of `recipient_detail` if it is only used
for the retired label — dcm still returns the field but it is now always `null`.

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
4. **B:** a message that is not `all_read` renders the "Gesendet" label — assert the string, and assert
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
