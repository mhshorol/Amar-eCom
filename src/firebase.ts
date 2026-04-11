import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp, getDocFromServer, orderBy, writeBatch, arrayUnion, runTransaction, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Configuration check
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE";

let app: FirebaseApp;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
  app = { options: {} } as any;
  console.warn("Firebase configuration is missing. Please set up Firebase using the tool.");
}

// Initialize Firestore with long polling for better stability in some environments
let dbInstance: any = null;

export const getDb = () => {
  if (dbInstance) return dbInstance;
  
  if (!isFirebaseConfigured) return null;
  
  const dbId = firebaseConfig.firestoreDatabaseId;
  if (dbId) {
    try {
      dbInstance = initializeFirestore(app, { 
        experimentalForceLongPolling: true
      }, dbId);
      return dbInstance;
    } catch (e) {
      console.error("Failed to initialize named Firestore, falling back to default:", e);
    }
  }
  
  dbInstance = initializeFirestore(app, { 
    experimentalForceLongPolling: true
  });
  return dbInstance;
};

export const db = getDb();

export const auth = isFirebaseConfigured ? getAuth(app) : null as any;
export const storage = isFirebaseConfigured ? getStorage(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

// Secondary app for admin tasks (creating users without logging out)
export const getSecondaryAuth = () => {
  if (!isFirebaseConfigured) return null;
  const secondaryAppName = "SecondaryApp";
  const secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
};

// Test connection to Firestore
async function testConnection() {
  if (!isFirebaseConfigured) return;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    console.log(`Testing Firestore connection to database: ${dbId}...`);
    await getDocFromServer(doc(db, 'health_check', 'connection_test'));
    console.log(`Firestore connection to ${dbId} successful.`);
  } catch (error: any) {
    console.error(`Firestore connection test failed for ${dbId}:`, error.message);
    if (error.message?.includes('the client is offline')) {
      console.error(`CRITICAL: Firestore client is offline. This usually means the database ID (${dbId}) or project configuration is incorrect.`);
    } else if (error.code === 'not-found' || error.message?.includes('NOT_FOUND')) {
      console.error(`CRITICAL: Firestore database ${dbId} NOT FOUND. Please verify this database exists in the Firebase Console.`);
    }
  }
}
testConnection();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  orderBy,
  writeBatch,
  arrayUnion,
  runTransaction,
  limit,
  ref,
  uploadBytes,
  getDownloadURL
};
export type { User };
