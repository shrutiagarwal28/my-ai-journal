import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-border bg-paper-card px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <span className="font-bold text-ink text-lg" style={serif}>DayLog</span>
        <nav className="flex gap-4 text-sm">
          <Link to="/" className="text-ink-muted hover:text-ink transition-colors italic" style={serif}>
            Today
          </Link>
          <Link to="/entries" className="text-ink-muted hover:text-ink transition-colors italic" style={serif}>
            Entries
          </Link>
          <Link to="/habits" className="text-ink-muted hover:text-ink transition-colors italic" style={serif}>
            Habits
          </Link>
          <Link to="/dashboard" className="text-ink-muted hover:text-ink transition-colors italic" style={serif}>
            Dashboard
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-muted italic" style={serif}>Hi, {user?.username}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-ink-muted hover:text-ink transition-colors italic"
          style={serif}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
