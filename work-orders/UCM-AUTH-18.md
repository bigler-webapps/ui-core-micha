# UCM-AUTH-18 · One wording for the too-short password message

## A. Envelope

### Goal & expected outcome

- Goal: every ui-core-micha surface shows the same text when a password is shorter than 8 characters, in every language.
- Expected outcome:
  - `Auth.PASSWORD_TOO_SHORT`, `Auth.PASSWORD_TOO_SHORT_LOCAL` and `password_too_short` carry identical texts per language;
  - a patch release that consumers can pin.

### Why

- `src/i18n/authTranslations.ts` has three keys for the same message with two wordings:

  | Key | Used by | en | fr | sw |
  |---|---|---|---|---|
  | `Auth.PASSWORD_TOO_SHORT_LOCAL` | `PasswordSetForm.jsx:38`, `PasswordChangeForm.jsx:28` | "The password must be at least 8 characters long." | "Le mot de passe doit contenir au moins 8 caractères." | "Nenosiri linahitajika kuwa na angalau herufi 8." |
  | `password_too_short` | server error code | same as above | same as above | same as above |
  | `Auth.PASSWORD_TOO_SHORT` | `SignupConfirmContent.jsx:46` | "Password must be at least 8 characters long." | "Le mot de passe doit comporter au moins 8 caractères." | "Nenosiri lazima liwe na herufi 8 au zaidi." |

- The difference made the workspace acceptance runner's en-US default miss the reset form's text (HRAM-CI-26). The runner now uses the majority wording (webapps@ee8d4a13). The operator decided on 2026-11-22 to align the kit as well.

### Existing capabilities

- The translation file and the consumers' registration of ucm strings (`I18N-*` contract) stay as they are.

### Scope

1. Change `Auth.PASSWORD_TOO_SHORT` in en, fr and sw to the wording of the other two keys (table above). German is already identical.
2. No other key, component or behaviour changes.
3. Patch release following the repo's publish-from-main flow, with a changelog line naming the changed texts.

### Non-goals

- No change to `Auth.PASSWORD_TOO_SHORT_LOCAL` or `password_too_short`.
- No merging of the three keys into one.
- No pin bumps in consumer apps; apps take the release through their normal updates.
- No change to the workspace acceptance runner.

### Tier

- Tier 3: a change inside shared-core (`ui-core-micha`), copy only.

### Risks

- An app test or acceptance protocol that asserts the old `Auth.PASSWORD_TOO_SHORT` text on the signup confirmation fails after the app bumps its pin. The changelog names the changed texts so the bump can adjust them.

### Required tests to WRITE

- For every language present, `Auth.PASSWORD_TOO_SHORT`, `Auth.PASSWORD_TOO_SHORT_LOCAL` and `password_too_short` have identical texts.

## Gate record

Gate #1 approved by the operator 2026-11-22 (AskUserQuestion: "Freigeben + Übergabetext").
