import { useEffect, useState } from 'react';
import { createHabit, deleteHabit, listHabits } from '../api/habits';
import Nav from '../components/Nav';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

const CATEGORIES = [
  'Health', 'Work', 'Learning', 'Relationships',
  'Finance', 'Creativity', 'Wellbeing', 'Other',
];

const CATEGORY_COLOURS = {
  Health:        'bg-green-100 text-green-700',
  Work:          'bg-blue-100 text-blue-700',
  Learning:      'bg-purple-100 text-purple-700',
  Relationships: 'bg-pink-100 text-pink-700',
  Finance:       'bg-amber-100 text-amber-700',
  Creativity:    'bg-orange-100 text-orange-700',
  Wellbeing:     'bg-teal-100 text-teal-700',
  Other:         'bg-stone-100 text-stone-600',
};

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Health');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await listHabits();
        setHabits(data.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setFormError('');
    try {
      const newHabit = await createHabit(name.trim(), category);
      setHabits((prev) => [newHabit, ...prev]);
      setName('');
      setCategory('Health');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-ink mb-8" style={serif}>Habits</h1>

        {/* Add habit form */}
        <div className="bg-paper-card border border-border rounded-xl px-6 py-5 mb-6">
          <h2 className="text-sm text-ink mb-4 italic" style={serif}>Add a habit</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning run, Read 20 pages..."
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-ink-muted/40"
                style={serif}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-ink-muted/40"
                style={serif}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {formError && (
              <p className="text-sm text-red-700">{formError}</p>
            )}

            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="self-start bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink/80 disabled:opacity-40 transition-colors"
              style={serif}
            >
              {adding ? 'Adding...' : 'Add habit'}
            </button>
          </form>
        </div>

        {loading && (
          <p className="text-ink-muted text-sm italic" style={serif}>Loading habits...</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && habits.length === 0 && (
          <p className="text-ink-muted text-sm text-center py-10 italic" style={serif}>
            No habits yet — add one above.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-paper-card border border-border rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-ink text-sm font-medium" style={serif}>{habit.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOURS[habit.category] || CATEGORY_COLOURS.Other}`}>
                  {habit.category}
                </span>
              </div>
              <button
                onClick={() => handleDelete(habit.id)}
                className="text-ink-muted hover:text-red-600 transition-colors text-lg leading-none"
                title="Remove habit"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
