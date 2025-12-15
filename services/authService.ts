
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { signOut, signInWithPhoneNumber, ApplicationVerifier } from 'firebase/auth';
import { auth, db } from './firebase';
import { User, UserRole, AuthMode } from '../types';

const SUPER_ADMIN_PHONE = '+905417726743';

/**
 * Checks if a user profile exists in Firestore.
 * GATEKEEPER LOGIC: 
 * 1. Enforces Super Admin privileges for specific phone number.
 * 2. Checks if user is BANNED.
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

      // --- SECURITY CHECK: BANNED USERS ---
      if (userData.status === 'BANNED' || userData.status === 'SUSPENDED') {
          throw new Error("ACCOUNT_BANNED");
      }

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

      // --- UPDATE METADATA (Async) ---
      updateDoc(doc(db, 'users', userId), {
          'metadata.lastLoginAt': Date.now(),
          'metadata.loginCount': increment(1)
      }).catch(e => console.log("Metadata update silent fail", e));

      return { id: userId, ...userData };
    }
    return null;
  } catch (error: any) {
    if (error.message === 'ACCOUNT_BANNED') throw error;
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
    try {
        const existingUser = await checkUserExists(phoneNumber);

        // 2. Logic Gates
        if (mode === 'LOGIN' && !existingUser) {
            throw new Error("ACCOUNT_NOT_FOUND");
        }

        if (mode === 'REGISTER' && existingUser) {
            throw new Error("ACCOUNT_EXISTS");
        }
    } catch (e: any) {
        if (e.message === 'ACCOUNT_BANNED') {
            throw new Error("Hesabınız askıya alınmıştır. Lütfen yönetimle iletişime geçin.");
        }
        throw e;
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

    // Set Default Metadata
    const finalData = {
        ...userData,
        status: 'ACTIVE',
        joinDate: Date.now(),
        metadata: {
            lastLoginAt: Date.now(),
            loginCount: 1,
            deviceInfo: navigator.userAgent
        }
    };

    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, finalData);
    return { id: docRef.id, ...finalData as User };
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
