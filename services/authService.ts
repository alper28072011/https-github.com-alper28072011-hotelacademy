
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signOut, signInWithPhoneNumber, ApplicationVerifier } from 'firebase/auth';
import { auth, db } from './firebase';
import { User, UserRole, AuthMode } from '../types';

/**
 * Checks if a user profile exists in Firestore for the given phone number.
 */
export const checkUserExists = async (phoneNumber: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error checking user:", error);
    return null;
  }
};

/**
 * Smart OTP Sender:
 * 1. Checks if user exists in DB.
 * 2. If Mode=LOGIN and User=NULL -> Error (Don't send SMS).
 * 3. If Mode=REGISTER and User=EXISTS -> Error (Don't send SMS).
 * 4. Sends SMS only if logic passes.
 */
export const initiatePhoneAuth = async (
    phoneNumber: string, 
    mode: AuthMode, 
    verifier: ApplicationVerifier
) => {
    // 1. Check DB first (Cheap & Safe)
    const existingUser = await checkUserExists(phoneNumber);

    // 2. Logic Gates
    if (mode === 'LOGIN' && !existingUser) {
        throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (mode === 'REGISTER' && existingUser) {
        throw new Error("ACCOUNT_EXISTS");
    }

    // 3. Send SMS (Costly)
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

/**
 * Registers a new user in Firestore.
 */
export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  try {
    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, userData);
    return { id: docRef.id, ...userData };
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

/**
 * Standard Sign Out
 */
export const logoutUser = async () => {
    await signOut(auth);
};
