# WORK ORDER NOTIF-12 (ui-core-micha + django-core-micha) — popup channel via the wizard renderer

**EXECUTION DIRECTIVE.** Implement through `codex exec` in the background — invoked **directly via
Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Seams verified against ucm 2.12.0 / dcm 2.32.0.

## HARD GATE — do not start before NOTIF-13 has landed and published
NOTIF-12 consumes NOTIF-13's envelope contract and its `subscribe(type, handler)` primitive. Starting
earlier means building on the catch-all in `NotificationsProvider.jsx:130-132` that NOTIF-13 removes.
Both WOs also edit `ui-core-micha/src/notifications/` and `src/index.js`, so running them in parallel
violates the AGENTS.md overlap rule. **Sequence: NOTIF-13 → publish → NOTIF-12.**

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
- The model to copy is `ChipDispatcher` (`:62-74`): it calls
  `push_to_users([recipient.user], {"type": notification.notification_type, "content": ..., "notification_id": ...})`
  and returns `DeliveryResult(ok=True)`. **Note the `type` field carries the *domain* type** — this is
  precisely the overload NOTIF-13 replaces with a proper envelope. Emit NOTIF-13's envelope, not this
  legacy shape.
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

**B. ucm — the popup surface.** A component that selects popup-eligible notifications from
notification state, renders them through the shell, marks `seen` on display and `dismissed` on close,
and subscribes to NOTIF-13's popup envelope type so a popup can appear live. Export additively from
`src/index.js`.

**C. Coexistence rule with onboarding — specify and test it.** Both surfaces render a MUI `Dialog`, so
two modals can be open at once. Required behaviour: **a blocking onboarding step wins**; the popup
waits until no blocking onboarding step is active. Non-blocking coexistence must not stack two dialogs.

**D. dcm — implement `PopupDispatcher.deliver`.** Emit NOTIF-13's envelope over `push_to_users` and
return `DeliveryResult(ok=True)`. Keep the delivery-record semantics identical to `ChipDispatcher`
(the surrounding `dispatch()` machinery already records pending → sent/failed; do not re-implement it).

## DO NOT TOUCH
- **The onboarding progress store** — `markStepSeen`, `dismissStep`, `persistDismissed` persistence,
  `OnboardingProvider`'s step-selection semantics, `stepSelection.js`.
- The four existing step components (`CookieConsentStep`, `CompleteNameStep`, `BrowserPushStep`,
  `PwaInstallStep`) and their props.
- NOTIF-13's realtime core — **consume** `subscribe()`, do not restructure it.
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
- with no popup-eligible notification present, nothing renders.

dcm (`pytest` on the notifications package):
- register a **test-local** notification type declaring `eligible_channels=["popup"]`, call `notify()`,
  and assert the dispatcher delivered (`ok=True`) with NOTIF-13's envelope shape on the wire — the
  end-to-end proof required by the scaffolding notice;
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
django-core-micha). Check the hard gate first — NOTIF-13 must be landed and published. git pull,
read the WO, then follow orchestrate-codex (Codex-first, own independent review, commit on green).
```
