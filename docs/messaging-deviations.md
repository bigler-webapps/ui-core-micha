# Messaging deviations from jg

## Chunk 5 — reactions, polls and scope configuration

- Reactions use a compact set of common emoji choices plus the aggregate chips, rather than jg's full third-party emoji palette. Adding and toggling every reaction remains available through the same REST mutations; the shared package avoids a new picker dependency.
- Poll creation is a Composer dialog instead of jg's Thread-coupled dialog. It retains question, two-or-more options and multiple-choice selection, while keeping composition independently mountable.
- Poll results are rendered inline as an accessible option list with live aggregate counts. Closing is only offered when the serialized creator/capability allows it; a server-side 403 remains visible as a validation error.
- Scope messaging configuration is an independently mountable component addressed by conversation id, rather than jg's event-id-specific settings panel. The host supplies placement and capability gating; it retains dm policy, group-chat enablement and everyone-can-post controls.
- **Announcement composing (jg's `AnnouncementDialog.jsx`) was missing from the first chunk-5 pass — flagged by independent review and corrected before commit, not silently accepted as a gap.** `Composer` now offers an announcement mode (title + body + a host-supplied `link_target`) behind an `allowAnnouncement` prop, since whether to offer it at all is a host/capability decision the client cannot make on its own; only the target-link *value* is host-specific navigation context ucm cannot compute (jg pre-fills it from the currently open event-info section — same reasoning as `linkTarget`'s framing here). Uses the same `sendMessage`/`kind` plumbing chunk 1 already built, with `kind: 'announcement'`.

## Final parity confirmation

- The provider/cache, conversation list and launchers, timeline/replies/read ticks, composer/attachments/announcements, reactions, polls and scope configuration are all represented by exported ucm surfaces. Host routing and scope selection remain host responsibilities by design.
- The known broadcast-list pre-open unread/preview gap is retained as the accepted Chunk 2 deviation.
- Every jg messaging file named in the work order's parity inventory (`Thread.jsx`, `ConversationList.jsx`, `MessagingContext.jsx`, `AnnouncementDialog.jsx`, `MessagingConfig.jsx`, `NewDirectMessageDialog.jsx` — unblocked by MSG-2b, `messagingApi.js`, `EmojiPickerButton.jsx`, `conversationHelpers.js`, `MessagesPage.jsx`'s launcher behavior) is represented by an exported ucm surface or an explicitly named deviation above — this line was corrected during chunk 5's independent review, which is exactly the check it exists to catch.

## Chunk 4 — composer and attachments

- The composer is an independently mountable provider collaborator and accepts the timeline's reply target as a small placement prop, instead of being coupled into jg's monolithic `Thread`. It preserves reply selection and clears that selection after a successful send.
- Attachment previews are compact authenticated thumbnail fetches with explicit download actions rather than jg's gallery/lightbox. Preview and download retain viewer-gated byte access; the licensed interaction redesign avoids a second media-viewer state machine in this shared surface.

## Chunk 3 — timeline, replies and receipts

- The timeline is split into `Thread`, `MessageBubble` and `ReadTicks`, with a simple expandable reply view rather than jg's coupled full-screen/thread-pane state. This preserves one-level reply viewing while allowing each surface to mount independently.
- Reply selection is exposed through `onReplyTargetChange` rather than embedding a temporary composer. The next Composer surface consumes that context, avoiding a second compose state machine.
- Older history automatically loads when the timeline reaches the top and also provides an explicit accessible button. Both use the server-issued opaque cursor; jg's timeline interaction is redesigned, not removed.
- This chunk intentionally leaves reactions, polls and attachments as non-interactive count/type chips. Their existing jg capabilities are scheduled for chunks 4/5, rather than reproduced as disposable interaction implementations here.
- Read ticks reproduce jg's `shouldShowReadTick(msg, isOwn)` semantics exactly: a `ReadTicks` collaborator is only mounted for the current user's own messages, matching jg's meaning of a read receipt (whether the sender's own message was seen) and bounding the number of `getMessageReadStatus` REST calls a rendered timeline fires to one per own message shown, not one per message in the conversation.

## Chunk 2 — conversation list and launchers

- The list is a standalone, provider-backed component rather than receiving a conversation array and selection state from a page. This removes the page-owned messaging state machine while preserving selection through the host's `onOpen` placement callback.
- Launchable group metadata is an explicit host-supplied `groupLaunchers` input, rather than jg's event-specific `listGroupsAvailable` request. The published dcm REST contract has no generic group-discovery endpoint; apps own scope pickers while ucm owns opening and surfacing the conversation.
- Broadcast opening is exposed as `broadcastLauncher` plus `autoOpenBroadcast`, rather than inspecting jg's `?tab=broadcast` query itself. Routing/query parsing stays host-app scope; auto-*open* is reproduced once the host maps its route to that boolean.
  - **Accepted deviation, not full parity:** jg's `MessagesPage.jsx` unconditionally fetches the broadcast conversation on every event load and pins it, with live unread count and message preview, at the top of the same recency-sorted unified list. ucm instead renders a static launcher button (no unread badge, no preview) until it is opened for the first time, at which point it becomes a normal list row with real unread/preview state and the launcher hides itself. Before that first open, a host relying on the broadcast conversation's unread state being visible without a click does not get it from ucm.
- The layout and actions are redesigned as a compact MUI list with per-conversation overflow actions and explicit cursor “Load more,” replacing jg's page sidebar composition. Features retained here are unread indication, opening conversations, unopened-group launches, broadcast launch (see above for the surfacing gap), mute and archive. Per-kind row icon (group/broadcast/DM) is reproduced (jg's `getConversationAvatar`), using generic MUI icons rather than jg's per-kind avatar treatment (incl. the DM partner's actual `UserAvatar`) — the identification capability is kept, the specific visual is redesigned.
