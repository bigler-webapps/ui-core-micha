# UCM-AUTH-13 — Preserve profile edits during a same-person refresh

## A. Envelope — operator-approved correction

The Spesix first-steps browser trace proves that a background current-user response can arrive while the privacy checkbox is being edited. `ProfileComponent` currently resets every form field whenever the context user object changes, losing the person's input.

Expected outcome: preserve unsaved name and consent edits across a background refresh of the same person. Continue to refresh untouched fields from server data. A change of person, including logout followed by login, must initialize the form from the new person's data and never transfer consent or edits between people. Initial asynchronous user hydration must still work.

Scope: the existing shared ProfileComponent form state, targeted regression tests, a patch release, and subsequent Spesix dependency consumption. No change to authentication, permissions, consent policy, API payload shape, statement requests, layout or copy. No prototype; existing components and labels remain the visual specification. Token delta: EMPTY. Copy list: EMPTY.

Tier 3: shared-core and profile/consent surface. Operator explicitly approved correction, checking, publication and Spesix pin update in the Spesix orchestration chat on 2026-10-14.

Risks: stale pristine fields, failure to hydrate an initially absent user, or carrying unsaved consent into a different account. Tests to write: same-person object replacement preserves typed first/last names and both edited consent values in the submitted payload; untouched fields update; different identity and logout/login reset all fields; initial hydration works. Use real form controls and context rerenders.

## B. Implementation map — addressed to the implementer

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.

Own only `src/components/ProfileComponent.jsx` and new `tests/ProfileComponent.refresh.test.jsx`. Read `tests/AccountPage.profileStatements.test.jsx` for the existing Vitest/jsdom, MUI and AuthContext conventions; `src/auth/AuthContext.jsx` for user identity shape; and `src/pages/AccountPage.jsx` for the caller contract. The library is not a joined application: one author owns component and focused unit tests.

The synchronization effect at ProfileComponent lines 56–65 currently depends on `[user]` and unconditionally assigns username, email, first/last name and both consent flags. The editable controls are near lines 205–250. `handleSubmit` near line 117 constructs the existing optional-fields payload; preserve it. Username/email remain read-only. Statement loading effects and visibility props are unchanged. AccountPage passes its profile update callback into this component. Work from these seams; do not broadly explore or change AuthContext or callers. Verify the identity contract before choosing synchronization behavior; do not use object reference as person identity.

### Required preamble and progress contract

The text above is the COMPLETE spec. Read root AGENTS.md and `.codex/skills/frontend-engineering/SKILL.md` only for conventions. Stay in scope. Do not edit WORK_ORDERS.md, MEMORY.md, package files, lockfiles, changelog, CI or unrelated files. Tools are only for reading the named context and editing assigned source/tests, plus one run of the new tests using the existing direct Vitest runner. No installs, package-manager commands, git, self-review or reviewer dispatch. Leave edits uncommitted. Your run is not the gate; the Orchestrator runs the affected set and independent reviews.

Use explicit UTF-8 file I/O. You share this checkout: preserve all other edits, including the foreign scratchpad directory. Native cwd bootstrap is the workspace root; assigned paths and test cwd must be absolute, without changing the shared process cwd. Start with `PLAN: ...`, report `PROGRESS: [n/total] ...` at meaningful actions with gaps below two minutes, and finish with exactly one `RESULT: DONE|BLOCKED <reason>`.

## C. Orchestrator only — NOT addressed to the implementer

> STOP here if you are the implementer. Everything below belongs to the Orchestrator after implementation. Do not execute it or dispatch anyone.

Dispatch a fresh native worker, explicit codex/gpt-6-luna, fresh context. Record requested and exposed effective metadata honestly; native provider/cwd/sandbox are unverified if not exposed.

Gate #1 is the explicit operator approval recorded above. Run independent envelope, regression, duplication and tests lenses plus UI and security concurrently on the corrected diff, read-only, configured Luna. Parent checks profile payload/identity boundaries in addition. Run focused ProfileComponent and existing AccountPage tests and the build. Root owns patch metadata and publication through the existing main-push workflow; no workflow dispatch is authorized by this file. Verify published version before changing Spesix pin, and inspect the intervening 3.12.0-to-current changes. No screenshots are needed for this state correction.

Foreign scratchpad is excluded. Commit only owned explicit paths. Update register with actual author, reviews, checks, release and consumption evidence; never claim completion before those checks.

### Execution and gate evidence

Fresh native `/root/ucm_auth13_author`, requested codex/gpt-6-luna/high, completed only the two assigned files; no git or package operations. Native provider/cwd/sandbox are not exposed. Author's one test attempt failed before collection on Windows Vitest cache EPERM. Parent authoritative elevated run passed: ProfileComponent.refresh (5) and existing AccountPage suites (6), 11 tests in 3 files. Parent added the independently edited-versus-pristine editable-fields case. Existing-dependency TypeScript build passed. Diff whitespace check passed. Root checked unchanged payload construction, statement effects, visibility flags and server-side authority; local edit tracking resets at identity/logout boundaries.

Six fresh CLI codex/gpt-6-luna read-only lanes ran concurrently against the same frozen diff, including package/changelog and complete component/caller context. Each exited 0 with requested model, openai provider and library cwd confirmed in banner. Envelope, duplication, UI and security reported No findings. Regression raised mutable fallback identity for consumers without IDs: not accepted as a defect in the supported AuthContext contract, which maps the immutable API id; without an immutable identity the component cannot establish that two changed fallback identities are the same person, and preserving consent across them would weaken account isolation. Tests raised that identity/logout/hydration guards also pass against the previous code: not accepted; these are explicitly required preservation cases and catch a naive freeze-after-first-hydration fix, while two same-person tests discriminate the actual defect and submitted consent values. Review: codex/gpt-6-luna; lenses envelope, regression, duplication, tests, ui, security; 2 raised, 0 accepted, worst accepted none. Some optional narrow reads failed process setup; reviewers completed from the full inline diff/context. UI attempted a second blocked narrow read; no command actually executed. No screenshots or image reviews.

npm version verified as 3.13.1 before reserving patch 3.13.2. Existing publish.yml builds and runs the library suite on main push before Trusted Publishing; no manual dispatch. Root inspected the consumer's intervening 3.12.0-to-3.13.1 code: AccountPage adds optional showProfileStatements default true, preserving existing controls/payload; SectionNav adds ListItem wrappers with existing selection/callbacks/labels. No changed exports or dependency requirements. Published patch and Spesix installed-package proof remain pending.

Release completion: main f29d1dd, publish workflow38640512864 succeeded (build,90 test files and npm Trusted Publishing). Public registry confirms3.13.2, published2026-10-14T21:33:03Z after propagation. Spesix consumed exact3.13.2 in a30de18; real installed Welcome/ProfileComponent, AuthRoutesIntegration and AccountHub tests8/8 passed, shared i18next resolution confirmed. Spesix's separate SPX-DEP-5 owns its pending real-browser/capture CI38641555651@7eaefcc. The library correction/release is complete; no production app promotion occurred.
