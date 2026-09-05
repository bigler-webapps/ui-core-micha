# Messaging parity outcomes (MSG-3b, extended by MSG-3c and MSG-3d)

This is the authoritative parity record for the ucm messaging surfaces. It
replaces the former file-level “final parity confirmation,” which was not
sufficient evidence of feature parity. Each entry maps directly to the
numbered checklist in Part A of `work-orders/MSG-3b.md`. `OK` means the
capability is present; `DEV` means an intentional, documented redesign or
non-parity; `BLOCKED` means the dependency (dcm) does not expose the data or
realtime contract needed to implement it truthfully.

**Binding rule, added by MSG-3c:** every `BLOCKED` entry below must name the
dcm version it was verified blocked against. MSG-3b was itself blocked
against dcm 2.36.1 and recorded seven rows as `BLOCKED` on "a future dcm work
order" — dcm 2.37.0 shipped that work mid-flight, and MSG-3b's own WO-end
review closed without noticing, because it cross-checked the checklist
against ucm's landed code and took the dependency's state from the WO text
instead of the live dependency. A version pin turns that re-check into a
two-minute job instead of an archaeology exercise; `tests/messagingContractConformance.test.js`
now fails the build if a `BLOCKED` line omits one.

## Unread lifecycle

1. **OK** — Selecting a conversation calls the existing mark-read endpoint and clears its local unread count.
2. **OK** — Opening a `Thread` also marks its conversation read; the duplicate call is idempotent.
3. **OK** — Marking a conversation read decrements the global count by that conversation’s prior unread value, clamped at zero.
4. **OK** — Expanding a reply thread calls the existing thread-read endpoint for its root message.
5. **OK** — Realtime incoming messages increment unread only outside the active conversation and never double-count optimistic-send reconciliation.

## Message actions

6. **DEV** — Desktop hover and right-click open the MUI action menu. jg’s dedicated mobile long-press gesture is not reproduced; the same actions remain available through the regular MUI affordance.
7. **OK** — Authors can edit their own messages inline. Moderator edit affordance is host-supplied because dcm exposes no per-viewer capability field; server authorization remains authoritative.
8. **OK** — An active editor closes when the message is deleted by another update.
9. **OK** — Authors and host-designated moderators can delete; the host boolean is UX gating only and dcm enforces the actual permission.
10. **OK** — Deletion is confirmed in a MUI dialog before the request is sent.
11. **OK** — A deleted reply/edit target clears dependent composer or editor state.
12. **OK** — Message text can be copied through the action menu.
13. **OK** — Reply targeting is present.
14. **DEV** — Reactions use five compact presets rather than jg’s six-preset presentation.
15. **DEV** — No full third-party emoji picker is added; the compact preset menu keeps the package dependency-free.
16. **OK** — Deleted and poll messages do not render the generic action menu.

## Direct conversations

17. **OK** — `DirectMessageLauncher` starts a direct conversation.
18. **OK** — The launcher displays the host-supplied candidate list (searchable via an Autocomplete since MSG-19) and selection state.
19. **OK** — It has distinct empty and in-flight creation states; candidate discovery remains host-owned because dcm has no directory endpoint.
20. **OK** — Start is disabled until a candidate is selected and during creation.
21. **OK** — Policy rejections render an API-derived readable error in the dialog.
22. **OK** — The picker uses a fullscreen MUI dialog at the small breakpoint.

## Threading and quoting

23. **OK** — Both dcm’s `reply_to_id` and optimistic rows’ `reply_to` are read, so REST and realtime replies group under their root.
24. **OK** — Replies show a sender and short quoted snippet.
25. **OK** — Clicking a quote scrolls its source message into view.
26. **OK** — Quotes of deleted messages render the deleted placeholder rather than stale content.
27. **OK** (delivered in MSG-3d, was BLOCKED as of dcm 2.37.0) — dcm 2.38.0's `serialize_message` gains viewer-independent `reply_count`/`last_reply_at`, and `thread_last_read_at` is attached REST-only from `MessageThreadReceipt`. `Thread` shows an unread-reply marker on the thread toggle when `last_reply_at > thread_last_read_at`, treats a `null` receipt with replies as unread, and shows no marker (and no toggle) when there are no replies. Opening a thread updates the receipt from the REST response, not a frame (the field is never present on one, by design). An incoming reply's `message` frame also live-advances the cached root's `reply_count`/`last_reply_at`, merged field-wise so a previously-fetched `thread_last_read_at` is never wiped — the same merge-trap discipline MSG-3c's three fixes established, now with its own mandatory regression test.
28. **OK** — Reply threads load lazily on expand and collapse locally.
29. **DEV** — Reply composition is supplied through the independently mountable `Composer` target prop rather than jg’s per-thread embedded composer.

## Composer

30. **OK** — Enter sends and Shift+Enter preserves a newline.
31. **OK** — Staged files show image thumbnails or file labels, with independent removal.
32. **OK** — Attachment uploads show real byte-percentage progress when the browser reports an upload total; otherwise an indeterminate indicator is shown while the upload is in flight.
33. **OK** — Images over 2 MB are compressed client-side to a maximum 2560 px JPEG at quality 0.85, with silent original-file fallback.
34. **DEV** — Composer emoji insertion uses the existing compact preset set instead of jg’s full picker, while preserving insertion at the cursor.
35. **OK** — Sending is optimistic and exposes retry plus inline error state.
36. **OK** — The poll button is disabled while an image is staged as a UI convenience matching jg’s composer behavior; no dcm-side constraint requires it. Poll creation and attachment sending are separate API calls and separate message rows.
37. **DEV** — Drafts are deliberately reset on conversation changes. jg’s cross-conversation draft leak is not reproduced.

## Conversation list

38. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — dcm 2.37.0 serializes `last_message` (`excerpt`/`created_at`) on the conversation payload and emits it live via `conversation_upsert` on new-message send. `ConversationList` was found reading the wrong field name (`last_message.body` instead of the real `excerpt`) — fixed, so the preview now actually renders against the real contract instead of always falling back to the empty state. Reorder and live preview refresh work for new messages; dcm does not publish `conversation_upsert` on message edit/delete, so those cases update on the next REST refresh rather than live (see row 58).
39. **OK** — `last_message_at` renders through browser-native, locale-aware `Intl.RelativeTimeFormat` labels.
40. **OK** — The existing MUI `selected={conversation.id === activeConversationId}` wiring produces the `Mui-selected` active-row highlight; it was verified and needs no redundant styling.
41. **OK** — Unread badges and bold unread titles are present.
42. **OK** (delivered in MSG-3d, was BLOCKED as of dcm 2.37.0) — dcm 2.38.0's `serialize_conversation_core` includes `external_key`. ucm does not interpret it — jg's `event_all`/`event_team` vocabulary (or any other app's) stays entirely host-side. `ConversationList` accepts an optional `resolveManagedLabel(conversation)` host resolver, called only for `kind: 'managed'` conversations, falling back to the existing title behavior when unset; no app-specific string appears anywhere in `src/` (asserted directly by test).
43. **DEV** — Generic MUI kind icons replace jg’s richer per-kind/person avatar treatment while retaining type identification.
44. **OK** — Mute and archive actions are present.

## Timeline

45. **OK** — New active-conversation messages auto-scroll when the reader was already near the bottom. Scrolled-up readers are not pulled away from history; this near-bottom gate is an intentional usability refinement.
46. **OK** — Announcement messages render their deep-link action only when a host supplies `onAnnouncementLink`; routing remains a host-app responsibility.
47. **OK** — Sender names remain visible for group and managed conversations and are suppressed in direct conversations. No sender-side bubble alignment scheme was added because it is not required for this capability.
48. **OK** — Deleted tombstones, edited marker, and timestamps are rendered.

## Read receipts

49. **OK** — Read ticks mount only for the current user’s own persisted messages.
50. **OK** — Non-direct recipient detail supplied by dcm is shown through a click/keyboard-openable popover list rather than hover-only tooltip. Direct conversations always suppress the detail control; dcm’s recipient-detail payload remains the moderator authorization boundary because no generic client moderator field exists.

## Polls

51. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — dcm 2.37.0's `serialize_poll` renders question, options and per-option `vote_count` through `PollCard`. Fixed against the real shape: the initial-selection effect previously read non-existent per-option `selected`/`voted` flags — it now derives from `voted_option_ids`, which dcm adds only to the create/vote/close REST responses (never to `serialize_poll` itself or the `poll_updated` frame), and correctly shows no known selection when that field is absent rather than guessing.
52. **DEV** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — dcm 2.37.0's poll options carry `voters` as user ids only, never names, and there is no user-directory endpoint (the same structural limit already established for the DM candidate list, row 19). `PollCard` renders the vote count and marks the viewer's own vote (derived from `voted_option_ids`) rather than a per-voter name list, which the dependency cannot supply.
53. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — `closed_at` is in the real poll projection; voting is disabled once set. The poll creator's close permission was found broken against the real contract (`created_by_id` is the real field; the prior code read a non-existent `created_by.id`) — fixed.
54. **OK** — Composer starts at two options and disables adding options once it reaches ten; the server’s two-option minimum remains enforced.
55. **OK** — Vote and close write paths are wired; full read rendering is now delivered per rows 51-53.

## Live synchronization

56. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — dcm 2.37.0 emits `reaction` frames. The handler had never run against a real frame; verification found it wholesale-replacing the message's reaction list with the server's aggregate-only projection (`{emoji, count}`, never a per-viewer `reacted` flag, by design) on every arrival — silently wiping every previously-known `reacted` flag on that message, not just whichever emoji changed. The same defect existed in the REST-confirm path for the viewer's own toggle. Both fixed to merge by emoji, preserving previously-known `reacted` state instead of discarding it.
57. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — dcm 2.37.0 emits `poll_updated` frames. Same defect class as row 56, found while implementing row 51-53: the frame handler wholesale-replaced a message's `poll` object, silently dropping a REST-known `voted_option_ids` the moment any `poll_updated` frame arrived (e.g. a vote-count bump from another viewer). Fixed to carry the previous value forward when the incoming frame is silent about it, per the WO's explicit "must not clear or invert the viewer's own vote state" requirement.
58. **OK** (delivered in MSG-3c, was BLOCKED as of dcm 2.36.1) — new messages live-reorder the conversation list and refresh its preview via `conversation_upsert` (row 38). dcm does not publish `conversation_upsert` on message edit or delete (only on new-message send — verified against every `_publish(..., "conversation_upsert", ...)` call site in `services.py`), so an edit/delete of a conversation's last message updates the preview on the next REST refresh rather than live; this is a dcm-side gap outside this WO's scope, not a ucm limitation.
59. **OK** — dcm’s emitted message, message-edited, and message-deleted frames are handled live.

## Required backend follow-up

None outstanding. This checklist has **zero `BLOCKED` entries** as of MSG-3d. MSG-2c (dcm 2.37.0)
delivered what MSG-3b's own audit had recorded as blocking rows 38, 51–53 and 56–58 — MSG-3c
re-verified each against the live dependency and delivered them. MSG-2d (dcm 2.38.0) delivered what
remained blocking rows 27 and 42 — MSG-3d re-verified and delivered them the same way. Every row of
the original MSG-3b checklist is now either implemented or a recorded deliberate deviation; see the
rows above for what was actually built, including the client-side bugs found and fixed only once real
server data was checked against, not assumed from the WO text or the doc's own prior claims.
