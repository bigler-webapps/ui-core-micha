# Messaging parity outcomes (MSG-3b)

This is the authoritative MSG-3b parity record. It replaces the former
file-level “final parity confirmation,” which was not sufficient evidence of
feature parity. Each entry maps directly to the numbered checklist in Part A
of `work-orders/MSG-3b.md`. `OK` means the capability is present; `DEV` means
an intentional, documented redesign or non-parity; `BLOCKED` means dcm 2.36.1
does not expose the data or realtime contract needed to implement it truthfully.

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
18. **OK** — The launcher displays the host-supplied candidate list and selection state.
19. **OK** — It has distinct empty and in-flight creation states; candidate discovery remains host-owned because dcm has no directory endpoint.
20. **OK** — Start is disabled until a candidate is selected and during creation.
21. **OK** — Policy rejections render an API-derived readable error in the dialog.
22. **OK** — The picker uses a fullscreen MUI dialog at the small breakpoint.

## Threading and quoting

23. **OK** — Both dcm’s `reply_to_id` and optimistic rows’ `reply_to` are read, so REST and realtime replies group under their root.
24. **OK** — Replies show a sender and short quoted snippet.
25. **OK** — Clicking a quote scrolls its source message into view.
26. **OK** — Quotes of deleted messages render the deleted placeholder rather than stale content.
27. **BLOCKED** — dcm writes a thread receipt but exposes no prior thread receipt state, unread flag, or unread count to read. A truthful cross-device unread-reply dot cannot be rendered without a dcm contract addition.
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

38. **BLOCKED** — dcm does not serialize `last_message`, so a last-message preview cannot be made correct against the real backend.
39. **OK** — `last_message_at` renders through browser-native, locale-aware `Intl.RelativeTimeFormat` labels.
40. **OK** — The existing MUI `selected={conversation.id === activeConversationId}` wiring produces the `Mui-selected` active-row highlight; it was verified and needs no redundant styling.
41. **OK** — Unread badges and bold unread titles are present.
42. **BLOCKED** — dcm stores the managed all/team distinction in `external_key` but omits it from conversation serialization. The UI must not guess from titles or other unrelated fields.
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

51. **BLOCKED** — dcm has no poll read serialization for question, option, or count data; client-side fabrication would hide the backend contract gap.
52. **BLOCKED** — Per-option voter names are likewise absent from dcm’s readable poll contract.
53. **BLOCKED** — Closed state and disabled-voting rendering depend on that absent poll read contract.
54. **OK** — Composer starts at two options and disables adding options once it reaches ten; the server’s two-option minimum remains enforced.
55. **OK** — Vote and close write paths are wired; their full read rendering remains subject to rows 51–53.

## Live synchronization

56. **BLOCKED** — Reaction frame handling remains intentionally ready, but dcm 2.36.1 does not emit `reaction` frames.
57. **BLOCKED** — Poll-update frame handling remains intentionally ready, but dcm 2.36.1 does not emit `poll_updated` frames.
58. **BLOCKED** — Conversation reorder and preview refresh require dcm’s missing `last_message` projection.
59. **OK** — dcm’s emitted message, message-edited, and message-deleted frames are handled live.

## Required backend follow-up

Rows 27, 38, 42, 51–53, and 56–58 require a future dcm work order: expose readable thread receipt state, serialize `external_key` where managed all/team labeling is required, define and serialize the poll read contract, add `last_message`, and emit the designed realtime frames. Until then, these are explicit BLOCKED outcomes rather than simulated client behavior.
