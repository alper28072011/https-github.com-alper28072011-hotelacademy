import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  arrayUnion,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DepartmentType, Course } from '../types';

// Collection References
const usersRef = collection(db, 'users');
const coursesRef = collection(db, 'courses');

/**
 * Fetches all users belonging to a specific department.
 */
export const getUsersByDepartment = async (dept: DepartmentType): Promise<User[]> => {
  console.group(`🔥 DB: getUsersByDepartment -> '${dept}'`);
  try {
    const q = query(usersRef, where('department', '==', dept));
    const snapshot = await getDocs(q);
    
    console.log(`✅ Success: Found ${snapshot.size} documents.`);
    
    if (snapshot.empty) {
      console.warn("⚠️ Warning: No users found. Check if 'users' collection exists and 'department' fields match exactly.");
    }

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      // Log individual user data mapping for debugging
      // console.log(`   - User: ${data.name} (${doc.id})`);
      return { id: doc.id, ...data } as User;
    });

    console.groupEnd();
    return users;

  } catch (error: any) {
    console.error("❌ FIREBASE ERROR:", error);
    
    if (error.code === 'permission-denied') {
      console.error("🚨 PERMISSION DENIED: Please check your Firestore Security Rules in Firebase Console.");
      console.error("Fix: Set rules to 'allow read, write: if true;' for development.");
    }
    
    console.groupEnd();
    return [];
  }
};

/**
 * Verifies if the PIN matches the user's stored PIN.
 */
export const verifyUserPin = async (userId: string, enteredPin: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.pin === enteredPin;
    }
    return false;
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return false;
  }
};

/**
 * Fetches a course by its ID.
 */
export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const courseDocRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseDocRef);
    
    if (courseSnap.exists()) {
      return { id: courseSnap.id, ...courseSnap.data() } as Course;
    }
    return null;
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
};

/**
 * Updates user progress after completing a course.
 */
export const updateUserProgress = async (userId: string, courseId: string, earnedXp: number) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      xp: increment(earnedXp),
      completedCourses: arrayUnion(courseId)
    });
    console.log(`User ${userId} earned ${earnedXp} XP`);
  } catch (error) {
    console.error("Error updating progress:", error);
  }
};

/**
 * Subscribes to real-time updates for a specific user.
 * Returns an unsubscribe function.
 */
export const subscribeToUser = (userId: string, callback: (user: User) => void) => {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as User);
    }
  });
};

/**
 * Subscribes to the leaderboard for a specific department.
 * Returns top 5 users sorted by XP.
 */
export const subscribeToLeaderboard = (dept: DepartmentType, callback: (users: User[]) => void) => {
  const q = query(
    usersRef, 
    where('department', '==', dept),
    orderBy('xp', 'desc'),
    limit(5)
  );

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    callback(users);
  });
};