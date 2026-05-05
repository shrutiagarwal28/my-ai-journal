import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <span className="font-bold text-stone-800 text-lg">DayLog</span>
        <nav className="flex gap-4 text-sm">
          <Link to="/" className="text-stone-500 hover:text-stone-800 transition-colors">
            Today
          </Link>
          <Link to="/entries" className="text-stone-500 hover:text-stone-800 transition-colors">
            Entries
          </Link>
          <Link to="/habits" className="text-stone-500 hover:text-stone-800 transition-colors">
            Habits
          </Link>
          <Link to="/dashboard" className="text-stone-500 hover:text-stone-800 transition-colors">
            Dashboard
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-400">Hi, {user?.username}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
