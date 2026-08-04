# WORK ORDER NOTIF-14 (ui-core-micha) — push-preview toggle in NotificationSettings

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is
not addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not
shell out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked
**directly via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags
`--skip-git-repo-check` and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a
positional argument from this file. Fall back to direct Claude implementation only on Codex quota /
rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Companion to `django-core-micha`'s `work-orders/MSG-13.md`
(landed `39135e9` on dcm `main`), whose Scope E explicitly said: "The `Switch` in `ui-core-micha`'s
`NotificationSettings.jsx` is a companion change and is NOT deliverable from this repo — flag it in
the completion note so a `ui-core-micha` WO gets written." This is that WO.

## TIER
Tier 2 — this repo IS a shared-core surface (`ui-core-micha`), which per AGENTS.md forces Tier 2
regardless of change size. Independent `reviewer` mandatory. No `sec_reviewer` needed: the security
question (should message content go in a push at all) was already ruled by the operator in dcm's
MSG-13; this WO only wires an existing, already-shipped backend preference into the existing
settings UI — no new exposure, no new endpoint, no new data crossing a trust boundary.

## GOAL
dcm's MSG-13 added a per-user account-level preference, `NotificationPreference.push_preview_opt_in`
(default `True`), already exposed read/write on the existing `notifications/preferences/` endpoint
(`NotificationPreferenceSerializer` fields: `email_opt_in`, `push_opt_in`, `push_preview_opt_in`).
When off, dcm's `PushDispatcher` sends a content-free push body (no sender name, no message text) —
the notification still arrives, but its preview is hidden. Nothing in ucm reads or writes this field
yet, so a user has no way to turn it off (or back on) — a per-user preference sitting dead on the
backend with no UI path to reach it.

## EXPECTED OUTCOME
- `NotificationSettings.jsx` gains a third toggle, alongside the existing email/push `Switch`es,
  bound to `push_preview_opt_in` via the same generic `patchNotificationPreferences()` call already
  used for the other two (no new API function needed — see Context Package).
- The toggle reflects the loaded preference correctly, **including the default-on case**: a fresh
  account (or a preferences payload predating this field) has never set `push_preview_opt_in`
  explicitly, and this MUST still render as checked/on. `Boolean(preferences?.push_preview_opt_in)`
  — the pattern the existing two switches use — is **wrong** here, because `Boolean(undefined) ===
  false`; that would silently show "preview off" for a user whose real, backend-defaulted state is
  "preview on" (the exact class of default-mismatch bug MSG-13 itself was about, one level up).
  The correct check is `preferences?.push_preview_opt_in !== false`.
- Toggling calls `patchNotificationPreferences({ push_preview_opt_in: <bool> })` and updates local
  state from the response, mirroring `handleEmailToggle`'s existing shape exactly (loading flag,
  error handling, no confirmation dialog).
- **UX placement decision (Expertenchat call, confirm or override at Approval Gate #1):** render the
  preview toggle directly under the push toggle (same `Box`/`Divider` block, not a new section), and
  **disable it when push notifications are not actually enabled for this account**
  (`!preferences?.push_opt_in`) — a preview setting is meaningless when no push is being sent at all,
  and leaving it enabled-but-inert invites a user to "fix" a push they never receive by toggling a
  setting that does nothing. Gate on the account-level `push_opt_in` (matches dcm's own
  `is_channel_enabled` gate for the `push` channel), not on this device's `pushSubscribed` — a user
  with push enabled on another device but not this one should still be able to manage their preview
  preference here.

## CONTEXT PACKAGE — verified current state

**`src/notifications/NotificationSettings.jsx`** (194 lines) already renders two independent
preference switches against the same preferences object:
- `handleEmailToggle` (`:81-93`) — the exact shape to mirror: `setSavingEmail(true)` →
  `patchNotificationPreferences({ email_opt_in })` → `setPreferences(updated)` → catch sets
  `error` → `finally` resets the saving flag.
- The push switch (`:176-187`) is more involved (subscribe/unsubscribe device flow) — **do not
  mirror that one**, the preview toggle is a plain preference flip like email, not a device
  subscription.
- `preferences` state (`:37`) is the raw object returned by `getNotificationPreferences()`
  (`GET /api/notifications/preferences/`) and updated in place by
  `patchNotificationPreferences()` (`PATCH`, same URL, generic passthrough — accepts any subset of
  serializer fields, **no new API function needed**, see `src/notifications/api.js:6-13`).
- Render block to extend is `:162-188` (the email `Box`, a `Divider`, the push `Box`). Add a third
  `Box` with a `FormControlLabel`+`Switch`, same structural pattern as the email one (`:163-168`) —
  `checked`, `onChange`, `disabled`, then a label with a primary `Typography` + a `caption`
  `Typography` hint underneath.

**`src/notifications/api.js`** — `patchNotificationPreferences(patch)` (`:11-14`) is a bare
passthrough `PATCH`; no change needed here.

**i18n**: `src/i18n/notificationsTranslations.ts` — existing `NotificationSettings.*` keys (`:5-19`)
cover `EMAIL_LABEL`/`EMAIL_HINT`/`PUSH_LABEL`/`PUSH_HINT` etc. across four languages (`de`, `fr`,
`en`, `sw`). Add two new keys, e.g. `NotificationSettings.PUSH_PREVIEW_LABEL` and
`NotificationSettings.PUSH_PREVIEW_HINT`, in the same four-language shape. The hint text should say
what changes when off (no sender name or message text in the push body — the message itself still
arrives) without needing to explain the underlying push-encryption reasoning from dcm's MSG-13 (that
belongs to dcm, not this UI copy).

**Tests**: `tests/NotificationSettings.test.jsx` already mocks `../src/notifications/api` in full
(`:6-13`) and stubs `react-i18next` to return raw keys (`:16`) — extend the existing
`getNotificationPreferences`/`patchNotificationPreferences` mocks, do not add a new mock module.

## NON-GOALS / DO NOT TOUCH
- Do not touch the push subscribe/unsubscribe device flow (`handleEnablePush`/`handleDisablePush`,
  `:95-144`) or anything in `getPushSupport`/`getIosInstallState`.
- Do not touch `django-core-micha` — the backend half (field, migration, serializer, dispatch gating)
  already shipped in dcm MSG-13 (`39135e9` on `main`). This WO is UI-only.
- Do not add a confirmation dialog or any new component beyond the one additional `Switch` block —
  match the existing two switches' bare, no-confirmation UX exactly.
- Do not change what dcm's push body renders when the preference is off (already correct and
  reviewed in dcm MSG-13) — this WO is only "can the user reach the setting", not the setting's effect.

## RISKS
- The `Boolean(...)` vs `!== false` default-mismatch trap above is the main risk in this WO — call it
  out explicitly in the PR/commit and in the required test, since it is easy to copy-paste the
  existing `Boolean(preferences?.push_opt_in)` pattern without noticing the two fields have opposite
  defaults (`push_opt_in` defaults `False` on the backend, `push_preview_opt_in` defaults `True`).
- Low blast radius otherwise: one existing, already-authenticated, already-scoped-to-`request.user`
  endpoint; no new permission surface; additive UI only.

## REQUIRED TESTS TO WRITE
Narrow, mirroring `tests/NotificationSettings.test.jsx`'s existing style and mocks.

1. The preview switch renders **checked** when `getNotificationPreferences()` resolves with
   `push_preview_opt_in: true`, **and also** when it resolves with the field **absent entirely**
   (the default-on, non-vacuity case — must fail if the implementation uses `Boolean(...)` instead
   of the `!== false` check).
2. The preview switch renders **unchecked** when `push_preview_opt_in: false`.
3. Toggling the switch calls `patchNotificationPreferences({ push_preview_opt_in: <new value> })`
   and re-renders from the mocked response.
4. The preview switch is **disabled** when `preferences.push_opt_in` is `false`, and **enabled**
   when it is `true` — regardless of this device's own `pushSubscribed` state (per the UX placement
   decision above).

**Non-vacuity:** test 1's absent-field case must fail against a naive `Boolean(preferences?.…)`
implementation — prove it before considering this WO done.

## TEST SCOPE FOR THE GATE (orchestrator)
`tests/NotificationSettings.test.jsx` only — no other suite touches this component.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (no `develop` in this repo — verify
with `git branch -a` before starting in case that has changed). Publish + version bump per the
repo's release flow if this ships as its own npm release, or bundle with the next ucm release per
operator direction.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`). Work order:
> `work-orders/NOTIF-14.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Adds the third `Switch` to `NotificationSettings.jsx` for dcm MSG-13's `push_preview_opt_in`
> preference (already live on the backend, `django-core-micha` `39135e9`). The one thing that will
> silently ship wrong if rushed: this field defaults to `True`, opposite of `push_opt_in`'s `False`
> default — the existing `Boolean(preferences?.field)` pattern used for the other two switches
> reads a missing/undefined field as `false` and would show "preview off" for every account that
> never explicitly touched the setting. Use `preferences?.push_preview_opt_in !== false` instead,
> and make sure the required test proves it (assert checked=true when the field is absent from the
> mocked API response, not just when it's explicitly `true`).

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
