import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEntries } from '../api/entries';
import Nav from '../components/Nav';

// One consistent colour per category — matches what the AI returns
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

function CategoryChip({ category }) {
  const colours = CATEGORY_COLOURS[category] || CATEGORY_COLOURS.Other;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colours}`}>
      {category}
    </span>
  );
}

function EntryCard({ entry }) {
  const preview = entry.body.slice(0, 120) + (entry.body.length > 120 ? '...' : '');
  const date = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      to={`/entries/${entry.id}`}
      className="block bg-white border border-stone-200 rounded-2xl px-6 py-5 hover:border-stone-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="text-sm font-medium text-stone-500">{date}</span>
        {entry.mood_score && (
          <span className="text-lg shrink-0">
            {['😞','😕','😐','🙂','😄'][entry.mood_score - 1]}
          </span>
        )}
      </div>

      <p className="text-stone-700 text-sm leading-relaxed mb-3" style={{ fontFamily: 'Georgia, serif' }}>
        {preview}
      </p>

      {entry.ai_categories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.ai_categories.map((cat) => (
            <CategoryChip key={cat} category={cat} />
          ))}
        </div>
      )}
    </Link>
  );
}

export default function Entries() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listEntries(page);
        setEntries(data.results);
        setHasNext(!!data.next);
        setHasPrev(!!data.previous);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]); // re-runs whenever page changes

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Your journal</h1>

        {loading && (
          <p className="text-stone-400 text-sm">Loading entries...</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg mb-2">No entries yet</p>
            <Link to="/" className="text-sm text-stone-600 hover:underline">
              Write your first entry →
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>

        {/* Pagination */}
        {(hasPrev || hasNext) && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev}
              className="text-sm text-stone-600 hover:text-stone-800 disabled:opacity-30 transition-colors"
            >
              ← Newer
            </button>
            <span className="text-sm text-stone-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="text-sm text-stone-600 hover:text-stone-800 disabled:opacity-30 transition-colors"
            >
              Older →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
