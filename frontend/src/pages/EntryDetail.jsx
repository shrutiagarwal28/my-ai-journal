import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEntry, reprocessEntry } from '../api/entries';
import Nav from '../components/Nav';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

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

const MOOD_LABELS     = { 1: 'Very low 😞', 2: 'Low 😕', 3: 'Neutral 😐', 4: 'Good 🙂', 5: 'Great 😄' };
const MOOD_ARC_LABELS = { improving: '📈 Improving', declining: '📉 Declining', flat: '➡️ Flat', stable: '〰️ Stable' };

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef(null);

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
      if (!data.ai_categories && !data.ai_error) {
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          const updated = await getEntry(id).catch(() => null);
          if (updated) setEntry(updated);
          if (updated?.ai_categories || updated?.ai_error || attempts >= 15) {
            clearInterval(pollRef.current);
          }
        }, 2000);
      }
    });
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
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex items-center justify-center py-32 text-ink-muted text-sm italic" style={serif}>
          Loading...
        </div>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="max-w-2xl mx-auto px-6 py-10 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  const aiPending = !entry.ai_categories && !entry.ai_error;
  const aiFailed  = !!entry.ai_error;
  const aiDone    = !!entry.ai_categories;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">

        <button
          onClick={() => navigate('/entries')}
          className="text-sm text-ink-muted hover:text-ink mb-6 flex items-center gap-1 transition-colors italic"
          style={serif}
        >
          ← Back to entries
        </button>

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-ink-muted italic" style={serif}>{formattedDate}</p>
          {entry.mood_score && (
            <span className="text-sm text-ink-muted italic" style={serif}>
              {MOOD_LABELS[entry.mood_score]}
            </span>
          )}
        </div>

        {/* Full entry body */}
        <div
          className="bg-paper-card border border-border rounded-xl px-6 py-6 text-ink text-base leading-relaxed mb-6 shadow-sm whitespace-pre-wrap"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {entry.body}
        </div>

        {/* AI insights panel */}
        <div className="bg-paper-card border border-border rounded-xl px-6 py-5">
          <h2 className="text-sm font-semibold text-ink mb-4 italic" style={serif}>AI Insights</h2>

          {aiPending && (
            <div className="flex items-center gap-2 text-sm text-ink-muted italic" style={serif}>
              <span className="animate-pulse">●</span>
              Analysing your entry...
            </div>
          )}

          {aiFailed && (
            <div>
              <p className="text-sm text-red-700 mb-3">
                Analysis failed: {entry.ai_error}
              </p>
              <button
                onClick={handleReprocess}
                disabled={retrying}
                className="text-sm bg-ink text-paper px-4 py-2 rounded-lg hover:bg-ink/80 disabled:opacity-50 transition-colors"
                style={serif}
              >
                {retrying ? 'Retrying...' : 'Retry analysis'}
              </button>
            </div>
          )}

          {aiDone && (
            <div className="space-y-4">

              {entry.ai_categories?.length > 0 && (
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-2 italic" style={serif}>
                    Categories
                  </p>
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

              {entry.mood_arc && (
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-1 italic" style={serif}>
                    Mood arc
                  </p>
                  <p className="text-sm text-ink" style={serif}>
                    {MOOD_ARC_LABELS[entry.mood_arc] || entry.mood_arc}
                  </p>
                </div>
              )}

              {entry.pattern_insight && (
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-1 italic" style={serif}>
                    Insight
                  </p>
                  <p className="text-sm text-ink italic" style={serif}>"{entry.pattern_insight}"</p>
                </div>
              )}

              {entry.people_mentioned?.length > 0 && (
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-1 italic" style={serif}>
                    People mentioned
                  </p>
                  <p className="text-sm text-ink" style={serif}>{entry.people_mentioned.join(', ')}</p>
                </div>
              )}

              {entry.habits_detected?.length > 0 && (
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-1 italic" style={serif}>
                    Habits detected
                  </p>
                  <div className="flex flex-col gap-1">
                    {entry.habits_detected.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-ink" style={serif}>
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
