import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEntry, reprocessEntry } from '../api/entries';
import Nav from '../components/Nav';

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

const MOOD_LABELS = { 1: 'Very low 😞', 2: 'Low 😕', 3: 'Neutral 😐', 4: 'Good 🙂', 5: 'Great 😄' };
const MOOD_ARC_LABELS = { improving: '📈 Improving', declining: '📉 Declining', flat: '➡️ Flat', stable: '〰️ Stable' };

export default function EntryDetail() {
  const { id } = useParams(); // grabs the :id from the URL
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef(null); // holds the polling interval so we can stop it

  async function load() {
    try {
      const data = await getEntry(id);
      setEntry(data);
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().then((data) => {
      if (!data) return;

      // If AI hasn't run yet and there's no error, poll every 2s for up to 30s
      if (!data.ai_categories && !data.ai_error) {
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          const updated = await getEntry(id).catch(() => null);
          if (updated) setEntry(updated);

          // Stop polling once AI data arrives, fails, or we hit 15 attempts (30s)
          if (updated?.ai_categories || updated?.ai_error || attempts >= 15) {
            clearInterval(pollRef.current);
          }
        }, 2000);
      }
    });

    // Cleanup: stop polling if the user navigates away
    return () => clearInterval(pollRef.current);
  }, [id]);

  async function handleReprocess() {
    setRetrying(true);
    try {
      const updated = await reprocessEntry(id);
      setEntry(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  }

  const formattedDate = entry
    ? new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Nav />
        <div className="flex items-center justify-center py-32 text-stone-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Nav />
        <div className="max-w-2xl mx-auto px-6 py-10 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const aiPending = !entry.ai_categories && !entry.ai_error;
  const aiFailed  = !!entry.ai_error;
  const aiDone    = !!entry.ai_categories;

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Back link */}
        <button
          onClick={() => navigate('/entries')}
          className="text-sm text-stone-400 hover:text-stone-700 mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back to entries
        </button>

        {/* Date and mood */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-stone-500">{formattedDate}</p>
          {entry.mood_score && (
            <span className="text-sm text-stone-500">{MOOD_LABELS[entry.mood_score]}</span>
          )}
        </div>

        {/* Full entry body */}
        <div
          className="bg-white border border-stone-200 rounded-2xl px-6 py-6 text-stone-800 text-base leading-relaxed mb-6 shadow-sm whitespace-pre-wrap"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {entry.body}
        </div>

        {/* AI insights panel */}
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">AI Insights</h2>

          {/* Pending state — AI hasn't run yet */}
          {aiPending && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <span className="animate-pulse">●</span>
              Analysing your entry...
            </div>
          )}

          {/* Failed state */}
          {aiFailed && (
            <div>
              <p className="text-sm text-red-600 mb-3">
                Analysis failed: {entry.ai_error}
              </p>
              <button
                onClick={handleReprocess}
                disabled={retrying}
                className="text-sm bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
              >
                {retrying ? 'Retrying...' : 'Retry analysis'}
              </button>
            </div>
          )}

          {/* Done state */}
          {aiDone && (
            <div className="space-y-4">

              {/* Categories */}
              {entry.ai_categories?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.ai_categories.map((cat) => (
                      <span
                        key={cat}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.Other}`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mood arc */}
              {entry.mood_arc && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Mood arc</p>
                  <p className="text-sm text-stone-700">{MOOD_ARC_LABELS[entry.mood_arc] || entry.mood_arc}</p>
                </div>
              )}

              {/* Pattern insight */}
              {entry.pattern_insight && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Insight</p>
                  <p className="text-sm text-stone-700 italic">"{entry.pattern_insight}"</p>
                </div>
              )}

              {/* People mentioned */}
              {entry.people_mentioned?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">People mentioned</p>
                  <p className="text-sm text-stone-700">{entry.people_mentioned.join(', ')}</p>
                </div>
              )}

              {/* Habits detected */}
              {entry.habits_detected?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Habits detected</p>
                  <div className="flex flex-col gap-1">
                    {entry.habits_detected.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                        <span>{h.completed ? '✅' : '⬜'}</span>
                        <span>{h.habit_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
