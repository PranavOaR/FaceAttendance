'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useClasses } from '@/hooks/useFirestore';
import { generateClassReport, exportReportAsCSV, DetailedReport } from '@/lib/analytics';
import { exportReportAsExcel, exportSimpleCSV, downloadCSV } from '@/lib/exportUtils';
import toast, { Toaster } from 'react-hot-toast';
import { FloatingHeader } from '@/components/ui/floating-header';

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { classes, loading: classesLoading } = useClasses(user?.email || '');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    setLoading(true);
    try {
      const reportData = await generateClassReport(selectedClass, startDate, endDate);
      setReport(reportData);
      toast.success('Report generated successfully!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report) {
      toast.error('Please generate a report first');
      return;
    }

    try {
      const csvContent = exportSimpleCSV(report);
      const fileName = `${report.className}_${report.dateRange.start}_to_${report.dateRange.end}.csv`;
      downloadCSV(csvContent, fileName);
      toast.success('Report exported as CSV successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV file');
    }
  };

  const handleExportExcel = () => {
    if (!report) {
      toast.error('Please generate a report first');
      return;
    }

    try {
      exportReportAsExcel(report);
      toast.success('Report exported as Excel successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
    }
  };

  if (authLoading || classesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Navigation */}
      <FloatingHeader showLogout={true} onLogout={logout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Attendance Reports</h1>
                <p className="text-slate-500">Generate and export detailed attendance reports</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Report Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-4">Report Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Class Selection */}
            <div>
              <label htmlFor="class-select" className="block text-sm font-medium text-slate-700 mb-1.5">
                Select Class
              </label>
              <select
                id="class-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                <option value="">Choose a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading || !selectedClass}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Report Results */}
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Report Header & Export Options */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{report.className} - {report.subject}</h2>
                  <p className="text-slate-500 text-sm">
                    {new Date(report.dateRange.start).toLocaleDateString()} to {new Date(report.dateRange.end).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel
                  </button>
                </div>
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Total Sessions</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{report.overallStats.totalSessions}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Average Attendance</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{report.overallStats.averageAttendance}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Best Attended</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">
                    {report.overallStats.mostAttendedDate ? new Date(report.overallStats.mostAttendedDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Lowest Attended</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">
                    {report.overallStats.leastAttendedDate ? new Date(report.overallStats.leastAttendedDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Session Summary</h3>
              {report.sessionSummaries.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No sessions found for the selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Present</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sessionSummaries.map((session, index) => (
                        <tr key={index} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {new Date(session.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{session.totalStudents}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{session.presentStudents}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{session.absentStudents}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${session.attendancePercentage >= 80
                                ? 'bg-green-50 text-green-700'
                                : session.attendancePercentage >= 60
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}>
                              {session.attendancePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Student Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Student Performance</h3>
                <button
                  onClick={() => setShowStudentDetails(!showStudentDetails)}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  {showStudentDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SRN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sessions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Present</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((student, index) => (
                      <tr key={student.studentId} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900">{student.studentName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{student.studentSrn}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{student.totalSessions}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{student.presentSessions}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{student.absentSessions}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${student.attendancePercentage >= 80
                              ? 'bg-green-50 text-green-700'
                              : student.attendancePercentage >= 60
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                            {student.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {classes.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-slate-900 mb-1">No classes available</h3>
            <p className="text-sm text-slate-500 mb-6">Create some classes first to generate reports</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}