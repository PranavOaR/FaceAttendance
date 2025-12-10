'use client';

import { motion } from 'framer-motion';
import { AttendanceStats } from '@/lib/analytics';
import { Calendar, Users, CheckCircle } from 'lucide-react';

interface RecentActivityProps {
    sessions: AttendanceStats[];
}

export default function RecentActivity({ sessions }: RecentActivityProps) {
    if (sessions.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No recent attendance sessions found
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
        >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Attendance Sessions
            </h3>
            <div className="space-y-3">
                {sessions.map((session, index) => (
                    <motion.div
                        key={`${session.classId}-${session.date}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    {session.className}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(session.date).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                    <Users className="w-4 h-4" />
                                    <span>{session.totalStudents} students</span>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{session.presentStudents} present</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div
                                className={`text-2xl font-bold ${session.attendancePercentage >= 75
                                        ? 'text-green-600 dark:text-green-400'
                                        : session.attendancePercentage >= 50
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}
                            >
                                {session.attendancePercentage}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                attendance
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
