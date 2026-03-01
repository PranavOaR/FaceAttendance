'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Class, Student, Attendance } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Flame,
  Award,
  User,
} from 'lucide-react';

// ─── Analytics helpers ────────────────────────────────────────────────────────

type HistoryEntry = { date: string; status: 'present' | 'absent' };

function buildHistory(studentId: string, records: Attendance[]): HistoryEntry[] {
  return records
    .map((r) => ({
      date: r.date,
      status: (r.presentStudents?.includes(studentId) ? 'present' : 'absent') as
        | 'present'
        | 'absent',
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function computeStreaks(history: HistoryEntry[]): { current: number; longest: number } {
  let current = 0;
  let longest = 0;
  let run = 0;

  // Walk newest → oldest for current streak
  const reversed = [...history].reverse();
  for (const h of reversed) {
    if (h.status === 'present') {
      current++;
    } else {
      break;
    }
  }

  // Walk oldest → newest for longest streak
  for (const h of history) {
    if (h.status === 'present') {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return { current, longest };
}

interface MonthlyPoint {
  month: string;
  present: number;
  absent: number;
  pct: number;
}

function buildMonthlyData(history: HistoryEntry[]): MonthlyPoint[] {
  const map: Record<string, { present: number; absent: number }> = {};
  for (const h of history) {
    const d = new Date(h.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { present: 0, absent: 0 };
    if (h.status === 'present') map[key].present++;
    else map[key].absent++;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', {
        month: 'short',
        year: '2-digit',
      });
      const total = val.present + val.absent;
      return {
        month: label,
        present: val.present,
        absent: val.absent,
        pct: total > 0 ? Math.round((val.present / total) * 100) : 0,
      };
    });
}

interface DowPoint {
  day: string;
  pct: number;
  sessions: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDowData(history: HistoryEntry[]): DowPoint[] {
  const map: Record<number, { present: number; total: number }> = {};
  for (const h of history) {
    const dow = new Date(h.date).getDay();
    if (!map[dow]) map[dow] = { present: 0, total: 0 };
    map[dow].total++;
    if (h.status === 'present') map[dow].present++;
  }
  return DAY_NAMES.map((name, i) => {
    const val = map[i] || { present: 0, total: 0 };
    return {
      day: name,
      pct: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
      sessions: val.total,
    };
  }).filter((d) => d.sessions > 0);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4"
    >
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [dowData, setDowData] = useState<DowPoint[]>([]);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [className, setClassName] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);
        if (!classSnap.exists()) throw new Error('Class not found');

        const classData = classSnap.data() as Class;
        setClassName(classData.name || '');

        const foundStudent = (classData.students || []).find((s) => s.id === studentId);
        if (!foundStudent) throw new Error('Student not found');
        setStudent(foundStudent);

        const records: Attendance[] = classData.attendanceRecords || [];
        const hist = buildHistory(studentId, records);
        setHistory(hist);
        setMonthlyData(buildMonthlyData(hist));
        setDowData(buildDowData(hist));
        setStreaks(computeStreaks(hist));
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId, studentId]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSessions = history.length;
  const presentCount = history.filter((h) => h.status === 'present').length;
  const absentCount = totalSessions - presentCount;
  const overallPct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const pctColor =
    overallPct >= 75 ? 'text-green-600' : overallPct >= 50 ? 'text-yellow-600' : 'text-red-600';
  const pctBg =
    overallPct >= 75 ? 'bg-green-50 border-green-200' : overallPct >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-medium">{error || 'Student not found'}</p>
        <button onClick={() => router.back()} className="text-indigo-600 hover:underline text-sm">
          ← Go back
        </button>
      </div>
    );
  }

  const recentHistory = [...history].reverse().slice(0, 30);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href={`/class/${classId}`}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{className || 'Back to Class'}</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-semibold text-sm truncate">{student.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Student hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
        >
          {/* Photo */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-4 ring-indigo-100">
            {student.photo ? (
              <Image src={student.photo} alt={student.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                <User className="w-10 h-10 text-indigo-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-500 font-mono text-sm mt-1">{student.srn}</p>
            {student.parentEmail && (
              <p className="text-gray-400 text-xs mt-1">{student.parentEmail}</p>
            )}
          </div>

          {/* Overall % badge */}
          <div className={`rounded-2xl border px-6 py-4 text-center shrink-0 ${pctBg}`}>
            <p className={`text-4xl font-black ${pctColor}`}>{overallPct}%</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Overall Attendance</p>
            {overallPct < 75 && (
              <p className="text-xs text-red-500 mt-0.5 font-semibold">Below 75% threshold</p>
            )}
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="w-5 h-5 text-indigo-600" />}
            label="Total Sessions"
            value={totalSessions}
            sub={`${presentCount} present · ${absentCount} absent`}
            color="bg-indigo-50"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            label="Classes Attended"
            value={presentCount}
            sub={`${absentCount} missed`}
            color="bg-green-50"
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            label="Current Streak"
            value={streaks.current}
            sub="consecutive present"
            color="bg-orange-50"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-purple-600" />}
            label="Longest Streak"
            value={streaks.longest}
            sub="best run of present days"
            color="bg-purple-50"
          />
        </div>

        {/* ── Monthly bar chart ── */}
        {monthlyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Monthly Attendance
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name === 'present' ? 'Present' : 'Absent']}
                />
                <Legend formatter={(v) => (v === 'present' ? 'Present' : 'Absent')} />
                <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* ── Bottom row: DoW + history ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day of week breakdown */}
          {dowData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Attendance by Day of Week
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dowData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 13 }}
                    formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Attendance']}
                    labelFormatter={(l) => `${l} (${dowData.find((d) => d.day === l)?.sessions ?? 0} sessions)`}
                  />
                  <Bar dataKey="pct" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Recent attendance history */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col"
          >
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-500" />
              Recent Attendance
            </h2>

            {recentHistory.length === 0 ? (
              <p className="text-gray-400 text-sm mt-4 text-center">No records yet.</p>
            ) : (
              <div className="overflow-y-auto max-h-64 space-y-1.5">
                {recentHistory.map((h, i) => {
                  const d = new Date(h.date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateLabel = d.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit',
                  });
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        h.status === 'present'
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      <span className="font-medium">
                        {dayName}, {dateLabel}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          h.status === 'present'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {h.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Full attendance table ── */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Full Attendance History ({totalSessions} sessions)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Day</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i) => {
                    const d = new Date(h.date);
                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 px-3 text-gray-700 font-mono">
                          {d.toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              h.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {h.status === 'present' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {h.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
