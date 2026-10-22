# UCM-AUTH-15 — Signup: preferred first mode and a mode-specific submit label

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (signup content of the auth flow); additive, existing callers unchanged.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumer:** MAANA-APP-22 decision 5 (Maana's setup wizard), adopted by a later Maana pin bump.

### Goal and expected outcome

The operator decided on 2026-10-22 (MAANA-APP-22) that Maana's public free-trial entry opens with direct registration
and its button reads "Konto anlegen", with the access-code path as the second option. Measured against the pinned
releases (django-core-micha 3.17.0, ui-core-micha 4.19.0): dcm's `RegistrationPolicyState.signup_modes` lists the modes
in a fixed order (access code, open, e-mail domain, QR); `SignUpContent` starts with `signupModes[0]` and has no prop
for a preferred mode; one key `Auth.SIGNUP_SUBMIT` ("Einladung anfordern" / "Request invitation") labels the submit
button in every mode, and an app cannot override it because ucm's translations are merged after the app's. Expected
outcome: an app can choose which available signup mode is shown first, and open self-signup has its own submit label.

### Settled decisions (operator, 2026-10-22)

1. **Preferred mode:** `SignUpContent` (and the full-page `SignUpPage` wrapper) accept an optional preferred mode (or
   order); if that mode is among the server's available modes it is shown first and preselected, otherwise the server
   order applies. The server's policy remains the authority over which modes exist.
2. **Submit label per mode:** open self-signup uses "Konto anlegen" / "Create account"; the access-code, e-mail-domain
   and QR modes keep "Einladung anfordern" / "Request invitation" unless the existing semantics of a mode say
   otherwise.
3. **Compatibility:** without the new prop, the order and labels of today stay for every other app, except that the
   open self-signup button reads "Konto anlegen" everywhere (it creates an account, not an invitation request). This is
   the one visible change and goes into the changelog.

### Scope and acceptance

`SignUpContent`, `SignUpPage`, the auth translations; DE and EN. Accepted when Maana can render direct registration
first with "Konto anlegen" and an app without the prop sees today's order.

### Non-goals and do-not-touch

dcm's signup policy and its mode order, the confirmation and login flows, MFA, the access-code-grants-subscription idea
(MAANA-APP-23), Maana's own wiring (MAANA-APP-22 after the release).

### Risks

A preferred mode that the server does not offer must be ignored, never shown.

### Required tests to write

Preferred mode shown first when available, ignored when not; server order without the prop; "Konto anlegen" on open
self-signup, "Einladung anfordern" on the access-code mode; DE and EN keys resolve through the shared i18n.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of MAANA-APP-22 on 2026-10-22, whose decision 5 provides for this ucm work
order when the signup content is not configurable (Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release and
report the version.
