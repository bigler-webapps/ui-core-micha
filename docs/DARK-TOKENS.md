# Dark-mode baseline tokens

Reference sheet for `UCM-THEME-13`. **This file is the value source** for the dark baseline: `UCM-THEME-14`
(dark mode in `createAppTheme`) takes every dark value from here by token name, and if code and this
sheet ever disagree, this sheet is the one to fix first.

Instrument: [`work-orders/assets/UCM-THEME-13-dark-prototype.html`](../work-orders/assets/UCM-THEME-13-dark-prototype.html)
(the screen the values were judged on, at 375 px and 1280 px, with contrasts computed in the page).

## Frozen

**Frozen 2026-10-02 by the operator** ("Passt so, bitte einfrieren"), after two value rounds.

## Structural decisions (operator, 2026-10-01)

1. **Complete baseline.** Every mode-dependent token class of the light baseline has a dark value, so an app
   that turns dark on is complete and `assertThemeComplete` can judge dark as it judges light.
2. **Outlined first, as in light.** Resting surfaces carry no shadow. Structure comes from borders and a
   small surface step. Only overlays (dialog, menu, popover, drawer) stand out, through a lighter surface;
   their shadow is an edge, not the means of separation.
3. **Primary is derived unless the app sets it.** The factory lightens the app's light primary until it
   clears 4.5:1 on the dark page. An app that supplies its own dark primary (webshop-guenter: `#D49040`)
   keeps it.
4. **Fixed dark status set, derivation as a safety net.** The status colours below are decided values. On
   an app page that is not the baseline page, the factory lightens a status colour that would fail there,
   the dark counterpart of the darkening `UCM-THEME-15` does on light pages.

## Token table

Every value below is either **distilled** (found in the estate, source named), **derived** (computed by a
stated rule from a decided value) or **invented** (no precedent anywhere; labelled, unvalidated).

### Surfaces and ink

| Token | Light (today) | Dark | Origin |
|---|---|---|---|
| `background.default` (page) | `#FAFAFA` | `#14181B` | distilled: cockpit OBS-10, cockpit KB-23 (`#14181b`), ucm SHELL-2 (`#14171c`) |
| `background.paper` (card) | `#FFFFFF` | `#1B2126` | distilled: cockpit OBS-10, KB-23 |
| `background.subtle` | `#F4F5F6` | `#20262C` | distilled: cockpit OBS-10, KB-23 (`surface2`) |
| overlay surface (dialog, menu, popover, drawer) | = paper, plus shadow | `#232A31` | derived: one step above paper on the same hue, ratio 1.12:1 to paper; new in dark |
| `divider` | `rgba(33,37,41,.10)` | `#2B333A` | distilled: cockpit OBS-10, KB-23 (`border`) |
| `ink.primary` / `text.primary` | `#212529` | `#E6EBEF` | distilled: cockpit KB-23 (`ink`); OBS-10 `#e7ebee` |
| `ink.secondary` / `text.secondary` | `#5B6670` | `#AAB5BF` | distilled: cockpit KB-23 (`ink2`) |
| `ink.muted` / `text.disabled` | `#6A7178` | `#87919A` | distilled: cockpit OBS-10 (`text3`) |

### Controls

| Token | Light (today) | Dark | Origin |
|---|---|---|---|
| `controlBorder.main` | `rgba(33,37,41,.50)` | `rgba(230,235,239,.38)` | derived: `ink.primary` at the smallest alpha that clears 3:1 on page and paper |
| `controlBorder.hover` | `rgba(33,37,41,.65)` | `rgba(230,235,239,.53)` | derived: the light step (+0.15) carried over |
| `controlBorder.error` | `#BF3227` | `#E58B80` | = `error.main` (dark) |
| `controlBorder.focus` | derived from primary | derived from primary | rule: lighten the primary until it clears 3:1 on page and paper |
| autofill field | `#FFFFFF` inset, `#212529` text (fixed) | paper inset, `ink.primary` text and caret | derived: replaces the fixed light values in `tokens.js` `autofill` |

### Status

`main` = `text` in dark. `light`/`dark`/`contrastText` follow from `main` through `withMainShades`, with
`contrastText` = `#14181B`. A solid fill takes the status colour with the page colour as its text (dark
text on a light fill, the same rule as the primary button).

| Status | `text` = `main` | `bg` | `fill` | `fillText` | Origin |
|---|---|---|---|---|---|
| success | `#7BC496` | `#1C2A22` | `#7BC496` | `#14181B` | distilled: cockpit KB-23 (`ok`, `ok-bg`) |
| warning | `#D8BD7E` | `#2A2418` | `#D8BD7E` | `#14181B` | distilled: cockpit KB-23 (`warn`, `warn-bg`) |
| error | `#E58B80` | `#3A2320` | `#E58B80` | `#14181B` | distilled: cockpit KB-23 (`err`), OBS-10 (`danger-bg`) |
| info | `#8FB8E0` | `#1A2633` | `#8FB8E0` | `#14181B` | **invented**: no dark info hue anywhere in the estate |
| stale | `#AAB5BF` | `#20262C` | `#AAB5BF` | `#14181B` | **invented**, like the light `stale` it mirrors: `ink.secondary` on `subtle` |

### Data series and shadows

| Token | Light (today) | Dark | Origin |
|---|---|---|---|
| `dataSeries.categorical` | `#3D5A99 #3E80B8 #2E8F8A #7A5FA8 #9C4F86 #8A7355` | `#506BA3 #3E80B8 #2E8F8A #7A5FA8 #A1588C #8A7355` | derived: each light colour lightened in 0.05 steps until it clears 3:1 on paper; only slots 1 and 5 move |
| `shadow.rest` | `none` | `none` | structural decision 2 |
| `shadow.overlay` | `0 8px 24px rgba(20,26,31,.16), 0 2px 8px rgba(20,26,31,.08)` | `0 8px 28px rgba(0,0,0,.45)` | invented: on near-black the light shadow is invisible; the surface step carries the separation |
| scrim (behind a modal) | MUI default | `rgba(0,0,0,.55)` | invented |

### App identity in dark (rules, not values)

| What | Rule | Worked examples (computed) |
|---|---|---|
| primary, app sets none | lighten the light primary in 0.05 steps until it clears 4.5:1 on `#14181B` | `#468AB2` stays `#468AB2` (4.71:1); hram `#2F4F96` -> `#6D84B6` (4.78:1); survey_app `#432CA1` -> `#8576C2` (4.56:1) |
| primary button text | whichever of `#FFFFFF` and `#14181B` contrasts more with the derived primary | `#14181B` in all three examples |
| primary, app sets its own | the app's value | webshop-guenter `#D49040` with `#0E0B08` text (7.35:1) |
| status on an app page that is not `#14181B` | lighten the status colour until it clears 4.5:1 on its `bg` and on the page | webshop-guenter `#0E0B08`: no status colour needs to move |

## Contrast table (computed 2026-10-02 with the instrument's own functions)

| Pair | Foreground | Background | Ratio | Threshold |
|---|---|---|---|---|
| ink.primary on page / paper / overlay | `#E6EBEF` | `#14181B` / `#1B2126` / `#232A31` | 14.87 / 13.54 / 12.09 | 4.5 |
| ink.secondary on page / paper / overlay | `#AAB5BF` | same | 8.56 / 7.79 / 6.96 | 4.5 |
| ink.muted on page / paper | `#87919A` | `#14181B` / `#1B2126` | 5.57 / 5.07 | 3 |
| success text on bg; main on page / paper; fillText on fill | `#7BC496` | | 7.25; 8.65 / 7.88; 8.65 | 4.5 |
| warning, same pairs | `#D8BD7E` | | 8.43; 9.78 / 8.90; 9.78 | 4.5 |
| error, same pairs | `#E58B80` | | 5.78; 7.09 / 6.45; 7.09 | 4.5 |
| info, same pairs | `#8FB8E0` | | 7.38; 8.59 / 7.82; 8.59 | 4.5 |
| stale text on bg; fillText on fill | `#AAB5BF` | `#20262C` | 7.32; 8.56 | 4.5 |
| controlBorder.main on page / paper | `rgba(230,235,239,.38)` | | 3.18 / 3.14 | 3 |
| controlBorder.hover on page / paper | `rgba(230,235,239,.53)` | | 4.98 / 4.79 | 3 |
| controlBorder.error on paper | `#E58B80` | `#1B2126` | 6.45 | 3 |
| dataSeries 1-6 on paper | as above | `#1B2126` | 3.07 / 3.86 / 4.19 / 3.12 / 3.32 / 3.61 | 3 |
| surface steps: paper/page, overlay/paper, divider/paper, subtle/paper | | | 1.10 / 1.12 / 1.27 / 1.06 | none (structure, not text) |

Every pair passes. Two pairs sit close to their threshold: `controlBorder.main` (3.14:1 on paper) and
`dataSeries` slot 1 (3.07:1). A paper colour that moves lighter breaks them first.

## Rejected, and why

- **Neutral base B** (`#121212` / `#1C1C1C`, no cast, near MUI) and **C** (`#16181B` / `#1D2024`, the light
  baseline's own cool ink carried into dark). Round 1: at this lightness none of the three could be told
  apart, so the cast was decided on principle: A is the one the estate already uses in three places.
- **Surface step 2** (paper `#1F262C`, overlay `#29313A`) and **step 3** (paper `#232B32`, overlay
  `#2F3942`). Round 2: step 1, the estate's own, reads as card and dialog already; the larger steps lower
  text and border contrast on cards for no gain the operator could see.

## Identity versus baseline

The baseline owns everything above. An app owns, in dark as in light, only its primary (optional in dark,
derived otherwise) and its font. An app with a decided brand (webshop-guenter) may own its dark surfaces and
ink too; that is the app's identity bucket, not a baseline change.

## Unverified

Declared, not demonstrated, because a static instrument cannot show them: hover and pressed states, focus
rings in a running app, native date and select pickers, scrollbars, transitions, and how browsers paint
autofill in dark. `UCM-THEME-14`'s rendered check is where they are first seen.

## Known code that assumes light (input for `UCM-THEME-14`)

- `src/theme/createAppTheme.js:221` and `src/theme/themeCompleteness.js:298`: contrast surfaces include a
  fixed `#FFFFFF`; the derivations only darken.
- `src/theme/tokens.js` `autofill`: fixed `#FFFFFF` inset and `#212529` text.
- `BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS`: the `background.paper` reason ("deliberately MUI white") is
  false in dark.
- `src/components/QrSignupManager.jsx:361`: `#ffffff` behind a QR code. **Stays white on purpose**: a QR code
  needs a light quiet zone to scan.
