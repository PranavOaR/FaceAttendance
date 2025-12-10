'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Teacher, Class, CreateClassForm } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useClasses } from '@/hooks/useFirestore';
import { getDashboardSummary, DashboardSummary, getAttendanceTrends, getRiskStudents, TrendDataPoint, RiskStudent } from '@/lib/analytics';
import AttendanceTrendsChart from '@/components/AttendanceTrendsChart';
import StudentRiskAlerts from '@/components/StudentRiskAlerts';
import toast, { Toaster } from 'react-hot-toast';
import { FloatingHeader } from '@/components/ui/floating-header';
import ClassCard from '@/components/ClassCard';
import AddClassModal from '@/components/AddClassModal';
import { LoadingState, LoadingSkeleton, ErrorState, EmptyState } from '@/components/LoadingStates';

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const router = useRouter();

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  // Firebase hooks
  const { user, loading: authLoading, logout } = useAuth();
  const {
    classes,
    loading: classesLoading,
    error: classesError,
    createClass: createNewClass,
    updateClass: updateExistingClass,
    deleteClass: deleteExistingClass
  } = useClasses(user?.email || '');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load analytics data
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (user && classes.length > 0) {
        setLoadingAnalytics(true);
        setAnalyticsError(null);
        try {
          const [summary, trends, risks] = await Promise.all([
            getDashboardSummary(user.email || ''),
            getAttendanceTrends(user.email || ''),
            getRiskStudents(user.email || '')
          ]);
          if (!isCancelled) {
            setDashboardSummary(summary);
            setTrendData(trends);
            setRiskStudents(risks);
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('Failed to load analytics:', error);
            setAnalyticsError('Failed to load analytics data.');
          }
        } finally {
          if (!isCancelled) {
            setLoadingAnalytics(false);
          }
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, classes]);

  // Loading state
  const isLoading = authLoading || classesLoading;

  const handleCreateClass = async (formData: CreateClassForm) => {
    if (!user) return;

    try {
      await createNewClass({
        name: formData.name,
        subject: formData.subject
      });
      setIsCreateModalOpen(false);
      toast.success('Class created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class');
    }
  };

  const handleEditClass = (classData: Class) => {
    setEditingClass(classData);
  };

  const handleUpdateClass = async (formData: CreateClassForm) => {
    if (!editingClass || !user) return;

    try {
      await updateExistingClass(editingClass.id, {
        name: formData.name,
        subject: formData.subject
      });
      setEditingClass(null);
      toast.success('Class updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      try {
        await deleteExistingClass(classId);
        toast.success('Class deleted successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete class');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <LoadingSkeleton variant="text" className="w-64 h-8 mb-2" />
            <LoadingSkeleton variant="text" className="w-48 h-4" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                <LoadingSkeleton variant="text" className="w-32 h-6 mb-4" />
                <LoadingSkeleton variant="text" className="w-24 h-8" />
              </div>
            ))}
          </div>

          {/* Classes skeleton */}
          <LoadingSkeleton variant="text" className="w-32 h-6 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} variant="card" className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (classesError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <FloatingHeader showLogout={true} onLogout={logout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState
            title="Failed to Load Classes"
            message="There was an error loading your classes. Please try again."
            onRetry={() => window.location.reload()}
          />
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
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Dashboard</h1>
              <p className="text-slate-500">
                Welcome back, {user?.displayName || user?.email?.split('@')[0]}
              </p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Class
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Classes</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {dashboardSummary?.totalClasses ?? classes.length}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Students</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {dashboardSummary?.totalStudents ?? classes.reduce((total, cls) => total + cls.students.length, 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg. Attendance</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {loadingAnalytics ? '...' : `${dashboardSummary?.averageAttendance ?? 0}%`}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Sessions</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {classes.reduce((total, cls) => total + cls.attendanceRecords.length, 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analytics Charts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <AttendanceTrendsChart data={trendData} loading={loadingAnalytics} />
          <StudentRiskAlerts students={riskStudents} loading={loadingAnalytics} />
        </motion.div>

        {/* Recent Sessions & Class Performance */}
        {dashboardSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          >
            {/* Recent Sessions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Recent Sessions</h3>
              {dashboardSummary.recentSessions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No recent sessions</p>
              ) : (
                <div className="space-y-3">
                  {dashboardSummary.recentSessions.slice(0, 5).map((session) => (
                    <div key={`${session.classId}-${session.date}`} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{session.className}</p>
                        <p className="text-xs text-slate-500">{new Date(session.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{session.attendancePercentage}%</p>
                        <p className="text-xs text-slate-500">{session.presentStudents}/{session.totalStudents}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Class Performance */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Class Performance</h3>
                <button
                  onClick={() => router.push('/reports')}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  View Reports →
                </button>
              </div>
              {dashboardSummary.classSummaries.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No class data available</p>
              ) : (
                <div className="space-y-3">
                  {dashboardSummary.classSummaries.slice(0, 5).map((classSummary) => (
                    <div key={classSummary.classId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{classSummary.className}</p>
                        <p className="text-xs text-slate-500">{classSummary.subject} • {classSummary.totalStudents} students</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classSummary.averageAttendance >= 80
                          ? 'bg-green-50 text-green-700'
                          : classSummary.averageAttendance >= 60
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                          }`}>
                          {classSummary.averageAttendance}%
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{classSummary.totalSessions} sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Classes Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-base font-semibold text-slate-900 mb-4">Your Classes</h2>

          {classes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-slate-900 mb-1">No classes yet</h3>
              <p className="text-sm text-slate-500 mb-6">Create your first class to start managing attendance</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classData, index) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <ClassCard
                    classData={classData}
                    onEdit={handleEditClass}
                    onDelete={handleDeleteClass}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Create Class Modal */}
      <AddClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateClass}
      />

      {/* Edit Class Modal */}
      <AddClassModal
        isOpen={editingClass !== null}
        onClose={() => setEditingClass(null)}
        onSubmit={handleUpdateClass}
        initialData={editingClass ? { name: editingClass.name, subject: editingClass.subject } : undefined}
        isEditing={true}
      />
    </div>
  );
}