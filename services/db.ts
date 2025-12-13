import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  arrayUnion 
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
  try {
    const q = query(usersRef, where('department', '==', dept));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

/**
 * Verifies if the PIN matches the user's stored PIN.
 * Note: In a real high-security app, this should be a cloud function.
 * For this kiosk app, checking against the fetched user doc is acceptable.
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