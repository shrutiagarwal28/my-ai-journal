import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokens = await loginUser(username, password);
      login(username, tokens);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-sm bg-paper-card rounded-xl shadow-sm border border-border p-8">
        <h1 className="text-2xl font-bold text-ink mb-1" style={serif}>Welcome back</h1>
        <p className="text-ink-muted text-sm mb-6 italic" style={serif}>Log in to your journal</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink mb-1 italic" style={serif}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-ink-muted/40"
            />
          </div>

          <div>
            <label className="block text-sm text-ink mb-1 italic" style={serif}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-ink-muted/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper rounded-lg py-2 text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition-colors"
            style={serif}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6 italic" style={serif}>
          No account?{' '}
          <Link to="/register" className="text-ink font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
