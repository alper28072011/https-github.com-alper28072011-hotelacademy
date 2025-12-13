import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

/**
 * Authenticates user via Firebase Auth and fetches their profile from Firestore.
 * NOTE: In a production app, the Firestore ID usually matches the Auth UID.
 * Here, we query by email to link them for the demo seeding to work easily.
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
      // User authenticated but no profile found in Firestore
      throw new Error("No user profile found for this account.");
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;

    return { ...userData, id: userDoc.id };

  } catch (error: any) {
    console.error("Login Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
    await signOut(auth);
};