// Debug script to check Firebase data structure
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRFMy76dN_i5jH8cJ8bqFGG0aDzHKSXgo",
  authDomain: "face-recognition-attendance-db.firebaseapp.com",
  projectId: "face-recognition-attendance-db",
  storageBucket: "face-recognition-attendance-db.firebasestorage.app",
  messagingSenderId: "134788138006",
  appId: "1:134788138006:web:9b6c5e4e8fe4a68c30cdb8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugClassData(classId) {
  try {
    console.log(`\n=== Debugging Class ${classId} ===`);
    
    // Check main class document
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      console.log('Class document does not exist');
      return;
    }
    
    const classData = classDoc.data();
    console.log('Class document data:');
    console.log(JSON.stringify(classData, null, 2));
    
    // Check if students subcollection exists
    const studentsCollectionRef = collection(db, 'classes', classId, 'students');
    const studentsSnapshot = await getDocs(studentsCollectionRef);
    
    console.log(`\nStudents subcollection has ${studentsSnapshot.size} documents:`);
    studentsSnapshot.forEach(doc => {
      console.log(`- ${doc.id}:`, doc.data());
    });
    
    // Check students array in main document
    const studentsArray = classData.students || [];
    console.log(`\nStudents array in main document has ${studentsArray.length} items:`);
    studentsArray.forEach((student, index) => {
      console.log(`- [${index}] ${student.id}: ${student.name}`);
    });
    
  } catch (error) {
    console.error('Error debugging class data:', error);
  }
}

// Call with your class ID
debugClassData('3DR02gf90PIP3VdjFJv4');