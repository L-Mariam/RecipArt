import * as firebaseApp from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Real Production Config
const firebaseConfig = {
  apiKey: "AIzaSyArhup8TH0E6McLXGNSMciXKE63Zb0wg-I",
  authDomain: "recipart.firebaseapp.com",
  projectId: "recipart",
  storageBucket: "recipart.firebasestorage.app",
  messagingSenderId: "167300628754",
  appId: "1:167300628754:web:98493d411e1e571e7533cb",
  measurementId: "G-69BPKVYYCK"
};

let app;
let storage;
let db;
let auth;
let googleProvider;

try {
    // Cast firebaseApp to any to avoid TypeScript errors if typings are mismatched
    const fb = firebaseApp as any;

    // Prevent duplicate initialization which can happen in development/HMR
    if (fb.getApps && fb.getApps().length > 0) {
        app = fb.getApp();
    } else {
        app = fb.initializeApp(firebaseConfig);
    }
    
    storage = getStorage(app);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
} catch (e) {
    console.warn("Firebase initialization failed:", e);
}

export { app, storage, db, auth, googleProvider };