# UCM-PERF-4 — Opt-in: start the app shell from one bootstrap request

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: an app that opts in starts its auth and notification state from dcm's bootstrap endpoint
  (`DCM-PERF-4`) in one request, instead of a CSRF request, then `users/current` +
  `auth-methods`, then the notification feed + unread count.
- Expected outcome:
  - With the opt-in enabled on the auth provider, page start issues one bootstrap request (no
    separate CSRF request before it, no `users/current`, no `auth-methods`, no initial feed or
    unread-count request). User, auth methods and notification state end up exactly as they would
    have from the separate requests.
  - `NotificationsProvider` starts from the bootstrap's feed and count; the notification WebSocket
    still connects only after that initial state is in place.
  - The app can read each extension payload from the bootstrap by its provider name (for hram: its
    application-access data), without its own request.
  - If the bootstrap request fails for any reason (a non-200 answer such as dcm's
    `bootstrap_part_failed`, `bootstrap_unavailable` or a 404 from a backend without the endpoint,
    or a network error), ucm falls back to today's separate start requests once, so every part
    succeeds or fails exactly as it does today (operator decision 2026-10-22).
  - With the opt-in off (the default), behaviour is exactly today's.

## Background (measured 2026-10-21 from Tanzania)

From Tanzania each serial request level costs at least about 400 ms (Cloudflare edge in
Johannesburg plus origin in Germany). Today's start sequence in `AuthContext` and
`NotificationsProvider` takes two levels, three on a first visit without a CSRF cookie.

## Scope + non-goals

- In scope: the opt-in on the auth provider, the bootstrap call, seeding the auth and notification
  state from it, and a way for the app to read extension payloads.
- Decided in the requirements round (2026-10-21): adoption is opt-in per app, so a pin bump alone
  changes nothing for apps that do not enable it.
- Non-goals / do not touch:
  - later refreshes keep using the existing endpoints: login, logout, MFA steps, profile updates,
    notification refresh and mark actions;
  - WebSocket protocol and reconnect behaviour;
  - no change for apps without the opt-in, including their request sequence;
  - no backend change (that is `DCM-PERF-4`).

## Tier · precondition / gate

- Tier 3: shared-core change on the auth bootstrap path.
- Precondition: `DCM-PERF-4` has landed, so the endpoint's path and response contract are fixed.
  Met 2026-10-22: released in django-core-micha 3.17.0; contract in django-core-micha
  `docs/design/bootstrap.md`.
- Release ordering: the dcm release carrying `DCM-PERF-4` is published before any app enables the
  opt-in.

## Risks

- dcm's bootstrap fails as a whole when any one part fails (for example a feed error or a throttled
  part). Treating that as "signed out" would show a signed-in user as signed out when only the feed
  failed; the fallback to the separate start requests prevents it. The fallback runs at most once
  per start, never loops, and never runs when the bootstrap succeeded.
- Loading-state timing: today `loading` stays true until both start requests settle; the opt-in
  path must not render protected routes earlier or later than that.
- Notification seeding: the WebSocket must not connect before the seeded state is in place (the
  existing comment in `NotificationsProvider` explains the race this prevents).
- An app that enables the opt-in against a backend without the endpoint gets a failed bootstrap; the
  adoption WO pins dcm first, and the fallback keeps such an app working as today.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- Opt-in on: start issues exactly one bootstrap request and none of `users/current`,
  `auth-methods`, the CSRF endpoint, the initial feed or the unread count; the resulting user,
  auth methods, notifications and unread count equal the bootstrap payload.
- Opt-in off: the start request set is unchanged from today.
- Bootstrap failure (a part-failure status such as 500 or 429, a 501, a 404, a network error): ucm
  falls back to the separate start requests exactly once, and the resulting state equals today's for
  the same per-part outcomes — for example user request succeeds and feed fails: signed in, no
  notifications, as today; user request refused: signed out, as today. Loading ends.
- Successful bootstrap: no fallback request is made.
- WebSocket connects only after the seeded notification state, in the opt-in path too.
- An extension payload is readable by provider name; an absent or `null` provider key reads as
  absent without throwing.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

Placeholder. Not yet mapped: context package, target directory and preamble are missing, so this
WO must not be dispatched in its current state.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish.

To be filled by the Orchestrator. Recorded from the requirements round (2026-10-21): acceptance is
measured before/after once hram has adopted it in `HRAM-WEBPERF-4`, recorded in the register Notiz;
no fixed budget.
