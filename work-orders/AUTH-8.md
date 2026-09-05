# AUTH-8 — `extractErrorInfo`'s hardcoded `'GENERIC'` code must not out-rank the caller's own default

---

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome
- Ziel: `extractErrorInfo` (`src/utils/auth-errors.js:2-27`) gibt für jeden Backend-Fehler der
  Form `{"detail": "..."}` (Djangos generisches Fehlerformat — u.a. DRF `Throttled`, `Http404`,
  `PermissionDenied`, jede unbehandelte `APIException`; exakt die Form des 429/409, das die
  gesamte `KIRA-TRACK-3`/`AUTH-7`-Untersuchung ausgelöst hat) den hartcodierten Code `'GENERIC'`
  zurück. `normaliseApiError` (Zeile 29-38) wählt dann `info.code || defaultCode` — da `'GENERIC'`
  ein truthy String ist, GEWINNT er IMMER gegen den von JEDER der 39 bestehenden Aufrufstellen in
  diesem Repo übergebenen, spezifischen `defaultCode` (z. B. `'Auth.LOGIN_FAILED'`,
  `'Auth.PROFILE_UPDATE_FAILED'`, …). `'GENERIC'` ist an KEINER Stelle als i18n-Key registriert
  (verifiziert: kein Treffer in `src/i18n/`, keine Erwähnung ausserhalb dieser einen Zeile) — die
  UI zeigt also für JEDEN `{detail}`-förmigen Backend-Fehler den rohen String `"GENERIC"` statt
  einer übersetzten Meldung, gleich welcher Aufrufer betroffen ist.
- Expected outcome: ein `{detail}`-förmiger Fehler liefert `code === <übergebener defaultCode>`
  (übersetzt, wie jeder andere fehlende/unbekannte Code auch) — `data.detail`s Text bleibt weiterhin
  in `.message` erhalten (nützlich für Logs/Debugging), beeinflusst aber nicht mehr `.code`.

## Scope + non-goals
- In scope: ausschliesslich `src/utils/auth-errors.js` — die EINE Zeile, die `code: 'GENERIC'`
  zurückgibt, wird zu `code: null` (dann gewinnt in `normaliseApiError` korrekt der übergebene
  `defaultCode`, exakt wie bei jedem anderen Fehler ohne erkennbaren Code).
- Explizite Non-Goals / nicht anfassen: die ANDEREN beiden Zweige von `extractErrorInfo`
  (`data.errors[0].code`, `data.code`) liefern einen ECHTEN, vom Backend gesetzten Code — dieses
  Verhalten ist korrekt und bleibt unverändert; nicht "verbessern" oder umbauen.
  `normaliseApiError`s Signatur/Rückgabeform (`Error` mit `.code`/`.status`/`.raw`) bleibt gleich.
  Keine neue i18n-Übersetzung für `'GENERIC'` selbst nötig — der Fix macht den String obsolet,
  statt ihn übersetzbar zu machen. Keine Änderung an `LoginPage.jsx`/`SecurityComponent.jsx`/
  anderen Konsumenten — die lesen bereits `err.code || '<eigener Default>'` und profitieren
  automatisch, ohne selbst geändert zu werden.

## Tier · precondition / gate
- Tier: 3 — Shared-Core (`ui-core-micha`), betrifft laut Aufrufstellen-Scan ALLE 39 bestehenden
  `normaliseApiError(...)`-Aufrufe in diesem Repo (jede Funktion in `src/auth/authApi.jsx` und
  `src/utils/authService.js`). Kein Precondition/Gate.
- **Wichtig fürs Versionsschema:** anders als `AUTH-7` (rein additiv) ändert dieser Fix
  BEOBACHTBARES Verhalten für jeden Aufrufer, der aktuell (fehlerhaft) `.code === 'GENERIC'`
  bekommt — das ist der Bug selbst, aber jede konsumierende App, die diese Version zieht, sieht ab
  sofort eine ANDERE (korrekte) übersetzte Meldung an Stellen, wo bisher der rohe String
  `"GENERIC"` erschien. Deshalb MINOR-Bump (nicht PATCH) vorgesehen, siehe Teil C.

## Risks
- Wird der Fix zu breit gefasst (z. B. `'GENERIC'` komplett aus dem Vokabular entfernt statt nur
  die eine Codepfad-Priorität zu korrigieren), könnte das `.message`-Feld (der rohe `data.detail`-
  Text) verlorengehen — das wird von KEINEM bekannten Aufrufer als Anzeige-Text verwendet (alle
  lesen `.code` fürs Rendering, s.o.), aber sicherheitshalber in den Tests absichern.
- Die beiden UNVERÄNDERTEN Zweige (`data.errors[].code`, `data.code`) müssen per Regressionstest
  nachweislich unverändert bleiben.

## Required tests to WRITE
Neue Datei `tests/authErrors.test.js` (reiner Unit-Test, kein React/Testing-Library nötig — direkter
Import von `normaliseApiError`/`extractErrorInfo` aus `../src/utils/auth-errors.js`):
1. `{ response: { status: 429, data: { detail: 'Die Anfrage wurde gedrosselt...' } } }` mit
   `normaliseApiError(err, 'Auth.LOGIN_FAILED')` aufgerufen → `.code === 'Auth.LOGIN_FAILED'` (NICHT
   `'GENERIC'`), `.message === 'Die Anfrage wurde gedrosselt...'`, `.status === 429`.
2. Ohne übergebenen `defaultCode` (Default-Parameter) mit demselben `{detail}`-Fehler → `.code ===
   'Auth.GENERIC_ERROR'` (der Funktions-Default, nicht `'GENERIC'`).
3. Regression: `{ response: { data: { errors: [{ code: 'enter_current_password', message: 'x' }] } } }`
   → `.code === 'enter_current_password'` (übergebener `defaultCode` NICHT verwendet — echter
   Backend-Code gewinnt weiterhin, unverändert).
4. Regression: `{ response: { data: { code: 'invalid_credentials' } } }` → `.code ===
   'invalid_credentials'` (unverändert).

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Context package

**Named file to change:** `src/utils/auth-errors.js:21-24`:

```js
  // Fallback for generic Django errors
  if (typeof data.detail === 'string') {
    return { status, code: 'GENERIC', message: data.detail, raw: data };
  }
```

Ändere die zurückgegebene `code`-Property von `'GENERIC'` zu `null`:

```js
  // Fallback for generic Django errors. `code: null` here (not a fake sentinel)
  // lets normaliseApiError's `info.code || defaultCode` correctly prefer the
  // caller's own specific default — `data.detail` is Django's generic
  // human-readable message field, never a machine code, and no caller of
  // normaliseApiError anywhere in this repo expects to see 'GENERIC' as a code
  // (grepped: zero references outside this one line, zero i18n key for it).
  if (typeof data.detail === 'string') {
    return { status, code: null, message: data.detail, raw: data };
  }
```

**Do NOT touch** the other two branches (lines 11-15 `data.errors[0]`, lines 17-19 `data.code`) or
`normaliseApiError` itself (lines 29-38) — its `info.code || defaultCode` logic is already correct;
the bug was entirely in what `extractErrorInfo` fed it.

**Invariants / Pitfalls:**
- `normaliseApiError`'s OWN default parameter is `defaultCode = 'Auth.GENERIC_ERROR'` (line 29) —
  this is a DIFFERENT string (`'Auth.GENERIC_ERROR'`, already namespaced like every other code in
  this file) from the bug's `'GENERIC'` sentinel. Do not confuse the two or "fix" the wrong one.
- `data.detail` being falsy/absent already falls through correctly to the final `return { status,
  code: null, message: null, raw: data }` (line 26) — that path is already correct and untouched.
- No i18n file needs a new key — this fix does not introduce any new user-visible string; it makes
  the ALREADY-TRANSLATED caller-specific keys (e.g. `Auth.LOGIN_FAILED`, confirmed translated in
  de/fr/en/sw) reachable again.

Directive: Arbeite ausschliesslich aus diesem Kontext-Paket; öffne nur `src/utils/auth-errors.js`
und die neue Testdatei zur Verifikation. Kein breites Erkunden in `authApi.jsx`/`authService.js` —
deren 39 Aufrufstellen sind bereits korrekt (sie übergeben schon einen sinnvollen `defaultCode`);
sie müssen nicht einzeln angeschaut werden.

## Target repo working directory (absolute)

`C:\Users\Micha Bigler\Documents\webapps\ui-core-micha`

## Preamble — REQUIRED, part of this file

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine;
> there is no separate plan file. Read the nearest `AGENTS.md`, the relevant
> `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do
> not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`.
> **Do NOT edit `WORK_ORDERS.md`** — the register row and the review verdicts are the
> orchestrator's alone. **Your tools are for editing source and test files and for running the
> tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package
> manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as
> `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the
> tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm
> they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT
> any review). The orchestrator re-runs the authoritative set + does the independent review after
> you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this
> line. Everything below describes what the Orchestrator does AFTER you finish. You do none of it
> — no reviewers, no verification run, no register edit, no commit.** You ARE the invocation
> described below; do NOT shell out to `codex exec`.

## Execution directive

Implement through `codex exec` in the background, invoked directly via Bash with both mandatory
flags. Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit
(flips authorship — independent reviewer becomes mandatory, already mandatory at Tier 3). Codex
confirmed available today (two successful dispatches already this session, `KIRA-TRACK-3`/
`AUTH-7`) — no fresh probe needed.

## Review routing

Tier 3, full set, all concurrent in one background batch: `reviewer` (all 4 lenses — `regression`
matters most here given 39 call sites; `envelope` needs Part A inline), `ui_reviewer` (this is
specifically an i18n/error-rendering correctness fix — narrow context: the diff + confirmation that
every `defaultCode` used across `authApi.jsx`/`authService.js` is actually a translated key in all
shipped locales), `sec_reviewer` (confirm `.message`/`.raw` still expose no more than before — this
diff should REDUCE not increase what reaches the UI, since `'GENERIC'` is replaced by `null`).
Orchestrator's own targeted pass runs alongside.

## Verification

Authoritative test run: `npx vitest run tests/authErrors.test.js tests/authErrorCodeRendering.test.jsx
tests/authApiLogin.test.js tests/authApiRegistration.test.js` (affected area — everything touching
`auth-errors.js` and its consumers). No prototype artifact, no rendered side-by-side (no markup
changed).

## Register + commit

Bump `package.json`'s `version` — **MINOR**, not PATCH, per the Envelope's tier note (observable
behavior change for existing `{detail}`-shaped-error callers, not purely additive) — from whatever
`AUTH-7` landed at, to the next `3.x.0`. `CHANGELOG.md` entry MUST explicitly warn: existing
consumers who upgrade will see a DIFFERENT (correct, translated) message wherever they previously
saw the raw string `"GENERIC"` for a `{detail}`-shaped backend error — re-check that UI surface
after bumping the pin, don't assume silent compatibility the way `AUTH-7`'s bump was. Commit on
`main`. `WORK_ORDERS.md` row for `AUTH-8` → `done`, named review verdict, landing SHA.
