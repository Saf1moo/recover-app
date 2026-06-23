import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyA6ycVMYBOlP9DAUZUSXT0ZyHlK1MlRFqg",
  authDomain: "recover-app-ad518.firebaseapp.com",
  projectId: "recover-app-ad518",
  storageBucket: "recover-app-ad518.firebasestorage.app",
  messagingSenderId: "547812458232",
  appId: "1:547812458232:web:b8b3dbb3fd421cfad9450d",
  measurementId: "G-TBN3ZL0TKG",
});

export const auth = getAuth(app);
export const db = getFirestore(app);
