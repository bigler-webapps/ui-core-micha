# MSG-3f — compact chat-bubble message layout

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)

---

## Part A — Envelope (Expertenchat, 2026-08-02)

### Goal

Make a message occupy the space a message deserves. Today a one-word message renders as **six stacked
rows**; it must become **one**.

### The problem

`MessageBubble` (`src/messaging/MessageBubble.jsx`) wraps everything in a vertical
`Stack spacing={0.75}`, so every element gets its own full-width row: the meta line, the body, the
`ReactionBar`, the reply control (a full MUI `Button`, which is why "Antworten" sits centred on a line of
its own), the overflow-menu `IconButton`, and finally `children` — where the host's `ReadTicks` lands as
a "Zugestellt an 0" text line. For the word "Hallo" that is roughly 260px of vertical space.

Operator direction: much more compact, icon-based rather than text-labelled, and modelled on WhatsApp.

### "Like WhatsApp" — the actual specification

"Like WhatsApp" is not a spec, so here is what it means for this WO. Each point is a requirement.

**1. Bubbles.** Own messages right-aligned on a tinted surface; incoming messages left-aligned on a
neutral surface. The bubble shrinks to its content and is capped at roughly three quarters of the thread
width — not the current full-width outlined `Paper`. Exact radius, tint, and elevation are design-system
choices, not fixed here; what is fixed is the alignment split and the shrink-to-content behaviour.

**2. Meta moves inside the bubble — this is the line-count fix.** Timestamp and status icons sit
**inside** the bubble, bottom right, instead of being their own full-width sibling rows. Whether they
share the last text line or occupy their own narrow trailing line is left to the implementation:
riding the last line is nicer and welcome if it falls out naturally, but it is **explicitly not
required** (operator decision, 2026-08-02 — "muss nicht perfekt sein"). Do not spend the WO fighting
that CSS. What matters is that the meta is inside the bubble and right-aligned, not that it is inline.

**3. Sender name.** Only for non-direct conversations, small, above the text, inside the bubble. Direct
conversations show no sender at all (already the case today, keep it).

**4. Status as icons.** Replace the "Zugestellt an N" text with tick icons — sent / delivered /
all-read, distinguished by tick count and emphasis. Own messages only; the existing
`canShowReadTicks` gate is correct and stays.

**5. Actions collapse into one affordance.** No standalone reply button, no permanently rendered
reaction row. One overflow affordance at the bubble's top edge opens a single menu carrying Reply,
React, and the existing Edit / Delete / Copy entries.

How it is reached (operator decision, 2026-08-02 — **no long-press**):
- **Desktop:** the affordance appears on hover, and on keyboard focus. The existing right-click
  `onContextMenu` path stays.
- **Touch:** a plain tap on the bubble reveals the affordance. No long-press, no swipe, no custom
  pointer-event handling — the gesture edge cases (scroll conflict, text selection, iOS's own
  context menu) are not worth their cost here.
- **React** is a menu entry that expands the existing `ReactionBar` emoji row. Do **not** try to nest an
  emoji picker inside the MUI `Menu` — MUI does not nest menus gracefully, and the existing expandable
  row already works.

**5b. The menu must open for messages the user cannot edit.** Today the whole menu is gated on `canAct`
(own message, or moderator), because it only contained Edit / Delete / Copy. Once Reply lives there, an
**incoming** message needs a menu too — you reply to other people's messages. So there are two variants:
any message offers Reply / React / Copy; a message the user may act on additionally offers Edit /
Delete. Getting this wrong makes replying to anyone else impossible, and it will not show up in a test
fixture that only contains own messages.

**6. Reactions.** Existing reaction chips render as a compact row overlapping the bubble's bottom edge,
not as their own stacked row. Adding a reaction moves into the action menu.

**7. Reply quote.** Stays inside the bubble as a tinted block with a coloured leading border, replacing
today's full-width text `Button`. Clicking it must still jump to the quoted message.

### Confirmed against operator-supplied reference screenshots (2026-08-02)

The operator supplied two WhatsApp screenshots as the reference. What they pin down beyond the points
above:

- In the reference, a two-line message has its timestamp at the right end of the *second* line — so
  WhatsApp's own rule is "meta rides the final line". Per point 2 this is **not** binding here; it is
  recorded so the implementation knows what the ideal looks like if it comes cheaply.
- **Incoming messages carry no status icon at all** — not even a "sent" tick. Only own messages show
  status.
- **At rest there is no visible action affordance whatsoever.** No reply control, no reaction button, no
  overflow glyph. The bubble is text plus meta and nothing else until the user hovers or long-presses.
- **The meta is visually recessed**: noticeably smaller than the body and in a lower-contrast grey; the
  read state is carried by colour on the ticks, not by the timestamp.
- Bubbles shrink to content — the short incoming message's bubble is markedly narrower than the long
  one's, confirming that the width cap is a maximum and not a fixed width.

A bubble tail/notch is visible in the reference. Treat it as optional design-system garnish, not a
requirement of this WO.

### Acceptance criterion

A message with short text, no reactions, no attachments and no reply quote occupies **at most two visual
lines** — the text and, at most, a narrow right-aligned meta line inside the bubble. One line if the meta
lands inline without a fight. Today's six rows for that case is what this WO exists to kill; anything
still costing a third line has not met it.

### Non-negotiable: the icons must keep their accessible names

Replacing text with icons is exactly how a UI becomes unusable with a screen reader. Every icon
introduced by this WO carries the text it replaced as its accessible name — the status icons keep the
existing `MessagingReadTicks.DELIVERED` / `ALL_READ` strings as `aria-label`, the action affordance keeps
a label, and no i18n key is deleted because its text stopped being displayed. A visually compact UI that
announces "button" to a screen reader is a regression, not a redesign.

Second, related trap: today's overflow menu is hover-only (`'& .message-actions': { opacity: 0 }`), which
makes it unreachable on touch **and** invisible to keyboard users. This WO must not carry that forward.
The affordance must be focusable and operable by keyboard. Note that `opacity: 0` does **not** remove an
element from the tab order — it is only invisible — so a `:focus-within` (or `:focus-visible`) rule that
reveals it on keyboard focus closes the keyboard half cheaply. The touch half is point 5's tap-to-reveal.
That this is a pre-existing defect does not make it acceptable to reproduce.

### Scope

`src/messaging/MessageBubble.jsx` primarily; `src/messaging/ReadTicks.jsx` (text → icon),
`src/messaging/ReactionBar.jsx` (compact placement, add-reaction moves into the menu), and the small part
of `src/messaging/Thread.jsx` that positions bubbles and passes `children`. Their tests, the messaging
i18n table if new labels are genuinely needed, and the `dev/` harness entry so the result can actually be
looked at.

### Non-goals / do-not-touch

- **No custom touch gestures at all** — no swipe-to-reply and, per point 5, **no long-press**. Both need
  hand-rolled pointer handling whose real cost is the edge cases (scroll conflict, text selection, iOS's
  own context menu), and neither is needed for "compact". Operator decision 2026-08-02. If either is
  wanted later it is its own WO.
- **No Composer change.** The screenshot that triggered this also shows a tall composer, but that is not
  what was asked. Raise it separately rather than folding it in.
- **No change to `Thread`'s data flow**, pagination, reply-thread expansion, unread-reply marker
  (MSG-3d), or the read-status contract.
- **No dcm change.** See the read-status note below.
- **No change to what `MessageBubble` accepts or renders as `children`** — hosts pass `ReadTicks` through
  it today and must keep working.
- No new dependency. MUI plus the existing icon set is enough.

### Read status — an observation, deliberately NOT a precondition

`ReadTicks` fetches per message (`getMessageReadStatus` in a `useEffect`), and dcm's `serialize_message`
carries no read state, so a thread fires one REST call per own message. Tick icons make that fan-out more
visible but do **not** worsen it: `canShowReadTicks` already bounds it to own messages, and the code
comments that bound as deliberate. Putting the delivered/read aggregate onto `serialize_message` — the
way `reply_count`/`last_reply_at` already ride it since MSG-3d, and viewer-independent in the same way —
would remove the fan-out entirely. That is a worthwhile dcm follow-up and should be raised as one, but
gating a UI fix behind a dcm release is the wrong trade. **Do not implement it here; do report it.**

### Tier

**Tier 2.** Shared-core, and this is an opinionated visual decision imposed on every future consumer of
ucm's messaging surface — see the cross-consumer note. Codex-first, mandatory independent review, plus a
`ui_reviewer` pass: this WO is entirely about how something looks and the harness exists to look at it.

### Cross-consumer note

ucm is consumer-agnostic by design, and this WO commits it to a specific chat aesthetic. That is
acceptable **now** because jg-ferien is currently the only messaging consumer (spesix is deferred per the
messaging-centralization course correction), so the design lands with one adopter rather than being
retrofitted onto several. Say so in the register row rather than letting a future consumer discover it.
What must **not** happen is jg-specific vocabulary or layout assumptions leaking into the package — the
same line MSG-3d drew for `external_key` applies here.

### Risks

- **Do not get drawn into the inline-meta CSS.** Placing timestamp and ticks on the last text line, and
  wrapping cleanly when the text ends near the edge, is a known-awkward problem needing a reserved inline
  spacer or a floated meta element. Point 2 deliberately does not require it. If a first attempt does not
  fall out cleanly, take the trailing meta line and move on — this risk is listed to be avoided, not
  managed.
- **Long text, long words, RTL and zoom.** A shrink-to-content bubble with a right-aligned meta
  breaks in interesting ways with a single unbroken 60-character token, at 200% zoom, and in narrow
  mobile widths. Check those three explicitly.
- **Losing an action.** Reply, React, Edit, Delete and Copy all currently exist. Collapsing them into one
  menu must not quietly drop one — particularly React, which is moving from a permanent control into the
  menu and is the easiest to forget.
- **Announcements and polls.** `MessageBubble` also renders announcement titles, announcement link
  buttons, poll cards and attachment lists. A bubble redesign that only considers plain text will make
  those look broken. Each needs a look in the harness.

### Tests to WRITE (scoped — run only these)

- a short own message renders its timestamp and status **inside** the bubble, not as a sibling row (the
  acceptance criterion, asserted structurally rather than by pixel — do not assert that the meta shares
  the text's line, which point 2 leaves open);
- the action menu opens for an **incoming** message and offers Reply, and offers Edit/Delete only where
  `canAct` holds (point 5b — a fixture containing only own messages will not catch this);
- the affordance is reachable on touch without a long press;
- no standalone reply button and no permanently rendered reaction row exist in the DOM for a plain
  message;
- own and incoming messages are distinguishable (alignment/styling hook), and the sender name renders for
  a group conversation but not a direct one;
- the status icon exposes the same accessible name the text label used, and appears only on own messages;
- the action affordance is reachable and operable by keyboard alone — no hover, no long press;
- the action menu contains Reply, React, Edit, Delete and Copy for a message the user may act on, and the
  reply quote still triggers `onJumpToMessage`;
- an announcement, a poll and an attachment message each still render their existing content inside the
  new bubble.

Command: `pnpm vitest run tests/Thread.test.jsx tests/messagingMessageActions.test.jsx tests/messagingInteractions.test.jsx tests/messagingPollRendering.test.jsx` plus any new file. The existing messaging tests are the regression net — if several of them need rewriting, that is a signal the change went wider than the envelope, and it should be reported before proceeding.

### Release

One version bump + npm publish at WO end. jg-ferien bumps its pin afterwards to pick the design up; that
pin bump is not part of this WO.

### Preconditions

None. Independent of `MSG-3e` (per-candidate scope in `DirectMessageLauncher`) — different files, either
order, but if both are in flight coordinate the version bumps so two releases don't collide.

### Approval Gate #1

Granted by the operator 2026-08-02: compact, icon-based, chat bubbles, WhatsApp as the model, across all
three design questions asked.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3f.md` in `ui-core-micha` (main). `git pull` first, read the WO,
then follow `orchestrate-codex` (write Part B yourself, Codex-first, own independent review plus a
`ui_reviewer` pass on the harness, publish at WO end). **The acceptance criterion is one visual line for a
short message — check it before declaring done.**

---

## Part B — Implementation map (Orchestrator)

**Target repo working directory:** `C:\Users\Micha Bigler\Documents\webapps\ui-core-micha` (repo root; main
branch). Work from this package; open only the named files to verify.

### Current shape (verified while scoping — do not re-derive)

**`src/messaging/MessageBubble.jsx`** (105 lines) — one `Paper` (`component="article"`, `:66`) wrapping a
single `Stack spacing={0.75}` (`:67`) with, in row order: reply-quote `Button` (`:68-73`, only if `replyTo`),
meta row — sender name (`conversation?.kind !== 'direct'`, `:75`) + `created_at` + "edited" caption
(`:74-78`), announcement title/link (`:79-80`), error `Alert` (`:81`), body/edit-`TextField` (`:82`),
`!deleted` wrapper with `AttachmentList` + `<ReactionBar message={message} />` + `PollCard` (`:83-87`),
standalone "Antworten" reply `Button` (`:88`, **not** inside the existing `Menu` — reply is currently
ungated by `canAct`, unlike edit/delete/copy), overflow `IconButton` (`:89`, `className="message-actions"`,
`canAct`-gated), `{children}` (`:90` — this is where `Thread.jsx` injects `<ReadTicks>`, currently its own
trailing row, not "inside the bubble"), then the edit/delete/copy `Menu` (`:92-96`) and delete-confirm
`Dialog` (`:97-101`).

- `canAct` (`:35-37`): `!deleted && message.kind !== 'poll' && ((Boolean(currentUser?.id) &&
  message.sender?.id === currentUser?.id) || canModerateMessages)` — gates both `onContextMenu` (`:66`) and
  the overflow `IconButton`. **No existing `isOwn`/alignment boolean** — the own-message check is inlined
  into `canAct` only; introduce a named `isOwn` for the alignment split (same condition, without the
  `!deleted`/`kind !== 'poll'` parts that are specific to action-gating, not alignment).
- Hover-only CSS trap (`:66`, inline `sx` on the `Paper`): `'& .message-actions': { opacity: 0 },
  '&:hover .message-actions': { opacity: 1 }` — pure `:hover`, no `:focus-within`/`:focus-visible` variant,
  no touch/tap path. This is the exact defect the WO's "Non-negotiable" section calls out — fix it here
  (add a focus-visible rule; touch is a tap-to-reveal state, not CSS-only).
- `Thread.jsx:103` and `:113` are the two `<MessageBubble>` mount sites (root messages and nested replies
  respectively), both passing `children={canShowReadTicks(message, user) && <ReadTicks .../>}`.
  `canShowReadTicks` (`Thread.jsx:25-27`) duplicates (more strictly — adds a pending-optimistic-row guard)
  the same own-message check as `canAct` — a third near-duplicate inline check. Consider factoring these
  three (MessageBubble's `canAct`, Thread's `canShowReadTicks`, the new alignment `isOwn`) toward one
  shared own-message predicate if it falls out cleanly; not required if it adds risk late in the WO.
- Direct-vs-group signal: `conversation?.kind !== 'direct'`, exactly this string comparison, reused
  identically at `MessageBubble.jsx:75` and `ReadTicks.jsx:21` — no enum, just keep using it.

**`src/messaging/ReadTicks.jsx`** (25 lines) — fetch-per-message `useEffect` (`:13-17`,
`getMessageReadStatus(messageId)` from `useMessaging()`). Only **two** states exist in the data today:
`status.all_read` (bool) vs `status.delivered_count` (number) — **there is no third "sent, not yet
delivered" state** in the current contract; do not invent one that the backend can't back. Map the two
existing states to icon variants (e.g. a single check for "delivered", a double/colored check for
"all read") — do not add a third tick state without a data source. `status.recipient_detail` (only present
for non-direct conversations, `:21` comment already documents the DM carve-out) drives the existing
clickable popover of names (`:24`) — keep that behavior, just change what triggers it from a text caption to
an icon (`aria-haspopup="dialog"` must move with it). i18n keys already exist and are reusable as
`aria-label`s: `MessagingReadTicks.ALL_READ`, `.DELIVERED` (`{{count}}`), `.RECIPIENTS`.

**`src/messaging/ReactionBar.jsx`** (47 lines) — currently its own sibling row (`Stack`, `:32`), mounted
inside MessageBubble's `!deleted` wrapper (`MessageBubble.jsx:85`). **Add-reaction already exists and is
reusable as-is**: `:35`, an `IconButton` (`AddReactionOutlinedIcon`, `aria-label={t('MessagingReactions.ADD')}`)
toggling local `expanded` state; when expanded, `:37-43` renders `QUICK_EMOJIS`
(`['👍','❤️','😂','🎉','👀']`, `:8`) as `Chip`s — this is "the existing expandable row" the WO says already
works; reuse it verbatim inside the action menu's React entry, don't rebuild it. `ReactionBar` takes only
`message` as a prop today — no position/z-index hook back to the parent; if overlapping the bubble's bottom
edge needs coordination (e.g. negative margin colliding with bubble padding), that's a MessageBubble-side
CSS concern, only touch `ReactionBar`'s own layout if the compact-row placement itself needs to change (it
likely does — from a full sibling row to a smaller overlapping one).

### The new bubble shape — map the seams, not the CSS

This WO is explicitly NOT asking for the inline-meta-shares-last-line CSS to be solved (Risks section, Part
A) — implement the straightforward version (meta as its own narrow trailing line inside the bubble,
right-aligned) and stop; do not spend cycles chasing the inline variant.

1. **Alignment split**: introduce `isOwn` (own-message boolean, computed once, see above). Own → bubble
   right-aligned on a tinted `Paper`; incoming → left-aligned, neutral surface. Shrink-to-content, capped at
   ~75% of thread width (today's `maxWidth: 'min(100%, 680px)'`, `:66`, is a fixed cap regardless of
   alignment — replace with a percentage-based cap and keep `min(...)` against a sane absolute ceiling for
   very wide threads).
2. **Meta moves inside**: move the timestamp + status-tick block from its own row into a small trailing
   `Stack` inside the bubble's content area, right-aligned, "recessed" styling (smaller, lower-contrast —
   Part A's confirmed-against-screenshots section). Sender name stays where it is conceptually (above text,
   inside the bubble) but only for `conversation?.kind !== 'direct'` (unchanged condition).
3. **Status as icons**: `ReadTicks.jsx` swaps its two `Typography` text branches for icon components
   (`Done`/`DoneAll` from `@mui/icons-material`, following the repo's `Outlined`-variant convention where one
   exists — check availability before picking exact icon names) with the existing i18n strings as
   `aria-label`, own-messages-only (unchanged `canShowReadTicks` gate in `Thread.jsx`, do not touch it).
4. **Actions collapse into one menu**: move the standalone reply `Button` (`:88`) INTO the existing `Menu`
   (`:92-96`) as a new first entry, alongside React (opens `ReactionBar`'s existing `expanded` row — do not
   nest an emoji picker inside the MUI `Menu`, per Part A) and the existing Edit/Delete/Copy entries. The
   overflow `IconButton` (`:89`) becomes the single affordance — reuse the existing `MoreVertIcon` (already
   the established overflow icon in this repo, `ConversationList.jsx` too), don't introduce a different one.
5. **Two menu variants (5b — the easy-to-miss one)**: any message (own or incoming) gets Reply + React +
   Copy; only a message where `canAct`-minus-the-reply-specific-parts holds (i.e. own message or moderator,
   the existing author/moderator check) additionally gets Edit + Delete. This means the menu's visibility
   condition changes from "`canAct` gates the whole menu" to "the menu is always offered when there's
   anything to put in it (any message), but its CONTENTS vary" — restructure the render condition
   accordingly; a fixture with only own messages will not catch a regression here (Part A's own warning).
6. **Desktop hover+focus, touch tap**: fix the CSS trap directly — add a `&:focus-within .message-actions`
   (or `:focus-visible`) rule alongside the existing `:hover` rule so keyboard Tab-focus reveals the
   affordance (the element is already in the tab order, per Part A's analysis — `opacity:0` doesn't remove
   it). For touch, add a tap-to-reveal state (e.g. local `actionsVisible` state toggled by a tap handler on
   the bubble, independent of hover/focus) — no long-press, no swipe, no custom pointer-event tracking.
7. **Reactions compact row**: `ReactionBar`'s existing-reactions row (not the add-reaction affordance, which
   moves into the menu per point 4) becomes a compact row overlapping the bubble's bottom edge rather than a
   full sibling Stack row — likely a negative top margin pulling it up into the bubble's bottom padding, or
   an absolutely-positioned row anchored to the bubble. `ReactionBar`'s own `expanded`/`QUICK_EMOJIS` block
   stays as-is; only its trigger changes (moves from `ReactionBar`'s own `AddReactionOutlinedIcon` button —
   now redundant, since React lives in the menu — but the `expanded` row itself is unchanged).
8. **Reply quote**: keep inside the bubble but restyle from a full-width `Button` (`:68-73`) to a tinted
   block with a coloured leading border (e.g. `borderLeft`) — must still call `onJumpToMessage` on click
   (existing prop, keep the click handler, only restyle the container).
9. **Announcements/polls/attachments** (`:79-80`, `:83-87`): keep rendering inside the new bubble container;
   check each in the harness (Part A's Risks section) since none of the four scoped test files assert on
   their visual placement, only their data/behavior.

### Verification harness — extend, don't just eyeball the diff

`dev/entries.jsx:140-157` already has a `messaging-message-bubble` entry, but it mounts a single bubble with
no `conversation` prop, no `currentUser` (so `canAct` is always false — no own-message demo), and no
`replyTo`/`children`/ReadTicks wired in — **insufficient to visually verify this WO's acceptance criterion**.
Either extend this entry with a currentUser matching one message's `sender.id` (for an own-message demo)
plus a second incoming-message instance, a `replyTo` prop, and mock `ReadTicks` children — or, likely
cleaner, extend the existing `messaging-thread` entry (`dev/entries.jsx:156`, `ThreadEntry` against
`messagingHarnessApi`) which already exercises the real Thread→MessageBubble wiring with realistic
`sender`/`reply_count`/replies data. Add fixture messages covering: a short own message (acceptance
criterion — one/two lines), a short incoming message, a long-single-unbroken-token message, a message at
200% zoom (use the harness's viewport toggle), a group-conversation message (sender name visible) vs a
direct one (no sender name), an announcement, a poll, and an attachment. This is the actual verification
step — visually confirm the acceptance criterion before reporting `RESULT: DONE`.

### Invariants / do-not-touch

- No Composer change (a different component, out of scope even though the triggering screenshot showed one).
- No change to `Thread.jsx`'s data flow, pagination, reply-thread expansion, unread-reply marker (MSG-3d),
  or the read-status REST contract (`getMessageReadStatus` shape stays exactly as-is — two states, no new
  backend call).
- No dcm change — the fan-out observation (one `getMessageReadStatus` call per own message) is a known,
  pre-existing, and deliberately bounded cost; report the read-aggregate-on-`serialize_message` idea as a
  dcm follow-up suggestion in the WO's own docs, do not implement it.
- `MessageBubble`'s `children` contract stays: hosts (jg-ferien today) pass `ReadTicks` through it and must
  keep working unchanged from the outside.
- No new dependency — MUI plus `@mui/icons-material` is enough (both already used throughout `src/messaging/`).
- Every icon this WO introduces keeps its text as an `aria-label` — no i18n key gets deleted because its
  text stopped being visually displayed (Part A's "Non-negotiable" section).

### Tests — see Part A's "Tests to WRITE" list verbatim

Run: `pnpm vitest run tests/Thread.test.jsx tests/messagingMessageActions.test.jsx
tests/messagingInteractions.test.jsx tests/messagingPollRendering.test.jsx` plus any new file for the new
assertions (own/incoming alignment, menu-for-incoming-message, keyboard/touch affordance reachability,
icon aria-labels). These four existing files assert on data/behavior (menu gating, reaction round-trips,
poll rendering, ReadTicks own-message-only mounting), not DOM layout — good news for a redesign, but per
Part A: **if several existing tests need rewriting (not just relocating an assertion), that's a signal the
change went wider than the envelope — stop and report before proceeding**, don't just patch tests to match
whatever the implementation produced.

### Progress contract

Emit a `PLAN: …` line first, then a single-line `PROGRESS: [n/total] <action>` before every relevant action
and `… done` on completion, no gap > ~2 min, unbuffered stdout, and exactly one final
`RESULT: DONE|BLOCKED <reason>`.

### Constraints for the implementer

The WO text (Part A + this Part B) is the COMPLETE spec. Read `AGENTS.md` and
`.codex/skills/frontend-engineering` only for conventions. Stay in scope: `MessageBubble.jsx`,
`ReadTicks.jsx`, `ReactionBar.jsx`, the small `Thread.jsx` slice that mounts them, their tests, the messaging
i18n file if new labels are genuinely needed, and the `dev/` harness entry. Do not touch `Composer.jsx`,
`ConversationList.jsx`, poll/attachment components' internals, or anything outside this list. Do not update
`MEMORY.md`. **Do NOT `git add`/`commit`/`push`** — leave the diff for the Orchestrator's review; a prior WO
in this campaign (`ui-core-micha` MSG-3e) had its implementer self-commit and self-publish against this same
instruction — that was a governance breach, not a template to follow. **Do NOT bump the version or
publish** — the Orchestrator owns the release. WRITE the tests specified in Part A and RUN ONLY the listed
files plus any new ones — no full suite, no self-review; the Orchestrator owns the authoritative run, the
independent review, AND the `ui_reviewer` harness pass, and those are the gate.
