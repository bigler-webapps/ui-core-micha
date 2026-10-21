/** Identity used to bind editable profile draft fields to one account. */
export const profileIdentity = (user) => user ? (user.id ?? user.email ?? user.username ?? null) : null;

/** Refresh untouched profile values while retaining edits for the same identity. */
export function refreshProfileDraft(user, previousIdentity, editedFields = new Set(), draft = {}) {
  const identity = profileIdentity(user);
  const samePerson = previousIdentity === identity;
  const retained = samePerson ? editedFields : new Set();
  if (!user) return { identity, editedFields: retained, values: { username: '', email: '', firstName: '', lastName: '', acceptedPrivacy: false, acceptedCookies: false } };
  return {
    identity,
    editedFields: retained,
    values: {
      username: user.username ?? '', email: user.email ?? '',
      firstName: retained.has('firstName') ? draft.firstName : (user.first_name ?? ''),
      lastName: retained.has('lastName') ? draft.lastName : (user.last_name ?? ''),
      acceptedPrivacy: retained.has('acceptedPrivacy') ? draft.acceptedPrivacy : Boolean(user.accepted_privacy_statement),
      acceptedCookies: retained.has('acceptedCookies') ? draft.acceptedCookies : Boolean(user.accepted_convenience_cookies),
    },
  };
}
