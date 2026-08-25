// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCu8atStx9y0CqyN-hokaEfwNDeyybaNW0",
  authDomain: "up-probaseball.firebaseapp.com",
  projectId: "up-probaseball",
  storageBucket: "up-probaseball.firebasestorage.app",
  messagingSenderId: "1003764482438",
  appId: "1:1003764482438:web:294e29137883ada1f96c07",
  measurementId: "G-0KKVYQSRK7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
