import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace these with your actual Firebase config from the console
const firebaseConfig = {

  apiKey: "AIzaSyC7LhlknLGXUwnkyfaJcQr1IbLa-iLVLxk",
  authDomain: "broker-app-b3722.firebaseapp.com",
  projectId: "broker-app-b3722",
  storageBucket: "broker-app-b3722.firebasestorage.app",
  messagingSenderId: "815027687386",
  appId: "1:815027687386:web:e1b5ac4a1269cbc896bae3"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
