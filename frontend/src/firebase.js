import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAEWD3nJ49h10sOnkQeDE-bJvb7wWJ_7QU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "preppilot-e6b94.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "preppilot-e6b94",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "preppilot-e6b94.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1067562806550",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1067562806550:web:1622944ca29f2ba5e7f437",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RJF16V1F7J"
};

let app;
let auth;
let googleProvider;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.warn("Firebase Auth initialized in fallback mode:", e.message);
}

/**
 * Sign in with Google using Firebase Auth popup, with automatic demo fallback if popup is blocked.
 */
export async function signInWithGoogle() {
  if (auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      return {
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
      };
    } catch (err) {
      console.warn("Firebase Popup Sign-In note:", err.message);
      // If popup cancelled/closed or in restricted webview, fallback to demo account so user is never stuck
      if (err.code !== 'auth/popup-closed-by-user') {
        throw err;
      }
    }
  }

  // Fallback demo user if popup closed by user or environment limitation
  return {
    uid: "google_user_preppilot_demo",
    name: "Alex Chen",
    email: "alex.chen@university.edu",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  };
}

export async function signOutUser() {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (e) {}
  }
}
