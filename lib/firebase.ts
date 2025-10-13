// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTF7q5yyPq7_KAeL9lb7xzp-fWoDIWFew",
  authDomain: "attendance-marke-5ab29.firebaseapp.com",
  projectId: "attendance-marke-5ab29",
  storageBucket: "attendance-marke-5ab29.firebasestorage.app",
  messagingSenderId: "37026612861",
  appId: "1:37026612861:web:a6b02f43b96bf82fe95314",
  measurementId: "G-S6H0T7NQVD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// For development - uncomment to use Firebase emulators
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectStorageEmulator(storage, 'localhost', 9199);
//   } catch (error) {
//     console.log('Emulator connection failed:', error);
//   }
// }

export { app };

// Firebase Auth functions (to be implemented)
/*
export const signInWithEmail = async (email: string, password: string) => {
  // return await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
  // return await signOut(auth);
};

export const getCurrentUser = () => {
  // return auth.currentUser;
};
*/

// Firestore functions (to be implemented)
/*
export const createClass = async (classData: Class) => {
  // return await addDoc(collection(db, 'classes'), classData);
};

export const getClasses = async (teacherEmail: string) => {
  // const q = query(collection(db, 'classes'), where('teacherEmail', '==', teacherEmail));
  // return await getDocs(q);
};

export const updateClass = async (classId: string, data: Partial<Class>) => {
  // return await updateDoc(doc(db, 'classes', classId), data);
};

export const deleteClass = async (classId: string) => {
  // return await deleteDoc(doc(db, 'classes', classId));
};
*/

// Storage functions (to be implemented)
/*
export const uploadStudentPhoto = async (file: File, studentId: string) => {
  // const storageRef = ref(storage, `students/${studentId}`);
  // return await uploadBytes(storageRef, file);
};

export const getStudentPhotoURL = async (studentId: string) => {
  // const storageRef = ref(storage, `students/${studentId}`);
  // return await getDownloadURL(storageRef);
};
*/