import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboard } from '../api/dashboard';
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Nav />
        <div className="max-w-2xl mx-auto px-6 py-10 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const sortedCategories = Object.entries(data.category_breakdown)
    .sort((a, b) => b[1] - a[1]);

  const maxCategoryCount = sortedCategories[0]?.[1] || 1;

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>

        {/* Streak */}
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5 flex items-center gap-4">
          <span className="text-4xl">🔥</span>
          <div>
            <p className="text-3xl font-bold text-stone-800">{data.streak}</p>
            <p className="text-sm text-stone-500">
              {data.streak === 1 ? 'day streak' : 'day streak'}
              {data.streak === 0 ? ' — write today to start one!' : ''}
            </p>
          </div>
        </div>

        {/* Mood chart */}
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Mood this week</h2>
          {data.mood_last_7_days.every((d) => d.mood_score === null) ? (
            <p className="text-sm text-stone-400">
              No mood data yet — select a mood when writing your entries.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.mood_last_7_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [value ?? '—', 'Mood']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }}
                />
                <Line
                  type="monotone"
                  dataKey="mood_score"
                  stroke="#292524"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#292524' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Top categories this month</h2>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-stone-400">
              No categories yet — AI analysis will populate this once Step 5 is built.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center shrink-0 ${CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.Other}`}>
                    {cat}
                  </span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div
                      className="bg-stone-700 h-2 rounded-full transition-all"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Habits this week */}
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Habits this week</h2>
          {Object.keys(data.habits_this_week).length === 0 ? (
            <p className="text-sm text-stone-400">
              No habit logs yet — add habits and mark them complete to see progress here.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.habits_this_week).map(([name, stats]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-stone-700 w-36 truncate shrink-0">{name}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div
                      className="bg-stone-700 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-10 text-right shrink-0">
                    {stats.completed}/{stats.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
