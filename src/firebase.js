import firebaseConfig from './firebase-config.js';

import {
  initializeApp,
  getApp,
  getApps
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';

import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

function looksConfigured(value) {
  return typeof value === 'string' && value.length > 0 && value.indexOf('YOUR_') !== 0;
}

const isFirebaseConfigured = Object.keys(firebaseConfig).every(function(key) {
  return looksConfigured(firebaseConfig[key]);
});

const app = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export {
  addDoc,
  app,
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  isFirebaseConfigured,
  onAuthStateChanged,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  updateProfile,
  writeBatch
};
