import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboard } from '../api/dashboard';
import {
  createHabitLog,
  listHabitLogs,
  listHabits,
  updateHabitLog,
} from '../api/habits';
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

const MOOD_EMOJI = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const MOOD_LABEL = { 1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Great' };

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

function localDateString(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs text-ink-muted mb-3 italic" style={serif}>
      {children}
    </p>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-paper-card border border-border rounded-xl px-5 py-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]           = useState(null);
  const [habits, setHabits]       = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const today    = new Date();
  const todayStr = localDateString(today);

  const dayName   = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum    = today.getDate();
  const monthName = today.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const year      = today.getFullYear();

  useEffect(() => {
    Promise.all([getDashboard(), listHabits(), listHabitLogs(todayStr)])
      .then(([dashboard, habitData, logs]) => {
        setData(dashboard);
        setHabits(habitData.results ?? habitData);
        const logMap = {};
        logs.forEach((log) => {
          logMap[log.habit] = { logId: log.id, completed: log.completed };
        });
        setHabitLogs(logMap);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleHabit(habitId) {
    const existing = habitLogs[habitId];
    if (!existing) {
      const log = await createHabitLog(habitId, todayStr, true);
      setHabitLogs((prev) => ({ ...prev, [habitId]: { logId: log.id, completed: true } }));
    } else {
      const newCompleted = !existing.completed;
      await updateHabitLog(existing.logId, newCompleted);
      setHabitLogs((prev) => ({ ...prev, [habitId]: { ...existing, completed: newCompleted } }));
    }
  }

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

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="max-w-4xl mx-auto px-6 py-10 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  const todayMood        = data.mood_last_7_days[6];
  const sortedCategories = Object.entries(data.category_breakdown).sort((a, b) => b[1] - a[1]);
  const maxCount         = sortedCategories[0]?.[1] || 1;
  const completedToday   = habits.filter((h) => habitLogs[h.id]?.completed).length;

  const RING_COLOURS = ['#8b7355', '#a0845c', '#b8956a', '#c4a882', '#6b5a42', '#7d6548', '#d4b896'];
  // Build wheel from the full habits list so rings always appear even with no logs yet.
  // Cross-reference with habits_this_week for actual completion %; default to 0.
  // Reversed because RadialBarChart draws the last array item as the outermost ring.
  const habitWheelData = habits
    .map((habit, i) => {
      const weekStats = data.habits_this_week[habit.name];
      const completion = weekStats && weekStats.total > 0
        ? Math.round((weekStats.completed / weekStats.total) * 100)
        : 0;
      return { name: habit.name, completion, fill: RING_COLOURS[i % RING_COLOURS.length] };
    })
    .reverse();

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Date header ── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-ink-muted italic mb-1" style={serif}>{dayName}</p>
            <h1 className="text-5xl font-bold text-ink leading-none tracking-tight" style={serif}>
              {monthName} {dayNum}
            </h1>
            <p className="text-sm text-ink-muted mt-1" style={serif}>{year}</p>
          </div>

          {/* Streak — like a stamp on the page */}
          <div className="flex items-center gap-3 bg-paper-card border border-border rounded-xl px-5 py-3 shadow-sm">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-2xl font-bold text-ink leading-none" style={serif}>{data.streak}</p>
              <p className="text-xs text-ink-muted mt-0.5 italic" style={serif}>day streak</p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Left column (3 / 5) */}
          <div className="col-span-3 space-y-4">

            {/* Today's mood */}
            <Card>
              <SectionLabel>Today's mood</SectionLabel>
              {todayMood?.mood_score ? (
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{MOOD_EMOJI[todayMood.mood_score]}</span>
                  <div>
                    <p className="text-xl font-semibold text-ink" style={serif}>
                      {MOOD_LABEL[todayMood.mood_score]}
                    </p>
                    <p className="text-xs text-ink-muted italic mt-0.5" style={serif}>
                      from today's entry
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-muted italic" style={serif}>No mood logged today.</p>
                  <Link
                    to="/"
                    className="text-xs text-ink-muted underline underline-offset-2 italic"
                    style={serif}
                  >
                    Write today's entry →
                  </Link>
                </div>
              )}
            </Card>

            {/* Habits today */}
            <Card>
              <div className="flex items-baseline justify-between mb-3">
                <SectionLabel>Habits today</SectionLabel>
                {habits.length > 0 && (
                  <span className="text-xs text-ink-muted italic -mt-3" style={serif}>
                    {completedToday} of {habits.length}
                  </span>
                )}
              </div>

              {habits.length === 0 ? (
                <p className="text-sm text-ink-muted italic" style={serif}>
                  No habits yet —{' '}
                  <Link to="/habits" className="underline underline-offset-2">add some</Link>.
                </p>
              ) : (
                <div>
                  {habits.map((habit, i) => {
                    const done = habitLogs[habit.id]?.completed || false;
                    return (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabit(habit.id)}
                        className={`w-full flex items-center gap-3 py-2.5 text-left group ${
                          i < habits.length - 1 ? 'border-b border-ruled' : ''
                        }`}
                      >
                        {/* Square checkbox — journal style */}
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                            done
                              ? 'bg-ink border-ink'
                              : 'border-ink-muted group-hover:border-ink'
                          }`}
                        >
                          {done && (
                            <svg
                              className="w-2.5 h-2.5 text-paper"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <span
                          className={`text-sm flex-1 transition-colors ${
                            done ? 'text-ink-muted line-through' : 'text-ink'
                          }`}
                          style={serif}
                        >
                          {habit.name}
                        </span>

                        {habit.category && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              CATEGORY_COLOURS[habit.category] || CATEGORY_COLOURS.Other
                            }`}
                          >
                            {habit.category}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

          </div>

          {/* Right column (2 / 5) */}
          <div className="col-span-2 space-y-4">

            {/* Mood chart */}
            <Card>
              <SectionLabel>Mood this week</SectionLabel>
              {data.mood_last_7_days.every((d) => d.mood_score === null) ? (
                <p className="text-xs text-ink-muted italic" style={serif}>No mood data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={data.mood_last_7_days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c8" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: '#8b7355', fontFamily: 'Georgia, serif' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontSize: 10, fill: '#8b7355', fontFamily: 'Georgia, serif' }}
                      axisLine={false}
                      tickLine={false}
                      width={18}
                    />
                    <Tooltip
                      formatter={(v) => [v ?? '—', 'Mood']}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: '1px solid #d4c9b0',
                        backgroundColor: '#faf8f4',
                        fontFamily: 'Georgia, serif',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mood_score"
                      stroke="#8b7355"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#8b7355' }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Category breakdown */}
            <Card>
              <SectionLabel>Top categories this month</SectionLabel>
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-ink-muted italic" style={serif}>
                  No categories yet — AI analysis will populate this.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium w-20 text-center shrink-0 ${
                          CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.Other
                        }`}
                      >
                        {cat}
                      </span>
                      <div className="flex-1 bg-ruled rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(count / maxCount) * 100}%`,
                            backgroundColor: '#a0845c',
                          }}
                        />
                      </div>
                      <span className="text-xs text-ink-muted w-4 text-right shrink-0" style={serif}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        </div>

        {/* ── Habits wheel ── */}
        <Card>
          <SectionLabel>Habits this week</SectionLabel>
          {habits.length === 0 ? (
            <p className="text-sm text-ink-muted italic" style={serif}>
              No habits yet — <Link to="/habits" className="underline underline-offset-2">add some</Link> to see progress here.
            </p>
          ) : (
            <div className="flex items-center gap-8">
              <div className="shrink-0" style={{ width: 220, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="20%"
                    outerRadius="95%"
                    data={habitWheelData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background={{ fill: '#e2d9c8' }}
                      dataKey="completion"
                      cornerRadius={5}
                    />
                    <Tooltip
                      formatter={(v, _name, props) => [`${v}%`, props.payload.name]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: '1px solid #d4c9b0',
                        backgroundColor: '#faf8f4',
                        fontFamily: 'Georgia, serif',
                      }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with mini progress bars */}
              <div className="flex-1 space-y-3">
                {[...habitWheelData].reverse().map(({ name, completion, fill }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                    <span className="text-sm text-ink flex-1 truncate" style={serif}>{name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 bg-ruled rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${completion}%`, backgroundColor: fill }}
                        />
                      </div>
                      <span className="text-xs text-ink-muted w-8 text-right" style={serif}>
                        {completion}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

      </main>
    </div>
  );
}
