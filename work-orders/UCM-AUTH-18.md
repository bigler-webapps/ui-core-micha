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

## B. Implementation map

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` on `main`. The existing `src/i18n/authTranslations.ts` contains all three keys and the four locales `de`, `en`, `fr`, `sw`; the two existing comparison keys already match. The existing `tests/authTranslations.test.js` checks auth translation coverage and is the relevant test seam. The Orchestrator owns the work order, register, version, changelog, tests, independent review and release. Preserve the unrelated uncommitted chat and permissions changes in the shared checkout.

## Preamble

> You are the configured implementer for UCM-AUTH-18. Run `codex-hook-canary-ws-gov-60` first from the workspace root; report unverified coverage if the expected denial is absent. Parts A and B are the complete specification. Work only in `src/i18n/authTranslations.ts` and `tests/authTranslations.test.js` under the target repository. Other sessions share the checkout; preserve their changes. Do not read environment files, credentials or real records. Do not edit the WO, register, metadata, dependencies or other paths; do not install packages, run git writes, review, delegate or dispatch. Write the required test; the Orchestrator runs authoritative evidence. Leave an uncommitted diff and return PLAN, PROGRESS and RESULT.

## C. Orchestrator only

Record test evidence, independent review, release and Part B accuracy in Completion.

## Completion

The configured implementer and fix worker used `codex/gpt-6.1-terra`. Independent OpenAI review used `codex/gpt-6.1-terra` for envelope, regression, tests, security and UI and `codex/gpt-6-luna` for duplication. The first round raised two test defects, both corrected; the closing round reported no findings. Part B: accurate.

The initial `tests.py --repo ui-core-micha --scope frontend --wo UCM-AUTH-18` returned `RESULT: BLOCKED` because the local `project.yaml` declared only `managed_picker`. After the operator approved the permanent test configuration, `tests.py --repo ui-core-micha --scope auth_translations --wo UCM-AUTH-18` passed 23 tests. The operator authorized an independent replacement review because the review runner refused round 3; `codex/gpt-6.1-terra` found no issues. The first attempt returned exit 65 because its answer did not match the wrapper's format; the formatted retry passed. The local test configuration also names an uncommitted UCM-CHAT-21 test, so its permanent landing remains coordinated with that order. The 4.40.1 metadata is prepared locally; publication remains to be verified.

The Auth change landed as `6e4ee0c`, followed by register commit `503215f`. Publish workflow `45046098825` completed successfully, including build and tests, and its npm step reported publishing `4.40.1`. The public npm registry initially returned `version not found: 4.40.1`, then confirmed the exact version after a short propagation delay. Keep the order in review until the approved permanent test configuration is landed.

## Gate record

Gate #1 approved by the operator 2026-11-22 (AskUserQuestion: "Freigeben + Übergabetext").

Gate #1 expansion approved by the operator 2026-11-22: add a permanent frontend test scope and an auth translation scope to `project.yaml`, and correct the managed-picker Windows test invocation.
