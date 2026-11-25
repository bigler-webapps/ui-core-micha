# UCM-NOTIF-18 — Web Push actions in the canonical service worker

## A. Envelope

**Tier:** 3 (shared worker and authenticated action transport). **Target:** `ui-core-micha`, `main`. **Companion:** `DCM-NOTIF-32`. **First consumer:** Gustav (`GUS-NOTIF-5`, proposed in `GUS-NOTIF-6`).

### Goal and existing capabilities

The canonical worker shows optional browser-push actions and lets a recipient mark a notification done without opening the app. The current worker already displays the title and body, forwards icon and badge, and navigates on normal notification clicks using same-origin URLs. Gustav imports a copy at `frontend/public/gustav-push-handler.js` through its PWA build. The existing UCM feed already handles the canonical DCM `notification.status` event.

### Scope and acceptance

- **Display.** Preserve `title`, `body` and `url` for notifications from existing DCM versions, including the existing basic fallback. Pass supported `icon`, `badge`, `tag`, `renotify` and the known actions through to `showNotification`. Use DCM's localized action titles. Skip invalid options and unknown actions. Pass `renotify` only when a tag exists. Unsupported actions or optional display fields must leave a usable basic notification. The tap-to-open path and the feed remain available on iOS and other clients without buttons.
- **Open.** A normal tap opens the existing notification URL. The `open` action can override it via its same-origin URL, and otherwise uses the existing destination. Preserve focus and navigation of an existing app window and the existing new-window fallback. Parse each target against the app origin and pass the validated absolute HTTP(S) URL directly to `navigate` or `openWindow`, including for paths with multiple leading slashes. Empty, malformed, credential-bearing and cross-origin destinations fall back safely within the app.
- **Done.** Offer `done` only when the payload contains a `done_token`. For each click, fetch a masked Django CSRF token from `GET /api/notifications/push/csrf/`. On a usable `200` JSON response, send `POST /api/notifications/push/done/` with `X-CSRFToken` from `csrf_token` and JSON `{ "token": "…" }`. Use fixed same-origin routes, the current session, `mode: same-origin`, `credentials: same-origin`, `redirect: error` and `cache: no-store` for both requests. The POST sets `referrerPolicy: same-origin` so the browser supplies the same-origin `Origin` header under a stricter worker default. Keep the CSRF proof in memory for that click and send the action token only in the completion POST. The handler works with every app window closed. Keep tokens out of URLs, logs, analytics and messages to other clients. Unknown actions trigger no mutation.
- **Success and failure.** A confirmed HTTP 204 from the completion POST closes the notification. A bootstrap failure stops the sequence before the POST. On expired or invalid token, logout, account switch, offline or network failure, the worker does not present success. Keep the notification available where the platform permits it. The consumer's in-app completion action is the fallback, including after the platform removes the native notification. The `done` handler opens no window on success or failure and queues no later offline action.
- **Compatibility.** Accept base-only payloads and preserve their existing behaviour. Keep backward compatibility for support gaps in browser notification options and for old worker copies receiving DCM's extended payload. Include the canonical worker in the package artefact and record an additive release for Gustav to pin.

### Exclusions and risks

Gustav owns its icons, grouping rules, localized labels and update of the imported worker copy. No new settings, feed UI, app-specific actions or offline queue is included. Browser/OS controls which buttons are shown and whether a failed action can leave the system notification visible. The already approved Gustav prototype remains the reference for its app adoption.

### Required tests to write

- Test legacy and base-only payloads, all allowed options and labels, valid and missing tags with `renotify`, unknown actions, omitted token and unavailable or rejected display options. Confirm the base notification remains usable.
- Test normal tap and `open` with valid same-origin URLs, unsafe destinations, focus of an existing window and the new-window path. Assert the final navigation arguments for an absolute same-origin URL whose pathname starts with multiple slashes. Confirm the action URL cannot change the API request destination.
- Test the exact CSRF GET and completion POST, including headers, credentials, no cache and redirect rejection. A denied, redirected or malformed bootstrap must leave the POST unsent. Cover `204`, rejected responses, network failure and double click. Verify no window opens, no auto-replay is queued and the worker closes the notification only on confirmed success where its API controls that state. Check the package carries the updated worker.

## B. Implementation map

- `src/notifications/serviceWorker/sw.js` owns the canonical push and click handler, same-origin navigation and notification options.
- `src/notifications/feedApi.js` and `src/notifications/realtime.jsx` describe the existing DCM API prefix and feed status update used by consumers.
- `package.json`, `tsconfig.build.json` and `CHANGELOG.md` cover distribution of the worker and release notes.
- `tests/notificationFeedContract.test.js` and `tests/notificationsExports.test.js` are existing notification contract checks. Gustav's `frontend/tests/unit/gustavPushHandler.test.js` shows a worker harness.
- Environment: copyable Service Worker script at the app origin, HTTPS in consumer use, DCM session cookies and the wire contract in `DCM-NOTIF-32`. Browser capabilities vary.

## Preamble

> **You are the dispatched implementer, not the Orchestrator. Never delegate, dispatch, review,
> run `codex` or `codex exec`, write to git or edit the register or `.claude/codex-status.md`.**
>
> **Your first tool action is the exact command `codex-hook-canary-ws-gov-60`. Expected denial:
> `WS-GOV-60 canary: workspace hooks are active`. Otherwise report unverified hook coverage once
> and continue with the existing gates.**
>
> Read the nearest `AGENTS.md`, relevant role skill and `MEMORY.md` for conventions. This work
> order is the complete specification. Edit the scoped source and tests. Run only the new tests
> you wrote. The Orchestrator runs the authoritative evidence and independent reviews. Do not
> install dependencies, touch lockfiles, update memory, edit `WORK_ORDERS.md` or write to git. Use
> cohesive files named by behaviour. If a test cannot run in the sandbox, report `TESTS NOT RUN:
> <reason>`. Start with `PLAN:`, report progress and end with `RESULT: DONE` or
> `RESULT: BLOCKED <reason>`.

## C. Orchestrator only

> **Implementer: stop here.** The Orchestrator owns dispatch, review, evidence and release.

- Follow `orchestrate-codex` for the Tier 3 review and authentication/transport evidence. Verify the packaged worker with a synthetic push against DCM using a real session cookie, normal CSRF validation and no open app window.
- Link the companion release and Gustav's `GUS-NOTIF-5` uptake. Consumer acceptance checks both buttons on supported Android and desktop browsers, tap-to-open on iOS, and completion through the bell after a failed push click or when action buttons are unavailable.

## Gate record

The operator confirmed the session, expiry and failure-handling requirements in the Gustav Notifications chat on 2026-11-25.

The operator requested integration of the review findings on 2026-11-25. The masked CSRF token route and the revised Envelope await Gate #1 for implementation.
