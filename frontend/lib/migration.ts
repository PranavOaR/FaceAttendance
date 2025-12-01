/**
 * Migration utility to move students from subcollections to class document arrays
 * This should be run once to migrate existing data
 */
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Student, Class } from './types';

export const migrateStudentsToClassArray = async (classId: string): Promise<void> => {
  try {
    console.log(`Starting migration for class ${classId}`);
    
    // Get the class document
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data() as Class;
    console.log('Current class data:', classData);
    
    // Check if students array already exists and has data
    const existingStudents = classData.students || [];
    console.log(`Class already has ${existingStudents.length} students in array`);
    
    // Get students from subcollection
    const studentsCollectionRef = collection(db, 'classes', classId, 'students');
    const studentsSnapshot = await getDocs(studentsCollectionRef);
    
    console.log(`Found ${studentsSnapshot.size} students in subcollection`);
    
    if (studentsSnapshot.size === 0) {
      console.log('No students found in subcollection, migration not needed');
      return;
    }
    
    // Convert subcollection students to array format
    const subcollectionStudents: Student[] = [];
    studentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      subcollectionStudents.push({
        id: doc.id,
        name: studentData.name || '',
        srn: studentData.student_id || studentData.srn || '', // Handle old field name
        photo: studentData.profilePicture || studentData.photo || '',
        classId: classId,
      });
    });
    
    // Merge existing array students with subcollection students
    // Remove duplicates based on ID
    const allStudents = [...existingStudents];
    subcollectionStudents.forEach(subStudent => {
      const existsInArray = allStudents.some(arrStudent => arrStudent.id === subStudent.id);
      if (!existsInArray) {
        allStudents.push(subStudent);
      }
    });
    
    console.log(`Total students after migration: ${allStudents.length}`);
    console.log('Migrated students:', allStudents.map(s => ({ id: s.id, name: s.name })));
    
    // Update the class document with the merged students array
    await updateDoc(classRef, { students: allStudents });
    
    console.log(`Successfully migrated ${subcollectionStudents.length} students to class array`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

export const debugClassStudents = async (classId: string): Promise<void> => {
  try {
    console.log(`\n=== Debugging Students for Class ${classId} ===`);
    
    // Check class document
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      console.log('Class document does not exist');
      return;
    }
    
    const classData = classDoc.data() as Class;
    
    // Log students array
    const studentsArray = classData.students || [];
    console.log(`Students in class document array: ${studentsArray.length}`);
    studentsArray.forEach((student, index) => {
      console.log(`  [${index}] ID: ${student.id}, Name: ${student.name}, SRN: ${student.srn}`);
    });
    
    // Check subcollection
    const studentsCollectionRef = collection(db, 'classes', classId, 'students');
    const studentsSnapshot = await getDocs(studentsCollectionRef);
    
    console.log(`Students in subcollection: ${studentsSnapshot.size}`);
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  ID: ${doc.id}, Name: ${data.name}, SRN: ${data.student_id || data.srn}`);
    });
    
  } catch (error) {
    console.error('Error debugging class students:', error);
  }
};