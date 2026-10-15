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
