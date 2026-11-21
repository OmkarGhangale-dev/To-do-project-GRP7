import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signOut,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const cleanApiKey = rawApiKey.replace(/^["']|["']$/g, '').trim();

const firebaseConfig = {
  apiKey: cleanApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'taskflow-grp7.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'taskflow-grp7',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'taskflow-grp7.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export const isFirebaseConfigured = Boolean(
  cleanApiKey &&
  cleanApiKey !== 'AIzaSyDummyKeyForDevelopment123456789'
);

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase client SDK initialization warning:', err);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, googleProvider };

/**
 * Retrieve a fresh Firebase ID token using the authenticated user's getIdToken() method.
 * Automatically handles token expiration and token refresh.
 */
export const getFreshIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  try {
    if (auth?.currentUser) {
      const idToken = await auth.currentUser.getIdToken(forceRefresh);
      if (idToken) {
        localStorage.setItem('taskflow_auth_token_v3', idToken);
        return idToken;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve fresh Firebase ID token from currentUser:', err);
  }
  return localStorage.getItem('taskflow_auth_token_v3');
};

/**
 * Subscribe to Firebase Auth state changes
 */
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = async (): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error(
      'Firebase client is not configured yet. Please check VITE_FIREBASE_API_KEY in frontend/.env.'
    );
  }
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken(true);
  localStorage.setItem('taskflow_auth_token_v3', idToken);
  return { idToken, user: result.user };
};

export const signInEmail = async (email: string, pass: string): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase client is not initialized.');
  }
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const idToken = await cred.user.getIdToken(true);
  localStorage.setItem('taskflow_auth_token_v3', idToken);
  return { idToken, user: cred.user };
};

export const registerEmail = async (name: string, email: string, pass: string): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase client is not initialized.');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateFirebaseProfile(cred.user, { displayName: name });
  const idToken = await cred.user.getIdToken(true);
  localStorage.setItem('taskflow_auth_token_v3', idToken);
  return { idToken, user: cred.user };
};

export const signInWithCustomToken = async (customToken: string): Promise<{ idToken: string; user: FirebaseUser }> => {
  if (!auth) {
    throw new Error('Firebase client is not initialized.');
  }
  const cred = await firebaseSignInWithCustomToken(auth, customToken);
  const idToken = await cred.user.getIdToken(true);
  localStorage.setItem('taskflow_auth_token_v3', idToken);
  return { idToken, user: cred.user };
};

export const firebaseLogout = async (): Promise<void> => {
  localStorage.removeItem('taskflow_auth_token_v3');
  if (auth) {
    await signOut(auth).catch(() => {});
  }
};
