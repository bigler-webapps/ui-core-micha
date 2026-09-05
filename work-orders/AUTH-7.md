# AUTH-7 — `loginWithPassword`'s "already authenticated" retry must not crash raw on a second failure

---

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome
- Ziel: allauth-headless antwortet auf `POST /auth/login` mit `409` ("Conflict"), wenn bereits
  eine gültige Session existiert (die Session ist real gültig — kein Fehlerfall an sich).
  `loginWithPassword` (`src/auth/authApi.jsx:97-123`) behandelt das korrekt, indem es dann
  `fetchCurrentUser()` erneut aufruft, um den bereits eingeloggten User zurückzugeben. Schlägt
  DIESER Retry-Call aber ebenfalls fehl (beobachtet 2026-09-05: ein anderer, unabhängig
  überlasteter Endpunkt hatte den globalen `user`-Throttle-Bucket geleert, sodass auch
  `/api/users/current/` mit 429 antwortete), wird der Fehler ungefangen durchgereicht — kein
  `.code`, keine Übersetzung, ein rohes Error-Objekt statt eines normalen Login-Fehlers.
- Expected outcome: schlägt der 409-Retry fehl, bekommt der Aufrufer (`LoginPage.jsx:219-220`
  liest `err.code`) einen normalisierten Fehler mit `.code` — dieselbe Fehlerform wie jeder andere
  Login-Fehlerpfad in dieser Funktion, kein Sonderfall.

## Scope + non-goals
- In scope: ausschliesslich der 409-Zweig in `loginWithPassword`
  (`src/auth/authApi.jsx:116-119`) — den bereits vorhandenen `fetchCurrentUser()`-Retry-Call in
  ein eigenes try/catch nehmen und einen Fehlschlag über `normaliseApiError` weiterwerfen, exakt
  wie jeder andere Fehlerpfad in dieser Funktion (Zeile 121) es bereits tut.
- Explizite Non-Goals / nicht anfassen: der **Erfolgsfall** dieses Zweigs (409 + erfolgreicher
  Retry → `{ user, needsMfa: false }`) bleibt bytegleich. `AuthContext.jsx`s Bootstrap-Catch-Block
  (Zeile 107-109) wird NICHT geändert — geprüft: `user` ist beim ersten Mount ohnehin bereits
  `null`, eine Fallunterscheidung nach Statuscode hätte dort unter keinem real erreichbaren
  Codepfad einen beobachtbaren Effekt (der Effect läuft genau einmal pro Seitenaufruf), wäre also
  Änderung ohne Wirkung in einer Shared-Core-Datei — bewusst ausgelassen. Keine neue Kontext-Prop,
  keine Änderung an einer konsumierenden App (`kira` o.a.) — der Fix ist rein additiv/intern zu
  `authApi.jsx`. `package.json`s Versionsfeld wird als Teil dieser WO angepasst (PATCH-Bump, siehe
  Teil C) — das ist Prozess/Publish-Mechanik dieses Repos, kein Scope-Zusatz am eigentlichen Fix.

## Tier · precondition / gate
- Tier: 3 — Änderung INNERHALB von Shared-Core (`ui-core-micha`), unabhängig vom Umfang (AGENTS.md
  → Tiering-Tabelle). Kein Precondition/Gate; die Änderung ist rein additiv (ein neuer catch um
  einen bestehenden Call), kein Breaking Change, kein Versions-Bump nötig, keine konsumierende App
  muss etwas tun.

## Risks
- Der Erfolgspfad (409 + Retry gelingt) darf sich nicht ändern — sonst bricht der bestehende
  "bereits eingeloggt"-Login-Flow für ALLE Apps, die `ui-core-micha` konsumieren.
- Der neue catch darf den `normaliseApiError`-Fehler nicht verschlucken oder verfälschen — die
  aufrufende `LoginPage.jsx` liest `err.code` für die i18n-Anzeige.

## Required tests to WRITE
- Neue Datei `tests/authApiLogin.test.js` (Muster: `tests/authApiRegistration.test.js` — `apiClient`
  gemockt via `vi.mock`, `client.post`/`client.get` direkt gestubbt, kein React/Testing-Library
  nötig, `loginWithPassword` direkt importiert und aufgerufen):
  1. `post` rejects mit `{ response: { status: 409 } }`, `get` (der `fetchCurrentUser`-Retry)
     resolved mit `{ data: { id: 1, ... } }` → `loginWithPassword` liefert
     `{ user: {...}, needsMfa: false }` (dokumentiert den unveränderten Erfolgspfad).
  2. `post` rejects mit `{ response: { status: 409 } }`, `get` (der Retry) rejects zusätzlich mit
     `{ response: { status: 429, data: { detail: '...' } } }` → `loginWithPassword` wirft einen
     Error mit einem gesetzten `.code` (nicht `undefined`, nicht das rohe Axios-Error-Objekt).

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Context package

**Named file to change:** `src/auth/authApi.jsx:97-123` (`loginWithPassword`), konkret nur
Zeilen 115-119:

```js
    // 409 = Already logged in
    if (status === 409) {
        const user = await fetchCurrentUser();
        return { user, needsMfa: false };
    }

    throw normaliseApiError(error, 'Auth.LOGIN_FAILED');
```

Ändere zu (Retry in eigenes try/catch, Fehlschlag desselben `normaliseApiError`-Wegs wie jeder
andere Fehlerpfad dieser Funktion):

```js
    // 409 = Already logged in
    if (status === 409) {
        try {
          const user = await fetchCurrentUser();
          return { user, needsMfa: false };
        } catch (retryError) {
          throw normaliseApiError(retryError, 'Auth.LOGIN_FAILED');
        }
    }

    throw normaliseApiError(error, 'Auth.LOGIN_FAILED');
```

`normaliseApiError` ist bereits oben in der Datei importiert (Zeile 3, aus `../utils/auth-errors`)
— keine neue Abhängigkeit.

**Invariants / Pitfalls:**
- `fetchCurrentUser()` (Zeile 16-24, gleiche Datei) wirft bei jedem Fehler das **rohe** Axios-Error
  weiter (kein eigener catch dort) — das ist bereits der Zustand, den dieser Fix abfängt; nicht
  `fetchCurrentUser()` selbst ändern.
- Der äussere `catch (error)`-Block (Zeile 103) bleibt unverändert; nur der 409-Zweig innerhalb
  bekommt einen zusätzlichen inneren try/catch. Die MFA-Prüfung (Zeile 108-112) und der finale
  `throw normaliseApiError(error, ...)` (Zeile 121, für den ursprünglichen `error`, NICHT den
  `retryError`) bleiben unverändert.
- `normaliseApiError`s zweites Argument ist ein Default-Code, kein spezifischer 429-Code — es gibt
  keinen eigenen i18n-Key für "Login gerade nicht möglich, Konto ist gedrosselt"; Wiederverwendung
  von `'Auth.LOGIN_FAILED'` (bereits vorhandener Key) ist beabsichtigt, kein neuer i18n-Key nötig
  in irgendeiner konsumierenden App.

Directive: Arbeite ausschliesslich aus diesem Kontext-Paket; öffne nur die genannte Datei plus die
genannte Testdatei-Vorlage zur Verifikation. Kein breites Erkunden im restlichen `src/auth/`.

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
(flips authorship — independent reviewer becomes mandatory, already mandatory at Tier 3).

## Review routing

Tier 3, full set, all concurrent in one background batch: `reviewer` (all 4 lenses — this is
shared-core, `duplication` and `regression` lenses matter most here), `ui_reviewer` (diff touches
a `.jsx` file consumed by every app's login page — narrow context: this diff + the relevant
`AGENTS.md` auth-error-handling convention), `sec_reviewer` (auth/login flow). Orchestrator's own
targeted security pass runs alongside, additional not substitute.

## Verification

Authoritative test run: `npx vitest run tests/authApiLogin.test.js tests/AuthContext.test.jsx
tests/authApiRegistration.test.js` (affected area — everything touching `authApi.jsx` and the
login flow it feeds). No prototype artifact in scope, no rendered side-by-side needed (no visual
change).

## Register + commit

Bump `package.json`'s `version` `3.5.0` -> `3.5.1` (PATCH — bugfix, no interface/behavior change
for any existing caller) as part of this same commit, matching this repo's established
push-to-`main` + version-bump publish flow (see `MSG-19`'s register row for precedent). Commit on
`main` (this repo has no `develop`). `WORK_ORDERS.md` row for `AUTH-7`, named review verdict.
After push, verify the bumped version actually published (per
`reference_dcm_ucm_publish_topology` — publish-from-main has no staging gate, check the live
package version after push). **No consumer pin-bump is required for this to take effect for
kira** — this is a pure bugfix with no interface change, so record explicitly in the Notiz that no
app needs to bump its `@micha.bigler/ui-core-micha` pin for this fix to matter (kira's *symptom*
was caused by the throttle exhaustion fixed in `KIRA-TRACK-3`, not by this bug alone — this fix
only prevents a raw/uncaught error the NEXT time any app's login flow race is hit).
