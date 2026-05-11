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

export async function listHabitLogs(date) {
  const res = await apiFetch(`/habits/logs/?date=${date}`);
  if (!res.ok) throw new Error('Failed to load habit logs.');
  const data = await res.json();
  return data.results ?? data;
}

export async function listHabitLogsForMonth(year, month) {
  const m    = String(month).padStart(2, '0');
  const days = new Date(year, month, 0).getDate(); // days in month
  const gte  = `${year}-${m}-01`;
  const lte  = `${year}-${m}-${String(days).padStart(2, '0')}`;
  const res  = await apiFetch(`/habits/logs/?date_gte=${gte}&date_lte=${lte}`);
  if (!res.ok) throw new Error('Failed to load monthly habit logs.');
  const data = await res.json();
  return data.results ?? data;
}

export async function createHabitLog(habitId, date, completed) {
  const res = await apiFetch('/habits/logs/', {
    method: 'POST',
    body: JSON.stringify({ habit: habitId, date, completed }),
  });
  if (!res.ok) throw new Error('Failed to log habit.');
  return res.json();
}

export async function updateHabitLog(logId, completed) {
  const res = await apiFetch(`/habits/logs/${logId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error('Failed to update habit log.');
  return res.json();
}
