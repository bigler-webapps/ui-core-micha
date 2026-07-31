import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const messagingRoot = path.join(root, 'src', 'messaging');

// These are deliberately named and time-bounded. Chunks 3 and 4 must remove
// their entries when they wire their existing adapters; the final three are
// retained only if their stated product rationale still holds at WO close.
const API_EXEMPTIONS = {
  createManagedConversation: 'No managed-conversation launcher is in the current public surface.',
  createObjectThreadConversation: 'Object-thread creation is host-owned routing/scope work.',
  getMessage: 'Timeline data is loaded through listMessages and listThread.',
};
const FRAME_TYPES = ['conversation_upsert', 'conversation_archived', 'message', 'message_edited', 'message_deleted', 'attachment_ready', 'reaction', 'poll_updated', 'delivered', 'read_state', 'thread_read_state', 'participant_changed'];
const FRAME_EXEMPTIONS = {
  attachment_ready: 'Reserved by the design and deliberately unemitted.',
  delivered: 'Receipt synchronisation is outside MSG-3b.',
  read_state: 'Receipt synchronisation is outside MSG-3b.',
  thread_read_state: 'Receipt synchronisation is outside MSG-3b.',
};

const BLOCKED_LINE = /\*\*BLOCKED\*\*/;
const VERSION_PIN = /dcm \d+\.\d+\.\d+/;

// A BLOCKED row without a version pin is exactly how MSG-3b's seven blocked
// rows went stale unnoticed: dcm shipped what they needed mid-flight and the
// WO-end review had no cheap way to tell. This check can't know whether dcm
// has since shipped — it only guarantees the pin exists, which is what turns
// the re-check into a two-minute job instead of an archaeology exercise.
function unpinnedBlockedLines(markdown) {
  return markdown.split('\n').filter((line) => BLOCKED_LINE.test(line) && !VERSION_PIN.test(line));
}

describe('messaging deviation-doc BLOCKED entries carry a dependency version pin', () => {
  it('every BLOCKED line in docs/messaging-deviations.md names the dcm version it was blocked at', () => {
    const markdown = fs.readFileSync(path.join(root, 'docs', 'messaging-deviations.md'), 'utf8');
    expect(unpinnedBlockedLines(markdown)).toEqual([]);
  });

  // Required negative case (the WO is explicit: prove the check can fail,
  // not only that the real file happens to pass).
  it('flags a BLOCKED line that omits the version pin', () => {
    const unpinned = '99. **BLOCKED** — some capability with no dependency version named.';
    const pinned = '100. **BLOCKED** (blocked as of dcm 2.37.0) — some other capability.';
    expect(unpinnedBlockedLines(`${unpinned}\n${pinned}`)).toEqual([unpinned]);
  });
});

describe('messaging adapter and realtime contract conformance', () => {
  it('has a caller for every API export unless it has an explicit rationale', () => {
    const apiSource = fs.readFileSync(path.join(messagingRoot, 'api.js'), 'utf8');
    const source = fs.readdirSync(messagingRoot).filter((file) => file.endsWith('.jsx')).map((file) => fs.readFileSync(path.join(messagingRoot, file), 'utf8')).join('\n');
    const exports = [...apiSource.matchAll(/export function (\w+)\(/g)].map((match) => match[1]);
    // Attachment readers are intentionally passed through the provider to the
    // standalone AttachmentList, where they are called. All other adapters
    // are invoked by the provider/component that owns the action.
    const unwired = exports.filter((name) => !new RegExp(`api\\.${name}\\(|${name}: api\\.${name}`).test(source) && !API_EXEMPTIONS[name]);
    expect(unwired).toEqual([]);
  });

  it('handles only design-listed frames and accounts for intentionally unhandled frames', () => {
    const provider = fs.readFileSync(path.join(messagingRoot, 'MessagingProvider.jsx'), 'utf8');
    const handled = [...provider.matchAll(/frame\.type === '([^']+)'/g)].map((match) => match[1]);
    expect(handled.every((type) => FRAME_TYPES.includes(type))).toBe(true);
    expect(FRAME_TYPES.filter((type) => !handled.includes(type) && !FRAME_EXEMPTIONS[type])).toEqual([]);
  });
});
