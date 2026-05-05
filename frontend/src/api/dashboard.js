import { apiFetch } from './client';

export async function getDashboard() {
  const res = await apiFetch('/dashboard/');
  if (!res.ok) throw new Error('Failed to load dashboard.');
  return res.json();
}
