import { apiFetch } from './client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Login uses plain fetch — no token exists yet when logging in
export async function loginUser(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Incorrect username or password.');
  }

  return res.json(); // { access, refresh }
}

export async function registerUser(username, email, password, passwordConfirm) {
  const res = await fetch(`${BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, password_confirm: passwordConfirm }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // DRF returns errors as { field: ["message", ...] } — grab the first one
    const firstError = Object.values(data).flat()[0] || 'Registration failed.';
    throw new Error(firstError);
  }

  return res.json(); // { id, username, email, date_joined }
}

export async function logoutUser() {
  // Fire-and-forget — the important cleanup happens in useAuth, not here
  await apiFetch('/auth/logout/', { method: 'POST' }).catch(() => {});
}
