import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(form.username, form.email, form.password, form.passwordConfirm);
      const tokens = await loginUser(form.username, form.password);
      login(form.username, tokens);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: 'Username', name: 'username', type: 'text' },
    { label: 'Email', name: 'email', type: 'email' },
    { label: 'Password', name: 'password', type: 'password' },
    { label: 'Confirm password', name: 'passwordConfirm', type: 'password' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-sm bg-paper-card rounded-xl shadow-sm border border-border p-8">
        <h1 className="text-2xl font-bold text-ink mb-1" style={serif}>Create account</h1>
        <p className="text-ink-muted text-sm mb-6 italic" style={serif}>Start your journal today</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ label, name, type }) => (
            <div key={name}>
              <label className="block text-sm text-ink mb-1 italic" style={serif}>{label}</label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required
                autoFocus={name === 'username'}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-ink-muted/40"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper rounded-lg py-2 text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition-colors"
            style={serif}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6 italic" style={serif}>
          Already have an account?{' '}
          <Link to="/login" className="text-ink font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
