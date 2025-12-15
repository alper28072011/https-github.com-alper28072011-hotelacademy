
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
  runTransaction,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DepartmentType, Course, Task, Issue, Category, CareerPath, FeedPost, KudosType, Organization, Membership, JoinRequest } from '../types';

// Collection References
const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');
const membershipsRef = collection(db, 'memberships');
const requestsRef = collection(db, 'requests');
const coursesRef = collection(db, 'courses');
const postsRef = collection(db, 'posts');
const categoriesRef = collection(db, 'categories');
const tasksRef = collection(db, 'tasks');
const issuesRef = collection(db, 'issues');
const careerPathsRef = collection(db, 'careerPaths');

// --- ORGANIZATION MANAGEMENT ---

export const searchOrganizations = async (searchTerm: string): Promise<Organization[]> => {
    if (!searchTerm || searchTerm.length < 2) return [];
    try {
        const term = searchTerm.toLowerCase();
        // Prototype: Fetch latest 50 and filter manually (No full-text search engine available)
        const q = query(orgsRef, limit(50));
        const snap = await getDocs(q);
        
        return snap.docs
            .map(d => ({id: d.id, ...d.data()} as Organization))
            .filter(o => o.name.toLowerCase().includes(term) || o.code === searchTerm.toUpperCase());
    } catch (e) {
        console.error("Search failed:", e);
        return [];
    }
};

export const getAllPublicOrganizations = async (): Promise<Organization[]> => {
    try {
        const q = query(orgsRef, limit(20), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({id: d.id, ...d.data()} as Organization));
    } catch (e) {
        return [];
    }
};

export const createOrganization = async (name: string, owner: User, logoUrl: string): Promise<Organization | null> => {
    try {
        const orgId = name.toLowerCase().replace(/\s/g, '_') + '_' + Math.floor(Math.random() * 1000);
        const code = name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000); // Ex: RUB1234

        const newOrg: Organization = {
            id: orgId,
            name,
            logoUrl,
            coverUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
            description: 'Welcome to our team.',
            location: 'Turkiye',
            ownerId: owner.id,
            code,
            createdAt: Date.now(),
            settings: {
                allowStaffContentCreation: false,
                customDepartments: [],
                primaryColor: '#0B1E3B'
            }
        };

        await setDoc(doc(db, 'organizations', orgId), newOrg);

        // Auto-create membership
        const membershipId = `${owner.id}_${orgId}`;
        const newMembership: Membership = {
            id: membershipId,
            userId: owner.id,
            organizationId: orgId,
            role: 'manager', 
            department: 'management',
            status: 'ACTIVE',
            joinedAt: Date.now()
        };
        await setDoc(doc(db, 'memberships', membershipId), newMembership);

        // Update User Profile
        await updateDoc(doc(db, 'users', owner.id), {
            currentOrganizationId: orgId,
            role: 'manager',
            department: 'management',
            organizationHistory: arrayUnion(orgId)
        });

        return newOrg;
    } catch (e) {
        console.error("Error creating org:", e);
        return null;
    }
};

export const getOrganizationDetails = async (orgId: string): Promise<Organization | null> => {
    try {
        const snap = await getDoc(doc(db, 'organizations', orgId));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Organization : null;
    } catch (e) { return null; }
};

export const updateOrganization = async (orgId: string, data: Partial<Organization>) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), data);
        return true;
    } catch (e) { return false; }
};

// --- DATA FETCHING WITH ISOLATION ---

/**
 * Fetch Posts ONLY for specific Organization
 */
export const getFeedPosts = async (userDept: DepartmentType, orgId: string): Promise<FeedPost[]> => {
    try {
        const q = query(
            postsRef, 
            where('organizationId', '==', orgId), // STRICT ISOLATION
            limit(50) 
        );
        const snapshot = await getDocs(q);
        const posts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as FeedPost))
            // Client-side filtering for departments (Firestone limitations on multiple array-contains)
            .filter(p => p.assignmentType === 'GLOBAL' || p.targetDepartments?.includes(userDept));
        
        return posts.sort((a,b) => b.createdAt - a.createdAt);
    } catch (e) {
        console.warn("Feed Fetch Error:", e);
        return [];
    }
};

/**
 * Fetch Users ONLY for specific Organization
 */
export const getUsersByDepartment = async (dept: DepartmentType, orgId: string): Promise<User[]> => {
  try {
    const q = query(
        membershipsRef, 
        where('organizationId', '==', orgId), // STRICT ISOLATION
        where('department', '==', dept),
        where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);
    const userIds = snap.docs.map(d => d.data().userId);

    if (userIds.length === 0) return [];

    const usersQ = query(usersRef, where('__name__', 'in', userIds.slice(0, 10)));
    const userSnap = await getDocs(usersQ);
    
    return userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) { return []; }
};

/**
 * Fetch Tasks ONLY for specific Organization
 */
export const getDailyTasks = async (dept: DepartmentType, orgId: string): Promise<Task[]> => {
  try {
    const q = query(
        tasksRef, 
        where('organizationId', '==', orgId), // STRICT ISOLATION
        where('department', '==', dept)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  } catch (error) { return []; }
};

/**
 * Fetch Courses (Global + Org Specific)
 */
export const getCourses = async (orgId?: string): Promise<Course[]> => {
  try {
    const snapshot = await getDocs(coursesRef);
    const allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    // Filter: Show Global Courses + Org Specific Courses
    return allCourses.filter(c => !c.organizationId || c.organizationId === orgId);
  } catch (error) { return []; }
};

/**
 * Fetch Career Paths ONLY for specific Organization
 */
export const getCareerPathByDepartment = async (dept: DepartmentType, orgId: string): Promise<CareerPath | null> => {
    try {
        const q = query(
            careerPathsRef, 
            where('organizationId', '==', orgId), // STRICT ISOLATION
            where('department', '==', dept)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CareerPath;
        }
        return null;
    } catch (e) { return null; }
};

export const getCareerPaths = async (orgId: string): Promise<CareerPath[]> => {
    try {
        const q = query(careerPathsRef, where('organizationId', '==', orgId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareerPath));
    } catch (e) { return []; }
};

// --- GENERIC FUNCTIONS ---

export const sendJoinRequest = async (userId: string, orgId: string, dept: DepartmentType, roleTitle?: string): Promise<boolean> => {
    try {
        const q = query(requestsRef, where('userId', '==', userId), where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        const snap = await getDocs(q);
        if (!snap.empty) return true; 

        await addDoc(requestsRef, {
            type: 'REQUEST_TO_JOIN',
            userId,
            organizationId: orgId,
            targetDepartment: dept,
            requestedRoleTitle: roleTitle || '',
            status: 'PENDING',
            createdAt: Date.now()
        });
        return true;
    } catch (e) { return false; }
};

export const getJoinRequests = async (orgId: string, department?: DepartmentType): Promise<(JoinRequest & { user?: User })[]> => {
    try {
        let q;
        if (department && department !== 'management') {
            q = query(requestsRef, where('organizationId', '==', orgId), where('targetDepartment', '==', department), where('status', '==', 'PENDING'));
        } else {
            q = query(requestsRef, where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        }
        
        const snap = await getDocs(q);
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));

        const hydrated = await Promise.all(requests.map(async (req) => {
            const user = await getUserById(req.userId);
            return { ...req, user: user || undefined };
        }));

        return hydrated;
    } catch (e) { return []; }
};

export const approveJoinRequest = async (requestId: string, joinRequest: JoinRequest): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const membershipId = `${joinRequest.userId}_${joinRequest.organizationId}`;
            const memRef = doc(db, 'memberships', membershipId);
            const membershipData: Membership = {
                id: membershipId,
                userId: joinRequest.userId,
                organizationId: joinRequest.organizationId,
                department: joinRequest.targetDepartment,
                role: 'staff',
                status: 'ACTIVE',
                joinedAt: Date.now()
            };
            transaction.set(memRef, membershipData);

            const userRef = doc(db, 'users', joinRequest.userId);
            transaction.update(userRef, {
                currentOrganizationId: joinRequest.organizationId,
                department: joinRequest.targetDepartment,
                organizationHistory: arrayUnion(joinRequest.organizationId)
            });

            const reqRef = doc(db, 'requests', requestId);
            transaction.update(reqRef, { status: 'APPROVED' });
        });
        return true;
    } catch (e) { return false; }
};

export const rejectJoinRequest = async (requestId: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'requests', requestId), { status: 'REJECTED' });
        return true;
    } catch (e) { return false; }
};

// ... existing small functions ...
export const createPost = async (post: Omit<FeedPost, 'id'>) => {
    try { await addDoc(postsRef, post); return true; } catch (e) { return false; }
};
export const createInteractivePost = async (post: Omit<FeedPost, 'id'>) => {
    return createPost(post);
};
export const createIssue = async (issue: Issue): Promise<boolean> => {
  try { await addDoc(issuesRef, issue); return true; } catch (error) { return false; }
};
export const getCategories = async (): Promise<Category[]> => {
    try {
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    } catch (error) { return []; }
};
export const getCourse = async (courseId: string): Promise<Course | null> => {
    try {
      const courseDocRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);
      if (courseSnap.exists()) return { id: courseSnap.id, ...courseSnap.data() } as Course;
      return null;
    } catch (error) { return null; }
};
export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, data);
        return true;
    } catch (e) { return false; }
};
export const togglePostLike = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const postRef = doc(db, 'posts', postId);
        if (isLiked) {
            await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(userId) });
        } else {
            await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(userId) });
        }
    } catch (e) { }
};
export const completeTask = async (userId: string, taskId: string, xpReward: number) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { xp: increment(xpReward), completedTasks: arrayUnion(taskId) });
    } catch (error) { }
};
export const startCourse = async (userId: string, courseId: string) => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { startedCourses: arrayUnion(courseId) });
    } catch (e) { }
};
export const updateUserProgress = async (userId: string, courseId: string, earnedXp: number) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { xp: increment(earnedXp), completedCourses: arrayUnion(courseId) });
    } catch (error) { }
};
export const subscribeToUser = (userId: string, callback: (user: User) => void) => {
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) callback({ id: doc.id, ...doc.data() } as User);
    });
};
export const subscribeToLeaderboard = (dept: DepartmentType, orgId: string, callback: (users: User[]) => void) => {
    const q = query(membershipsRef, where('organizationId', '==', orgId), where('department', '==', dept));
    return onSnapshot(q, async (snap) => {
        const memberUserIds = snap.docs.map(d => d.data().userId);
        if (memberUserIds.length === 0) { callback([]); return; }
        const uQ = query(usersRef, where('__name__', 'in', memberUserIds.slice(0, 10)));
        const uSnap = await getDocs(uQ);
        const users = uSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
        const sorted = users.sort((a, b) => b.xp - a.xp);
        callback(sorted);
    });
};
export const getCareerPath = async (id: string): Promise<CareerPath | null> => {
    try {
        const docRef = doc(db, 'careerPaths', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as CareerPath;
        return null;
    } catch (e) { return null; }
};
export const sendKudos = async (sender: User, recipientId: string, recipientName: string, recipientAvatar: string, badgeType: KudosType, message: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const recipientRef = doc(db, 'users', recipientId);
            const recipientDoc = await transaction.get(recipientRef);
            if (!recipientDoc.exists()) throw new Error("User not found");
            const userData = recipientDoc.data() as User;
            const currentBadges = userData.badges || [];
            const badgeIndex = currentBadges.findIndex(b => b.type === badgeType);
            let newBadges = [...currentBadges];
            if (badgeIndex > -1) {
                newBadges[badgeIndex] = { ...newBadges[badgeIndex], count: newBadges[badgeIndex].count + 1, lastReceivedAt: Date.now() };
            } else {
                newBadges.push({ type: badgeType, count: 1, lastReceivedAt: Date.now() });
            }
            transaction.update(recipientRef, { xp: increment(250), badges: newBadges });
            const newPostRef = doc(collection(db, 'posts'));
            const newPost: Omit<FeedPost, 'id'> = {
                organizationId: sender.currentOrganizationId!,
                authorId: sender.id,
                authorName: sender.name,
                authorAvatar: sender.avatar,
                assignmentType: 'GLOBAL',
                targetDepartments: [], 
                priority: 'NORMAL',
                type: 'kudos',
                caption: message,
                likes: 0,
                createdAt: Date.now(),
                likedBy: [],
                kudosData: { recipientId, recipientName, recipientAvatar, badgeType }
            };
            transaction.set(newPostRef, newPost);
        });
        return true;
    } catch (e) { return false; }
};
export const createCareerPath = async (path: Omit<CareerPath, 'id'>) => {
    try { await addDoc(careerPathsRef, path); return true; } catch(e) { return false; }
};
export const searchUserByPhone = async (phone: string): Promise<User | null> => {
    try {
        const q = query(usersRef, where('phoneNumber', '==', phone));
        const snap = await getDocs(q);
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
        return null;
    } catch (e) { return null; }
};
export const inviteUserToOrg = async (user: User, orgId: string, dept: DepartmentType): Promise<boolean> => {
    try {
        const membershipId = `${user.id}_${orgId}`;
        const newMembership: Membership = {
            id: membershipId,
            userId: user.id,
            organizationId: orgId,
            role: 'staff',
            department: dept,
            status: 'ACTIVE', 
            joinedAt: Date.now()
        };
        await setDoc(doc(db, 'memberships', membershipId), newMembership);
        if (!user.currentOrganizationId) {
            await updateDoc(doc(db, 'users', user.id), {
                currentOrganizationId: orgId,
                department: dept,
                organizationHistory: arrayUnion(orgId)
            });
        }
        return true;
    } catch (e) { return false; }
};
export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);
            transaction.update(currentUserRef, { following: arrayUnion(targetUserId), followingCount: increment(1) });
            transaction.update(targetUserRef, { followers: arrayUnion(currentUserId), followersCount: increment(1) });
        });
        return true;
    } catch (e) { return false; }
};
export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);
            transaction.update(currentUserRef, { following: arrayRemove(targetUserId), followingCount: increment(-1) });
            transaction.update(targetUserRef, { followers: arrayRemove(currentUserId), followersCount: increment(-1) });
        });
        return true;
    } catch (e) { return false; }
};
export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) return { id: userDoc.id, ...userDoc.data() } as User;
        return null;
    } catch (e) { return null; }
};
export const getUserPosts = async (userId: string): Promise<FeedPost[]> => {
    try {
        const q = query(postsRef, where('authorId', '==', userId), orderBy('createdAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    } catch (e) { return []; }
};
export const findOrganizationByCode = async (code: string): Promise<Organization | null> => {
    try {
        const q = query(orgsRef, where('code', '==', code));
        const snap = await getDocs(q);
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as Organization;
        return null;
    } catch (e) { return null; }
};
export const getMyMemberships = async (userId: string): Promise<Membership[]> => {
    try {
        const q = query(membershipsRef, where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Membership);
    } catch (e) { return []; }
};
