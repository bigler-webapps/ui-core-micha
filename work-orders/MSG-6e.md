# WORK ORDER MSG-6e (ui-core-micha) — messaging surface defects found by click-through

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Origin: jg-ferien `work-orders/MSG-9.md` findings 3, 7, 9, 10,
13b and 14 — all reproduced in a running app on 2026-08-03. Read that file's "Live verification"
section; do not re-derive the evidence.

## TIER
Tier 2 — shared-core, consumed by every app. Independent `reviewer` mandatory. `ui_reviewer` requested
for scope A (visible layout change).

## SCOPE — six independent defects, one release

**A. Timestamps: `HH:MM` plus a day separator, and pass the active locale (findings 3 + 9).**
`MessageBubble.jsx:133` calls `new Date(message.created_at).toLocaleString()` **with no locale
argument**, so it renders in the runtime's default locale — observed as `8/3/2026, 10:41:29 AM` in a
German UI. Two changes, and they must land together:

1. Show `HH:MM` on the bubble. The **date** appears once as a separator row when the day changes,
   inserted by `Thread` (it needs the neighbouring message to compare against), **not** by
   `MessageBubble`.
2. Pass i18next's active language to every date formatter. `ConversationList` already threads
   `i18n?.language` into `relativeTime` — follow that existing pattern rather than inventing another.

Not a one-off: `SupportRecoveryRequestsTab.jsx:368` and `:410` have the same bare `toLocaleString()`.
Fix them in the same pass; leaving them is how this recurs.

**B. A freshly created poll is cached under the wrong id (finding 10).**
`createConversationPoll` (`MessagingProvider.jsx:401-406`):

```js
const message = poll?.message || poll;          // <- dcm never sends `message`
if (message?.id != null) patchMessage({ ...message, ..., poll: ... });
```

dcm's `_poll_response` (`messaging/views.py:32-36`) returns `serialize_poll(poll)` + `voted_option_ids`.
Keys: `id`, `question`, `allow_multiple`, `closed_at`, `created_by_id`, `options`, `voted_option_ids`.
**No `message`, no `message_id`.** So `message.id` is the **poll's** id and `patchMessage` writes a
phantom timeline entry keyed by it, with no `created_at`, no `sender_id`, no `kind`.

Observed: a newly created poll renders with **no timestamp**, sender "Unbekannte Person", and sorts to
the **top** of the timeline (`chronological()` on `new Date(undefined)` → `NaN`), above messages from
two days earlier. Correct after reload.

**The `|| poll` fallback is the actual defect** — it converts a wrong assumption into silent data
corruption instead of an error. Remove the guess: resolve the message id explicitly from a field dcm
really sends, or re-fetch the message. **If dcm's response genuinely carries no way to identify the
message, do not invent one — stop and report**; that would be a dcm contract gap needing its own WO.
Apply the same scrutiny to `castPollVote`/`closePoll` (`:407+`), which use the same response shape.

**C. Handle the read-state frames dcm already sends (finding 7).**
`applyFrame` (`MessagingProvider.jsx:123ff`) handles only `message`, `message_edited`, `reaction` and
`poll_updated`. dcm publishes `read_state` (`services.py:293`), `delivered` (`:302`) and
`thread_read_state` (`:312`) — all silently discarded. Combined with `ReadTicks` fetching its status
once on mount (`ReadTicks.jsx:15-19`) and never re-fetching, a receipt can **never** update within a
session.

**Ordering caveat, read before starting C:** jg MSG-9 finding 1 (live WS push arriving ~10 minutes late)
is still undiagnosed. Handling frames that do not arrive fixes nothing observable. **Do C last, and
report if finding 1 is still open** — the Orchestrator may defer it to the next release rather than ship
an unverifiable change.

**D. Stop double-firing `markConversationRead` (finding 13, ucm half).**
Both `Thread.jsx:55` (a `useEffect` on `conversationId`) and `ConversationList.jsx:77` (the row's
`onClick`) call it for the same conversation. Measured: `POST /conversations/<id>/read/` fires **twice**
on every open. Keep exactly one owner. `Thread` is the better one — it fires on every way a
conversation becomes active, including deep links and programmatic switches, whereas the list click
covers only one path. Removing the `Thread` effect instead would silently break those paths.

**E. Plural forms for the reply counter (finding 14).**
`MessagingThread.SHOW_REPLIES` is a single string `'{{count}} Antworten anzeigen'`
(`i18n/messagingTranslations.ts:32`). All three languages are wrong at count 1: "1 Antworten anzeigen",
"Show 1 replies", "1 réponses". Use i18next plural keys (`_one`/`_other`). **Audit the rest of
`messagingTranslations.ts` for other `{{count}}` strings without plural forms** and fix them in the same
pass — including `MessagingReadTicks.DELIVERED` if it survives dcm MSG-7 scope C.

## DEPENDENCY — do not fix findings 2, 5 and 11 here
Own/incoming alignment, missing read ticks and "Unbekannte Person" all trace to dcm never serializing a
`sender` object. **ucm's code is already correct for all three** — `MessageBubble.jsx:100/108/109`
implements the alignment in full, it simply never sees `isOwn === true`. That fix is
`django-core-micha` MSG-7. **Changing `MessageBubble`'s ownership logic here would be wrong and would
mask the real defect.** If a change in this WO appears to need it, stop and report.

## NON-GOALS / DO NOT TOUCH
- No change to `isOwn`, `canShowReadTicks`, `senderName`, or any ownership derivation (see above).
- No change to `reconcileMessage`'s merge semantics — the optimistic-`sender` survival it produces is
  currently the only thing making own messages render at all; changing it before MSG-7 lands would make
  the surface strictly worse.
- No change to `useRealtimeCore`. The missing heartbeat is real (jg MSG-9 finding 1) but is its own
  Tier 0 diagnosis with cross-app scope.
- No new dependencies.

## RISKS
- **B is the one that can corrupt state.** A wrong id key writes a phantom row into every consumer's
  timeline. Get its test right before the fix.
- A changes visible layout in every host app — hence `ui_reviewer`.
- D: removing the wrong caller silently breaks read-marking on deep links. State which one you kept and
  why.
- E: i18next plural resolution depends on the configured language; a key that works in `de` can still be
  wrong in `fr`. Assert all three.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. **B, the important one:** creating a poll puts exactly **one** new entry in the message cache, keyed
   by the **message** id, carrying `created_at`, and it sorts **last** in a timeline whose other
   messages are older. Assert the poll id is **not** used as a message key.
2. A bubble renders `HH:MM` only; a day separator appears exactly once between two messages on different
   days and **not** between two on the same day.
3. Date formatting uses the active i18next language — assert a `de` render differs from an `en` render
   for the same timestamp (this fails today, where both produce the runtime default).
4. D: opening a conversation issues exactly **one** `markConversationRead` call, via both entry paths
   (list click and direct mount).
5. E: `SHOW_REPLIES` at `count: 1` renders the singular in **de, en and fr**.
6. C (if implemented): a `read_state` frame updates the cached receipt without a REST round-trip.

**Non-vacuity:** each test must fail with its fix reverted. Test 1 in particular must fail against
today's `|| poll` fallback — if it passes on the unmodified code, it is not testing the defect.

## TEST SCOPE FOR THE GATE (orchestrator)
The messaging test files plus whatever covers `SupportRecoveryRequestsTab`. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; **jg's pin bump is a separate step and NOT part of this WO** — jg also needs
django-core-micha MSG-7, and bumping one without the other leaves the surface half-fixed.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
