import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace these with your actual Firebase config from the console


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
