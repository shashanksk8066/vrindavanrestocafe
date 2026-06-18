// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAM6P3Mdq4tB-9DbpspIgEEEm8ZU2b008s",
  authDomain: "vrindavan-9a9aa.firebaseapp.com",
  databaseURL: "https://vrindavan-9a9aa-default-rtdb.firebaseio.com",
  projectId: "vrindavan-9a9aa",
  storageBucket: "vrindavan-9a9aa.firebasestorage.app",
  messagingSenderId: "579743050125",
  appId: "1:579743050125:web:0a2565473c5673f4e2f5c4",
  measurementId: "G-PTDG2ZC4W9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
