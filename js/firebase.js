
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";


// 🔥 STEP 1: PASTE YOUR REAL FIREBASE CONFIG HERE (ONLY THIS PART CHANGE)
const firebaseConfig = {
  apiKey: "AIzaSyAzjEuRDmOzoHIPVscvw742PDZqV0_mi3A",
  authDomain: "arjunsalon-9faa6.firebaseapp.com",
  projectId: "arjunsalon-9faa6",
  storageBucket: "arjunsalon-9faa6.firebasestorage.app",
  messagingSenderId: "848843749984",
  appId: "1:848843749984:web:6a727fda149c7dca88a105",
  measurementId: "G-0ZK5Z8Q4C1"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();


// Export everything
export {
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  googleProvider,
  signInWithPopup,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};