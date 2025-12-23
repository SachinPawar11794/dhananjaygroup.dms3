import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// The frontend must supply Firebase config at runtime via a global:
// window.FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", ... }
// This lets the same build work across environments.
const firebaseConfig = (typeof window !== 'undefined' && window.FIREBASE_CONFIG) ? window.FIREBASE_CONFIG : null;

let firebaseAuth = null;
if (firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
  // Enable persistence/other settings can be configured by the consuming code
}

// Expose firebaseAuth on window for other modules/util helpers to access easily.
if (typeof window !== 'undefined') {
  try {
    window.firebaseAuth = firebaseAuth;
  } catch {
    // ignore if we cannot set window properties in some environments
  }
}

export { firebaseAuth };


