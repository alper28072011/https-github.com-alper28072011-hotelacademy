import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

/**
 * Authenticates user via Firebase Auth and fetches their profile from Firestore.
 */
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    // 1. Authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 2. Find the corresponding User document in Firestore by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // FALLBACK: If Auth succeeded but Firestore profile is missing for the specific admin email,
      // create it automatically. This fixes the "Manual Console User" sync issue.
      if (email === 'admin@hotelacademy.com') {
          console.warn("⚠️ Admin profile missing in Firestore. Auto-creating...");
          
          const newAdmin: Omit<User, 'id'> = {
              name: 'System Admin',
              email: email,
              avatar: 'AD',
              department: 'management',
              role: 'admin',
              pin: '9999',
              xp: 9999,
              completedCourses: [],
              completedTasks: []
          };
          
          const docRef = await addDoc(usersRef, newAdmin);
          return { ...newAdmin, id: docRef.id };
      }

      // User authenticated but no profile found in Firestore (and not the main admin)
      throw new Error("AUTH_SUCCESS_BUT_NO_PROFILE");
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;

    return { ...userData, id: userDoc.id };

  } catch (error: any) {
    console.error("Login Service Error:", error.code || error.message);
    throw error;
  }
};

export const logoutUser = async () => {
    await signOut(auth);
};