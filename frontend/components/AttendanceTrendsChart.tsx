'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendDataPoint } from '@/lib/analytics';

interface AttendanceTrendsChartProps {
    data: TrendDataPoint[];
    loading?: boolean;
}

export default function AttendanceTrendsChart({ data, loading }: AttendanceTrendsChartProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="h-6 w-40 bg-slate-100 rounded animate-pulse mb-4" />
                <div className="h-64 bg-slate-50 rounded animate-pulse" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Attendance Trends</h3>
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                    No attendance data available yet
                </div>
            </div>
        );
    }

    // Format data for chart - aggregate by date
    const aggregatedData = data.reduce((acc, item) => {
        const existing = acc.find(d => d.date === item.date);
        if (existing) {
            existing.total += item.attendance;
            existing.count += 1;
        } else {
            acc.push({ date: item.date, total: item.attendance, count: 1 });
        }
        return acc;
    }, [] as { date: string; total: number; count: number }[]);

    const chartData = aggregatedData.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: Math.round(d.total / d.count)
    }));

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Attendance Trends</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickLine={{ stroke: '#e2e8f0' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickLine={{ stroke: '#e2e8f0' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            formatter={(value) => [`${value ?? 0}%`, 'Attendance']}
                        />
                        <Line
                            type="monotone"
                            dataKey="attendance"
                            stroke="#0f172a"
                            strokeWidth={2}
                            dot={{ fill: '#0f172a', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#0f172a' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
