
// Firebase Core
import { initializeApp, getApps, getApp } from "firebase/app";

// Firebase Auth
import { getAuth } from "firebase/auth";

// Firestore
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

// Storage
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";


// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAgWE_JutmLJmgIQihIcMl-wHSoNxOYHfY",
  authDomain: "vistara-d6dea.firebaseapp.com",
  projectId: "vistara-d6dea",
  storageBucket: "vistara-d6dea.firebasestorage.app",
  messagingSenderId: "699528287728",
  appId: "1:699528287728:web:197f51eedca7f4f058b935",
  measurementId: "G-4GNTMKC2YL"
};


// Prevent duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();


// Firebase Auth
export const auth = getAuth(app);


// Firestore
export const db = getFirestore(app);


// Storage
export const storage = getStorage(app);


// Export Storage utils
export { ref, uploadBytes, getDownloadURL };


// Export Firestore utils
export {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy
};


// Export default app
export default app;