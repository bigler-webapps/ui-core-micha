# ui-core-micha

## Development harness

Run `pnpm dev` to open the local Vite harness. It mounts entries with the package's MUI theme, `react-i18next`, a memory router, and fixture-backed REST/realtime transport. Use the controls to change theme and viewport.

To add an entry, create a small component in `dev/entries.jsx` and append it to `entries`. It may be a complete surface or one standalone component. Keep fixtures and transport behaviour in `dev/`, never in `src/`: the harness is not part of the published package.

## Internationalization

Spread `uiCoreTranslations` into the default i18n namespace as the supported aggregate; per-feature translation exports remain available to selective apps that accept responsibility for pairing every adopted feature with its bundle.

## Account profile statements

`AccountPage` defaults `showProfileStatements` to `true`. Pass `false` when the consumer does not
offer privacy/cookie statement text endpoints; this hides their panels and prevents their requests.
The privacy and cookie consent controls and their submitted values remain available.

## Account page: extra tabs in a navigation group

An entry of `AccountPage`'s `extraTabs` (`{ value, label, render, visible? }`) may carry an optional `group` naming one of
the kit's navigation groups: `my-account` (Profile, Security), `management` (Users, Invite) or `help` (Support). The tab
then appears in that group after the kit's own tabs, in the order of `extraTabs`, in the desktop sidebar and in the
phone navigation. Without `group`, or with `more` or an unknown value, it stays in "More" as before.

## Account page: app-defined groups

Since 4.21.0 `AccountPage` takes an optional `groups` declaration that replaces the kit's three groups:
`[{ key, label, order?, tabs?, visible? }]`. `label` is the app's text (or `(context) => string`); groups render by
`order` (array order when absent); `tabs` places the built-in tabs (`profile`, `security`, `users`, `invite`,
`support`), each still shown only when its own permission check passes; `extraTabs[].group` may name any declared key.
`visible(context)` (`context` = `{ user, perms, isSuperUser, t }`, as for `extraTabs`) hides a group and makes its tabs
unreachable, `?tab=` included. Empty groups are hidden; a tab placed in no declared group lands in "More". Without
`groups` the hub is unchanged.

```jsx
<AccountPage
  groups={[
    { key: 'personal', label: 'Persönlich', tabs: ['profile', 'security'] },
    { key: 'collaboration', label: 'Zusammenarbeit', tabs: ['invite'] },
    { key: 'help', label: 'Hilfe', tabs: ['support'] },
    { key: 'operations', label: 'Betrieb', tabs: ['users'], visible: ({ user }) => isOperator(user) },
  ]}
  extraTabs={[
    { value: 'subscription', label: 'Abo und Token', group: 'personal', render: () => <Subscription /> },
    { value: 'teams', label: 'Teams', group: 'collaboration', render: () => <Teams /> },
    { value: 'all-projects', label: 'Alle Projekte', group: 'operations', render: () => <AllProjects /> },
  ]}
/>
```

Labels are passed already translated (for example `t('Maana.GROUP_PERSONAL')`), so an app's own DE and EN texts apply.

## Users tab: access column and delete

With billing in the account page, the user list shows two columns: "Zugang", a short coloured status ("Freigeschaltet",
"{Plan} · bis {Datum}", "Team · bis {Datum}", "Schreibgeschützt", "Betreiber"), and "Ohne Abo", the free-access switch
without a visible label (only for free and read-only rows; "–" otherwise). Plan names come from the app's own catalogue
(`getMe().plans`); a plan without a name shows "Abo", never its key. Operator rows default to `user.is_superuser`;
`<AccountPage billingUsers billingOperator={({ user }) => user.is_superuser || user.role === 'admin'}>` (or
`useBillingUsersColumn({ isOperator })` directly) applies the app's own rule; a new function per render does not
refetch the accounts. The built-in delete is an icon button
named "Löschen – {Name}", shown disabled on the own row; confirmation, permissions and app row actions are unchanged.

## Account section: plan choice on the app's own page

`SubscriptionSection` shows an inline plan picker for an account without access. An app with its own plan page passes
`onChoosePlan`: the section then shows the "access ended" banner and one button "Abo waehlen" that calls
`onChoosePlan()` (the banner's renew action calls it too, and wins over `onRenew`), and no inline picker. Without the
prop the section behaves as before.

## Setup wizard: account and profile steps

For a page-based first-use flow (UCM-AUTH-14). The host owns the journey: which steps exist, which are completed or
reachable, navigation, busy state, errors, every draft and any persistence. The kit stores nothing and starts no
project, import or payment work. Existing pages and the dialog `OnboardingProvider` / `OnboardingWizard` are unchanged.

- `SetupWizardShell` — one column of stable width: labelled step list, "Schritt n von N", title (`title`, default the
  step label), optional `description`, `error` alert, the step content and one action row (`onBack` / `backLabel`,
  `primaryLabel` with `onPrimary` or `primaryForm`). Props `steps` (`[{ id, label }]`), `currentStepId`,
  `completedStepIds`, `reachableStepIds`, `onSelectStep`, `busy`. `onPrimary` may return a promise; the action is
  ignored until it settles. `primaryForm` names a form in the content that the primary button submits natively.
- `SignUpContent` — the sign-up form of `SignUpPage` (all modes, Turnstile, QR token via `registrationContextToken`).
  `onSubmitted(email)` switches it to the confirmation instruction; remount it (new `key`) to let the person change the
  email. `showProviders` adds Google/Microsoft above the form. `preferredSignupMode` (also on `SignUpPage`, e.g.
  `'self_signup_open'`) shows that mode first and selected when the server offers it; otherwise it is ignored and the
  server order applies. Open self-signup submits with "Konto anlegen" (`Auth.SIGNUP_SUBMIT_OPEN`); the other modes
  keep "Einladung anfordern".
- `SignupConfirmContent` — the password form of `SignupConfirmPage`. Pass `token` (from the emailed
  `/signup/confirm/?token=…` link, which your app routes) and `onSuccess()`; there is no automatic sign-in, show
  `LoginContent` next.
- `LoginContent` — the controller of `LoginPage` without page framing, MFA inline. `onSuccess({ user, target })`; when
  recovery or required additional security applies it navigates to the security page itself and does not call
  `onSuccess`. `onSignUp` and `onForgotPassword` show those buttons.
- `ProfileStepContent` — names, one required statement and optional convenience cookies; `onComplete(user)` only after
  every required write succeeded. Host draft via `draft` / `onDraftChange` (bound to the person, never shown to another
  account); as in `ProfileComponent`, fields the person edited win over later server values for the same person, so
  drop the draft once the step completes. `formId` hands the submit to the shell; `onBusyChange` reports saving.

**Continuation.** `LoginContent` and `SignUpContent` take a `continuation`: a same-origin path such as `/setup`. Anything
else (absolute, protocol-relative, backslash) falls back to `/`. It is also the Google/Microsoft callback URL, so render
`LoginContent` on that route: it shows a cancelled provider sign-in (`?error=`) with the choice again and handles a
person who arrives signed in. The emailed confirmation link carries no continuation: render `SignupConfirmContent` on
your app's `/signup/confirm` route inside the setup and follow it with `LoginContent` and your continuation, which also
works when the link is opened in a fresh session. An anonymous setup route needs `addPublicPath('/setup')` before the
`AuthProvider` mounts.
Passwords, tokens and access codes never leave the components; host drafts contain names and choices only.

**Terms of use (requires `django-core-micha` >= 3.16.0).** `ProfileStepContent` with `termsEnabled` shows the combined
statement "Ich akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung." and records the acceptance through
`createTermsApi()` (`getAcceptance()`, `accept(version)`; default prefix `/api/terms/`, pass `{ apiBase }` for another
mount, created once at module level and passed as `termsApi`). The statement is pre-checked only when the server reports
the current version as accepted and privacy as accepted. A changed version (409 `version_mismatch`) keeps the step open
with the current document. Without `termsEnabled` nothing requests the terms API.

**Contextual checkout (requires `django-core-micha` >= 3.16.0).** `createBillingApi()` keeps `startCheckout(planKey)`
unchanged. `startCheckout(planKey, { context, idempotencyKey })` sends only `plan_key`, `context` and `idempotency_key`
(no return URL is ever sent). Create the key with `createCheckoutIdempotencyKey()` once per deliberate pay click and
reuse it when retrying that click; a new key is a new attempt. On return, read `checkout_attempt` from the URL and call
`resolveCheckoutAttempt(reference)` (`{ url, attempt }`, `attempt.status` `open | processing | paid | failed | expired`).
Access still comes only from `getMe()`. Nothing retries automatically. To give `PlanPicker` a context, pass an override:

```js
const base = createBillingApi();
const setupBillingApi = createBillingApi({
  startCheckout: (planKey) => base.startCheckout(planKey, { context: 'setup', idempotencyKey: currentAttemptKey() }),
});
<PlanPicker api={setupBillingApi} plans={plans} />;
```

## Start from one bootstrap request (opt-in)

With `django-core-micha` >= 3.17.0, `<AuthProvider bootstrap>` starts from `GET /api/bootstrap/` (or pass a same-origin
path instead of `true`): one request instead of CSRF, `users/current` + `auth-methods`, then the notification feed and
unread count. User, auth methods and the initial notifications end up as from the separate requests, `loading` ends at
the same point, and the notification WebSocket still connects only after that state is in place. If the bootstrap fails
in any way (a part failure, 501, 404, network), the provider runs today's separate start requests once. App start data
registered as dcm bootstrap providers is read with `useBootstrapExtension('application_access')` (`undefined` when
absent, `null`, the opt-in is off or the bootstrap failed). Without the prop nothing changes.

## Stale chunks after a deploy

An app that lazy-loads code calls `installChunkLoadRecovery()` once at startup (before rendering). When a deploy has
removed a chunk that an open page still asks for ("Failed to fetch dynamically imported module", Vite's
`vite:preloadError`, "Unable to preload CSS"), the page reloads once onto the new build. A second chunk failure within
60 seconds of that reload is left alone and surfaces as today, so a genuinely broken deploy cannot loop; a later failure
reloads again. Without usable `sessionStorage` it never reloads. Other errors are untouched; `isChunkLoadError(error)`
lets an error boundary tell the cases apart. Option `guardWindowMs` changes the window; the function returns an
uninstall. A reload loses unsaved input, so do not lazy-load routes where people type before the chunk is needed.

```js
import { installChunkLoadRecovery } from '@micha.bigler/ui-core-micha';

installChunkLoadRecovery();
```

## Consumer integration check

```js
import { checkKitIntegration } from '@micha.bigler/ui-core-micha';
import i18n from '../i18n';
import { AppProviders } from '../AppProviders';

it('kit integration is sound', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; // skip if your test setup already sets this
  const { findings } = await checkKitIntegration({ i18n, wrapper: AppProviders });
  expect(findings).toEqual([]);
});
```

`pages` controls which additional kit pages render (default: `LoginPage`, `SignUpPage`, `PasswordInvitePage`); `LoginPage` itself always renders once more for the error-text check regardless of what `pages` contains. Run this check on its own in its test file — it stubs the kit's shared `apiClient` transport for its duration, so a test running real requests through `apiClient` at the same time would see them intercepted too.

## Dashboard primitives

`StatTile` (a bordered KPI tile) and `SoftChip` (a soft tinted annotation/status chip, tones derived from `theme.palette[tone]`) live under `src/components/` and are exported from the package root.

`EmptyState` (an icon/title/description/action empty-section placeholder, built from theme tokens) lives under `src/components/` and is exported from the package root.

## Sub-path imports and optional peers

The main entry needs only the required peers. Charts, the chat surface and `MarkdownReply` live on sub-paths whose
extra peers are optional: `@micha.bigler/ui-core-micha/charts` (`@mui/x-charts`), `/chat` and `/markdown`
(`react-markdown`, `remark-gfm`). Install those peers only in apps that import the sub-path. The 4.0.0 entry in
`CHANGELOG.md` has the migration table.

## Shared chat: compact composer (opt-in)

`<ChatWorkspace composerLayout="compact" renderComposerContext={({ chat }) => ...}>` lays the composer out in two
rows: a context row with the host's content (for example chips of what was added to the chat) and the model choice at
its end — one line that never wraps, the host content is clipped first (plain text gets an ellipsis; give element
items `minWidth: 0` and their own ellipsis, as MUI `Chip` labels have, and a "+n" item, so they shorten instead of
being cut) — and a full-width input with an icon Send that
becomes Stop ("Antwort stoppen") while an answer runs. The model button then shows a short label ("Sonnet · Gründlich")
without vendor and version. The long-chat hint becomes one line with "Neuer Chat" and a close button; closed, it stays
closed for that chat until the page reloads, and another chat shows it again. `renderComposerExtra` keeps rendering
above the composer. Without `composerLayout` the composer is unchanged. `ChatComposer` takes the same `layout`,
`context` and `notice` props directly; `ModelPicker` takes `shortLabel`.

## Shared chat: limit, links, tool steps, estimates

Since 4.22.0, with django-core-micha's DCM-CHAT-16 data:

- `ChatWorkspace` shows the per-user period limit (`GET <apiBase>limit/`) as a meter in the composer and disables the
  composer at the limit with the reset date. Without a limit, or against an older backend, the composer is unchanged.
- Answers show their stored tool steps after reload.
- The model picker adds "≈ <cost> USD per answer" when the catalogue sends `average_cost_usd_micros`.
- Links in answers are clickable. Pass `onNavigate={(path) => navigate(path)}` to route same-origin links through the
  app's router, which keeps the chat panel open. External http(s) links open in a new tab, and other schemes stay text.
  `MarkdownReply` takes the same `onNavigate`.

## Shared chat: host controls

`ChatWorkspace` (from `@micha.bigler/ui-core-micha/chat`) takes optional props for apps that put UI around the surface;
without them it behaves as before. Each is described in `CHANGELOG.md` under the release that added it.
Since 4.19.0: `preloadedChats` (`{ scope, results, next }`, the active-list response the app already loaded for that
`scope`): the start then requests only the archived list. It is used once, at the start, and only when its `scope`
equals the workspace's `scope`; later reloads request both lists as before. The start requests status, catalogue and
both lists together; when the status is not available their answers are discarded. Since 4.3.0: `getSendContext()` (a plain object attached as `context` to every `send` frame, read by
`django-core-micha` 3.3.0), `sendRequest` (`{ id, text }`, sends a message on the host's behalf) and
`onSendRequestHandled({ id, sent })`. Since 4.2.0: `activeChatId`, `onActiveChatChange`, `composerPrefill` and
`send(text)` / `canSend` in `renderAnswerExtra`.
