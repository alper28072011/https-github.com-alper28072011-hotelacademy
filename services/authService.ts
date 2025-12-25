
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db } from './firebase';
import { User } from '../types';

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
};

export const loginUser = async (identifier: string, password: string): Promise<User> => {
  let email = identifier.trim();

  // 1. Resolve Username to Email if needed
  if (!email.includes('@')) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', identifier.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Kullanici adi bulunamadi.");
    }
    
    email = snapshot.docs[0].data().email;
  }

  // 2. Attempt Authentication
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // 3. Fetch User Profile
  const userDoc = await getDoc(doc(db, 'users', uid));
  
  // --- AUTO-HEAL MECHANISM (ZOMBIE ACCOUNT RECOVERY) ---
  // Fixes the issue where a user exists in Auth but not in Firestore (e.g. after a bad delete)
  if (!userDoc.exists()) {
    console.warn("User authenticated but profile missing. Initiating auto-recovery...");
    
    // Construct a fresh profile based on Auth data
    const recoveredUser: Omit<User, 'id'> = {
        email: userCredential.user.email || email,
        username: (userCredential.user.email || email).split('@')[0] + Math.floor(Math.random() * 1000),
        name: userCredential.user.displayName || 'Recovered User',
        phoneNumber: '',
        avatar: 'RU', // Recovered User initials
        currentOrganizationId: null,
        department: null,
        role: 'staff',
        status: 'ACTIVE',
        xp: 0,
        creatorLevel: 'NOVICE',
        reputationPoints: 0,
        joinDate: Date.now(),
        organizationHistory: [],
        completedCourses: [],
        startedCourses: [],
        savedCourses: [],
        completedTasks: [],
        followersCount: 0,
        followingCount: 0,
        joinedPageIds: [],
        followedTags: [],
        managedPageIds: [],
        channelSubscriptions: [],
        pageRoles: {},
        isPrivate: false,
        primaryNetworkId: null,
        primaryNetworkRole: 'MEMBER',
        targetCareerPathId: null
    };

    // Save the recovered profile
    await setDoc(doc(db, 'users', uid), recoveredUser);
    
    // Return with ID
    return { id: uid, ...recoveredUser };
  }

  const userData = userDoc.data() as User;

  // 4. Update Metadata
  updateDoc(doc(db, 'users', uid), {
    'metadata.lastLoginAt': Date.now(),
    'metadata.loginCount': increment(1)
  }).catch(e => console.error("Metadata update error", e));

  return { id: uid, ...userData };
};

export const registerUser = async (data: {
  email: string;
  password: string;
  username: string;
  name: string;
}): Promise<User> => {
  const isAvailable = await checkUsernameAvailability(data.username);
  if (!isAvailable) {
    throw new Error("Bu kullanici adi zaten alinmis.");
  }

  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const uid = userCredential.user.uid;

  await updateProfile(userCredential.user, {
    displayName: data.name
  });

  const avatarInitials = data.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  
  const newUser: Omit<User, 'id'> = {
    email: data.email.toLowerCase(),
    username: data.username.toLowerCase().trim(),
    name: data.name,
    phoneNumber: '',
    avatar: avatarInitials,
    currentOrganizationId: null,
    department: null,
    role: 'staff',
    status: 'ACTIVE',
    xp: 0,
    creatorLevel: 'NOVICE',
    reputationPoints: 0,
    joinDate: Date.now(),
    organizationHistory: [],
    completedCourses: [],
    startedCourses: [],
    savedCourses: [],
    completedTasks: [],
    followersCount: 0,
    followingCount: 0,
    joinedPageIds: [],
    followedTags: [],
    managedPageIds: [],
    channelSubscriptions: [],
    pageRoles: {},
    isPrivate: false,
    primaryNetworkId: null,
    primaryNetworkRole: 'MEMBER',
    targetCareerPathId: null
  };

  await setDoc(doc(db, 'users', uid), newUser);

  return { id: uid, ...newUser };
};

export const logoutUser = async () => {
  await signOut(auth);
};