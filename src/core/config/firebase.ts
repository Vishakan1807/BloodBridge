import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'bloodbridge-mock.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://bloodbridge-mock-default-rtdb.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bloodbridge-mock',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'bloodbridge-mock.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.warn('Firebase init warning:', e);
}

export const auth = getAuth(app);
export const db   = getDatabase(app);
export default app;
