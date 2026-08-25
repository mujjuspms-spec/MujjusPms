import { apiFetch, getToken } from './api';

// Populated by fetchPeople() after login. Kept as a stable array reference
// (mutated in place) so existing components that import PEOPLE directly
// keep working once the auth bootstrap has loaded data.
export const PEOPLE = [];

export function person(id) {
  return PEOPLE.find((p) => p.id === id);
}

export async function fetchPeople() {
  const { people } = await apiFetch('/api/people');
  PEOPLE.length = 0;
  PEOPLE.push(...people);
  return PEOPLE;
}

export async function createPerson(payload) {
  const { person: newPerson } = await apiFetch('/api/people', { method: 'POST', body: JSON.stringify(payload) });
  PEOPLE.push(newPerson);
  return newPerson;
}

// A person's uploaded avatar image, or null if they haven't set one (in
// which case Avatar falls back to the color+initials pill).
export function avatarSrc(p) {
  if (!p?.avatarUrl) return null;
  return `${p.avatarUrl}?token=${encodeURIComponent(getToken() || '')}`;
}
