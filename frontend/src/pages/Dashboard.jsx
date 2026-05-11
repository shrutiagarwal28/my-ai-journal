import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  createHabitLog,
  listHabitLogs,
  listHabitLogsForMonth,
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

const MOOD_EMOJI  = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const MOOD_LABEL  = { 1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Great' };

// Warm journal-ink palette — one colour per habit ring
const WHEEL_COLOURS = ['#8b7355', '#a0845c', '#b8956a', '#c4a882', '#6b5a42', '#7d6548', '#d4b896'];

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

// ── Custom SVG habit wheel ─────────────────────────────────────────────────────
// Draws a donut divided into daysInMonth slices (angular) × habits rings (radial).
// Each cell is filled with the habit's colour when completed, cream when not.
function HabitWheel({ habits, logs, year, month }) {
  const SIZE    = 400;
  const CX      = SIZE / 2;
  const CY      = SIZE / 2;
  const INNER_R = 62;
  const OUTER_R = 178;
  const LABEL_R = OUTER_R + 13;
  const RING_GAP = 1.5; // px gap between adjacent rings
  const DAY_GAP  = 0.7; // degree gap between adjacent day slices

  const daysInMonth = new Date(year, month, 0).getDate();
  const nHabits     = habits.length;
  const ringW       = nHabits > 0 ? (OUTER_R - INNER_R) / nHabits : 0;
  const degPerDay   = 360 / daysInMonth;
  const today       = new Date();

  // Set of "habitId-YYYY-MM-DD" strings for quick lookup
  const completedSet = new Set(
    logs.filter((l) => l.completed).map((l) => `${l.habit}-${l.date}`)
  );

  function toRad(deg) { return (deg * Math.PI) / 180; }

  // angle=0 → 12 o'clock, increases clockwise
  function polar(angleDeg, r) {
    const rad = toRad(angleDeg - 90);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function segPath(dayIdx, ringIdx) {
    const r1 = INNER_R + ringIdx * ringW + RING_GAP;
    const r2 = INNER_R + (ringIdx + 1) * ringW - RING_GAP;
    const a1 = dayIdx * degPerDay + DAY_GAP / 2;
    const a2 = (dayIdx + 1) * degPerDay - DAY_GAP / 2;
    const large = (a2 - a1) > 180 ? 1 : 0;
    const p1 = polar(a1, r1);
    const p2 = polar(a1, r2);
    const p3 = polar(a2, r2);
    const p4 = polar(a2, r1);
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `A ${r2.toFixed(2)} ${r2.toFixed(2)} 0 ${large} 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      `A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${large} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  function dateStr(day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Segments */}
      {habits.map((habit, ringIdx) =>
        Array.from({ length: daysInMonth }, (_, dayIdx) => {
          const date     = dateStr(dayIdx + 1);
          const done     = completedSet.has(`${habit.id}-${date}`);
          const cellDate = new Date(year, month - 1, dayIdx + 1);
          const future   = cellDate > today;

          const fill = future
            ? '#f2ede4'
            : done
              ? WHEEL_COLOURS[ringIdx % WHEEL_COLOURS.length]
              : '#e2d9c8';

          return (
            <path
              key={`${habit.id}-${dayIdx}`}
              d={segPath(dayIdx, ringIdx)}
              fill={fill}
              stroke="#faf8f4"
              strokeWidth="0.8"
            />
          );
        })
      )}

      {/* Day number labels around the outside */}
      {Array.from({ length: daysInMonth }, (_, dayIdx) => {
        const midAngle = (dayIdx + 0.5) * degPerDay;
        const pos      = polar(midAngle, LABEL_R);
        return (
          <text
            key={`lbl-${dayIdx}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fill="#8b7355"
            fontFamily="Georgia, serif"
            transform={`rotate(${midAngle}, ${pos.x}, ${pos.y})`}
          >
            {String(dayIdx + 1).padStart(2, '0')}
          </text>
        );
      })}
    </svg>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]           = useState(null);
  const [habits, setHabits]       = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [monthLogs, setMonthLogs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const today    = new Date();
  const todayStr = localDateString(today);
  const year     = today.getFullYear();
  const month    = today.getMonth() + 1;

  const dayName   = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum    = today.getDate();
  const monthName = today.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  useEffect(() => {
    Promise.all([
      getDashboard(),
      listHabits(),
      listHabitLogs(todayStr),
      listHabitLogsForMonth(year, month),
    ])
      .then(([dashboard, habitData, todayLogList, mLogs]) => {
        setData(dashboard);
        setHabits(habitData.results ?? habitData);
        const logMap = {};
        todayLogList.forEach((log) => {
          logMap[log.habit] = { logId: log.id, completed: log.completed };
        });
        setHabitLogs(logMap);
        setMonthLogs(mLogs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleHabit(habitId) {
    const existing = habitLogs[habitId];
    if (!existing) {
      const log = await createHabitLog(habitId, todayStr, true);
      setHabitLogs((prev) => ({ ...prev, [habitId]: { logId: log.id, completed: true } }));
      setMonthLogs((prev) => [...prev, { id: log.id, habit: habitId, date: todayStr, completed: true }]);
    } else {
      const newCompleted = !existing.completed;
      await updateHabitLog(existing.logId, newCompleted);
      setHabitLogs((prev) => ({ ...prev, [habitId]: { ...existing, completed: newCompleted } }));
      setMonthLogs((prev) =>
        prev.map((l) => l.id === existing.logId ? { ...l, completed: newCompleted } : l)
      );
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

            <Card>
              <SectionLabel>Today's mood</SectionLabel>
              {todayMood?.mood_score ? (
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{MOOD_EMOJI[todayMood.mood_score]}</span>
                  <div>
                    <p className="text-xl font-semibold text-ink" style={serif}>
                      {MOOD_LABEL[todayMood.mood_score]}
                    </p>
                    <p className="text-xs text-ink-muted italic mt-0.5" style={serif}>from today's entry</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-muted italic" style={serif}>No mood logged today.</p>
                  <Link to="/" className="text-xs text-ink-muted underline underline-offset-2 italic" style={serif}>
                    Write today's entry →
                  </Link>
                </div>
              )}
            </Card>

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
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                            done ? 'bg-ink border-ink' : 'border-ink-muted group-hover:border-ink'
                          }`}
                        >
                          {done && (
                            <svg className="w-2.5 h-2.5 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm flex-1 transition-colors ${done ? 'text-ink-muted line-through' : 'text-ink'}`}
                          style={serif}
                        >
                          {habit.name}
                        </span>
                        {habit.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLOURS[habit.category] || CATEGORY_COLOURS.Other}`}>
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

            <Card>
              <SectionLabel>Mood this week</SectionLabel>
              {data.mood_last_7_days.every((d) => d.mood_score === null) ? (
                <p className="text-xs text-ink-muted italic" style={serif}>No mood data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={data.mood_last_7_days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c8" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b7355', fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#8b7355', fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} width={18} />
                    <Tooltip
                      formatter={(v) => [v ?? '—', 'Mood']}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #d4c9b0', backgroundColor: '#faf8f4', fontFamily: 'Georgia, serif' }}
                    />
                    <Line type="monotone" dataKey="mood_score" stroke="#8b7355" strokeWidth={2} dot={{ r: 3, fill: '#8b7355' }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <SectionLabel>Top categories this month</SectionLabel>
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-ink-muted italic" style={serif}>No categories yet — AI analysis will populate this.</p>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-20 text-center shrink-0 ${CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.Other}`}>
                        {cat}
                      </span>
                      <div className="flex-1 bg-ruled rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: '#a0845c' }} />
                      </div>
                      <span className="text-xs text-ink-muted w-4 text-right shrink-0" style={serif}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        </div>

        {/* ── Habit wheel ── */}
        <Card>
          <SectionLabel>Habit tracker — {monthName} {year}</SectionLabel>
          {habits.length === 0 ? (
            <p className="text-sm text-ink-muted italic" style={serif}>
              No habits yet —{' '}
              <Link to="/habits" className="underline underline-offset-2">add some</Link>{' '}
              to see the tracker.
            </p>
          ) : (
            <div className="flex items-center justify-center gap-10 flex-wrap">
              <HabitWheel
                habits={habits}
                logs={monthLogs}
                year={year}
                month={month}
              />

              {/* Legend */}
              <div className="space-y-3">
                {habits.map((habit, i) => (
                  <div key={habit.id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: WHEEL_COLOURS[i % WHEEL_COLOURS.length] }}
                    />
                    <span className="text-sm text-ink" style={serif}>{habit.name}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-ruled space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-sm shrink-0 bg-[#e2d9c8]" />
                    <span className="text-xs text-ink-muted italic" style={serif}>Not completed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-sm shrink-0 bg-[#f2ede4]" />
                    <span className="text-xs text-ink-muted italic" style={serif}>Future</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

      </main>
    </div>
  );
}
