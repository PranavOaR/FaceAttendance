'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceRecord {
    id: string;
    date: string;
    presentStudents: string[];
    absentStudents: string[];
}

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    totalStudents: number;
}

export default function AttendanceCalendar({ attendanceRecords, totalStudents }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Get month data
    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // 0 = Sunday

        return { year, month, daysInMonth, startingDay };
    }, [currentDate]);

    // Create attendance lookup map
    const attendanceMap = useMemo(() => {
        const map: Record<string, AttendanceRecord> = {};
        attendanceRecords.forEach(record => {
            map[record.date] = record;
        });
        return map;
    }, [attendanceRecords]);

    // Get attendance percentage for a date
    const getAttendanceInfo = (date: string) => {
        const record = attendanceMap[date];
        if (!record || totalStudents === 0) return null;

        const presentCount = record.presentStudents.length;
        const percentage = (presentCount / totalStudents) * 100;

        return { presentCount, percentage, record };
    };

    // Get color based on attendance percentage
    const getColorClass = (percentage: number) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-green-400';
        if (percentage >= 40) return 'bg-yellow-400';
        if (percentage >= 20) return 'bg-orange-400';
        return 'bg-red-400';
    };

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days = [];
        const { year, month, daysInMonth, startingDay } = monthData;

        // Empty cells for days before the first day
        for (let i = 0; i < startingDay; i++) {
            days.push({ day: null, date: null });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({ day, date });
        }

        return days;
    }, [monthData]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const selectedRecord = selectedDate ? attendanceMap[selectedDate] : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Attendance Calendar</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
                        {monthNames[monthData.month]} {monthData.year}
                    </span>
                    <button
                        onClick={goToNextMonth}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, index) => {
                    if (!item.day) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const info = getAttendanceInfo(item.date!);
                    const isToday = item.date === new Date().toISOString().split('T')[0];
                    const isSelected = item.date === selectedDate;

                    return (
                        <motion.button
                            key={item.date}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedDate(isSelected ? null : item.date)}
                            className={`
                aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative
                transition-all duration-200
                ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''}
                ${isToday ? 'font-bold' : ''}
                ${info ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
              `}
                            style={{
                                backgroundColor: info ? undefined : '#f8fafc'
                            }}
                        >
                            <span className={`
                ${info ? 'text-white font-medium' : 'text-slate-400'}
                ${isToday && !info ? 'text-slate-900' : ''}
              `}>
                                {item.day}
                            </span>

                            {/* Attendance indicator */}
                            {info && (
                                <div className={`absolute inset-0 rounded-lg ${getColorClass(info.percentage)} -z-10`} />
                            )}

                            {/* Today indicator */}
                            {isToday && !info && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-900" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>≥80%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-400" />
                    <span>40-79%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-400" />
                    <span>&lt;40%</span>
                </div>
            </div>

            {/* Selected date details */}
            <AnimatePresence>
                {selectedRecord && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-100"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-900">
                                {new Date(selectedDate!).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-sm text-slate-600">
                                    {selectedRecord.presentStudents.length} Present
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <span className="text-sm text-slate-600">
                                    {selectedRecord.absentStudents.length} Absent
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
