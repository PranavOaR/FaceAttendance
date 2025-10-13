// LocalStorage utility functions for Face Recognition Attendance System
import { Teacher, Class, Student, Attendance } from '@/lib/types';

// Storage keys
const STORAGE_KEYS = {
  TEACHER: 'face_recognition_teacher',
  CLASSES: 'face_recognition_classes',
  STUDENTS: 'face_recognition_students',
  ATTENDANCE: 'face_recognition_attendance',
} as const;

// Teacher functions
export const saveTeacher = (teacher: Teacher): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(teacher));
  }
};

export const getTeacher = (): Teacher | null => {
  if (typeof window !== 'undefined') {
    const teacher = localStorage.getItem(STORAGE_KEYS.TEACHER);
    return teacher ? JSON.parse(teacher) : null;
  }
  return null;
};

export const removeTeacher = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.TEACHER);
  }
};

// Class functions
export const saveClasses = (classes: Class[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }
};

export const getClasses = (): Class[] => {
  if (typeof window !== 'undefined') {
    const classes = localStorage.getItem(STORAGE_KEYS.CLASSES);
    return classes ? JSON.parse(classes) : [];
  }
  return [];
};

export const addClass = (newClass: Class): void => {
  const classes = getClasses();
  classes.push(newClass);
  saveClasses(classes);
};

export const updateClass = (updatedClass: Class): void => {
  const classes = getClasses();
  const index = classes.findIndex(c => c.id === updatedClass.id);
  if (index !== -1) {
    classes[index] = updatedClass;
    saveClasses(classes);
  }
};

export const removeClass = (classId: string): void => {
  const classes = getClasses();
  const filteredClasses = classes.filter(c => c.id !== classId);
  saveClasses(filteredClasses);
};

export const getClassById = (classId: string): Class | null => {
  const classes = getClasses();
  return classes.find(c => c.id === classId) || null;
};

// Student functions
export const addStudentToClass = (classId: string, student: Student): void => {
  const classes = getClasses();
  const classIndex = classes.findIndex(c => c.id === classId);
  if (classIndex !== -1) {
    classes[classIndex].students.push(student);
    saveClasses(classes);
  }
};

export const removeStudentFromClass = (classId: string, studentId: string): void => {
  const classes = getClasses();
  const classIndex = classes.findIndex(c => c.id === classId);
  if (classIndex !== -1) {
    classes[classIndex].students = classes[classIndex].students.filter(s => s.id !== studentId);
    saveClasses(classes);
  }
};

export const updateStudent = (classId: string, updatedStudent: Student): void => {
  const classes = getClasses();
  const classIndex = classes.findIndex(c => c.id === classId);
  if (classIndex !== -1) {
    const studentIndex = classes[classIndex].students.findIndex(s => s.id === updatedStudent.id);
    if (studentIndex !== -1) {
      classes[classIndex].students[studentIndex] = updatedStudent;
      saveClasses(classes);
    }
  }
};

// Attendance functions
export const addAttendanceRecord = (classId: string, attendance: Attendance): void => {
  const classes = getClasses();
  const classIndex = classes.findIndex(c => c.id === classId);
  if (classIndex !== -1) {
    classes[classIndex].attendanceRecords.push(attendance);
    saveClasses(classes);
  }
};

export const getAttendanceForClass = (classId: string): Attendance[] => {
  const classData = getClassById(classId);
  return classData ? classData.attendanceRecords : [];
};

// Utility functions
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const isEmailValid = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Clear all data (for testing/reset)
export const clearAllData = (): void => {
  if (typeof window !== 'undefined') {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};