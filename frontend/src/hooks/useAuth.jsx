import { createContext, useContext, useEffect, useState } from 'react';
import { logoutUser } from '../api/auth';
import { clearAccessToken, setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading=true while we check if there's a saved session from a previous visit
  const [loading, setLoading] = useState(true);

  // On app startup: if a refresh token is saved, silently restore the session
  useEffect(() => {
    async function restoreSession() {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access);
          if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
          const savedUsername = localStorage.getItem('username') || 'User';
          setUser({ username: savedUsername });
        } else {
          // Refresh token expired — clear everything and show login
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('username');
        }
      } catch {
        // Network error — leave the user logged out, they can try again
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Called by the Login and Register pages after a successful auth request
  function login(username, tokens) {
    setAccessToken(tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    localStorage.setItem('username', username);
    setUser({ username });
  }

  async function logout() {
    await logoutUser();
    clearAccessToken();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
