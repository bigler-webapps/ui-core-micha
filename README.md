# ui-core-micha

## Development harness

Run `pnpm dev` to open the local Vite harness. It mounts entries with the package's MUI theme, `react-i18next`, a memory router, and fixture-backed REST/realtime transport. Use the controls to change theme and viewport.

To add an entry, create a small component in `dev/entries.jsx` and append it to `entries`. It may be a complete surface or one standalone component. Keep fixtures and transport behaviour in `dev/`, never in `src/`: the harness is not part of the published package.

## Internationalization

Spread `uiCoreTranslations` into the default i18n namespace as the supported aggregate; per-feature translation exports remain available to selective apps that accept responsibility for pairing every adopted feature with its bundle.
