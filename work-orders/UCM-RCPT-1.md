# UCM-RCPT-1 — Shared receipt capture and review components

Prepared: 2026-10-16. Target repository: `ui-core-micha` (`main`). Backend counterpart: `django-core-micha/DCM-RCPT-1`. Consumers:
- `reimbursements/RMB-RCPT-1`;
- `spesix/SPX-RCPT-1`;
- `bigler-consult/BCO-EXP-1`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

reimbursements and spesix each built their own receipt capture and their own review of recognised values:
- spesix: client-side downscaling, `capture="environment"`, prefilling untouched fields;
- reimbursements: a suggestions dialog with apply per field, apply to empty fields and apply all.

bigler-consult needs the same.

Expected outcome: ui-core-micha offers receipt components that any app places next to its own form:
- a capture card;
- a review dialog, shown as a sheet on phones;
- a picker for several receipts in one photo;
- a consent switch.

They talk to `DCM-RCPT-1`'s endpoints. The app keeps its form and decides what to do with the values it receives.

## Visual spec

Prototype: [`work-orders/assets/UCM-RCPT-1-receipt-capture.html`](assets/UCM-RCPT-1-receipt-capture.html), drawn in spesix's theme. It shows:
- the capture card and the review dialog at 1280 px;
- capture and the review sheet at 375 px;
- several receipts from one photo;
- the edge states.

It declares its coverage at the top. The components take every colour, type and radius from the consuming app's theme.

**Parity guardrail:** the prototype governs look and interaction. Behaviour, consent and data contract come from `DCM-RCPT-1`.

## Operator decisions this Envelope records (2026-10-16)

- The receipt UI is shared, with a prototype as the visual spec.
- Consent is standing and revocable; the capture card offers it inline.

## Scope

- **Capture card:**
  - a camera button (`capture="environment"`) and a file button;
  - accepted types JPG, PNG, HEIC and PDF;
  - client-side downscaling of large images before upload, with the 10 MB bound; HEIC and PDF pass through unchanged;
  - progress while the receipt is read;
  - the image with the recognised fields outlined;
  - "use another receipt";
  - without consent, the inline consent switch and an upload-only path, so the app can still attach the file without recognition.
- **Review**, as a dialog at wide widths and a sheet at narrow ones:
  - **Per field:** the recognised value, the form's current value when it differs, a "same as in the form" note when they match, an "uncertain" chip for low confidence, and "Apply".
  - **Line items** as a list.
  - **Actions:** "Only empty fields", "Apply all", "Close".
  - **The host** passes its current form values and field labels and receives the chosen values. It decides how to fill its form.
- **Several receipts in one photo:** one card per receipt, with a crop preview, merchant, date, amount and a confidence chip. Low-confidence receipts are unselected by default. The confirm button reports the selected receipts to the host; its label is "{n} übernehmen", or a label the host supplies.
- **Consent switch:** usable inside the capture card and on an app's profile page. It reads and writes the user's own consent through `DCM-RCPT-1`. The text names the provider as configured.
- **API client:** default calls for recognition and consent, overridable per function as in the chat client.
- **Edge states, as drawn:** no consent yet; nothing recognised; recognition unavailable (spend cap, count limit or provider); file too large or wrong type.
- **Strings:** all registered in a new translations module in German, English, French and Swahili. Field labels can be overridden by the host.

## Copy list (released with this Envelope)

German shown; translated in the four languages:
- "Beleg fotografieren", "Datei wählen", "JPG, PNG, HEIC oder PDF", "Beleg wird gelesen …", "Anderer Beleg"
- "Erkannte Werte", "wie im Formular", "Übernehmen", "Nur leere Felder", "Alle übernehmen", "Schliessen"
- Chips "sicher" / "unsicher"
- "{n} Belege erkannt", "{n} übernehmen", "Unleserlich", "Betrag nicht erkannt"
- Consent: "Belege dürfen für die automatische Erkennung an {provider} übermittelt werden. Jederzeit widerrufbar.", "Nur hochladen"
- "Auf diesem Beleg wurden keine Angaben erkannt. Bitte von Hand erfassen."
- "Die Belegerkennung ist im Moment nicht verfügbar. Bitte von Hand erfassen."
- "Diese Datei kann nicht gelesen werden. Erlaubt sind JPG, PNG, HEIC und PDF bis 10 MB."
- Default field labels: "Händler", "Datum", "Betrag", "Währung", "Zahlungsart", "Konto", "Positionen"

## Token delta list

None. Drawn from spesix's theme.

## Replaces / removes

Nothing in ui-core-micha. Each consumer order lists its own removals.

## Non-goals

- The expense or claim forms of the apps.
- Bank-proof pairing and ZIP upload.
- Live camera streams through `getUserMedia`; the operating system's camera via `capture` is enough.

## Tier

Tier 3: a new shared-core surface with a privacy-relevant consent control.

## Risks

- **Overwriting user input:** "Apply all" replaces values the user typed. "Only empty fields" and the per-field view exist for that reason, and the form's current value is always shown beside the suggestion.
- **Consent wording:** the switch is the only consent the user gives, so it must name the provider and that consent is revocable.

## Required tests to write

- Capture:
  - camera and file inputs carry the right `accept` and `capture`;
  - large images are downscaled under the bound;
  - HEIC and PDF pass through;
  - files that are too large or of a wrong type show the error state without a request.
- Consent:
  - without consent, recognition is not called and upload-only is offered;
  - switching it on calls the consent endpoint.
- Review:
  - "Apply" hands over one field;
  - "Only empty fields" hands over only fields the form left empty;
  - "Apply all" hands over every field;
  - "same as in the form" and the "uncertain" chip render from the data.
- Several receipts: low-confidence receipts start unselected, and confirm reports exactly the selected ones.
- Edge states render from their error codes.
- API client: overriding one function keeps the defaults.
- Translations: every new key exists in all four languages.

# B. Implementation map — addressed to the implementer

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Minor release; can be built against the `DCM-RCPT-1` contract in parallel. ucm has no host app: the rendered side-by-side at 375 px and 1280 px runs where the components are first mounted, in `spesix/SPX-RCPT-1`, and is that order's commit gate.
