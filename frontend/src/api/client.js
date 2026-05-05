const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Access token lives in memory — it disappears on page refresh (intentional).
// On refresh, the app uses the refresh token in localStorage to get a new one.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

// Silently gets a new access token using the saved refresh token.
// Returns the new access token, or null if the refresh token is expired/missing.
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    // Refresh token is expired — user has to log in again
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    clearAccessToken();
    return null;
  }

  const data = await res.json();
  setAccessToken(data.access);
  // simplejwt rotates the refresh token on each use — save the new one
  if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
  return data.access;
}

// The main fetch wrapper — use this instead of fetch() everywhere in the app.
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 401 = access token expired. Try refreshing once, then retry the request.
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  return res;
}
