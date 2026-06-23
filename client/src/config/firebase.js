import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app;
let auth;
let googleProvider;

// Check which specific config values are missing
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigStatus = {
  isConfigured: missingKeys.length === 0,
  missingKeys,
};

if (firebaseConfigStatus.isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} else {
  console.error(
    `⚠️ Firebase is NOT configured. Missing env variables:\n${missingKeys
      .map((k) => `  - VITE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
      .join('\n')}\n\nCreate a .env file in the client/ directory with these values from your Firebase Console.`
  );
}

export { app as default, auth, googleProvider };
