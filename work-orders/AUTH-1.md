# WORK ORDER AUTH-1 — Password forms: state the rules (proactive helperText + inline validator)

Tier 2 (touches `ui-core-micha` = shared-core). ucm-only, **zero per-app work** (consumers get it
on their next ucm pin-bump). Origin: Spesix field report 2026-08-06 — a first-time admin setting a
password from an invitation link could not tell what the password had to satisfy; the only way to
learn the rules was to submit and read the rejection.

## A. Envelope (authoritative WHAT / WHY)

### Goal
Tell the user the password rules **before** they submit, and give **instant frontend feedback** on
the two most common failures — so the invitation/first-contact screen no longer rejects people
without ever saying what it wants.

### Scope — exactly the two forms that take a NEW password
- `src/components/PasswordSetForm.jsx` (invitation set + reset-confirm).
- `src/components/PasswordChangeForm.jsx`.
- **NOT** `PasswordResetRequestForm.jsx` — verified it takes **email only** (`type="email"`,
  `onSubmit(email)`), no password field. The Spesix report listed it by mistake.

### Deliverable 1 — proactive helperText (the rules, stated)
- Render `helperText` on the **new-password** `TextField` in both forms, default =
  `t('Auth.PASSWORD_RULES_HINT')`.
- Add `Auth.PASSWORD_RULES_HINT` to `src/i18n/authTranslations.ts` in **de/fr/en**, stating the
  baseline the template ships with. The baseline is authoritative from dcm
  `settings_base.py:493-498` (the 4 Django defaults): **min 8 chars · not entirely numeric · not a
  common password · not too similar to personal info.** Suggested de: „Mindestens 8 Zeichen, nicht
  nur Zahlen, kein gängiges Passwort." (keep it concise; the similarity rule is niche — translator
  finalises).
- Add an **optional prop** `passwordRulesHint` (string) to both forms — overrides the default so an
  app that configures custom validators can pass matching text. This is the "Better" variant: cheap
  effort, removes the only real objection (divergence from a customised backend).

### Deliverable 2 — inline validator (signal before the backend rejects)
Before calling `onSubmit(...)`, validate the two rules that are cheap and faithful to replicate,
reusing the existing local-error mechanism (`localErrorKey` — the forms already do this for
empty/mismatch):
- **min length 8** → `Auth.PASSWORD_TOO_SHORT_LOCAL`,
- **not entirely numeric** → `Auth.PASSWORD_NUMERIC_LOCAL`.
Add both keys (de/fr/en). **Deliberately NOT** replicating CommonPassword (needs the ~20k list in
the browser) or UserAttributeSimilarity (needs user attributes the set-from-invite form doesn't
have) — those stay backend-enforced; the helperText already warns about them, and AUTH-2 will
translate their backend rejection. This is a **best-effort UX layer, not a security boundary** —
the backend stays authoritative (frontend permissive, backend decides).

### Non-goals
- Don't change the backend or the validators. Don't touch `PasswordResetRequestForm`. Don't touch
  the `onSubmit` contract or add API-error rendering (that's the deferred reactive error-prop, out
  of scope). No new screen → **no prototype** (trivial addition per `frontend-design`).

### Tier / rollout
Tier 2 (shared-core). ucm has **no staging** → publish-from-main: land on `main` → **minor version
bump** (2.26.4 → 2.27.0) → consumers adopt on their own pin-bump. **Spesix is pinned at 2.5.0**
(far behind) — it won't receive this until it does a separate, larger ucm pin-bump; that's an
app-side decision, not part of this WO.

### Required tests
ucm component tests: helperText renders on both forms (and the `passwordRulesHint` prop overrides);
the inline validator blocks submit + shows the right message for a <8-char and an all-numeric
password; de/fr/en keys present for all 3 new strings.

## B. Implementation map (seed)
- `src/components/PasswordSetForm.jsx` (new-password `TextField` ~L48) + `PasswordChangeForm.jsx` —
  add `helperText` + the pre-`onSubmit` length/numeric check via `localErrorKey`; add the
  `passwordRulesHint` prop.
- `src/i18n/authTranslations.ts` — 3 new keys × de/fr/en: `PASSWORD_RULES_HINT`,
  `PASSWORD_TOO_SHORT_LOCAL`, `PASSWORD_NUMERIC_LOCAL`.
- `package.json` — minor bump at finalize (Orchestrator, on green).

**Review:** Tier 2 → independent `reviewer` + **`ui_reviewer`** (frontend diff, i18n coverage).
**Directive:** implementer leaves the diff; Orchestrator reviews + bumps the version + commits on
green. Codex out until 2026-08-06 → direct Claude.

**Companion:** AUTH-2 (translate the backend auth error codes — the *reactive* half, broader).
