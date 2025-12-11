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
import StudentCard from '@/components/StudentCard';
import Webcam from 'react-webcam';

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const webcamRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);
  const recognizedStudentsRef = useRef<Set<string>>(new Set());
  const activeScanToastRef = useRef<string | null>(null);

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

  // Initialize attendance records when students are loaded
  useEffect(() => {
    if (students.length > 0) {
      const records: AttendanceRecord[] = students.map(student => ({
        studentId: student.id,
        studentName: student.name,
        srn: student.srn,
        status: 'absent',
        photo: student.photo
      }));
      setAttendanceRecords(records);
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

  // Train the face recognition model for this class
  const trainFaceRecognition = async () => {
    if (!classData) return;

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
      return false;
    }
  };

  // Capture webcam frame and recognize face
  const recognizeFace = async () => {
    if (!webcamRef.current || !classData) {
      console.log('Recognition skipped: webcam or classData not available');
      return null;
    }

    try {
      // Capture webcam image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image from webcam');
      }

      console.log(`Captured image from webcam: ${imageSrc.substring(0, 50)}...`);

      const controller = new AbortController();
      activeControllersRef.current.add(controller);

      const timeoutId = setTimeout(() => controller.abort('Recognition timeout'), 8000); // 8 second timeout
      activeTimeoutsRef.current.add(timeoutId);

      // Send to backend for recognition
      const response = await fetch(`${BACKEND_URL}/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          image_base64: imageSrc
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      activeTimeoutsRef.current.delete(timeoutId);
      activeControllersRef.current.delete(controller);
      console.log('Recognition response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Recognition response error:', errorText);
        throw new Error(`Recognition failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Recognition result:', result);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Recognition timeout:', error);
        throw new Error('Recognition took too long to respond');
      }
      console.error('Recognition error:', error);
      throw error;
    }
  };

  // Synchronize local UI state with recognized students from backend
  const updateAttendanceFromBackend = async (studentId: string) => {
    try {
      // Get fresh class data to verify the mark was successful
      const response = await fetch(`${BACKEND_URL}/classes/${classId}/students`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const classData = await response.json();
        // We can verify from backend if needed, but frontend is source of truth for UI
        console.log(`Verified student ${studentId} marked in backend`);
      }
    } catch (error) {
      console.warn('Could not verify backend state:', error);
      // Continue anyway - frontend state is maintained
    }
  };

  // Mark attendance for a recognized student
  const markStudentAttendance = async (studentId: string) => {
    try {
      const controller = new AbortController();
      activeControllersRef.current.add(controller);

      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      activeTimeoutsRef.current.add(timeoutId);

      const response = await fetch(`${BACKEND_URL}/mark_attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          studentId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      activeTimeoutsRef.current.delete(timeoutId);
      activeControllersRef.current.delete(controller);

      if (!response.ok) {
        throw new Error(`Failed to mark attendance: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Mark attendance timeout:', error);
        // Don't throw - continue scanning
        return null;
      }
      console.error('Mark attendance error:', error);
      // Don't throw - continue scanning even if marking fails
      return null;
    }
  };

  // Real-time face recognition scanning with manual control
  const startFaceRecognition = async () => {
    if (!classData) return;

    setIsScanning(true);
    setScanComplete(false);
    recognizedStudentsRef.current = new Set();
    setRecognizedCount(0);

    // Clear any existing scan toasts
    toast.dismiss('scan');

    // Show loading toast only once
    const toastId = toast.loading('Starting face recognition scan...', { id: 'scan' });
    activeScanToastRef.current = toastId as string;

    try {
      // First, ensure the model is trained
      const isTrained = await trainFaceRecognition();
      if (!isTrained) {
        throw new Error('Model training failed. Cannot proceed with recognition.');
      }

      // Update toast to scanning status
      toast.loading('Scanning for faces... Look at the camera! Click "Stop Scan" when done.', { id: 'scan' });

      // Scan for faces every 2 seconds continuously until manually stopped
      const scanInterval = 2000; // 2 seconds

      scanIntervalRef.current = setInterval(async () => {
        try {
          console.log(`Scanning for faces... Currently found: ${recognizedStudentsRef.current.size}`);

          const result = await recognizeFace();
          console.log(`Scan result:`, result);

          if (result?.matched && result.studentId) {
            if (!recognizedStudentsRef.current.has(result.studentId)) {
              console.log(`New face detected: ${result.studentName}, marking as present`);
              recognizedStudentsRef.current.add(result.studentId);
              setRecognizedCount(recognizedStudentsRef.current.size);

              // Mark student as present in local state - ONLY update the specific student
              setAttendanceRecords(prev => {
                const updated = [...prev];
                const studentIndex = updated.findIndex(r => r.studentId === result.studentId);
                if (studentIndex >= 0 && updated[studentIndex].status !== 'present') {
                  console.log(`Updating UI: marking ${result.studentName} as present`);
                  updated[studentIndex] = { ...updated[studentIndex], status: 'present' };
                }
                return updated;
              });

              // Mark attendance in backend
              const markResult = await markStudentAttendance(result.studentId);
              if (markResult) {
                console.log(`Backend marked attendance for ${result.studentName}`);
              }

              toast.success(`${result.studentName} marked present! (Confidence: ${(result.confidence * 100).toFixed(0)}%)`, {
                duration: 3000
              });
            } else {
              console.log(`Student ${result.studentName} already recognized this session`);
            }
          } else if (result?.matched === false) {
            console.log('No face match found in this scan', result);
          }

        } catch (error: any) {
          console.error('Scan error:', error);
          // Continue scanning even if one frame fails
          if (error.message.includes('timeout') || error.message.includes('too long')) {
            // Silent timeout - don't show error toast every time
            console.warn('Scan frame timeout, continuing...');
          } else {
            toast.error(`Scan error: ${error.message}`, { duration: 2000 });
          }
        }
      }, scanInterval);

    } catch (error: any) {
      setIsScanning(false);
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      // Clear the loading toast
      toast.dismiss('scan');

      if (error.message.includes('not running')) {
        toast.error(
          'Backend server is not running. Start it with: python -m uvicorn main:app --reload --port 8000',
          { duration: 6000 }
        );
      } else {
        toast.error(`Face recognition failed: ${error.message}`);
      }
    }
  };

  // Stop face recognition scanning manually
  const stopFaceRecognition = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
    setScanComplete(true);

    // Dismiss ALL scan-related toasts
    toast.dismiss('scan');
    if (activeScanToastRef.current) {
      toast.dismiss(activeScanToastRef.current);
    }

    // Show success message
    toast.success(`Scan stopped! ${recognizedStudentsRef.current.size} students marked present.`, { duration: 4000 });
  };

  // Cleanup on unmount - dismiss all toasts, clear intervals, timeouts, and abort controllers
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      console.log('Component unmounting - cleaning up all resources');
      mountedRef.current = false;

      // Clear scan interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

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
    // Prevent toggling while scanning to avoid race conditions
    if (isScanning) {
      toast.error('Cannot manually toggle attendance while scanning. Stop the scan first.', {
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
              parentEmail: student?.parentEmail || null
            };
          })
          .filter(s => s.parentEmail);

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

              {scanComplete && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveAttendance}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Attendance
                </motion.button>
              )}
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

                {/* Face detection overlay - subtle green border instead of blue */}
                {isScanning && (
                  <div className="absolute inset-4 border-2 border-green-500 rounded-lg animate-pulse">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Train Model Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={trainFaceRecognition}
                  disabled={isScanning}
                  className="w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Train Model
                  </div>
                </motion.button>

                {/* Scan Buttons */}
                {!isScanning && !scanComplete && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startFaceRecognition}
                    className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Start Face Scan
                    </div>
                  </motion.button>
                )}

                {isScanning && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={stopFaceRecognition}
                    className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Stop Scan ({recognizedCount} found)
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
              </div>

              {/* Instructions */}
              {!isScanning && !scanComplete && (
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
                        <li>Click "Train Model" first (only needed once)</li>
                        <li>Click "Start Face Scan" to begin</li>
                        <li>Position students in front of camera</li>
                        <li>Click "Stop Scan" when all students are marked</li>
                        <li>Manually adjust if needed, then save</li>
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
