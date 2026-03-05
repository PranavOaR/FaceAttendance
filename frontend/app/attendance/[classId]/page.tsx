'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { Teacher, Class, Student, Attendance, AttendanceRecord } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useClass, useStudents, useAttendance } from '@/hooks/useFirestore';
import { downloadCSV } from '@/utils/storage';
import toast, { Toaster } from 'react-hot-toast';
import { FloatingHeader } from '@/components/ui/floating-header';
import { TrainingLoader } from '@/components/ui/loader';
import StudentCard from '@/components/StudentCard';
import Webcam from 'react-webcam';

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);
  const [isTraining, setIsTraining] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [showBatchResult, setShowBatchResult] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    facesDetected: number;
    matchedCount: number;
    matchedNames: string[];
    unmatchedCount: number;
  } | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<{
    trained: boolean;
    needsRetrain: boolean;
    embeddingCount: number;
    studentCount: number;
    message: string;
  } | null>(null);
  const webcamRef = useRef<any>(null);
  const recognizedStudentsRef = useRef<Set<string>>(new Set());

  // Cleanup management refs
  const mountedRef = useRef<boolean>(true);
  const activeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const activeControllersRef = useRef<Set<AbortController>>(new Set());

  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  // Firebase hooks
  const { user, loading: authLoading, logout } = useAuth();
  const { classData, loading: classLoading, error: classError } = useClass(classId);
  const { students, loading: studentsLoading } = useStudents(classId);
  const { markAttendance, loading: attendanceLoading } = useAttendance(classId);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Check if class exists
  useEffect(() => {
    if (!classLoading && !classData && classId) {
      toast.error('Class not found');
      router.push('/dashboard');
    }
  }, [classData, classLoading, classId, router]);

  // Initialize attendance records when students are loaded.
  // Important: merge — preserve any 'present' statuses already set by face recognition
  // so that the Firestore real-time listener firing (same document) doesn't wipe them.
  useEffect(() => {
    if (students.length > 0) {
      setAttendanceRecords(prev => {
        const existingPresent = new Set(
          prev.filter(r => r.status === 'present').map(r => r.studentId)
        );
        return students.map(student => ({
          studentId: student.id,
          studentName: student.name,
          srn: student.srn,
          status: existingPresent.has(student.id) ? 'present' : 'absent',
          photo: student.photo
        }));
      });
    }
  }, [students]);

  // Loading state
  const isLoading = authLoading || classLoading || studentsLoading;

  // Backend API configuration
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Check backend connectivity
  const checkBackendConnection = async () => {
    try {
      const controller = new AbortController();
      activeControllersRef.current.add(controller);

      const timeoutId = setTimeout(() => controller.abort(), 5000);
      activeTimeoutsRef.current.add(timeoutId);

      const response = await fetch(`${BACKEND_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      activeTimeoutsRef.current.delete(timeoutId);
      activeControllersRef.current.delete(controller);

      return response.ok;
    } catch (error) {
      // Suppress AbortError - it's expected on cleanup
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Backend connection check failed:', error);
      }
      return false;
    }
  };

  // Check training status on page load
  const checkTrainingStatus = async () => {
    if (!classId) return;

    try {
      const response = await fetch(`${BACKEND_URL}/training/status/${classId}`);
      if (response.ok) {
        const status = await response.json();
        setTrainingStatus(status);
        console.log('Training status:', status);
      }
    } catch (error) {
      console.error('Failed to check training status:', error);
    }
  };

  // Check training status when class loads
  useEffect(() => {
    if (classData && classId) {
      checkTrainingStatus();
    }
  }, [classData, classId]);

  // Train the face recognition model for this class
  const trainFaceRecognition = async () => {
    if (!classData) return;

    setIsTraining(true);
    toast.loading('Training face recognition model...', { id: 'train' });

    try {
      // First check if backend is reachable
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        throw new Error(
          `Backend server is not running. Please start it with: cd backend && python -m uvicorn main:app --reload --port 8000`
        );
      }

      const controller = new AbortController();
      activeControllersRef.current.add(controller);

      const timeoutId = setTimeout(() => controller.abort('Training timeout'), 90000); // 90 second timeout for CNN model
      activeTimeoutsRef.current.add(timeoutId);

      const response = await fetch(`${BACKEND_URL}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      activeTimeoutsRef.current.delete(timeoutId);
      activeControllersRef.current.delete(controller);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Training failed: ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      setIsTraining(false);
      // Refresh training status after training
      await checkTrainingStatus();
      toast.success(`Model trained successfully! Processed ${result.studentsProcessed} students.`, { id: 'train' });
      return true;
    } catch (error: any) {
      console.error('Training error:', error);

      if (error.name === 'AbortError') {
        toast.error('Training request timed out. The backend may be slow or overloaded.', { id: 'train' });
      } else if (error.message.includes('Failed to fetch') || error.message.includes('not running')) {
        toast.error(
          'Cannot connect to backend server. Make sure it is running on port 8000.',
          { id: 'train', duration: 5000 }
        );
      } else {
        toast.error(`Training failed: ${error.message}`, { id: 'train' });
      }
      setIsTraining(false);
      return false;
    }
  };

  // One-shot batch scan: capture a single frame and match ALL faces in it
  const runBatchScan = async () => {
    if (!webcamRef.current || !classData) return;

    setIsBatchScanning(true);
    setBatchResult(null);
    setShowBatchResult(false);

    try {
      // Ensure the model is trained before scanning
      if (!trainingStatus?.trained || trainingStatus?.needsRetrain) {
        toast.loading('Training model first...', { id: 'batch' });
        const trained = await trainFaceRecognition();
        if (!trained) throw new Error('Model training failed. Cannot proceed.');
      }

      toast.loading('Capturing classroom frame...', { id: 'batch' });

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error('Failed to capture image from webcam');

      toast.loading('Recognising all faces in frame...', { id: 'batch' });

      const controller = new AbortController();
      activeControllersRef.current.add(controller);
      const timeoutId = setTimeout(() => controller.abort('Batch timeout'), 30000);
      activeTimeoutsRef.current.add(timeoutId);

      const response = await fetch(`${BACKEND_URL}/recognize_batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, image_base64: imageSrc }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      activeTimeoutsRef.current.delete(timeoutId);
      activeControllersRef.current.delete(controller);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch recognition failed: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Batch recognition returned unsuccessful');
      }

      if (result.facesDetected === 0) {
        toast.error('No faces detected in the frame. Try better lighting or move closer.', { id: 'batch' });
        setIsBatchScanning(false);
        return;
      }

      // Mark every matched student present
      const matched = (result.matches as any[]).filter(m => m.matched && m.studentId);

      // Separate new matches from already-recognised ones (from a previous scan)
      const newMatches = matched.filter(
        (m: any) => !recognizedStudentsRef.current.has(m.studentId)
      );

      // Optimistic UI update for ALL matched students (new + already known)
      setAttendanceRecords(prev => {
        const updated = [...prev];
        for (const match of matched) {
          const idx = updated.findIndex(r => r.studentId === match.studentId);
          if (idx >= 0) updated[idx] = { ...updated[idx], status: 'present' };
        }
        return updated;
      });

      // Single atomic backend call for only newly-recognised students
      if (newMatches.length > 0) {
        const newStudentIds = newMatches.map((m: any) => m.studentId as string);
        for (const sid of newStudentIds) recognizedStudentsRef.current.add(sid);

        try {
          const batchRes = await fetch(`${BACKEND_URL}/mark_attendance_batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, studentIds: newStudentIds })
          });
          if (!batchRes.ok) {
            console.error('Batch mark failed:', await batchRes.text());
          }
        } catch (err) {
          console.error('Batch mark error:', err);
        }
      }

      setRecognizedCount(recognizedStudentsRef.current.size);
      setScanComplete(true);

      setBatchResult({
        facesDetected: result.facesDetected,
        matchedCount: matched.length,
        matchedNames: matched.map((m: any) => m.studentName as string),
        unmatchedCount: result.facesDetected - matched.length
      });
      setShowBatchResult(true);

      toast.success(
        `Batch scan done! Detected ${result.facesDetected} face(s), matched ${matched.length} student(s).`,
        { id: 'batch', duration: 4000 }
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Batch scan timed out. Try again.', { id: 'batch' });
      } else {
        toast.error(`Batch scan failed: ${error.message}`, { id: 'batch' });
      }
    } finally {
      setIsBatchScanning(false);
    }
  };

  // Cleanup on unmount - dismiss all toasts, clear intervals, timeouts, and abort controllers
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      console.log('Component unmounting - cleaning up all resources');
      mountedRef.current = false;

      // Clear all active timeouts
      activeTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      activeTimeoutsRef.current.clear();

      // Abort all pending requests with a reason
      activeControllersRef.current.forEach(controller => {
        controller.abort('Component unmounted');
      });
      activeControllersRef.current.clear();

      // Dismiss all toasts when leaving the page
      toast.dismiss();
    };
  }, []);

  const toggleStudentAttendance = (studentId: string) => {
    // Prevent toggling while batch scanning to avoid race conditions
    if (isBatchScanning) {
      toast.error('Cannot manually toggle attendance while scanning. Wait for the batch scan to finish.', {
        duration: 2000
      });
      return;
    }

    setAttendanceRecords(prev => {
      const updated = [...prev];
      const studentIndex = updated.findIndex(r => r.studentId === studentId);

      if (studentIndex >= 0) {
        const currentStatus = updated[studentIndex].status;
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';

        console.log(`Toggling student ${studentId} from ${currentStatus} to ${newStatus}`);

        updated[studentIndex] = {
          ...updated[studentIndex],
          status: newStatus
        };
      }

      return updated;
    });
  };

  const saveAttendance = async () => {
    if (!classData) return;

    try {
      // Get present and absent students from current UI state
      const presentStudents = attendanceRecords
        .filter(record => record.status === 'present')
        .map(record => record.studentId);

      const absentStudents = attendanceRecords
        .filter(record => record.status === 'absent')
        .map(record => record.studentId);

      console.log(`Saving attendance: ${presentStudents.length} present, ${absentStudents.length} absent`);
      console.log('Present student IDs:', presentStudents);

      // Save to Firebase using just the date (YYYY-MM-DD format)
      const todayDate = new Date().toISOString().split('T')[0];

      await markAttendance({
        date: todayDate,
        presentStudents,
        absentStudents
      });

      // Send email notifications to parents of absent students
      try {
        const absentStudentDetails = attendanceRecords
          .filter(record => record.status === 'absent')
          .map(record => {
            const student = students.find(s => s.id === record.studentId);
            return {
              id: record.studentId,
              name: record.studentName,
              parentEmail: student?.parentEmail || null,
              parentPhone: student?.parentPhone || null
            };
          })
          .filter(s => s.parentEmail || s.parentPhone);

        if (absentStudentDetails.length > 0) {
          await fetch(`${BACKEND_URL}/notify/absence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classId: classData.id,
              className: classData.name,
              subject: classData.subject,
              date: todayDate,
              absentStudents: absentStudentDetails,
              teacherName: user?.displayName || user?.email?.split('@')[0] || 'Your Teacher'
            })
          });
          toast.success(`Attendance saved! ${absentStudentDetails.length} parent(s) notified.`);
        } else {
          toast.success('Attendance saved successfully!');
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        toast.success('Attendance saved! (Email notifications failed)');
      }

      // Redirect back to class page after a short delay
      setTimeout(() => {
        router.push(`/class/${classData.id}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.message || 'Failed to save attendance');
    }
  };

  const exportToCSV = () => {
    if (!classData) return;

    const csvData = attendanceRecords.map(record => ({
      Name: record.studentName,
      SRN: record.srn,
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      Date: new Date().toLocaleDateString(),
      Time: new Date().toLocaleTimeString(),
      Class: classData.name,
      Subject: classData.subject
    }));

    const filename = `attendance_${classData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvData, filename);
    toast.success('Attendance report downloaded!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Not Found</h2>
          <p className="text-gray-600 mb-4">The class you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;

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
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push(`/class/${classData.id}`)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
                <p className="text-gray-600">{classData.name} - {classData.subject}</p>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Report
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveAttendance}
                disabled={isBatchScanning}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Attendance
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Students</div>
                <div className="text-2xl font-bold text-gray-900">{attendanceRecords.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Present</div>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Absent</div>
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Webcam Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Recognition Scanner</h3>

              {/* Webcam Component */}
              <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  height={360}
                  screenshotFormat="image/jpeg"
                  width={640}
                  videoConstraints={{
                    width: 640,
                    height: 360,
                    facingMode: 'user'
                  }}
                  className="w-full h-full object-cover rounded-lg"
                />

                {/* Training Loader Overlay */}
                {isTraining && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg z-10">
                    <TrainingLoader text="Training model..." className="text-white" />
                  </div>
                )}

                {/* Batch scanning overlay */}
                {isBatchScanning && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-white/90 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse bg-purple-500"></div>
                      <span className="text-xs font-medium text-gray-700">Scanning all faces...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Training Status Indicator */}
                {trainingStatus && (
                  <div className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${trainingStatus.trained && !trainingStatus.needsRetrain
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : trainingStatus.needsRetrain
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                    {trainingStatus.trained && !trainingStatus.needsRetrain ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Model Ready ({trainingStatus.embeddingCount}/{trainingStatus.studentCount} students)</span>
                      </>
                    ) : trainingStatus.needsRetrain ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>New students added - retrain needed</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Training required for first use</span>
                      </>
                    )}
                  </div>
                )}

                {/* Train/Retrain Model Button - Only show if needed */}
                {(!trainingStatus?.trained || trainingStatus?.needsRetrain) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={trainFaceRecognition}
                    disabled={isTraining || isBatchScanning}
                    className={`w-full py-2 px-4 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${trainingStatus?.needsRetrain
                        ? 'border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:ring-yellow-500'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
                      }`}
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {trainingStatus?.needsRetrain ? 'Retrain Model' : 'Train Model'}
                    </div>
                  </motion.button>
                )}

                {scanComplete && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setScanComplete(false);
                      setRecognizedCount(0);
                      setShowBatchResult(false);
                      setBatchResult(null);
                    }}
                    className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Scan Complete ✓ - Scan Again
                    </div>
                  </motion.button>
                )}

                {/* Batch Scan button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runBatchScan}
                  disabled={isTraining || isBatchScanning}
                  className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center">
                    {isBatchScanning ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Scanning All Faces...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Batch Scan (All Faces at Once)
                      </>
                    )}
                  </div>
                </motion.button>
              </div>

              {/* Batch scan result panel */}
              {showBatchResult && batchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">Batch Scan Results</p>
                    <button
                      onClick={() => setShowBatchResult(false)}
                      className="text-purple-400 hover:text-purple-600 text-xs"
                    >✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="bg-white rounded p-2 shadow-sm">
                      <div className="text-lg font-bold text-gray-800">{batchResult.facesDetected}</div>
                      <div className="text-xs text-gray-500">Faces</div>
                    </div>
                    <div className="bg-white rounded p-2 shadow-sm">
                      <div className="text-lg font-bold text-green-600">{batchResult.matchedCount}</div>
                      <div className="text-xs text-gray-500">Matched</div>
                    </div>
                    <div className="bg-white rounded p-2 shadow-sm">
                      <div className="text-lg font-bold text-orange-500">{batchResult.unmatchedCount}</div>
                      <div className="text-xs text-gray-500">Unknown</div>
                    </div>
                  </div>
                  {batchResult.matchedNames.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-purple-800 mb-1">Marked present:</p>
                      <div className="flex flex-wrap gap-1">
                        {batchResult.matchedNames.map(name => (
                          <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {batchResult.unmatchedCount > 0 && (
                    <p className="mt-2 text-xs text-orange-700">
                      {batchResult.unmatchedCount} face(s) not recognised — they may not be enrolled or lighting/angle may need adjustment.
                    </p>
                  )}
                </motion.div>
              )}

              {/* Instructions */}
              {!isBatchScanning && !scanComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md"
                >
                  <div className="flex">
                    <svg className="flex-shrink-0 h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 font-medium mb-1">How to use:</p>
                      <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                        <li>Click "Train Model" first (only needed once per class)</li>
                        <li>Gather all students in view of the camera</li>
                        <li>Click <strong>Batch Scan</strong> — one shot identifies and marks everyone present</li>
                        <li>Manually adjust any missed students, then save</li>
                      </ol>
                    </div>
                  </div>
                </motion.div>
              )}

              {scanComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md"
                >
                  <div className="flex">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        Face scan completed! Found {recognizedCount} students. You can manually adjust attendance below if needed.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Students List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Attendance</h3>

              {attendanceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No students enrolled in this class.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attendanceRecords.map((record, index) => (
                    <motion.div
                      key={record.studentId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => toggleStudentAttendance(record.studentId)}
                      className="cursor-pointer"
                    >
                      <StudentCard
                        student={{
                          id: record.studentId,
                          name: record.studentName,
                          srn: record.srn,
                          photo: record.photo,
                          classId: classId
                        }}
                        onEdit={() => { }}
                        onDelete={() => { }}
                        attendanceStatus={record.status}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
