// Data Models for Face Recognition Attendance System

export interface Teacher {
  uid?: string;
  email: string;
  name?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  teacherEmail: string;
  teacherId?: string;
  students: Student[];
  attendanceRecords: Attendance[];
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  srn: string;
  photo: string; // base64 or URL
  classId: string;
}

export interface Attendance {
  id: string;
  classId: string;
  date: string;
  presentStudents: string[]; // array of student IDs
  absentStudents: string[]; // array of student IDs
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  srn: string;
  status: 'present' | 'absent';
  photo: string;
}

// Form interfaces
export interface CreateClassForm {
  name: string;
  subject: string;
}

export interface AddStudentForm {
  name: string;
  srn: string;
  photo: File | null;
}

export interface LoginForm {
  email: string;
}