'use client';

import { useState, useEffect } from 'react';
import {
  getTeacherClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  listenToTeacherClasses,
  listenToClassStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  addAttendanceRecord
} from '@/lib/firestoreHelpers';
import { Class, Student, Attendance } from '@/lib/types';

// Hook for managing teacher's classes
export function useClasses(teacherId: string) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for classes
    const unsubscribe = listenToTeacherClasses(teacherId, (updatedClasses) => {
      setClasses(updatedClasses);
      setLoading(false);
    });

    return unsubscribe;
  }, [teacherId]);

  const createNewClass = async (classData: { name: string; subject: string }) => {
    try {
      setError(null);
      await createClass({
        ...classData,
        teacherEmail: teacherId
      });
      // Real-time listener will update the classes automatically
    } catch (err: any) {
      setError(err.message || 'Failed to create class');
      throw err;
    }
  };

  const updateExistingClass = async (classId: string, updates: Partial<Class>) => {
    try {
      setError(null);
      await updateClass(classId, updates);
      // Real-time listener will update the classes automatically
    } catch (err: any) {
      setError(err.message || 'Failed to update class');
      throw err;
    }
  };

  const deleteExistingClass = async (classId: string) => {
    try {
      setError(null);
      await deleteClass(classId);
      // Real-time listener will update the classes automatically
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
      throw err;
    }
  };

  return {
    classes,
    loading,
    error,
    createClass: createNewClass,
    updateClass: updateExistingClass,
    deleteClass: deleteExistingClass
  };
}

// Hook for managing a specific class
export function useClass(classId: string) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    const fetchClass = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getClass(classId);
        setClassData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load class');
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [classId]);

  return {
    classData,
    loading,
    error,
    refetch: () => {
      if (classId) {
        getClass(classId).then(setClassData);
      }
    }
  };
}

// Hook for managing students in a class
export function useStudents(classId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for students
    const unsubscribe = listenToClassStudents(classId, (updatedStudents) => {
      setStudents(updatedStudents);
      setLoading(false);
    });

    return unsubscribe;
  }, [classId]);

  const addNewStudent = async (studentData: Omit<Student, 'id' | 'classId'>) => {
    try {
      setError(null);
      // Add the classId to the student data
      const studentWithClassId = { ...studentData, classId };
      await addStudent(classId, studentWithClassId);
      // Real-time listener will update students automatically
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
      throw err;
    }
  };

  const updateExistingStudent = async (studentId: string, updates: Partial<Student>) => {
    try {
      setError(null);
      
      // Find the current student
      const currentStudent = students.find(s => s.id === studentId);
      if (!currentStudent) {
        throw new Error('Student not found');
      }
      
      // Create the updated student object
      const updatedStudent: Student = { ...currentStudent, ...updates };
      
      await updateStudent(classId, updatedStudent);
      // Real-time listener will update students automatically
    } catch (err: any) {
      setError(err.message || 'Failed to update student');
      throw err;
    }
  };

  const deleteExistingStudent = async (studentId: string) => {
    try {
      setError(null);
      console.log(`Deleting student ${studentId} from class ${classId}`);
      await deleteStudent(classId, studentId);
      console.log(`Successfully deleted student ${studentId}`);
      // Real-time listener will update students automatically
    } catch (err: any) {
      console.error('Error in deleteExistingStudent:', err);
      setError(err.message || 'Failed to delete student');
      throw err;
    }
  };

  return {
    students,
    loading,
    error,
    addStudent: addNewStudent,
    updateStudent: updateExistingStudent,
    deleteStudent: deleteExistingStudent
  };
}

// Hook for managing attendance
export function useAttendance(classId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAttendance = async (attendanceData: {
    date: string;
    presentStudents: string[];
    absentStudents: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      await addAttendanceRecord(classId, attendanceData);
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    markAttendance
  };
}

// Generic hook for async operations
export function useAsync<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (asyncFunction: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}