# UCM-NOTIF-18 — Web Push actions in the canonical service worker

## A. Envelope

**Tier:** 3 (shared worker and authenticated action transport). **Target:** `ui-core-micha`, `main`. **Companion:** `DCM-NOTIF-32`. **First consumer:** Gustav (`GUS-NOTIF-5`, proposed in `GUS-NOTIF-6`).

### Goal and existing capabilities

The canonical worker shows optional browser-push actions and lets a recipient mark a notification done without opening the app. The current worker already displays the title and body, forwards icon and badge, and navigates on normal notification clicks using same-origin URLs. Gustav imports a copy at `frontend/public/gustav-push-handler.js` through its PWA build. The existing UCM feed already handles the canonical DCM `notification.status` event.

### Scope and acceptance

- **Display.** Preserve `title`, `body` and `url` for notifications from existing DCM versions, including the existing basic fallback. Pass supported `icon`, `badge`, `tag`, `renotify` and the known actions through to `showNotification`. Use DCM's localized action titles. Skip invalid options and unknown actions. Pass `renotify` only when a tag exists. Unsupported actions or optional display fields must leave a usable basic notification. The tap-to-open path and the feed remain available on iOS and other clients without buttons.
- **Open.** A normal tap opens the existing notification URL. The `open` action can override it via its same-origin URL, and otherwise uses the existing destination. Preserve focus and navigation of an existing app window and the existing new-window fallback. Validate destinations before navigating. Empty, malformed and cross-origin destinations fall back safely within the app.
- **Done.** Offer `done` only when the payload contains a `done_token`. Send `POST /api/notifications/push/done/` with the current same-origin session and JSON `{ "token": "…" }`. Use the token only for this request. The worker must not follow redirects for the completion request or expose the token in URLs, analytics, messages to other clients or logs. Unknown actions trigger no mutation.
- **Success and failure.** A confirmed HTTP 204 closes the notification. On expired or invalid token, logout, account switch, offline or network failure, the worker does not present success. Keep the notification available where the platform permits it, with the ordinary in-app path as the fallback. The `done` handler opens no window on success or failure and queues no later offline action.
- **Compatibility.** Accept base-only payloads and preserve their existing behaviour. Keep backward compatibility for support gaps in browser notification options and for old worker copies receiving DCM's extended payload. Include the canonical worker in the package artefact and record an additive release for Gustav to pin.

### Exclusions and risks

Gustav owns its icons, grouping rules, localized labels and update of the imported worker copy. No new settings, feed UI, app-specific actions or offline queue is included. Browser/OS controls which buttons are shown and whether a failed action can leave the system notification visible. The already approved Gustav prototype remains the reference for its app adoption.

### Required tests to write

- Test legacy and base-only payloads, all allowed options and labels, valid and missing tags with `renotify`, unknown actions, omitted token and unavailable or rejected display options. Confirm the base notification remains usable.
- Test normal tap and `open` with valid same-origin URLs, unsafe destinations, focus of an existing window and the new-window path. Confirm the action URL and token cannot be used to send a request to another origin.
- Test the exact `done` request and successful 204, rejected/malformed responses, network failure and double click. Verify no window opens, no auto-replay is queued and the worker closes the notification only on confirmed success where its API controls that state. Check the package carries the updated worker.

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

- Follow `orchestrate-codex` for the Tier 3 review and authentication/transport evidence. Verify the packaged worker with synthetic push payloads against the DCM contract.
- Link the companion release and Gustav's `GUS-NOTIF-5` uptake. Consumer acceptance checks both buttons on supported Android and desktop browsers and tap-to-open plus feed completion on iOS.

## Gate record

The operator confirmed the session, expiry and failure-handling requirements in the Gustav Notifications chat on 2026-11-25.
