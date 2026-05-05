import { apiFetch } from './client';

export async function createEntry({ body, moodScore }) {
  const payload = { body };
  if (moodScore) payload.mood_score = moodScore;

  const res = await apiFetch('/entries/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(Object.values(data).flat()[0] || 'Failed to save entry.');
  }

  return res.json();
}

export async function listEntries(page = 1) {
  const res = await apiFetch(`/entries/?page=${page}`);
  if (!res.ok) throw new Error('Failed to load entries.');
  return res.json(); // { count, next, previous, results: [...] }
}
