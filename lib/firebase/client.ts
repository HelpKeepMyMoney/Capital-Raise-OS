import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function trimEnv(v: string | undefined): string | undefined {
  const s = v?.trim();
  return s && s.length > 0 ? s : undefined;
}

function getFirebaseConfig() {
  return {
    apiKey: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };
}

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_* env vars");
  }
  app = initializeApp(cfg);
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}
