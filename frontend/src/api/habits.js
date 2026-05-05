import { apiFetch } from './client';

export async function listHabits() {
  const res = await apiFetch('/habits/');
  if (!res.ok) throw new Error('Failed to load habits.');
  return res.json(); // { count, results: [...] }
}

export async function createHabit(name, category) {
  const res = await apiFetch('/habits/', {
    method: 'POST',
    body: JSON.stringify({ name, category }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(Object.values(data).flat()[0] || 'Failed to create habit.');
  }
  return res.json();
}

export async function deleteHabit(id) {
  // This is a soft delete — Django sets is_active=False, data stays in the DB
  const res = await apiFetch(`/habits/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete habit.');
}
