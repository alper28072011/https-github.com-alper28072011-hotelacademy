
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, signInWithPhoneNumber, ApplicationVerifier } from 'firebase/auth';
import { auth, db } from './firebase';
import { User, UserRole, AuthMode } from '../types';

const SUPER_ADMIN_PHONE = '+905417726743';

/**
 * Checks if a user profile exists in Firestore.
 * GATEKEEPER LOGIC: Enforces Super Admin privileges for specific phone number.
 */
export const checkUserExists = async (phoneNumber: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;
      const userId = userDoc.id;

      // --- GATEKEEPER PROTOCOL ---
      // If this is the Master Number, FORCE super_admin role locally and update DB if needed.
      if (phoneNumber.replace(/\s/g, '') === SUPER_ADMIN_PHONE) {
          userData.role = 'super_admin';
          userData.isSuperAdmin = true;
          
          // Background sync to ensure DB stays correct
          if (userDoc.data().role !== 'super_admin') {
              updateDoc(doc(db, 'users', userId), { role: 'super_admin', isSuperAdmin: true });
          }
      }

      return { id: userId, ...userData };
    }
    return null;
  } catch (error) {
    console.error("Error checking user:", error);
    return null;
  }
};

/**
 * Smart OTP Sender
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
    // --- GATEKEEPER PROTOCOL FOR REGISTRATION ---
    if (userData.phoneNumber.replace(/\s/g, '') === SUPER_ADMIN_PHONE) {
        userData.role = 'super_admin';
        userData.isSuperAdmin = true;
    }

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
