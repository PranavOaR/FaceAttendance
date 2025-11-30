// Firestore helper functions for CRUD operations
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Teacher, Class, Student, Attendance } from './types';

// Collections
export const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE: 'attendanceRecords'
} as const;

// Helper function to convert Firestore timestamps
const convertTimestamp = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp || new Date().toISOString();
};

// ===== TEACHER OPERATIONS =====

/**
 * Create or update teacher profile in Firestore
 */
export const createOrUpdateTeacher = async (uid: string, teacherData: Partial<Teacher>): Promise<void> => {
  try {
    const teacherRef = doc(db, COLLECTIONS.TEACHERS, uid);
    await updateDoc(teacherRef, {
      ...teacherData,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, COLLECTIONS.TEACHERS), {
        ...teacherData,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error creating/updating teacher:', error);
    throw error;
  }
};

/**
 * Get teacher by UID
 */
export const getTeacher = async (uid: string): Promise<Teacher | null> => {
  try {
    const teacherRef = doc(db, COLLECTIONS.TEACHERS, uid);
    const teacherSnap = await getDoc(teacherRef);
    
    if (teacherSnap.exists()) {
      const data = teacherSnap.data();
      return {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as unknown as Teacher;
    }
    return null;
  } catch (error) {
    console.error('Error getting teacher:', error);
    throw error;
  }
};

// ===== CLASS OPERATIONS =====

/**
 * Create a new class
 */
export const createClass = async (classData: Omit<Class, 'id' | 'createdAt' | 'students' | 'attendanceRecords'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.CLASSES), {
      ...classData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
};

/**
 * Get all classes for a teacher
 */
export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CLASSES),
      where('teacherEmail', '==', teacherId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const classes: Class[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      
      // Get students for this class
      const students = await getClassStudents(docSnap.id);
      
      // Get attendance records for this class  
      const attendanceRecords = await getClassAttendance(docSnap.id);
      
      classes.push({
        id: docSnap.id,
        ...data,
        students,
        attendanceRecords,
        createdAt: convertTimestamp(data.createdAt)
      } as Class);
    }
    
    return classes;
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    throw error;
  }
};

/**
 * Get a specific class by ID
 */
export const getClass = async (classId: string): Promise<Class | null> => {
  try {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classSnap = await getDoc(classRef);
    
    if (classSnap.exists()) {
      const data = classSnap.data();
      
      // Get students and attendance records
      const students = await getClassStudents(classId);
      const attendanceRecords = await getClassAttendance(classId);
      
      return {
        id: classSnap.id,
        ...data,
        students,
        attendanceRecords,
        createdAt: convertTimestamp(data.createdAt)
      } as Class;
    }
    return null;
  } catch (error) {
    console.error('Error getting class:', error);
    throw error;
  }
};

/**
 * Update a class
 */
export const updateClass = async (classId: string, updates: Partial<Class>): Promise<void> => {
  try {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    await updateDoc(classRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

/**
 * Delete a class and all its subcollections
 */
export const deleteClass = async (classId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete all students in the class
    const studentsQuery = query(
      collection(db, COLLECTIONS.CLASSES, classId, COLLECTIONS.STUDENTS)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    studentsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete all attendance records
    const attendanceQuery = query(
      collection(db, COLLECTIONS.CLASSES, classId, COLLECTIONS.ATTENDANCE)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    attendanceSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete the class document
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    batch.delete(classRef);
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};

// ===== STUDENT OPERATIONS =====

/**
 * Add a student to a class
 */
export const addStudent = async (classId: string, student: Omit<Student, 'id'>): Promise<string> => {
  try {
    const batch = writeBatch(db);
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    const students = classData.students || [];
    
    // Generate a new ID for the student
    const studentId = doc(collection(db, 'temp')).id;
    
    // Create the new student with the generated ID
    const newStudent: Student = {
      id: studentId,
      name: student.name,
      srn: student.srn,
      photo: student.photo,
      classId: student.classId,
    };
    
    // Add the student to the class's students array
    students.push(newStudent);
    
    // Update the class document with the new students array
    batch.update(classRef, { students });
    
    await batch.commit();
    return studentId;
  } catch (error) {
    console.error('Error adding student:', error);
    throw error;
  }
};

/**
 * Get all students in a class
 */
export const getClassStudents = async (classId: string): Promise<Student[]> => {
  try {
    console.log(`Fetching students for class ${classId}`);
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    console.log('Class data for students fetch:', JSON.stringify(classData, null, 2));
    
    let students = classData.students || [];
    console.log(`Found ${students.length} students in class array`);
    
    // If no students in array, check subcollection (backward compatibility)
    if (students.length === 0) {
      console.log('No students in array, checking subcollection...');
      try {
        const q = query(
          collection(db, COLLECTIONS.CLASSES, classId, COLLECTIONS.STUDENTS),
          orderBy('name', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.size} students in subcollection`);
        
        if (querySnapshot.size > 0) {
          const subcollectionStudents: Student[] = [];
          querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            subcollectionStudents.push({
              id: doc.id,
              name: data.name || '',
              srn: data.student_id || data.srn || '', // Handle old field names
              photo: data.profilePicture || data.photo || '',
              classId: classId,
            });
          });
          
          console.log('Students from subcollection:', subcollectionStudents.map(s => ({ id: s.id, name: s.name })));
          students = subcollectionStudents;
        }
      } catch (subError) {
        console.log('Error checking subcollection:', subError);
      }
    }
    
    console.log('Final students:', students.map(s => ({ id: s.id, name: s.name })));
    
    // Sort students by name
    return students.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting class students:', error);
    throw error;
  }
};

/**
 * Update a student in a class
 */
export const updateStudent = async (classId: string, student: Student): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    const students = classData.students || [];
    
    // Find the student index
    const studentIndex = students.findIndex(s => s.id === student.id);
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    // Update the student in the array
    students[studentIndex] = student;
    
    // Update the class document with the modified students array
    batch.update(classRef, { students });
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

/**
 * Delete a student from a class
 */
export const deleteStudent = async (classId: string, studentId: string): Promise<void> => {
  try {
    console.log(`Attempting to delete student ${studentId} from class ${classId}`);
    
    const batch = writeBatch(db);
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    console.log('Raw class data:', JSON.stringify(classData, null, 2));
    
    const students = classData.students || [];
    
    console.log(`Found class with ${students.length} students in array`);
    console.log('Students in class array:', students.map(s => ({ id: s.id, name: s.name })));
    console.log(`Looking for student with ID: ${studentId}`);
    
    // Check if student exists in array format
    const studentIndex = students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      // Student not found in array, check if it exists in subcollection (old format)
      console.log('Student not found in array, checking subcollection...');
      
      try {
        const studentSubRef = doc(db, COLLECTIONS.CLASSES, classId, COLLECTIONS.STUDENTS, studentId);
        const studentSubDoc = await getDoc(studentSubRef);
        
        if (studentSubDoc.exists()) {
          console.log('Found student in subcollection, deleting from subcollection...');
          // Delete from subcollection (old format)
          batch.delete(studentSubRef);
          
          // Also clean up any attendance records
          const attendanceRecords = classData.attendanceRecords || [];
          const updatedAttendanceRecords = attendanceRecords.map(record => ({
            ...record,
            presentStudents: record.presentStudents?.filter(id => id !== studentId) || [],
            absentStudents: record.absentStudents?.filter(id => id !== studentId) || []
          }));
          
          if (attendanceRecords.length > 0) {
            batch.update(classRef, { attendanceRecords: updatedAttendanceRecords });
          }
          
          await batch.commit();
          console.log(`Successfully deleted student ${studentId} from subcollection in class ${classId}`);
          return;
        }
      } catch (subError) {
        console.log('Error checking subcollection:', subError);
      }
      
      console.error(`Student ${studentId} not found in class students array`);
      console.error('Available student IDs:', students.map(s => s.id));
      throw new Error('Student not found in class');
    }
    
    // Remove the student from the array
    students.splice(studentIndex, 1);
    
    // Update attendance records to remove this student
    const attendanceRecords = classData.attendanceRecords || [];
    const updatedAttendanceRecords = attendanceRecords.map(record => ({
      ...record,
      presentStudents: record.presentStudents?.filter(id => id !== studentId) || [],
      absentStudents: record.absentStudents?.filter(id => id !== studentId) || []
    }));
    
    // Update the class document
    batch.update(classRef, { 
      students,
      attendanceRecords: updatedAttendanceRecords
    });
    
    await batch.commit();
    console.log(`Successfully deleted student ${studentId} from array in class ${classId}`);
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

// ===== ATTENDANCE OPERATIONS =====

/**
 * Add an attendance record to the class document
 */
export const addAttendanceRecord = async (classId: string, attendanceData: Omit<Attendance, 'id' | 'classId'>): Promise<string> => {
  try {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    const attendanceRecords = classData.attendanceRecords || [];
    
    // Check if a record for today already exists
    const today = attendanceData.date;
    const existingRecordIndex = attendanceRecords.findIndex(r => r.date === today);
    
    if (existingRecordIndex !== -1) {
      // Update existing record for today
      console.log(`Updating existing attendance record for ${today}`);
      attendanceRecords[existingRecordIndex] = {
        ...attendanceRecords[existingRecordIndex],
        ...attendanceData,
        id: attendanceRecords[existingRecordIndex].id || `record_${today}`
      };
    } else {
      // Create new record
      console.log(`Creating new attendance record for ${today}`);
      const newRecord = {
        id: `record_${today}`,
        classId,
        ...attendanceData
      };
      attendanceRecords.push(newRecord);
    }
    
    // Update class document
    await updateDoc(classRef, { attendanceRecords });
    
    console.log(`Saved ${attendanceData.presentStudents?.length || 0} present and ${attendanceData.absentStudents?.length || 0} absent for ${today}`);
    
    return `record_${today}`;
  } catch (error) {
    console.error('Error adding attendance record:', error);
    throw error;
  }
};

/**
 * Get all attendance records for a class from the class document
 */
export const getClassAttendance = async (classId: string): Promise<Attendance[]> => {
  try {
    const classRef = doc(db, COLLECTIONS.CLASSES, classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      return [];
    }
    
    const classData = classDoc.data() as Class;
    const attendanceRecords = classData.attendanceRecords || [];
    
    console.log(`Found ${attendanceRecords.length} attendance records for class ${classId}`);
    
    // Convert to Attendance type and sort by date descending
    return attendanceRecords
      .map((record: any, index: number) => ({
        id: record.id || `record_${index}`,
        date: record.date,
        presentStudents: record.presentStudents || [],
        absentStudents: record.absentStudents || [],
        classId: classId,
        ...record
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Descending order (most recent first)
      }) as Attendance[];
  } catch (error) {
    console.error('Error getting class attendance:', error);
    return [];
  }
};

// ===== REAL-TIME LISTENERS =====

/**
 * Listen to teacher classes in real-time
 */
export const listenToTeacherClasses = (teacherId: string, callback: (classes: Class[]) => void) => {
  const q = query(
    collection(db, COLLECTIONS.CLASSES),
    where('teacherEmail', '==', teacherId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const classes: Class[] = [];
    
    for (const docChange of snapshot.docs) {
      const data = docChange.data();
      
      // Get students and attendance for each class
      const students = await getClassStudents(docChange.id);
      const attendanceRecords = await getClassAttendance(docChange.id);
      
      classes.push({
        id: docChange.id,
        ...data,
        students,
        attendanceRecords,
        createdAt: convertTimestamp(data.createdAt)
      } as Class);
    }
    
    callback(classes);
  });
};

/**
 * Listen to class students in real-time
 */
export const listenToClassStudents = (classId: string, callback: (students: Student[]) => void) => {
  const classRef = doc(db, COLLECTIONS.CLASSES, classId);
  
  return onSnapshot(classRef, async (classDoc) => {
    if (!classDoc.exists()) {
      callback([]);
      return;
    }
    
    const classData = classDoc.data() as Class;
    let students = classData.students || [];
    
    console.log(`Real-time listener: Found ${students.length} students in class array`);
    
    // If no students in array, check subcollection for backward compatibility
    if (students.length === 0) {
      console.log('Real-time listener: No students in array, checking subcollection...');
      try {
        const q = query(
          collection(db, COLLECTIONS.CLASSES, classId, COLLECTIONS.STUDENTS),
          orderBy('name', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`Real-time listener: Found ${querySnapshot.size} students in subcollection`);
        
        if (querySnapshot.size > 0) {
          const subcollectionStudents: Student[] = [];
          querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            subcollectionStudents.push({
              id: doc.id,
              name: data.name || '',
              srn: data.student_id || data.srn || '', // Handle old field names
              photo: data.profilePicture || data.photo || '',
              classId: classId,
            });
          });
          students = subcollectionStudents;
        }
      } catch (subError) {
        console.log('Real-time listener: Error checking subcollection:', subError);
      }
    }
    
    // Sort students by name
    const sortedStudents = students.sort((a, b) => a.name.localeCompare(b.name));
    console.log('Real-time listener: Final students:', sortedStudents.map(s => ({ id: s.id, name: s.name })));
    
    callback(sortedStudents);
  });
};