
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
  limit,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DepartmentType, Course, Task, Issue, Category, CareerPath, FeedPost, KudosType } from '../types';

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
 * Update general user profile information.
 */
export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, data);
        return true;
    } catch (e) {
        console.error("Error updating profile", e);
        return false;
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

/**
 * Sends Kudos to a user.
 * 1. Creates a FeedPost.
 * 2. Updates the Recipient's XP (+250) and Badges array atomically.
 */
export const sendKudos = async (
    sender: User,
    recipientId: string,
    recipientName: string,
    recipientAvatar: string,
    badgeType: KudosType,
    message: string
): Promise<boolean> => {
    try {
        const xpReward = 250;

        await runTransaction(db, async (transaction) => {
            // 1. Get Recipient User Ref
            const recipientRef = doc(db, 'users', recipientId);
            const recipientDoc = await transaction.get(recipientRef);
            
            if (!recipientDoc.exists()) {
                throw new Error("Recipient user does not exist!");
            }

            const recipientData = recipientDoc.data() as User;
            const currentBadges = recipientData.badges || [];
            
            // 2. Update Badges Logic
            const badgeIndex = currentBadges.findIndex(b => b.type === badgeType);
            let newBadges = [...currentBadges];
            
            if (badgeIndex > -1) {
                // Increment count
                newBadges[badgeIndex] = {
                    ...newBadges[badgeIndex],
                    count: newBadges[badgeIndex].count + 1,
                    lastReceivedAt: Date.now()
                };
            } else {
                // Add new badge
                newBadges.push({
                    type: badgeType,
                    count: 1,
                    lastReceivedAt: Date.now()
                });
            }

            // 3. Update User Doc
            transaction.update(recipientRef, {
                xp: increment(xpReward),
                badges: newBadges
            });

            // 4. Create Feed Post (Note: Transaction mainly for user data consistency, 
            // but we can create the post reference here too, though addDoc is cleaner outside.
            // For simplicity in this demo, we'll do the post creation after transaction or separate, 
            // but strictly atomic would mean creating a doc ref and setting it in transaction.)
            
            const newPostRef = doc(collection(db, 'posts'));
            const newPost: Omit<FeedPost, 'id'> = {
                authorId: sender.id,
                authorName: sender.name,
                authorAvatar: sender.avatar,
                assignmentType: 'GLOBAL', // Kudos are public celebrations!
                targetDepartments: ['housekeeping', 'kitchen', 'front_office', 'management'],
                priority: 'NORMAL',
                type: 'kudos',
                caption: message,
                likes: 0,
                createdAt: Date.now(),
                likedBy: [],
                kudosData: {
                    recipientId,
                    recipientName,
                    recipientAvatar,
                    badgeType
                }
            };
            
            transaction.set(newPostRef, newPost);
        });

        console.log(`Kudos sent from ${sender.name} to ${recipientName}`);
        return true;

    } catch (e) {
        console.error("Error sending kudos:", e);
        return false;
    }
};

/**
 * Alias for createPost to support legacy calls if any, or specific interactive logic
 */
export const createInteractivePost = async (post: Omit<FeedPost, 'id'>) => {
    return createPost(post);
};

export const getFeedPosts = async (userDept: DepartmentType): Promise<FeedPost[]> => {
    try {
        // Fetch posts for department OR global
        // Simple implementation: Client side filtering for demo if composite indexes missing
        // In prod: array-contains-any ['GLOBAL', userDept]
        
        const q = query(
            postsRef, 
            // We fetch slightly more to filter client side for better 'mixed' results in this demo structure
            limit(50) 
        );
        
        const snapshot = await getDocs(q);
        const posts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as FeedPost))
            .filter(p => p.assignmentType === 'GLOBAL' || p.targetDepartments?.includes(userDept));
        
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
 * Marks a course as "Started" in user profile.
 */
export const startCourse = async (userId: string, courseId: string) => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            startedCourses: arrayUnion(courseId)
        });
        console.log(`Course ${courseId} started by ${userId}`);
    } catch (e) {
        console.error("Error starting course:", e);
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
