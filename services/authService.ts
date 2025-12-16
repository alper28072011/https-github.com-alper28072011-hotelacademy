
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { signOut, signInWithPhoneNumber, ApplicationVerifier, deleteUser } from 'firebase/auth';
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
 * UPDATED: Department is now optional and defaults to null.
 */
export const registerUser = async (userData: Omit<User, 'id' | 'department' | 'role' | 'pin' | 'currentOrganizationId' | 'organizationHistory' | 'xp' | 'completedCourses' | 'startedCourses' | 'completedTasks' | 'badges'>): Promise<User> => {
  try {
    const role = userData.phoneNumber.replace(/\s/g, '') === SUPER_ADMIN_PHONE ? 'super_admin' : 'staff';
    
    // Set Default Metadata & Privacy
    const finalData: Omit<User, 'id'> = {
        ...userData,
        role,
        department: null, // Default
        currentOrganizationId: null,
        organizationHistory: [],
        pin: '1234',
        xp: 0,
        completedCourses: [],
        startedCourses: [],
        completedTasks: [],
        badges: [],
        isSuperAdmin: role === 'super_admin',
        
        status: 'ACTIVE',
        joinDate: Date.now(),
        metadata: {
            lastLoginAt: Date.now(),
            loginCount: 1,
            deviceInfo: navigator.userAgent
        },
        privacySettings: {
            showInSearch: true,
            allowTagging: true,
            isPrivateAccount: false
        }
    };

    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, finalData);
    return { id: docRef.id, ...finalData };
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

/**
 * Self-Destruct: Deletes DB record AND Auth Account
 */
export const deleteAccount = async (userId: string) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user");

        // 1. Delete from Firestore
        await deleteDoc(doc(db, 'users', userId));

        // 2. Delete from Firebase Auth
        await deleteUser(user);
        
        return true;
    } catch (error) {
        console.error("Self Destruct Error:", error);
        throw error;
    }
};
