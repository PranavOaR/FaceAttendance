import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCTF7q5yyPq7_KAeL9lb7xzp-fWoDIWFew",
  authDomain: "attendance-marke-5ab29.firebaseapp.com",
  projectId: "attendance-marke-5ab29",
  storageBucket: "attendance-marke-5ab29.firebasestorage.app",
  messagingSenderId: "37026612861",
  appId: "1:37026612861:web:a6b02f43b96bf82fe95314",
  measurementId: "G-S6H0T7NQVD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };
