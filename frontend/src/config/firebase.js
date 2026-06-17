// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCTvLvFyIKMt88ux1kH_3SItU0n99Q4JFk",
  authDomain: "vrindavan-resto-cafe.firebaseapp.com",
  projectId: "vrindavan-resto-cafe",
  storageBucket: "vrindavan-resto-cafe.firebasestorage.app",
  messagingSenderId: "431646385369",
  appId: "1:431646385369:web:1c731b82e32dc12627cac8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
