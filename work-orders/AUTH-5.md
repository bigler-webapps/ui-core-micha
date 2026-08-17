# AUTH-5 — `addPublicPath` muss dynamische Routen ausdrücken können

**Target repo:** `ui-core-micha` (branch `main`)
**Tier:** 3 — shared-core. Die Änderung betrifft die Login-Weiterleitung jeder konsumierenden App.

**Kein Prototyp.** Diese Work Order hat keine Oberfläche — sie erweitert eine Registrierungs-API.

**Auslöser:** `jg-ferien` PUB-7 Teil 2. Diese WO ist dessen Vorbedingung; nach der Veröffentlichung
zieht jg seinen Pin von **`2.37.1`** hoch.

---

## A. Envelope

### Goal

`apiClient` leitet bei 401/403 per hartem `window.location.assign("/login")` um — **ausser** der
aktuelle Pfad steht auf einer Allowlist (`redirectToLoginOnce`, `src/auth/apiClient.jsx`). Der
Mechanismus ist richtig gebaut: auf einer öffentlichen Seite unterbleibt die Weiterleitung und der
401 wird an die Komponente durchgereicht.

**Was er nicht kann, ist dynamische Routen.** `matchesPublicPath` vergleicht mit `startsWith`, ausser
bei `/`, wo Gleichheit verlangt wird. Eine App mit öffentlichen Seiten unter einem **variablen
Segment** — `/<slug>`, `/<slug>/team` — kann ihre öffentliche Fläche damit nicht beschreiben. Ein
konkreter Slug lässt sich eintragen; der nächste, den jemand anlegt, fällt wieder heraus.

**Warum das mehr ist als eine Unbequemlichkeit.** Fehlt der Pfad in der Liste, landet ein anonymer
Besucher beim ersten 401 auf `/login` — auf einer Seite, die öffentlich sein soll. Von aussen ist das
nicht von „diese Seite gibt es nicht" zu unterscheiden, und der Fehler zeigt sich erst, wenn ein
zweites Department existiert. Er sieht dann aus wie ein Zufall, nicht wie eine Lücke.

**Erwartetes Ergebnis.** Eine konsumierende App kann ihre öffentliche Fläche vollständig beschreiben,
auch wenn Teile davon aus variablen Segmenten bestehen.

### Scope

- **`addPublicPath` nimmt zusätzlich ein `RegExp` entgegen** (String bleibt unverändert gültig).
- **`matchesPublicPath` unterscheidet nach Typ**: String wie bisher (`/` exakt, sonst `startsWith`),
  `RegExp` per `test()` gegen **ausschliesslich `window.location.pathname`** — nie gegen Query oder
  Fragment, damit ein Muster nicht versehentlich über den Pfad hinaus greift.
- **`removePublicPath` funktioniert für beide Formen.** Bei `RegExp` über Identität des übergebenen
  Objekts; das gehört dokumentiert, weil zwei gleich aussehende Literale nicht dasselbe Objekt sind.
- **`BUILTIN_PUBLIC_PATHS` bleibt eingefroren und rein string-basiert.** Kein Muster in der
  Bibliotheks-Liste — sie darf sich nicht durch eine Konsumenten-Erweiterung verschieben.
- **Die Dokumentation am Aufruf sagt, was der Konsument nun selbst trägt**: ein zu weites Muster
  unterdrückt die Weiterleitung dort, wo sie gebraucht wird, und ein abgelaufener Login endet dann in
  einer stillen Fehlerseite statt am Login. Muster gehören verankert (`^…$`).

### Non-goals / do not touch

- **Keine Änderung am Weiterleitungsverhalten selbst** — weder Ziel, noch `?next=`, noch der
  einmalige Sperrmechanismus (`redirectingToLogin`).
- **Keine Änderung an der eingefrorenen Builtin-Liste** und keine an `isPublicSitePath`.
- **Keine Änderung am Per-Request-Opt-out** für Bootstrap-Proben.
- **Keine neue Prüfung gegen Query oder Fragment.**

### Risks

- **Die Verantwortung wandert zum Konsumenten.** Ein unverankertes Muster wie `/team` trifft auch
  `/admin/team`. Das ist der Preis der Flexibilität und muss in der Dokumentation stehen, nicht nur
  im Kopf des Autors.
- **Geteilter Code**: jede konsumierende App bekommt die Änderung. Deshalb rein additiv — bestehende
  String-Registrierungen müssen sich zeichengenau gleich verhalten.
- **Ein Muster, das zu eng greift, ist unsichtbar**, bis jemand die betroffene Seite anonym öffnet.
  Deshalb gehört die Gegenrichtung mitgetestet.

### Required tests to WRITE

- **Regression, nicht verhandelbar:** String-Registrierungen verhalten sich exakt wie bisher — `/`
  nur bei Gleichheit, andere Einträge per Präfix.
- Ein registriertes `RegExp` trifft die passenden Pfade; ein nicht passender Pfad **löst weiterhin
  die Weiterleitung aus**.
- Das Muster wird gegen `pathname` geprüft, nicht gegen Query oder Fragment.
- `removePublicPath` entfernt einen `RegExp`-Eintrag; ein Builtin-Pfad lässt sich weiterhin **nicht**
  entfernen.
- Ein `RegExp` in `CONSUMER_PUBLIC_PATHS` bricht die bestehende Auswertung der String-Einträge nicht.
- **Affected set** (laufen, nicht schreiben): die vorhandenen `apiClient`-Tests.

---

## B. Implementation map

**Selbst umgesetzt (nicht per Codex)** — laufende Operator-Anweisung für diese Session.

### Design-Entscheidungen

- **`addPublicPath`/`removePublicPath`** akzeptieren jetzt zusätzlich `instanceof RegExp` neben
  `string`; `CONSUMER_PUBLIC_PATHS` bleibt ein `Set`, das für `RegExp`-Objekte automatisch
  Identitäts-Löschung liefert (`Set.delete` nutzt SameValueZero) — kein Sonderfall nötig.
- **`matchesPublicPath`** prüft `entry instanceof RegExp` zuerst und ruft `entry.test(pathname)` —
  ausschliesslich gegen `window.location.pathname`, nie gegen `search`/`hash`, da die Funktion
  ohnehin nur `pathname` als Parameter erhält (kein Risiko einer versehentlichen Konkatenation).
- **`BUILTIN_PUBLIC_PATHS` unverändert** — bleibt string-only und eingefroren, keine Berührung.
- Dokumentation an `addPublicPath`/`removePublicPath` erweitert: Anker-Pflicht (`^…$`) für
  `RegExp`-Muster und Identitäts-Hinweis für `removePublicPath`.

### Kontextpaket

- `src/auth/apiClient.jsx` — einzige geänderte Quelldatei.

### Tests

`tests/apiClientPublicPaths.test.js` (neu, 11 Fälle) — fährt durch den echten
Response-Interceptor (nicht durch eine Nachbildung von `matchesPublicPath`), damit ein Fehler in
der Verdrahtung selbst auffällt, nicht nur ein Fehler im Matcher. Jeder Test importiert das Modul
frisch (`vi.resetModules()` + dynamisches `import()`), weil `redirectingToLogin` ein
Modul-Level-Riegel ist, der sich in jsdom nie durch echte Navigation zurücksetzt.
`window.location` wird durch ein rein synthetisches Objekt ersetzt (jsdoms echtes
`location.assign` ist nicht konfigurierbar, und `pushState` bindet nicht an ein ersetztes
`location`-Objekt) — deckt exakt das ab, was der Interceptor liest (`pathname`) und aufruft
(`assign`). Affected set: `authApiRegistration.test.js`, `AuthContext.test.jsx`,
`feedApi.test.js`, `messagingApi.test.js`, `notificationsApi.test.js` — alle grün.

---

## C. Orchestrator only

> **STOPP — wer diesen Auftrag als eigene Spezifikation liest, ist mit diesem Abschnitt nicht
> gemeint.** Er beschreibt dem Orchestrator, wie er dich aufruft, wie das Ergebnis geprüft und wie es
> verbucht wird. **Du BIST dieser Aufruf — starte kein `codex exec`, spawne keine Reviewer, pflege
> das Register nicht, committe nicht.** Deine Aufgabe endet beim Diff.

### Execution directive

`.claude/codex-status.md` im Workspace-Root vor dem Aufruf prüfen. Ohne Zeile für den
Ausführungstag Codex verwenden — direkt per Bash, nie über die `debugger`/`*_coder`-Wrapper, mit
BEIDEN Flags `--skip-git-repo-check` und `--dangerously-bypass-approvals-and-sandbox`. Der Rückfall
auf direkte Umsetzung dreht die Autorschaft und macht den unabhängigen `reviewer` zwingend.

### Review routing

Tier 3 (shared-core): **`reviewer` und `sec_reviewer`**, gleichzeitig in einem Hintergrund-Batch vor
dem Commit. `ui_reviewer` entfällt — es gibt keine Oberfläche. `sec_reviewer` prüft die Kernfrage:
kann ein registriertes Muster die Weiterleitung dort unterdrücken, wo sie gebraucht wird, und ist die
Auswertung auf `pathname` beschränkt.

### Verification

Kein Prototyp, kein Zwei-Breiten-Abgleich. Der Nachweis sind die Tests, insbesondere die
Regressionsfälle für die String-Registrierung.

Nach grünem Review: Version anheben und veröffentlichen. **Die WO ist erst abgeschlossen, wenn die
Version veröffentlicht ist** — jg-ferien PUB-7 hängt daran und kann ohne sie nicht landen.

### Register + commit

Zeile `AUTH-5` erreicht `done` nur mit beiden Reviewern samt Verdikt in der `Notiz` und der
veröffentlichten Version. Auf grün nach `main` committen und pushen.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), Branch `main`.
WO: `work-orders/AUTH-5.md`. Konsument: `jg-ferien` PUB-7 Teil 2 (Pin heute `2.37.1`).
`git pull`, WO lesen, dann `orchestrate-codex` folgen.
