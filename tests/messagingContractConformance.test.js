import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const messagingRoot = path.join(root, 'src', 'messaging');

// These are deliberately named and time-bounded. Chunks 3 and 4 must remove
// their entries when they wire their existing adapters; the final three are
// retained only if their stated product rationale still holds at WO close.
const API_EXEMPTIONS = {
  createDirectConversation: 'Chunk 4 wires the host-supplied recipient launcher.',
  patchMessage: 'Chunk 3 wires inline message editing.',
  deleteMessage: 'Chunk 3 wires the delete action and confirmation.',
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
