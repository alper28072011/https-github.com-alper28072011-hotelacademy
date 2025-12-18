
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
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DepartmentType, Course, Task, Issue, Category, CareerPath, FeedPost, KudosType, Organization, Membership, JoinRequest, OrganizationSector, PermissionType, AuthorType } from '../types';

// Collection References
const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');
const membershipsRef = collection(db, 'memberships');
const requestsRef = collection(db, 'requests');
const coursesRef = collection(db, 'courses');
const postsRef = collection(db, 'posts');
const categoriesRef = collection(db, 'categories');

// --- CONTENT MANAGEMENT (CRUD) ---

export const getAdminCourses = async (userId: string, orgId?: string | null): Promise<Course[]> => {
    try {
        let q;
        if (orgId) {
            q = query(coursesRef, where('organizationId', '==', orgId));
        } else {
            q = query(coursesRef, where('authorId', '==', userId));
        }
        
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({id: d.id, ...d.data()} as Course))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
        console.error("Get Admin Courses Error:", e);
        return [];
    }
};

// --- HİBRİT HABER KAYNAĞI MOTORU (FEED ENGINE) ---
// REFACTORED: Uses Promise.allSettled for fault tolerance and Map for uniqueness.
export const getDashboardFeed = async (user: User): Promise<(Course | FeedPost)[]> => {
    try {
        const promises = [];

        // 1. HAVUZ: KİŞİSEL (Kendi içeriklerim)
        const myQ = query(coursesRef, where('authorId', '==', user.id), limit(5));
        promises.push(getDocs(myQ));

        // 2. HAVUZ: KURUMSAL (Kurum içi)
        if (user.currentOrganizationId) {
            const orgQ = query(coursesRef, where('organizationId', '==', user.currentOrganizationId), limit(15));
            promises.push(getDocs(orgQ));
        }

        // 3. HAVUZ: SOSYAL (Takip edilenler)
        const following = user.following || [];
        if (following.length > 0) {
            // Firestore 'in' query supports max 10 items. Slice recent 10.
            const recentFollowing = following.slice(-10); 
            const socialQ = query(
                coursesRef, 
                where('authorId', 'in', recentFollowing),
                where('visibility', 'in', ['PUBLIC', 'FOLLOWERS_ONLY']),
                limit(15)
            );
            promises.push(getDocs(socialQ));
        }

        // 4. HAVUZ: KEŞFET (Public içerikler)
        const discoverQ = query(coursesRef, where('visibility', '==', 'PUBLIC'), limit(10));
        promises.push(getDocs(discoverQ));

        // Execute all queries in parallel, tolerating failures
        const results = await Promise.allSettled(promises);
        
        // Use Map to ensure unique items by ID (Priority: Last write wins, or logic based)
        const feedMap = new Map<string, Course | FeedPost>();
        
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                result.value.docs.forEach(doc => {
                    // Normalize data structure if needed
                    const data = doc.data();
                    feedMap.set(doc.id, { id: doc.id, ...data, type: 'course' } as any);
                });
            } else {
                console.warn("Feed partial fetch error:", result.reason);
            }
        });

        const feedList = Array.from(feedMap.values())
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return feedList;

    } catch (error) {
        console.error("Hybrid Feed Engine Critical Error:", error);
        return []; // Return empty array instead of crashing
    }
};

/**
 * STORIES ENGINE v2 (Precise Targeting)
 * Filters content based on:
 * 1. Global Org Content
 * 2. Department-Specific Content
 * 3. Position-Specific Content
 */
export const getDashboardStories = async (user: User): Promise<Course[]> => {
    if (!user.currentOrganizationId) return [];
    
    try {
        // Fetch ALL Active/High Priority courses for this Org
        const q = query(
            coursesRef, 
            where('organizationId', '==', user.currentOrganizationId),
            where('priority', '==', 'HIGH')
        );
        
        const snap = await getDocs(q);
        const allOrgCourses = snap.docs.map(d => ({id: d.id, ...d.data()} as Course));

        // Filter based on User's Dept & Position
        const targetedCourses = allOrgCourses.filter(course => {
            // A. Already completed? Skip.
            if (user.completedCourses?.includes(course.id)) return false;

            // B. Check Targeting Rules
            if (!course.targeting || course.targeting.type === 'ALL') {
                return true; // Everyone sees this
            }

            if (course.targeting.type === 'DEPARTMENT') {
                return user.department && course.targeting.targetIds.includes(user.department);
            }

            if (course.targeting.type === 'POSITION') {
                return user.positionId && course.targeting.targetIds.includes(user.positionId);
            }

            return false;
        });

        return targetedCourses;

    } catch (error) { 
        console.error("Story Engine Error:", error);
        return []; 
    }
};

// --- DİĞER TEMEL FONKSİYONLAR ---

export const getCourse = async (courseId: string): Promise<Course | null> => {
    try {
      const snap = await getDoc(doc(db, 'courses', courseId));
      return snap.exists() ? { id: snap.id, ...snap.data() } as Course : null;
    } catch (error) { return null; }
};

export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        const snap = await getDoc(doc(db, 'users', userId));
        return snap.exists() ? { id: snap.id, ...snap.data() } as User : null;
    } catch (e) { return null; }
};

export const getOrganizationDetails = async (orgId: string): Promise<Organization | null> => {
    try {
        const snap = await getDoc(doc(db, 'organizations', orgId));
        return snap.exists() ? { id: snap.id, ...snap.data() } as Organization : null;
    } catch (e) { return null; }
};

export const updateCourse = async (courseId: string, data: Partial<Course>): Promise<boolean> => {
    try { await updateDoc(doc(db, 'courses', courseId), data); return true; } catch (e) { return false; }
};

export const deleteCourse = async (courseId: string): Promise<boolean> => {
    try { await deleteDoc(doc(db, 'courses', courseId)); return true; } catch (e) { return false; }
};

export const getMyMemberships = async (userId: string): Promise<Membership[]> => {
    try {
        const q = query(membershipsRef, where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Membership);
    } catch (e) { return []; }
};

export const toggleSaveCourse = async (userId: string, courseId: string, isSaved: boolean): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { savedCourses: isSaved ? arrayUnion(courseId) : arrayRemove(courseId) });
        return true;
    } catch (e) { return false; }
};

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try { await updateDoc(doc(db, 'users', userId), data); return true; } catch (e) { return false; }
};

export const getInstructorCourses = async (authorId: string): Promise<Course[]> => {
    try {
        const q = query(coursesRef, where('authorId', '==', authorId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) { return []; }
};

export const getUserPosts = async (userId: string): Promise<FeedPost[]> => {
    try {
        const q = query(collection(db, 'posts'), where('authorId', '==', userId), limit(20));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) { return []; }
};

export const searchOrganizations = async (searchTerm: string): Promise<Organization[]> => {
    if (!searchTerm || searchTerm.length < 2) return [];
    try {
        const q = query(orgsRef, limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({id: d.id, ...d.data()} as Organization))
            .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.code === searchTerm.toUpperCase());
    } catch (e) { return []; }
};

export const createOrganization = async (name: string, sector: OrganizationSector, owner: User): Promise<Organization | null> => {
    try {
        const orgId = name.toLowerCase().replace(/\s/g, '_') + '_' + Math.floor(Math.random() * 1000);
        const code = name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000); 

        // Default Hierarchy
        const defaultHierarchy = [
            { id: 'mgmt', name: 'Yönetim', positions: [{ id: 'gm', title: 'Genel Müdür' }] },
            { id: 'fo', name: 'Ön Büro', positions: [{ id: 'fo_agent', title: 'Resepsiyonist' }] },
            { id: 'hk', name: 'Kat Hizmetleri', positions: [{ id: 'hk_maid', title: 'Kat Görevlisi' }] }
        ];

        const newOrg: Organization = {
            id: orgId, name, sector, logoUrl: '', location: 'Global', ownerId: owner.id, code, createdAt: Date.now(),
            settings: { allowStaffContentCreation: false, customDepartments: ['Yönetim', 'Operasyon'], primaryColor: '#0B1E3B' },
            followersCount: 0, memberCount: 1,
            status: 'ACTIVE',
            hierarchy: defaultHierarchy
        };
        await setDoc(doc(db, 'organizations', orgId), newOrg);

        const membershipId = `${owner.id}_${orgId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: owner.id, organizationId: orgId, role: 'manager', department: 'mgmt', status: 'ACTIVE', joinedAt: Date.now(),
            positionId: 'gm', roleTitle: 'Genel Müdür'
        });

        await updateDoc(doc(db, 'users', owner.id), {
            currentOrganizationId: orgId, role: 'manager', department: 'mgmt', positionId: 'gm', organizationHistory: arrayUnion(orgId)
        });

        return newOrg;
    } catch (e) { return null; }
};

export const switchUserActiveOrganization = async (userId: string, orgId: string): Promise<boolean> => {
    try { await updateDoc(doc(db, 'users', userId), { currentOrganizationId: orgId }); return true; } catch (e) { return false; }
};

export const startCourse = async (userId: string, courseId: string) => {
    try { await updateDoc(doc(db, 'users', userId), { startedCourses: arrayUnion(courseId) }); } catch (e) { }
};

export const updateUserProgress = async (userId: string, courseId: string, earnedXp: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { xp: increment(earnedXp), completedCourses: arrayUnion(courseId) });
    } catch (error) { }
};

export const getCourses = async (orgId?: string): Promise<Course[]> => {
  if (!orgId) return [];
  const q = query(coursesRef, where('organizationId', '==', orgId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id: d.id, ...d.data()} as Course));
};

export const getCategories = async (): Promise<Category[]> => {
    const snap = await getDocs(categoriesRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const subscribeToUser = (userId: string, callback: (user: User) => void) => {
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) callback({ id: doc.id, ...doc.data() } as User);
    });
};

export const subscribeToLeaderboard = (dept: DepartmentType, orgId: string, callback: (users: User[]) => void) => {
    const q = query(membershipsRef, where('organizationId', '==', orgId), where('department', '==', dept));
    return onSnapshot(q, async (snap) => {
        const userIds = snap.docs.map(d => d.data().userId);
        if (userIds.length === 0) return callback([]);
        const usersSnap = await getDocs(query(usersRef, where('__name__', 'in', userIds.slice(0, 10))));
        const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User)).sort((a, b) => b.xp - a.xp);
        callback(users);
    });
};

// Updated: Accepts Position ID
export const sendJoinRequest = async (userId: string, orgId: string, dept: DepartmentType, roleTitle?: string, positionId?: string): Promise<{ success: boolean; message?: string }> => {
    try {
        await addDoc(collection(db, 'requests'), {
            type: 'REQUEST_TO_JOIN', userId, organizationId: orgId, targetDepartment: dept, requestedRoleTitle: roleTitle || '', positionId, status: 'PENDING', createdAt: Date.now()
        });
        return { success: true };
    } catch (e: any) { 
        return { success: false, message: e.message || 'Başvuru yapılamadı.' }; 
    }
};

export const getDailyTasks = async (dept: DepartmentType, orgId: string): Promise<Task[]> => {
    try {
        const q = query(collection(db, 'tasks'), where('organizationId', '==', orgId), where('department', '==', dept));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
    } catch (e) { return []; }
};

export const completeTask = async (userId: string, taskId: string, xp: number) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            xp: increment(xp),
            completedTasks: arrayUnion(taskId)
        });
    } catch (e) { }
};

export const createIssue = async (issue: Issue): Promise<boolean> => {
    try {
        await addDoc(collection(db, 'issues'), issue);
        return true;
    } catch (e) { return false; }
};

export const getUsersByDepartment = async (dept: string, orgId: string): Promise<User[]> => {
    try {
        const q = query(membershipsRef, where('organizationId', '==', orgId), where('department', '==', dept));
        const snap = await getDocs(q);
        const userIds = snap.docs.map(d => d.data().userId);
        if (userIds.length === 0) return [];
        const usersSnap = await getDocs(query(usersRef, where('__name__', 'in', userIds.slice(0, 30))));
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) { return []; }
};

export const searchUserByPhone = async (phoneNumber: string): Promise<User | null> => {
    try {
        const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    } catch (e) { return null; }
};

export const inviteUserToOrg = async (user: User, orgId: string, dept: string, roleTitle: string, permissions: PermissionType[]) => {
    try {
        const membershipId = `${user.id}_${orgId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: user.id, organizationId: orgId, role: 'staff', roleTitle, permissions, department: dept, status: 'ACTIVE', joinedAt: Date.now()
        });
        return true;
    } catch (e) { return false; }
};

export const createCareerPath = async (path: Omit<CareerPath, 'id'>): Promise<boolean> => {
    try {
        await addDoc(collection(db, 'careerPaths'), path);
        return true;
    } catch (e) { return false; }
};

export const getCareerPaths = async (orgId: string): Promise<CareerPath[]> => {
    try {
        const q = query(collection(db, 'careerPaths'), where('organizationId', '==', orgId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerPath));
    } catch (e) { return []; }
};

export const getCareerPath = async (id: string): Promise<CareerPath | null> => {
    try {
        const snap = await getDoc(doc(db, 'careerPaths', id));
        return snap.exists() ? { id: snap.id, ...snap.data() } as CareerPath : null;
    } catch (e) { return null; }
};

export const getCareerPathByDepartment = async (dept: string | null, orgId: string): Promise<CareerPath | null> => {
    if (!dept) return null;
    try {
        const q = query(collection(db, 'careerPaths'), where('organizationId', '==', orgId), where('department', '==', dept), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as CareerPath;
    } catch (e) { return null; }
};

export const togglePostLike = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            likes: increment(isLiked ? 1 : -1),
            likedBy: isLiked ? arrayUnion(userId) : arrayRemove(userId)
        });
        return true;
    } catch (e) { return false; }
};

export const getAllPublicOrganizations = async (): Promise<Organization[]> => {
    try {
        const snap = await getDocs(query(orgsRef, limit(100)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) { return []; }
};

export const getJoinRequests = async (orgId: string, dept?: string): Promise<(JoinRequest & { user?: User })[]> => {
    try {
        let q = query(requestsRef, where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        if (dept) q = query(q, where('targetDepartment', '==', dept));
        const snap = await getDocs(q);
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
        return await Promise.all(reqs.map(async r => {
            const user = await getUserById(r.userId);
            return { ...r, user: user || undefined };
        }));
    } catch (e) { return []; }
};

export const approveJoinRequest = async (requestId: string, request: JoinRequest, roleTitle: string, permissions: PermissionType[]) => {
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'requests', requestId), { status: 'APPROVED' });
        const membershipId = `${request.userId}_${request.organizationId}`;
        batch.set(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: request.userId, organizationId: request.organizationId, role: 'staff', roleTitle, permissions, department: request.targetDepartment, status: 'ACTIVE', joinedAt: Date.now(), positionId: request.positionId
        });
        
        // Also update User profile
        const userRef = doc(db, 'users', request.userId);
        batch.update(userRef, { department: request.targetDepartment, positionId: request.positionId, roleTitle });

        await batch.commit();
        return true;
    } catch (e) { return false; }
};

export const rejectJoinRequest = async (requestId: string) => {
    try {
        await updateDoc(doc(db, 'requests', requestId), { status: 'REJECTED' });
        return true;
    } catch (e) { return false; }
};

export const updateOrganization = async (orgId: string, data: Partial<Organization>): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), data);
        return true;
    } catch (e) { return false; }
};
