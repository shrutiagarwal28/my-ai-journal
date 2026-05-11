import { useState } from 'react';
import { createEntry } from '../api/entries';
import Nav from '../components/Nav';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Very low' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

export default function Today() {
  const [body, setBody] = useState('');
  const [moodScore, setMoodScore] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave() {
    if (!body.trim()) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      await createEntry({ body, moodScore });
      setStatus('success');
      setBody('');
      setMoodScore(null);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-ink-muted mb-1 italic" style={serif}>{today}</p>
        <h1 className="text-2xl font-bold text-ink mb-8" style={serif}>How was your day?</h1>

        <div className="mb-6">
          <p className="text-sm text-ink-muted mb-3 italic" style={serif}>How are you feeling?</p>
          <div className="flex gap-3">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setMoodScore(mood.value === moodScore ? null : mood.value)}
                title={mood.label}
                className={`text-2xl w-12 h-12 rounded-xl border-2 transition-all ${
                  moodScore === mood.value
                    ? 'border-ink bg-paper scale-110'
                    : 'border-border bg-paper-card hover:border-ink-muted'
                }`}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write about your day..."
          rows={12}
          className="w-full border border-border rounded-xl px-6 py-5 text-ink text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ink-muted/40 bg-paper-card shadow-sm"
          style={{ fontFamily: 'Georgia, serif' }}
        />

        {status === 'success' && (
          <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            Entry saved! AI analysis will appear shortly.
          </div>
        )}
        {status === 'error' && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!body.trim() || status === 'saving'}
          className="mt-4 bg-ink text-paper rounded-xl px-6 py-3 text-sm font-medium hover:bg-ink/80 disabled:opacity-40 transition-colors"
          style={serif}
        >
          {status === 'saving' ? 'Saving...' : 'Save + Analyse'}
        </button>
      </main>
    </div>
  );
}
