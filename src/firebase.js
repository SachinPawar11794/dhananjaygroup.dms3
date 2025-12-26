import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

// Initialize Firebase app and export commonly used services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;


