'use client';

import { RiskStudent } from '@/lib/analytics';

interface StudentRiskAlertsProps {
    students: RiskStudent[];
    loading?: boolean;
}

export default function StudentRiskAlerts({ students, loading }: StudentRiskAlertsProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="h-6 w-40 bg-slate-100 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">At-Risk Students</h3>
                <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All students are above 75% attendance
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">At-Risk Students</h3>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    {students.length} below 75%
                </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
                {students.slice(0, 10).map((student) => (
                    <div
                        key={`${student.classId}-${student.studentId}`}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">{student.studentName}</p>
                                <p className="text-xs text-slate-500">{student.className} • {student.studentSrn}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${student.attendancePercentage < 50
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                {student.attendancePercentage}%
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                                {student.presentSessions}/{student.totalSessions} sessions
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
