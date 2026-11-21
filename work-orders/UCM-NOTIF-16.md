# UCM-NOTIF-16 — Complete notification inbox and personal channel controls

**Target** `ui-core-micha` on `main`

**Tier** 3 for shared notification UI, state management and account isolation.

**Status** Prepared for Gate #1. Backend contract dependency [DCM-NOTIF-30](../../django-core-micha/work-orders/DCM-NOTIF-30.md).

## A. Envelope

### Goal

Ship one UCM release that completes the notification bell from `jg-ferien` JG-FIX-21 and exposes the personal channel settings from JG-NOTIF-29. The bell reaches older entries, accurately marks the full unread inbox, and stays tied to the current account. Profile settings distinguish general defaults and per-category choices. The app adopts the compatible DCM and UCM releases together.

### 1. Reach older notifications from the bell

The shared provider currently consumes the first response page. The unread badge covers the account's full eligible inbox, while the displayed list stops at 20. Extend the existing bell interaction and reuse its current compact layout and deep-link callback.

- Older entries are reachable through a single **Load more** action while additional pages exist. Preserve loaded items, keep their server order, and merge live updates by stable recipient identity. Repeated or slow loads cannot duplicate rows or collapse the menu. End of feed, loading and fetch failure have distinct accessible states. A page-load failure leaves the current list available and offers retry.
- An individual read action persists and updates the unread badge. Selecting a row follows its existing string link via the consumer callback and closes the bell. A row with no link can still be marked as seen. The app owns conversion of typed task actions into those links.
- Keep controls and older entries reachable with keyboard and on small screens. Preserve translated labels, focus behaviour, and the existing affordance for empty feeds. Keep a single shared notifications provider and bell per consumer mount.

### 2. Mark the whole inbox accurately

- Use the DCM-NOTIF-30 account-scoped mark-all API for **Mark all as read**. The UI reconciles from the server result. Entries arriving after the operation's boundary remain unread, including live arrivals that reach the client while the request is pending. Reloading gives the persisted badge and seen state.
- A failed or stale write cannot show false success. Preserve current unread information or recover it from a successful account-scoped read, announce the failure, and provide a usable retry. A compatible server that lacks bulk marking uses accurately scoped wording for any retained first-page action. Verify feature detection against the actual paired contract and a backend without it.
- Apply the account isolation required by this shared state path. On a real account change, close or clear the old list and badge together, reload the new account's data, and invalidate in-flight requests and subscriptions belonging to the previous account. This folds the planned UCM-NOTIF-15 account-switch finding into the same provider change. A late page, seen response or real-time event cannot populate the new account's view with the prior account's data.

### 3. Offer personal category and channel choices in the existing settings

- Extend the shared `NotificationSettings` with the authenticated DCM preference pairs that the host app exposes. In `jg-ferien` these are chat email, chat browser push and task digest email. Existing app-wide email, browser subscription and preview controls remain available.
- For each supported pair show **General setting**, **On** and **Off**, the effective choice, and technical unavailability for push where relevant. A reset follows the general preference again. The screen reflects a successful server update for only the chosen row and retains coherent values when saving fails or the active account changes. A global setting change updates the effective display of inherited rows.
- Keep browser device state distinct from desired delivery. A user may select the chat push preference while the device lacks an active subscription, with the same existing register and unregister controls. The category controls cannot grant access, change recipients, or replace activity or membership checks. For apps that expose zero pairs or run a compatible older DCM version, keep their existing settings surface usable.
- User-facing labels for the new shared controls are translated using the shared notification vocabulary. Host-provided labels and availability are driven by the DCM response. The `jg-ferien` prototype illustrates the three rows and their relationship to the general controls. The organisation settings, event exceptions and area-level envelope popup belong to `jg-ferien`.

### Contract, scope and release

Implement the wire contract in [DCM-NOTIF-30 Part A](../../django-core-micha/work-orders/DCM-NOTIF-30.md#shared-wire-contract-for-ucm-and-app-adoption). Use the same-origin `next` continuation and stable recipient ID, the `capabilities.mark_all_seen` signal and scoped bulk endpoint, and the `notification.inbox_changed` invalidation. Reconcile loaded rows and the badge from the active account's authoritative refresh, including a new live arrival during an outstanding mark action. Use the channel-matrix read and update/reset contract to render the declared pairs. A missing matrix route exposes existing general controls. A backend advertising zero pairs returns an empty list. Preserve existing shared consumers' supported entry points and exports. Changes to app-specific rule panels, dispatch policy, device privacy defaults, chat contents, public permissions and unrelated app UI require their owning scope.

Produce one compatible UCM release and document new capabilities, legacy fallback and the required DCM feature contract in the changelog. `jg-ferien` consumes it with the paired DCM version and one set of app integration checks. Coordinate disposition of UCM-NOTIF-15 in the register after the account-isolation acceptance passes.

### Required tests to write

| ID | Expected result |
| --- | --- |
| UCM-FEED-1 | Load a 20-row first page and then the remaining page. Repeated loading and a same-ID real-time event keep one row in stable order. Preserve the first page on fetch failure, retry, and stop offering more after the final page. |
| UCM-FEED-2 | Mark one row and follow its string link. Mark all with older unloaded unread rows, a newly arrived row outside the server boundary and a transport failure. Check persisted state after refresh, accurate badge and correct fallback on the old feed contract. |
| UCM-IDENTITY-1 | Switch from A to B without logout during an in-flight load and a mark action. A's rows and badge clear, B's data loads, late A results cannot overwrite it, and B's socket updates are received. Repeat for a normal logout and fresh login. |
| UCM-PREF-1 | Show only offered pairs with correct inherited and explicit states. Set independently, reset, change the general fallback and verify the display against server responses. A failed save preserves state and can be retried. |
| UCM-PREF-2 | Missing device subscription with push preferred, successful registration and removal, general preview preference, and zero pairs or absent new capability on legacy backends. |
| UCM-VIEW-1 | Verify the open bell and populated profile controls with keyboard, zoom or small viewport, long translations and load/failure states. The 375 and 1280 CSS-pixel checks in JG-NOTIF-29 cover corresponding `jg-ferien` surfaces. |

## B. Implementation map

Working directory `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.

| Area | Inputs and named files |
| --- | --- |
| Paging and marking | `src/notifications/feedApi.js:3,15`, `NotificationsProvider.jsx:57` and `NotificationBell.jsx:19`. Extend `tests/notificationsApi.test.js`, `NotificationsProvider.test.jsx` and `NotificationBell.test.jsx`. Confirm the public `useNotifications` surface still supports existing consumer behaviour. |
| Account lifecycle | `src/notifications/NotificationsProvider.jsx` reads `AuthContext`, the bootstrap notification seed, and the shared real-time hook. Follow the established account ID for bootstrap, REST and socket lifecycles. Verify the affected auth and real-time tests alongside explicit stale-response cases. |
| Preferences | `src/notifications/NotificationSettings.jsx:65`, `api.js`, the notification entry exports, and `src/i18n/notificationsTranslations.ts`. Reuse current components and theme. Extend `tests/NotificationSettings.test.jsx` and the notification API tests, with registered pairs and absent features. |

The backend contract lives in DCM-NOTIF-30. Consumer-side references are `jg-ferien/frontend/src/pages/AccountHubPage.jsx:467`, `frontend/src/components/Header.jsx:217`, and `frontend/src/components/mobileShell/AppHeaderMobile.jsx:45`. The authoritative `jg-ferien` prototype pin and adopted criteria belong to JG-NOTIF-29. Match the shared UCM settings pattern, and use synthetic data for UI validation.

### Implementer preamble

> You are the dispatched implementer for the named UCM scope. The committed Parts A and B are the complete specification. Read the nearest instructions, relevant role skill and memory for conventions. Start with the exact command `codex-hook-canary-ws-gov-60`. Expect `WS-GOV-60 canary: workspace hooks are active`. Report unverified coverage once if absent.
>
> Edit assigned source and tests only and run only the tests you wrote once. The Orchestrator owns releases, pins, dependency management, review, wider tests, register and Git. Do not invoke `codex` or `codex exec`. Leave an uncommitted diff. Read focused ranges, use behaviour-based test names, emit `PLAN` and `PROGRESS` lines, and end with `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## C. Orchestrator only

> Implementer instructions end at Part B.

1. Record Gate #1 and confirm the paired API contract. Use the configured implementer and the independent Tier 3 general, UI and security review lenses. Focus the security work on account switching, late responses and preference ownership. Confirm scope against JG-FIX-21 and JG-NOTIF-29.
2. Run the authoritative shared notification, relevant auth, preference, translation and WebSocket-related frontend tests. Check selected desktop and mobile states against the real shared components. Verify old-backend fallback and the published DCM contract separately.
3. Land and verify a single UCM package publication through the existing workflow. Record its version and compatible DCM version, then provide both to the app integration. Account-specific fixes and the previously tracked UCM-NOTIF-15 require fresh acceptance evidence before register closure.

## Completion

Implementation, reviews, compatibility evidence and release are pending.

## Gate record

On 2026-11-21 the operator requested preparation of the combined Core package alongside JG-NOTIF-29. Gate #1 for code implementation is pending.
