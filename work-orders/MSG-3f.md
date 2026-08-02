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

## Part B — Implementation map

Owned by the Orchestrator session, deliberately not written here.
