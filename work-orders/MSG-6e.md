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

**Ordering, updated 2026-08-03 — the earlier caveat here is resolved.** jg MSG-9 finding 1 is now
diagnosed as `django-core-micha` MSG-8: `push_to_users` feeds raw `datetime` objects into a msgpack
channel layer, `group_send` raises, the exception is swallowed as a warning, and the frame is dropped
(measured 16/16 failures). **C is therefore worth doing and no longer speculative.**

Two concrete implications:

- `read_state`, `delivered` and `thread_read_state` build their payloads with an explicit
  `.isoformat()`, so **those three frames arrive today** — C is verifiable right now, before MSG-8
  lands.
- `message` / `message_edited` / `conversation_upsert` frames start arriving only once MSG-8 ships. Do
  not conclude from "no message frame appears" that C is broken; check MSG-8's status first.

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
6. C: a `read_state` frame and a `thread_read_state` frame each update the cached receipt `ReadTicks`
   actually renders, without a REST round-trip. No test asserts a `delivered` frame does anything — it
   should not (dcm MSG-7 retires that frame's only publisher in this same run).

**Non-vacuity:** each test must fail with its fix reverted. Test 1 in particular must fail against
today's `|| poll` fallback — if it passes on the unmodified code, it is not testing the defect.

## TEST SCOPE FOR THE GATE (orchestrator)
The messaging test files plus whatever covers `SupportRecoveryRequestsTab`. Not the full suite.

## OPERATOR DECISIONS (this run)
- **Scope C — superseded below.** The envelope above was updated after the original defer decision was
  made (finding 1 is now diagnosed as `django-core-micha` MSG-8, not still-open); the instruction that
  follows replaces the earlier "defer all of C" call.
- **Implement C narrowly: `read_state` and `thread_read_state` only. Do NOT add a `delivered` frame
  handler.** The envelope's update confirms these three frames already carry an explicit `.isoformat()`
  and arrive today, independent of MSG-8 (which only gates `message`/`message_edited`/`conversation_upsert`).
  But `delivered` is the one exception: dcm MSG-7 (this same run, scope C there) **deletes `mark_delivered`**
  — the only production code that ever published a `delivered` frame — as part of retiring delivery
  tracking down to an honest two-state receipt (`all_read` only). Adding a `delivered` handler in
  `applyFrame` here would be live-testable today (against the pre-MSG-7 backend) but dead on arrival the
  moment MSG-7 ships, and contradicts the product decision behind it. In `applyFrame`
  (`MessagingProvider.jsx:123ff`), add `read_state`/`thread_read_state` branches that merge the received
  `last_read_at` (and for `thread_read_state`, the `root_id`) into the relevant cached receipt/message so
  `ReadTicks`/thread-unread state updates without a REST round-trip — do not add a third branch for
  `delivered`. Required test 6 covers `read_state`; add the equivalent for `thread_read_state`, do not add
  one for `delivered`.
- **Scope B's root cause is now confirmed and fixed at the source, in parallel, by `django-core-micha`
  MSG-7 scope F (operator-approved extension, running concurrently in this session):** dcm's poll REST
  response (`_poll_response` / `serialize_poll`) previously had no `message_id` at all — verified by
  reading dcm's `views.py`/`serializers.py`/`models.py` directly, not assumed. It now returns
  `message_id` (a string, dcm's UUID-as-string convention) on create/vote/close. **Do not re-derive or
  re-verify dcm's fix — build against the assumption that `poll.message_id` is present** on the response
  object `createConversationPoll`/`castPollVote`/`closeConversationPoll` receive. If your local dcm
  checkout does not yet have `message_id` on that response when you test, that is a sequencing problem to
  report, not a signal to invent a fallback in ucm.

## IMPLEMENTATION MAP (Orchestrator)

### Context package

**A — timestamps (`src/messaging/MessageBubble.jsx`, `src/components/SupportRecoveryRequestsTab.jsx`)**
- `MessageBubble.jsx:133` — `{new Date(message.created_at).toLocaleString()}` inside the `hasMeta` block
  (`:132-136`). Change to render `HH:MM` only, with the active i18next locale, e.g.
  `new Date(message.created_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })`
  — `useTranslation()` is already destructured as `{ t }` at `:33`; add `i18n` to that destructure.
- The day-separator is `Thread`'s job (it has the neighbouring message), not `MessageBubble`'s. In
  `Thread.jsx`, the render loop over `roots` (`:139-153`, `roots.map((message) => { ... })`) and the
  nested `replies.map` (`:151`) only ever see one message at a time inside the callback — you need the
  previous rendered root's date to compare against. Track it across iterations (e.g. reduce over `roots`
  building an array of `{ message, showDateSeparator }` before rendering, rather than mutating a ref
  inside `.map`, which fires render-order-dependent and is fragile under React StrictMode's double-invoke).
  Insert a separator row (a `Divider`-adjacent `Typography` with the formatted date, locale-aware, e.g. via
  `toLocaleDateString(i18n.language)`) when the day changes. `chronological()` (`Thread.jsx:10`) already
  guarantees ascending order, so a simple previous-vs-current day comparison suffices — no need to
  re-sort.
- `ConversationList.jsx`'s `relativeTime(value, locale)` (`:31-36`) is the existing pattern for threading
  `i18n?.language` through a date formatter (called at `:89` with `i18n?.language`) — follow that shape,
  don't invent a second convention.
- `SupportRecoveryRequestsTab.jsx:368` and `:410` (both bare `new Date(...).toLocaleString()`) — same fix,
  same locale-threading. Check whether that component already has `i18n` from `useTranslation()`; if not,
  destructure it there too.

**B — poll cache key (`src/messaging/MessagingProvider.jsx`)**
- `createConversationPoll` (`:401-406`): replace `const message = poll?.message || poll;` — dcm never
  sends a `message` object, only the flat poll projection now carrying `message_id` (see Operator
  Decisions above). Resolve the message id from `poll.message_id` explicitly; if absent, treat it as a
  real error (don't silently fall back to `poll.id`). Something like:
  ```js
  const messageId = poll?.message_id;
  if (messageId != null) patchMessage({ id: messageId, conversation_id: poll.conversation_id ?? conversationId, created_at: poll.created_at ?? new Date().toISOString(), poll });
  ```
  — note dcm's poll object itself carries no `created_at` either (check `serialize_poll`); you likely need
  to accept that a freshly created poll message has no server `created_at` until the next fetch/frame, OR
  confirm whether the realtime `poll_updated` frame (which does carry a full conversation/message context
  via `_poll_updated_payload`) arrives fast enough in practice to backfill it. Investigate `serialize_poll`'s
  actual returned keys yourself (do not assume) and choose the least-guessy option; state your reasoning.
- `castPollVote` (`:407-412`) / `closeConversationPoll` (`:413-418`) use `cache.messages[messageId]` where `messageId` is already
  passed in by the caller (not derived from the poll response) — these two are likely already correct
  today (the bug is specific to *creation*, where the id doesn't exist in cache yet). Verify, don't assume;
  the WO's instruction to apply "the same scrutiny" to these means check-first, not change-by-default.

**D — double `markConversationRead` (`src/messaging/Thread.jsx`, `src/messaging/ConversationList.jsx`)**
- `Thread.jsx:56` — `useEffect(() => { if (conversationId != null) markConversationRead(conversationId)...`
- `ConversationList.jsx:85` — the `ListItemButton`'s `onClick` also calls `markConversationRead(...)`.
- Keep `Thread.jsx:56`; remove the call from `ConversationList.jsx:85`'s `onClick` (keep `onOpen?.(conversation)`
  itself — only drop the `markConversationRead` call and its `.catch`).

**C — wiring gap you must close, not just `applyFrame` (`src/messaging/MessagingProvider.jsx`, `src/messaging/ReadTicks.jsx`)**
- `EMPTY_CACHE` (`:35`) already declares a `receipts: {}` slot — unused today, no reducer case writes to
  it and nothing reads from it. This is almost certainly the intended home for what `read_state`/
  `thread_read_state` frames should update. Add reducer cases in `applyFrame` (`:123ff`, alongside the
  existing `message`/`reaction`/`poll_updated`/etc. branches) for `frame.type === 'read_state'` and
  `'thread_read_state'` that merge into `state.receipts`, keyed so `ReadTicks` can look itself up (e.g. by
  `conversation_id` + `user_id` for `read_state`, by `root_id` + `user_id` for `thread_read_state` — the
  payload shapes are `{"user_id", "last_read_at"}` and `{"user_id", "root_id", "last_read_at"}`
  respectively, per dcm `services.py:293`/`:312`).
- **Writing to `cache.receipts` alone does not satisfy required test 6** ("updates the cached receipt
  without a REST round-trip") unless something actually reads it. `ReadTicks.jsx` (`:10-19`) today only
  ever calls `getMessageReadStatus(messageId)` once on mount via `useEffect`, into its own local `status`
  state — it has no path back to `cache` at all. You need `ReadTicks` to react to the relevant slice of
  `cache.receipts` (via `useMessaging()`) so a frame arriving after the initial REST fetch actually updates
  what's rendered — e.g. merge a fresher `cache.receipts` entry over the REST-derived `status` state, or
  derive `all_read` from the participant set + `cache.receipts` entries you have instead of holding a
  second independent read of the same fact. Use your judgment on the exact merge (a full redesign of
  `ReadTicks`' data source is not required — the REST fetch stays as the initial/fallback source of truth,
  e.g. for `recipient_detail`, which no frame carries), but the frame update must be observable in what
  `ReadTicks` renders, not just in an otherwise-unread part of `cache`.

**E — plural forms (`src/i18n/messagingTranslations.ts`)**
- `MessagingThread.SHOW_REPLIES` (`:32`): convert to i18next `_one`/`_other` keys (de/en/fr), all three —
  `Thread.jsx:144` already calls `t('MessagingThread.SHOW_REPLIES', { count: ... })`, i18next resolves the
  plural key automatically once `_one`/`_other` exist; no call-site change needed.
- Audit found two more `{{count}}` strings with no plural variants: `MessagingComposer.FILES_SELECTED`
  (`:64`) and `MessagingReactions.TOGGLE` (`:72`) — fix both the same way. `MessagingPoll.OPTION` (`:85`,
  `"Option {{count}}"`) is an ordinal label, not a plural noun phrase — it reads correctly at every count
  in all three languages as-is; leave it alone.
- `MessagingReadTicks.DELIVERED` (`:57`) — **do not add plural forms for it.** Per the WO's own conditional
  ("if it survives dcm MSG-7 scope C"): it does not survive — dcm MSG-7 removes `delivered_count` from
  `read_status` this same run (operator-approved), so `ReadTicks.jsx:21`'s
  `status.delivered_count || 0` will render `0` from now on for a different reason (`undefined` instead of
  an always-NULL field) but with **no change in rendered output** — it already always showed "0" before
  this run. This is a pre-existing, unrelated-to-this-WO UX rough edge (a two-state receipt showing a
  meaningless count); flag it as a follow-up in your final report, do not fix `ReadTicks.jsx` here — that
  is out of this WO's scope A-E.

### Do-not-touch reminders (from the envelope, restated)
No change to `isOwn`/`canShowReadTicks`/`senderName`/ownership derivation (that's dcm MSG-7's job) or to
`reconcileMessage`'s merge semantics or `useRealtimeCore`.

### Target repo working directory
`C:\Users\biglmi\Documents\webapps\ui-core-micha`

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; **jg's pin bump is a separate step and NOT part of this WO** — jg also needs
django-core-micha MSG-7, and bumping one without the other leaves the surface half-fixed.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
