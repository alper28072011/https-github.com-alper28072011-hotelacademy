
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

/**
 * Kullanıcı adının müsaitlik durumunu kontrol eder.
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
};

/**
 * Hibrit Giriş Sistemi: Identifier e-posta mı yoksa kullanıcı adı mı tespit eder.
 */
export const loginUser = async (identifier: string, password: string): Promise<User> => {
  let email = identifier.trim();

  // E-posta formatında değilse (identifier içinde @ yoksa) kullanıcı adıdır.
  if (!email.includes('@')) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', identifier.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Kullanıcı adı bulunamadı.");
    }
    
    email = snapshot.docs[0].data().email;
  }

  // Firebase Auth ile giriş yap
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // Firestore'dan profil verilerini çek
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error("Kullanıcı profili eksik.");
  }

  const userData = userDoc.data() as User;

  // Metadata güncelleme
  updateDoc(doc(db, 'users', uid), {
    'metadata.lastLoginAt': Date.now(),
    'metadata.loginCount': increment(1)
  }).catch(e => console.error("Metadata update error", e));

  return { id: uid, ...userData };
};

/**
 * Yeni Kullanıcı Kaydı
 */
export const registerUser = async (data: {
  email: string;
  password: string;
  username: string;
  name: string;
}): Promise<User> => {
  // 1. Kullanıcı adı kontrolü
  const isAvailable = await checkUsernameAvailability(data.username);
  if (!isAvailable) {
    throw new Error("Bu kullanıcı adı zaten alınmış.");
  }

  // 2. Firebase Auth hesabı oluştur
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const uid = userCredential.user.uid;

  // 3. Auth profilini güncelle
  await updateProfile(userCredential.user, {
    displayName: data.name
  });

  // 4. Firestore dökümanını hazırla
  const avatarInitials = data.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  
  const newUser: Omit<User, 'id'> = {
    email: data.email.toLowerCase(),
    username: data.username.toLowerCase().trim(),
    name: data.name,
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
    followingCount: 0
  };

  await setDoc(doc(db, 'users', uid), newUser);

  return { id: uid, ...newUser };
};

export const logoutUser = async () => {
  await signOut(auth);
};
