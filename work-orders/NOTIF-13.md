# WORK ORDER NOTIF-13 (ui-core-micha + django-core-micha) — Layer-1 transport extraction

**EXECUTION DIRECTIVE.** Implement through `codex exec` in the background — invoked **directly via
Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). The seams below are **verified against the landed code**
(ucm 2.12.0, dcm 2.32.0) and are the required scope. The Orchestrator fills the exact line map.

## TIER
Tier 2 — restructures a provider that **cockpit consumes in production**, and changes a WebSocket
message contract shared across apps. Independent `reviewer` mandatory. Per AGENTS.md Tier 2,
`sec_reviewer` is NOT auto-included; request it only if the operator asks.

## GOAL
Turn ucm's notification-only socket into a generic **Layer-1 realtime primitive**: one socket,
subscribe-by-message-type, so a second domain (messaging) can ride it without being misread as a
notification. **Additive**: `NotificationsProvider` remains the sole mount point and its public
context value is unchanged (operator decision 2026-07-29).

## EXPECTED OUTCOME
- ucm exports a `useRealtime()`-style subscribe primitive alongside the unchanged `useNotifications()`.
- An unknown/unsubscribed message type is **ignored** instead of being appended to the notification feed.
- No app has to change its provider tree. cockpit and jg keep working untouched.
- NOTIF-15 (jg bell adoption, retiring jg's local context) becomes implementable; Phase B messaging
  gets its substrate.

## CONTEXT PACKAGE — verified current state

**ucm `src/notifications/NotificationsProvider.jsx` (232 LOC)** owns *both* the socket and the
notifications domain state:
- socket ownership: `socketRef`, `connect()`, exponential backoff `INITIAL_BACKOFF_MS` 1s →
  `MAX_BACKOFF_MS` 30s, auth-gated effect keyed on `[authenticated, refresh, replaceNotifications, wsUrlBase]` (`:87-179`).
- `handleMessage` (`:103-133`) dispatches on exactly **one** envelope type, `notification.status` (`:111`).
- **The blocker:** everything else falls through to `normalizeNotificationPush(data)` and is appended
  to the feed with `unreadCount + 1` (`:130-132`). A messaging payload on this socket becomes a fake
  notification today.
- **Field overload — the reason a third stream cannot simply be added:** in the status branch
  `data.type` is the *envelope* type; in the new-notification branch `normalizeNotificationPush`
  reads `data.type` as the *domain* notification-type key (`:25`). One field, two meanings. The
  envelope contract must resolve this without breaking either reading.
- WS URL hardcoded to `/ws/notifications/` (`:36`, `:40`).
- exports in `src/index.js:48` (`NotificationsProvider`, `useNotifications`).

**dcm transport is ALREADY generic — correct the roadmap wording here.** The roadmap §4 calls for a
"dcm multi-stream consumer"; that overstates the dcm work:
- `notifications/delivery.py::push_to_users(users, payload)` (`:20-43`) fans an **arbitrary** payload
  into the per-user group `notifications_user_{id}`.
- `notifications/consumers.py::NotificationConsumer.message()` (`:21-22`) is `send_json(event["payload"])` —
  fully stream-agnostic. jg's messaging **already** rides this same group via `push_to_users`.
- The only dcm-side envelope producer is `notifications/views.py:235` (`"type": "notification.status"`);
  the contract is documented at `views.py:3`.
- **So the dcm work is the envelope contract + a thin authoring helper + doc — NOT a consumer rewrite.**

**Reference implementation to promote:** jg's `frontend/src/context/NotificationsContext.jsx` (91 LOC,
docstring "WebSocket owner only") already does exactly this multiplexing with
`registerMessageCallback` / `registerChatCallback`. Read it for the shape. **Do not edit jg here.**

## SCOPE

**A. ucm — extract the socket into an internal realtime core.** Single owner; preserve the existing
backoff, reconnect, auth-gating and cleanup semantics **verbatim**. Expose
`subscribe(type, handler) -> unsubscribe`.

**B. ucm — `NotificationsProvider` becomes the first subscriber.** It registers handlers for the
notification envelope types. Its returned context value stays **exactly**
`{ notifications, unreadCount, markSeen, markDismissed, markDone, refresh }`.

**C. Envelope contract.** Introduce an explicit envelope discriminator that does not collide with the
domain `type` field (see the field-overload note above). Unknown / unsubscribed envelope types are
**ignored** — the catch-all at `:130-132` dies. This is a deliberate behaviour change and must be
called out in the CHANGELOG.

**D. Backward compatibility in BOTH directions** — apps pin dcm and ucm independently, so mismatched
versions are normal:
- *new ucm + old dcm* (payload has no envelope field): must still be recognised as a new notification,
  exactly as today. Without this the feed silently goes dead against an un-bumped backend.
- *old ucm + new dcm*: dcm must keep emitting the legacy fields so a ucm 2.12.0 client is unaffected
  (**cockpit runs 2.12.0 in staging/prod**).

**E. dcm — formalize the contract.** Document the envelope next to `views.py:3` and add a thin
authoring helper so producers stop hand-rolling the dict. `push_to_users`'s signature stays unchanged.

## DO NOT TOUCH
- **jg-ferien** (`NotificationsContext.jsx`, `MessagingContext.jsx`) — that is NOTIF-15.
- The messaging domain itself — Phase B (`MSG-*`).
- `NotificationBell.jsx`, `NotificationSettings.jsx`, `feedApi.js`, the `feed/*` REST contract.
- `BaseSecureConsumer` / S112 permission model, `IsAuthenticatedWs`, the group name `notifications_user_{id}`.
- **No standalone `RealtimeProvider` export that apps must mount.** Operator decision 2026-07-29:
  additive only. A standalone provider is a later, separate WO if a second consumer ever needs it.
- Reconnect/backoff semantics and the single-socket-owner invariant — preserve, do not "improve".
- Schema, migrations, dependencies, CI.
- **No app pin bumps** in this WO (cockpit/jg stay where they are).

## RISKS
- **Silent feed death** if C lands without D: an envelope-less payload from an older dcm would be
  ignored instead of shown. D is not optional.
- **cockpit is a live consumer** at ucm 2.12.0 — any change to the returned context shape breaks it.
- **Subscription leaks / double delivery:** `subscribe` must return a stable unsubscribe, and handlers
  must **survive reconnects** without the caller re-registering them.
- **Reconnect loop:** the socket effect currently depends on `refresh` / `replaceNotifications`;
  moving the socket out must not make the socket re-create on every feed update.

## REQUIRED TESTS / ACCEPTANCE
ucm runs `vitest` (`pnpm test`) and has **no tests under `src/notifications/` today** — this WO adds
the first ones:
- an unknown envelope type is ignored: feed and `unreadCount` both untouched (the regression that
  protects messaging from being misread as a notification);
- two subscribers on distinct types each receive only their own messages, from **one** socket —
  assert exactly one `WebSocket` was constructed;
- `unsubscribe` stops delivery for that subscriber and does not affect the others;
- handlers keep receiving after a close → backoff → reopen cycle, with no re-registration by the caller;
- a legacy envelope-less payload still lands in the feed (backward-compat D);
- `notification.status` handling and the `unreadCount` delta are unchanged — this guards the NOTIF-6
  R1 fix (badge went stale after a cross-device mark);
- `NotificationsProvider`'s public context value is unchanged.

Plus `pnpm build` (tsc) green. If E lands in dcm, run the dcm notifications `pytest` package.

## RELEASE
ucm minor bump + publish (publish-from-main). dcm only if E lands there — then publish-from-main with
a **registry live-check before any app pin bump**. No app pin bumps in this WO.

## TARGET REPO / WORKING DIRECTORY
- Primary: `C:\Users\biglmi\Documents\webapps\ui-core-micha`
- Secondary (scope E only): `C:\Users\biglmi\Documents\webapps\django-core-micha`
- Never the workspace root `…\webapps`.
Both are platform repos: commit directly to the trunk, no feature branches.

## PROGRESS CONTRACT
Emit a `PLAN: <step1> | <step2> | …` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` **before every relevant action** (file opened, file
edited, command/test run) and `PROGRESS: [<n>/<total>] done` on step completion, spaced so no gap
exceeds ~2 min. stdout unbuffered. Exactly one final `RESULT: DONE|BLOCKED <reason>`.

## MINI-HANDOVER (paste into a fresh Orchestrator session)
```
Orchestrator: implement work-orders/NOTIF-13.md in ui-core-micha (main; scope E also touches
django-core-micha). git pull first, read the WO, then follow orchestrate-codex (Codex-first, own
independent review, commit on green).
```
