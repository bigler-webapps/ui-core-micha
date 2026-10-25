# UCM-CHAT-11 — Remove the "earlier messages left out" chip from the chat thread

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`) that removes a visible element in every consuming app.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumers:** maana, cockpit, hram, survey_app (they pick it up with their next pin bump; Maana's bump is routed by
the Maana Expertenchat).

### Goal and expected outcome

When the server trims a chat's history it sends a `notice` frame `history_trimmed` with `left_out`, and `ChatThread`
shows a chip "N earlier messages left out" above the thread (UCM-CHAT-3). The operator found it on Maana staging and
decided (2026-10-25) to drop it everywhere, in line with the earlier decision that hints in the chat be clearly reduced.
Expected outcome: no chip in any app; the history is still trimmed by the server exactly as today, only not announced.

### Settled decisions (operator, 2026-10-25)

1. The chip is removed for all apps, not made optional.
2. The server-side trimming and the `history_trimmed` frame are unchanged (django-core-micha is not touched); the
   frame is simply ignored by the workspace.

### Scope and acceptance

`src/chat/ChatThread.jsx` (chip, `trimmedCount` prop, `CHAT_THREAD_TRIMMED_SX`), `src/chat/ChatWorkspace.jsx`
(the `trimmedCount` state and the `history_trimmed` frame handling), the `ChatThread.trimmed` entry in
`src/chat/kitSxRegistry.js`, the two `Chat.historyTrimmed_*` keys in `src/i18n/chatTranslations.ts`, and the tests
that assert them. Keep `CHAT_NOTICE_CODES` in `src/chat/wire.js` only if something else still uses it; otherwise
remove it. Accepted when a `history_trimmed` frame renders nothing and causes no error, and the other notices and
frames behave as today.

### Non-goals and do-not-touch

The server trimming, other notice codes, the `onAppFrame` path, the composer, all other chat states.

### Risks

`CHAT_KIT_SX_REGISTRY` is a public export (`src/entries/chat.js`); removing the `ChatThread.trimmed` entry changes
it. Check the consuming apps' kit-sx or theme completeness tests for a reference to that entry before release and
name any in the release note.

### Required tests to write

Replace the chip test in `tests/chatExtensions.test.jsx` with: a `history_trimmed` frame renders no chip and no text
and the thread stays usable. Remove the two key assertions in `tests/chatTranslations.test.js`.

## Part B — Implementation map (implementer)

Work from this package; do not explore broadly. Part A is the authoritative spec; this map fixes the seams. One dispatch; complete, no stubs. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root). You may touch only the files named here. The Orchestrator owns `package.json`, the version, lockfiles, `CHANGELOG.md`, `README.md`, `WORK_ORDERS.md`, `dev/**` and the work-order files; do not touch them. Do not touch any other chat behaviour: the other notices and frames, `onAppFrame`, the summary block, the composer, the model picker, the long-chat notice and every other state stay exactly as they are.

### What to remove (verified against the landed code, all under `src/`)

1. `src/chat/ChatThread.jsx`: the exported constant `CHAT_THREAD_TRIMMED_SX` (line 8), the `trimmedCount` prop in the `ChatThread` signature (line 74) and the chip line `{trimmedCount ? <Chip ... Chat.historyTrimmed_one / _other ... /> : null}` (line 139). `Chip` stays imported (other chips use it). Nothing else in the file changes.
2. `src/chat/ChatWorkspace.jsx`: the state `const [trimmedCount, setTrimmedCount] = useState(null)` (line 107), the `setTrimmedCount(null)` call inside the layout effect that resets per chat (line 278, keep the other resets on that line), the `else if (frame.type === 'notice' && frame.code === 'history_trimmed') setTrimmedCount(...)` branch in `onFrame` (line 298) and the `trimmedCount={trimmedCount}` prop on `<ChatThread ... />` (line 517). A `notice` frame with code `history_trimmed` must afterwards fall through every branch of `onFrame` and do nothing (no state change, no error, no re-render trigger); the other `notice` code (`summarised`) keeps its branch. Do not add a new branch for `history_trimmed`; add at most a one-line comment where the branch was, saying the frame is deliberately ignored (the server still sends it).
3. `src/chat/kitSxRegistry.js`: the `import` of `CHAT_THREAD_TRIMMED_SX` (line 9, keep the other imported names) and the entry `createKitSxEntry('ChatThread.trimmed', 'MuiChip', CHAT_THREAD_TRIMMED_SX, 'CHAT_THREAD_TRIMMED_SX')` (line 36). `CHAT_KIT_SX_REGISTRY` is exported publicly from `src/entries/chat.js`; the removal is intended.
4. `src/i18n/chatTranslations.ts`: the two keys `Chat.historyTrimmed_one` and `Chat.historyTrimmed_other` (lines 66-67, all four languages go with them).
5. `src/chat/wire.js`: `export const CHAT_NOTICE_CODES = { HISTORY_TRIMMED: 'history_trimmed' };` (line 10) is used nowhere else in `src` (verified by search): remove it, and remove nothing else from the file. Before removing, search `src/` and `tests/` once more for `CHAT_NOTICE_CODES`; if anything uses it, keep it and say so in your final report.
6. Search `src/`, `tests/` and `dev/` once for any other mention of `trimmedCount`, `historyTrimmed`, `CHAT_THREAD_TRIMMED_SX` or `ChatThread.trimmed` and remove or adjust what you find (apart from `CHANGELOG.md`, `work-orders/**`, which stay untouched). Existing tests that pass `trimmedCount` to `ChatThread` or assert the chip must be removed or rewritten as below.

### Tests to write

- `tests/chatExtensions.test.jsx` line 32 (`renders history trimmed count chip`): replace by a test that a `history_trimmed` frame (`{ type: 'notice', code: 'history_trimmed', left_out: 3 }`) pushed through the socket renders no chip and no text: assert that none of the strings `Chat.historyTrimmed_one`, `Chat.historyTrimmed_other`, `3`-with-"left out" text appears (the test mock `t` returns keys with values, assert on the key substring `historyTrimmed` and on the absence of any new element in the thread), that the thread is still usable afterwards (push a `delta` frame and a final `turn` frame, or send a message, and see the answer render exactly as in the neighbouring tests), and that a `summarised` notice frame in the same test still triggers its existing reload behaviour only if a neighbouring test already pins it (do not invent new coverage for it). Also push `left_out: 1` and `left_out: 0` and a frame without `left_out`: nothing renders and nothing throws.
- A test that `ChatThread` rendered with a stray `trimmedCount={5}` prop (an old caller) renders no chip and no error (the prop is simply ignored).
- `tests/chatTranslations.test.js` lines 25-26: remove the two assertions on `Chat.historyTrimmed_one` / `_other`; add one assertion that `chatTranslations` has no key that starts with `Chat.historyTrimmed`.
- A test that `CHAT_KIT_SX_REGISTRY` (import it the way `tests/themeCompleteness.test.js` or an existing registry test does) has no entry named `ChatThread.trimmed`, and that `src/chat/ChatThread.jsx` no longer exports `CHAT_THREAD_TRIMMED_SX` (import the module namespace and assert the name is absent).
- Run `tests/chat*.test.*`, `tests/themeCompleteness.test.js`, `tests/i18nAggregate.test.js` and nothing else; read the whole vitest summary including a possible `Errors` line, not only the failures.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`. Use explicit UTF-8 for all file I/O.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-25 in the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses (envelope, regression, duplication, tests) and `ui_reviewer`; no `sec_review` (no auth surface). Review is ONE round plus ONE re-run on the corrected diff (AGENTS.md → Reviews "One round, not a cycle"); only a blocker holds the commit. The Orchestrator reads the diff against the Envelope itself while the lenses run. Evidence: a `ci-test/UCM-CHAT-11` run via `ci-proof.py push` then `ci-proof.py dispatch`. Minor release 4.24.0 (current version 4.23.0) by push to `main` (the register row is filled in a second commit after the landing commit, both in one push); the release note (CHANGELOG, Orchestrator) names the removed public sx registry entry `ChatThread.trimmed` and the removed export `CHAT_THREAD_TRIMMED_SX`; consumers searched: no reference in maana, cockpit, hram or survey_app sources. Do NOT start UCM-CHAT-12 (compact model picker): its Gate #1 is pending; it lands after this order. Report to the Maana Expertenchat session `local_cbfc9d51-5217-42a4-99ba-27a315c854ce` with the released version.

Handover (2026-10-25): mapped and dispatched (codex/gpt-6-luna) by the session "UCM Implementierung"; the operator
then assigned the order to the Orchestrator session "UCM-AUTH-14 auth integration", and the first session closed. Its
Luna run's RESULT line was not observed; the tree was quiet for 3 minutes before the takeover, and the inherited diff
was checked against this map: every removal and every required test is present, nothing beyond scope. Orchestrator:
CHANGELOG, version 4.24.0. Orchestrator's Envelope pass (before the lens results): complete, nothing beyond scope,
nothing missing. Review: all five passes without findings, one round.
