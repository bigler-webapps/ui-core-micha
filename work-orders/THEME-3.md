# THEME-3 — Add the missing "subtle surface" baseline token

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`; a push touching
`src/**`/`package.json` publishes to npm immediately via `publish.yml`)
**Tier:** 3 — shared-core theme baseline, consumed by every `createAppTheme` adopter.
**Review:** independent `reviewer` **and** `ui_reviewer`, concurrently, both mandatory before commit
(no staging net in this repo — the independent review is the only gate and is not back-fillable).
**Found by:** `cockpit/UI-6` (adopting `createAppTheme` with the frozen `UI-4` token table). The
sheet's canonical token table (section 8, "what cockpit stops owning") lists an *inset surface*
`#F4F5F6` as a baseline-supplied value, replacing `cockpit.surface2` (16 of 195 token reads in that
WO). It does not exist anywhere in the shipped package — confirmed by grepping
`src/theme/tokens.js`/`themeCompleteness.js` for the hex and for any "surface"/"inset" key. The value
was one of the design-language instrument's *own* internal comparison-stack entries
(`cockpit/work-orders/assets/UI-4-design-language.html:681`), never actually wired into
`createAppTheme`. Per this estate's own rule ("a gap in the shared kit discovered mid-adoption is a
`ui-core-micha` work order and cockpit's item waits — not a local workaround"), `UI-6` is blocked on
this landing and publishing first.

---

## A. Envelope

### Goal

Add a third baseline background tier — `palette.background.subtle` — to `createAppTheme`'s shared
palette, for panels/table stripes/excerpt boxes that need to read as slightly recessed from
`background.paper` without a bespoke per-app colour. Register it in the completeness-assertion
surface inventory so every adopter (present and future) gets the same guarantee the other baseline
surfaces already have.

### Scope

1. **`src/theme/tokens.js`** — add `background.subtle: '#F4F5F6'` to `BASELINE_PALETTE.background`
   (alongside the existing `default`/`paper`). This is a **fixed baseline constant**, not
   accent-derived — the same treatment as `default`/`paper`, not the accent-tint derivation used for
   `cockpit.accentTint`.
2. **`src/theme/themeCompleteness.js`** — add `pathSurface('palette.background.subtle')` to
   `THEME_COMPLETENESS_SURFACES`.
3. **Recompute the contrast claim independently** — the frozen sheet's "muted ink on it: 4.81" was
   computed on the sheet's own static comparison canvas, not via this package's
   `calculateContrastRatio`. Recompute `calculateContrastRatio('#5B6670', '#F4F5F6')` (baseline
   `ink.secondary`, the tone most likely to sit on this surface) directly against the shipped
   function before treating the sheet's number as confirmed.
4. Publish (version bump — see Risks for the semver call).

### Non-goals / do not touch

- Renaming or removing any existing palette token.
- `CHART-*`/`SHELL-*`/`AUTH-*` surfaces — unrelated to this addition.
- `fitness-monitor` or any other consuming app's own repo — this WO lands and publishes the token
  only; `cockpit/UI-6` consumes it afterward, in its own repo, as a separate step.
- Any accent-derived tint/shade math — this token is a fixed baseline value, structurally unlike
  `cockpit.accentTint`/`accentLight`/`accentDark`.

### Risks

- **`fitness-monitor` is a real, already-shipped adopter** (`frontend/src/theme.js` +
  `frontend/src/theme.test.js`) that hard-asserts `assertThemeComplete(theme).findings` equals `[]`.
  A new *required* completeness surface must resolve automatically for every adopter with zero
  app-level action — the same guarantee `background.default`/`background.paper` already give,
  **not** an opt-in the app must declare. Concretely: the new key must come from
  `BASELINE_PALETTE` so every real `createAppTheme(...)` output has it defined, and MUI's own
  default theme must never define `background.subtle` itself (a novel key — verify this, don't
  assume it), so `descriptor.get(MUI_DEFAULT_THEME)` returns `undefined` and the "still equals MUI's
  untouched default" branch never fires. If either assumption is wrong, `fitness-monitor`'s CI
  breaks on its next pin bump and this WO must not ship that way.
- **Semver classification** — additive to the factory's *output* (no adopter passes anything new to
  get it), which argues for a patch, mirroring `SHELL-4`'s "narrows the contract, cannot turn
  cockpit red" precedent in the opposite direction (widens the contract, but resolves automatically,
  so it also cannot turn an adopter red). Confirm no adopter needs a code change before treating
  this as settled rather than asserting it.
- **Do not silently rename cockpit's `surface2` in this repo** — this WO adds the baseline token;
  cockpit's own re-point of 16 call sites from `cockpit.surface2` to the new baseline token is
  `UI-6`'s job, in cockpit's repo, not this one's.

### Required tests to WRITE

1. `assertThemeComplete` stays empty-findings for a minimal adopter call —
   `createAppTheme({ palette: { primary: { main: '#0F62FE' } } })` (mirroring `fitness-monitor`'s
   real usage) — proving the new surface resolves with zero adopter action, not just for a theme
   that happens to declare it.
2. `theme.palette.background.subtle` equals `'#F4F5F6'` on an unconfigured `createAppTheme(...)`
   call.
3. `calculateContrastRatio('#5B6670', '#F4F5F6')` (baseline `ink.secondary` on the new surface)
   passes AA (≥ 4.5:1) — computed via the shipped function, not asserted from the sheet's number.
4. Existing `tests/createAppTheme.test.js` and `tests/themeCompleteness.test.js` stay green
   unmodified in intent (only extended where the new surface must appear in an enumeration they
   already assert against, e.g. a surface-count or key-list check if one exists).

### Verification

No visual/prototype gate — this is a token-level palette addition with no rendered specimen of its
own in this repo. The rendered check for what this token actually looks like on real cockpit
surfaces happens downstream, in `cockpit/UI-6`'s own two-width verification.
