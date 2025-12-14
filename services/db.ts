
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
  arrayRemove, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DepartmentType, Course, Task, Issue, Category, CareerPath, FeedPost } from '../types';

// Collection References
const usersRef = collection(db, 'users');
const coursesRef = collection(db, 'courses');
const postsRef = collection(db, 'posts');
const categoriesRef = collection(db, 'categories');
const tasksRef = collection(db, 'tasks');
const issuesRef = collection(db, 'issues');
const careerPathsRef = collection(db, 'careerPaths');

/**
 * Fetches all users belonging to a specific department.
 */
export const getUsersByDepartment = async (dept: DepartmentType): Promise<User[]> => {
  try {
    const q = query(usersRef, where('department', '==', dept));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn("⚠️ Warning: No users found.");
    }

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data } as User;
    });

    return users;

  } catch (error: any) {
    console.error("❌ FIREBASE ERROR:", error);
    return [];
  }
};

/**
 * Fetches all available courses.
 */
export const getCourses = async (): Promise<Course[]> => {
  try {
    const snapshot = await getDocs(coursesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
};

/**
 * --- HOTELGRAM FEED FUNCTIONS ---
 */

export const createPost = async (post: Omit<FeedPost, 'id'>) => {
    try {
        await addDoc(postsRef, post);
        return true;
    } catch (e) {
        console.error("Error creating post", e);
        return false;
    }
};

export const getFeedPosts = async (userDept: DepartmentType): Promise<FeedPost[]> => {
    try {
        // TEMPORARY FIX: Avoid "Missing Index" error by removing orderBy('createdAt') from Firestore query.
        // We fetch posts for the department and sort them client-side.
        // To re-enable server-side sorting, create a composite index in Firebase Console: 
        // Collection: posts, Fields: targetDepartments (Arrays), createdAt (Descending)
        
        const q = query(
            postsRef, 
            where('targetDepartments', 'array-contains', userDept)
        );
        
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
        
        // Client-side sort: Newest first
        return posts.sort((a,b) => b.createdAt - a.createdAt);
    } catch (e) {
        console.warn("Feed Fetch Error:", e);
        return [];
    }
};

export const togglePostLike = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const postRef = doc(db, 'posts', postId);
        if (isLiked) {
            // Unlike
            await updateDoc(postRef, {
                likes: increment(-1),
                likedBy: arrayRemove(userId)
            });
        } else {
            // Like
            await updateDoc(postRef, {
                likes: increment(1),
                likedBy: arrayUnion(userId)
            });
        }
    } catch (e) {
        console.error("Like error", e);
    }
};

/**
 * Fetches all course categories.
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

/**
 * Fetches daily tasks for a specific department.
 */
export const getDailyTasks = async (dept: DepartmentType): Promise<Task[]> => {
  try {
    const q = query(tasksRef, where('department', '==', dept));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

/**
 * Marks a daily task as complete for a user and awards XP.
 */
export const completeTask = async (userId: string, taskId: string, xpReward: number) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      xp: increment(xpReward),
      completedTasks: arrayUnion(taskId)
    });
    console.log(`Task ${taskId} completed by ${userId}. +${xpReward} XP`);
  } catch (error) {
    console.error("Error completing task:", error);
  }
};

/**
 * Submits a new issue report.
 */
export const createIssue = async (issue: Issue): Promise<boolean> => {
  try {
    await addDoc(issuesRef, issue);
    
    // Give XP to reporter
    const userDocRef = doc(db, 'users', issue.userId);
    await updateDoc(userDocRef, {
        xp: increment(50) // Fixed reward for reporting
    });
    
    return true;
  } catch (error) {
    console.error("Error creating issue:", error);
    return false;
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
 */
export const subscribeToLeaderboard = (dept: DepartmentType, callback: (users: User[]) => void) => {
  const q = query(
    usersRef, 
    where('department', '==', dept)
  );

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    // Client-side sort: Descending XP
    const topUsers = users.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
    callback(topUsers);
  });
};

/**
 * --- CAREER PATH FUNCTIONS ---
 */

export const createCareerPath = async (path: Omit<CareerPath, 'id'>) => {
    try {
        await addDoc(careerPathsRef, path);
        return true;
    } catch (e) {
        console.error("Error creating career path", e);
        return false;
    }
};

export const getCareerPaths = async (): Promise<CareerPath[]> => {
    try {
        const snapshot = await getDocs(careerPathsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareerPath));
    } catch (e) {
        console.error("Error fetching career paths", e);
        return [];
    }
};

export const getCareerPath = async (id: string): Promise<CareerPath | null> => {
    try {
        const docRef = doc(db, 'careerPaths', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as CareerPath;
        return null;
    } catch (e) {
        console.error("Error fetching career path", e);
        return null;
    }
};

/**
 * New function to automatically find a path for the user's department
 * eliminating the need for manual assignment.
 */
export const getCareerPathByDepartment = async (dept: DepartmentType): Promise<CareerPath | null> => {
    try {
        const q = query(careerPathsRef, where('department', '==', dept));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            // Return the first found path for this department
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CareerPath;
        }
        return null;
    } catch (e) {
        console.error("Error finding dept path", e);
        return null;
    }
};

export const assignCareerPath = async (userId: string, pathId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            assignedPathId: pathId
        });
        return true;
    } catch (e) {
        console.error("Error assigning path", e);
        return false;
    }
};
