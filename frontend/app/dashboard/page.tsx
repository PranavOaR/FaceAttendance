'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Teacher, Class, CreateClassForm } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useClasses } from '@/hooks/useFirestore';
import { getDashboardSummary, DashboardSummary } from '@/lib/analytics';
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
  const loadAnalytics = async () => {
    if (user && classes.length > 0) {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const summary = await getDashboardSummary(user.email || '');
        setDashboardSummary(summary);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalyticsError('Failed to load analytics data. Please try again.');
      } finally {
        setLoadingAnalytics(false);
      }
    }
  };

  useEffect(() => {
    loadAnalytics();
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <LoadingSkeleton variant="text" className="w-64 h-8 mb-2" />
            <LoadingSkeleton variant="text" className="w-48 h-4" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <FloatingHeader showLogout={true} onLogout={logout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {user?.displayName || user?.email}! Manage your classes and track attendance.
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Class
            </motion.button>
          </div>
        </motion.div>

        {/* Enhanced Stats with Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
                    <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Classes</div>
                <div className="text-2xl font-bold text-gray-900">{dashboardSummary?.totalClasses ?? classes.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Students</div>
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardSummary?.totalStudents ?? classes.reduce((total, cls) => total + cls.students.length, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Average Attendance</div>
                <div className="text-2xl font-bold text-gray-900">
                  {loadingAnalytics ? '...' : `${dashboardSummary?.averageAttendance ?? 0}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Sessions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {classes.reduce((total, cls) => total + cls.attendanceRecords.length, 0)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Sessions & Class Performance */}
        {dashboardSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          >
            {/* Recent Sessions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
              {dashboardSummary.recentSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent sessions found</p>
              ) : (
                <div className="space-y-3">
                  {dashboardSummary.recentSessions.slice(0, 5).map((session, index) => (
                    <div key={`${session.classId}-${session.date}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{session.className}</p>
                        <p className="text-sm text-gray-500">{new Date(session.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{session.attendancePercentage}%</p>
                        <p className="text-sm text-gray-500">{session.presentStudents}/{session.totalStudents}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Class Performance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Class Performance</h3>
                <button
                  onClick={() => router.push('/reports')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Reports →
                </button>
              </div>
              {dashboardSummary.classSummaries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No class data available</p>
              ) : (
                <div className="space-y-3">
                  {dashboardSummary.classSummaries.slice(0, 5).map((classSummary) => (
                    <div key={classSummary.classId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{classSummary.className}</p>
                        <p className="text-sm text-gray-500">{classSummary.subject} • {classSummary.totalStudents} students</p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          classSummary.averageAttendance >= 80
                            ? 'bg-green-100 text-green-800'
                            : classSummary.averageAttendance >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {classSummary.averageAttendance}%
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{classSummary.totalSessions} sessions</p>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Classes</h2>
          
          {classes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-6">Create your first class to start managing attendance</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Class
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classData, index) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
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