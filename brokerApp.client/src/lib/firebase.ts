import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config with fallback defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC7LhlknLGXUwnkyfaJcQr1IbLa-iLVLxk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "broker-app-b3722.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "broker-app-b3722",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "broker-app-b3722.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "815027687386",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:815027687386:web:e1b5ac4a1269cbc896bae3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
