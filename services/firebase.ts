import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with actual Firebase configuration from console
const firebaseConfig = {
  apiKey: "AIzaSyAHOcLD07PZ-Qv7QNmoBRi7Ml4Z5eOQRuU",
  authDomain: "hotel-academy-14515.firebaseapp.com",
  projectId: "hotel-academy-14515",
  storageBucket: "hotel-academy-14515.firebasestorage.app",
  messagingSenderId: "425397024826",
  appId: "1:425397024826:web:1659911adf1986eca6dd03"
};

// Initialize Firebase only if config is valid (prevent crash in demo)
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;