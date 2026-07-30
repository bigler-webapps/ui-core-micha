# WORK ORDER NOTIF-12 (ui-core-micha + django-core-micha) — popup channel via the wizard renderer

**EXECUTION DIRECTIVE.** Implement through `codex exec` in the background — invoked **directly via
Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Seams verified against ucm 2.12.0 / dcm 2.32.0.

## HARD GATE — SATISFIED 2026-07-30
NOTIF-13 landed and published: ucm **2.13.0** (`7a83ee9`), dcm **2.33.0** (`de77335`), both verified
live on npm/PyPI. This WO was re-verified against the landed code on 2026-07-30 and the context
package below describes the **actual shipped API**, not the pre-NOTIF-13 state. Cleared to start.

## TIER
Tier 2 — this extracts a renderer out of `OnboardingWizard`, which **cockpit and jg run in
production**. The roadmap calls the popup channel "uncritical"; that refers to business urgency, not
blast radius. Independent `reviewer` mandatory. `sec_reviewer` only on explicit operator request.

## SCAFFOLDING NOTICE — READ FIRST
**This channel ships with zero producers, deliberately.** Verified 2026-07-29 across dcm, jg-ferien,
cockpit, hram, spesix and survey_app: **no notification type declares `popup` in `eligible_channels`**,
so `resolve_channels()` will never route anything to it until some app opts a type in. The operator
decided to build the scaffolding anyway (2026-07-29), having been shown this.

Two obligations follow, and they are part of the acceptance criteria:
1. **Do not overclaim.** The CHANGELOG entry and any docstring must state plainly that the popup
   channel is wired but inactive until a notification type declares `popup`. Precedent: NOTIF-4's
   reviewer (R1) had to soften a CHANGELOG that promised retry behaviour no shipped dispatcher could
   reach. Do not repeat that.
2. **Scaffolding must be tested scaffolding.** Register a test-local notification type that declares
   `popup` and prove the whole path end-to-end. Untested dead code is not an acceptable outcome.

## GOAL
Make `popup` a real delivery channel: a notification whose type opts into `popup` is rendered to the
recipient in a modal that reuses the onboarding **wizard renderer**, with its seen/dismissed status
recorded on `NotificationRecipient` — **not** in the onboarding progress store.

## EXPECTED OUTCOME
- dcm's `PopupDispatcher` stops being a logging stub and delivers for real.
- ucm exports a popup surface that renders popup-eligible notifications and marks them via the
  existing `feed/mark/` path.
- Onboarding behaviour is bit-for-bit unchanged for existing consumers.
- With no producer registered, nothing visibly changes in any app.

## CONTEXT PACKAGE — verified current state

**dcm `notifications/dispatch.py`:**
- `PopupDispatcher` (`:117-121`) is a stub: logs "queued for unimplemented popup channel" and returns
  `DeliveryResult(ok=None, error="pending")`. It is registered in `_DISPATCHERS` (`:126-133`).
- The model to copy is `ChipDispatcher` (`dispatch.py:64-75`, post-NOTIF-13): it calls
  `push_to_users([recipient.user], notification_envelope({"type": notification.notification_type, "content": ..., "notification_id": ...}))`
  and returns `DeliveryResult(ok=True)`.

**How NOTIF-13 actually shipped — read this before writing scope D.** The envelope is a
**domain-level** discriminator, not a per-channel one:
- `delivery.py:25` `NOTIFICATION_ENVELOPE = "notification"`; `delivery.py:28-35`
  `notification_envelope(payload)` merges `{"envelope": "notification"}` into any payload. **Additive**
  — the pre-existing fields, including the overloaded `type`, are unchanged.
- ucm `src/notifications/realtime.jsx:68` routes purely on `data.envelope ?? DEFAULT_ENVELOPE`, then
  fans to every handler subscribed to that envelope.
- **Inside** the notification envelope, `NotificationsProvider` keeps the original two-way split:
  `data.type === 'notification.status'` patches status (`:98`), and **everything else is appended to
  the feed with `unreadCount + 1`** (`:120`).

**Consequence — the trap this WO must avoid:** if `PopupDispatcher` simply calls
`notification_envelope({...})` like Chip does, its message is **indistinguishable from a chip
message**. The popup surface subscribing to the `"notification"` envelope would receive every chip
notification and pop up for all of them, and a notification routed to *both* chip and popup would
produce **two feed entries and `unreadCount + 2` for one notification**. Scope D and D2 below exist
to close exactly this.
- `_render_content(content, user)` (`:44-60`) renders `title_key`/`body_key`/`params` in the
  recipient's language — reuse it rather than re-deriving text client-side if the payload needs text.
- `prefs.py:22` already treats `popup` as a channel defaulting to True; `router.py:24` narrows to
  `ntype.eligible_channels`. **No prefs or router change is needed** — only a type opting in.

**ucm `src/onboarding/OnboardingWizard.jsx` (75 LOC)** is the renderer to reuse:
- MUI `Dialog open fullWidth maxWidth="sm"` (`:59`), `DialogTitle` with a step counter +
  `LinearProgress` (`:60-67`), `DialogContent` rendering
  `<StepComponent onComplete={...} onDismiss={...} ctx={...} />` (`:69`).
- Step contract: `{ id, Component, blocking, persistDismissed }`. `blocking` disables escape/backdrop
  close (`:59`).
- **The parts that must NOT come along** (design decision D-F7,
  `django-core-micha/docs/design/notifications-platform.md:70-71`): `onboarding.markStepSeen` (`:35`),
  `dismissStep` (`:54`), and the sequential progress store behind them. Popup status lives on
  `NotificationRecipient`.
- Exported at `src/index.js:61`; the four existing steps at `:62-65`.

**ucm notification status API:** `useNotifications()` already returns `markSeen` / `markDismissed` /
`markDone`, backed by `feed/mark/`. Use `markSeen` when a popup is shown and `markDismissed` when the
user closes it. **Never `markDone`** — done is a todo-channel semantic.

## SCOPE

**A. ucm — extract the dialog shell.** Lift the presentational shell out of `OnboardingWizard` into a
reusable renderer (dialog frame, counter/progress header, the `onComplete`/`onDismiss`/`ctx` child
contract). `OnboardingWizard` keeps its current behaviour by composing that shell with the onboarding
store; the popup surface composes the same shell with notification state.

**B. ucm — the popup surface.** A component that renders popup-eligible notifications through the
shell, marks `seen` on display and `dismissed` on close. For live popups it subscribes via
`useRealtime()` to the **`"notification"` envelope** (`DEFAULT_ENVELOPE` — there is no popup-specific
envelope, see D) and filters on `channel === "popup"`, ignoring `notification.status` messages and
channel-less legacy payloads. Export additively from `src/index.js`.

**C. Coexistence rule with onboarding — specify and test it.** Both surfaces render a MUI `Dialog`, so
two modals can be open at once. Required behaviour: **a blocking onboarding step wins**; the popup
waits until no blocking onboarding step is active. Non-blocking coexistence must not stack two dialogs.

**D. dcm — implement `PopupDispatcher.deliver`, with a channel discriminator *inside* the envelope.**
Emit through `notification_envelope()` (so Layer-1 routing stays domain-keyed and messaging can still
ride alongside) and add an explicit **`"channel": "popup"`** field to the payload. Return
`DeliveryResult(ok=True)`. Keep delivery-record semantics identical to `ChipDispatcher` — the
surrounding `dispatch()` machinery already records pending → sent/failed; do not re-implement it.

**Do NOT invent a second envelope value** (e.g. `"notification.popup"`). The envelope discriminates
*domains* so a future messaging stream can share the socket; overloading it with channels would
undo NOTIF-13's design. Channel selection belongs inside the payload.

For symmetry and so the client can tell the cases apart, `ChipDispatcher` should carry
`"channel": "chip"` as well. **Backward compatibility:** a payload with **no** `channel` field must
keep behaving exactly as today (feed entry + unread increment), because an app pinned to an older dcm
will still send channel-less payloads.

**D2. ucm — de-duplicate by `notification_id` in `NotificationsProvider`.** A notification routed to
both chip and popup now produces two WS messages. The provider must fold them into **one** feed entry
and **one** unread increment (de-dupe on `notification_id`, last-write-wins on content). Without this,
enabling popup alongside chip double-counts the badge. This is an edit to `NotificationsProvider`,
which is explicitly in scope here — it is not part of NOTIF-13's realtime core.

## DO NOT TOUCH
- **The onboarding progress store** — `markStepSeen`, `dismissStep`, `persistDismissed` persistence,
  `OnboardingProvider`'s step-selection semantics, `stepSelection.js`.
- The four existing step components (`CookieConsentStep`, `CompleteNameStep`, `BrowserPushStep`,
  `PwaInstallStep`) and their props.
- **NOTIF-13's realtime core** (`src/notifications/realtime.jsx`) — consume `useRealtime()` /
  `subscribe(envelope, handler)`, do not restructure it. In particular leave the `seeded` gate, the
  backoff/reconnect semantics and the envelope-routing alone. (`NotificationsProvider` itself IS
  editable — scope D2 requires it.)
- `feed/*` REST contract, `NotificationBell`, `NotificationSettings`.
- `prefs.py`, `router.py`, `resolve_channels` — popup already works there; a type opting in is an
  app-side change, not this WO's.
- Schema, migrations, dependencies, CI.
- **Do not register a `popup` producer in any app.** This WO ships the channel only.

## RISKS
- **Onboarding regression** is the main risk: the shell extraction touches a wizard that cockpit and jg
  run in production. The step counter (`totalRef`/`completed`), the session-dismissed Set, and the
  `blocking` escape-key behaviour are easy to break silently.
- **Stacked modals** if C is skipped — two dialogs, neither reachable.
- **Badge double-count** if D2 is skipped: a notification routed to both chip and popup arrives as two
  WS messages and increments `unreadCount` twice for one notification. This is the single most likely
  silent defect in this WO.
- **Popup storm** if B subscribes to the envelope without filtering on `channel` — every chip
  notification would pop up a modal.
- **Regressing the NOTIF-13 R1 fix:** the `seeded` gate in `NotificationsProvider` exists because
  decoupling the REST seed from the socket connect opened a silent-message-loss race. Do not touch it
  while implementing D2.
- **Dead code rot:** with no producer, only the tests exercise the path. Hence the mandatory test-local
  producer type.
- **Status semantics drift:** marking a popup `done` instead of `dismissed` would pollute todo-channel
  semantics.

## REQUIRED TESTS / ACCEPTANCE
ucm (`pnpm test`, vitest):
- a popup-eligible notification renders in the shell; `markSeen` fires once on display;
- closing it fires `markDismissed`, never `markDone`;
- **coexistence:** with a blocking onboarding step active, no popup dialog renders; once it clears, the
  popup appears — and never two dialogs at once;
- **onboarding regression guard:** existing `OnboardingWizard` behaviour unchanged — step counter,
  progress bar, session-dismissed set, `blocking` disabling escape/backdrop close, `persistDismissed`
  still calling `dismissStep`;
- with no popup-eligible notification present, nothing renders;
- **no popup storm:** a `channel: "chip"` message and a channel-less legacy message both leave the
  popup surface silent;
- **no double-count (D2):** two WS messages for the same `notification_id` (one `chip`, one `popup`)
  yield exactly one feed entry and `unreadCount + 1`;
- **NOTIF-13 R1 guard:** the `seeded` gate still holds — no socket messages are processed before the
  REST seed completes.

dcm (`pytest` on the notifications package):
- register a **test-local** notification type declaring `eligible_channels=["popup"]`, call `notify()`,
  and assert the dispatcher delivered (`ok=True`) with `envelope: "notification"` **and**
  `channel: "popup"` on the wire — the end-to-end proof required by the scaffolding notice;
- a chip delivery still carries `envelope: "notification"` and now `channel: "chip"`, with every other
  field unchanged (no regression for existing consumers);
- `resolve_channels` still excludes `popup` for types that do not declare it (no accidental widening);
- the existing `test_dispatch.py` registry assertion (`:25`) still passes.

Plus `pnpm build` (tsc) green.

## RELEASE
ucm minor bump + publish. dcm minor bump + publish (publish-from-main), with a **registry live-check
before any app pin bump**. No app pin bumps in this WO. CHANGELOG in both repos must carry the
inactive-until-a-producer-opts-in wording from the scaffolding notice.

## TARGET REPO / WORKING DIRECTORY
- Primary: `C:\Users\biglmi\Documents\webapps\ui-core-micha`
- Secondary (scope D): `C:\Users\biglmi\Documents\webapps\django-core-micha`
- Never the workspace root `…\webapps`.
Both are platform repos: commit directly to the trunk, no feature branches.

## PROGRESS CONTRACT
Emit a `PLAN: <step1> | <step2> | …` line up front, then a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` **before every relevant action** (file opened, file
edited, command/test run) and `PROGRESS: [<n>/<total>] done` on step completion, spaced so no gap
exceeds ~2 min. stdout unbuffered. Exactly one final `RESULT: DONE|BLOCKED <reason>`.

## MINI-HANDOVER (paste into a fresh Orchestrator session)
```
Orchestrator: implement work-orders/NOTIF-12.md in ui-core-micha (main; scope D also touches
django-core-micha). The NOTIF-13 gate is satisfied (ucm 2.13.0 / dcm 2.33.0). git pull, read the WO,
then follow orchestrate-codex (Codex-first, own independent review, commit on green).
```
