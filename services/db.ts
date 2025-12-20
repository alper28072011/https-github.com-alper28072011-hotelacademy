
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
import { User, Course, Task, Issue, Category, CareerPath, FeedPost, Organization, Membership, JoinRequest, OrganizationSector, PageRole, PermissionType } from '../types';

// Collection References
const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');
const membershipsRef = collection(db, 'memberships');
const requestsRef = collection(db, 'requests');
const coursesRef = collection(db, 'courses');
const categoriesRef = collection(db, 'categories');

// Helper to remove undefined fields
const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    return JSON.parse(JSON.stringify(data));
};

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

// --- HİBRİT HABER KAYNAĞI MOTORU (CHANNEL FEED ENGINE) ---
export const getDashboardFeed = async (user: User): Promise<(Course | FeedPost)[]> => {
    try {
        const promises = [];

        // 1. HAVUZ: KİŞİSEL (Kendi içeriklerim)
        const myQ = query(coursesRef, where('authorId', '==', user.id), limit(5));
        promises.push(getDocs(myQ));

        // 2. HAVUZ: ABONELİK (Takip edilen Kanallar)
        if (user.currentOrganizationId && user.subscribedChannelIds?.length > 0) {
            // Firestore 'in' query supports max 10. Split if needed or take first 10 for MVP.
            const channels = user.subscribedChannelIds.slice(0, 10);
            
            const channelQ = query(
                coursesRef, 
                where('organizationId', '==', user.currentOrganizationId),
                where('channelId', 'in', channels),
                limit(20)
            );
            promises.push(getDocs(channelQ));
        }

        // 3. HAVUZ: SOSYAL (Takip edilen Kişiler)
        const following = user.following || [];
        if (following.length > 0) {
            const recentFollowing = following.slice(-10); 
            const socialQ = query(
                coursesRef, 
                where('authorId', 'in', recentFollowing),
                where('visibility', 'in', ['PUBLIC', 'FOLLOWERS_ONLY']),
                limit(15)
            );
            promises.push(getDocs(socialQ));
        }

        const results = await Promise.allSettled(promises);
        
        const feedMap = new Map<string, Course | FeedPost>();
        
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                result.value.docs.forEach(doc => {
                    const data = doc.data();
                    feedMap.set(doc.id, { id: doc.id, ...data, type: 'course' } as any);
                });
            }
        });

        const feedList = Array.from(feedMap.values())
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return feedList;

    } catch (error) {
        console.error("Hybrid Feed Engine Critical Error:", error);
        return []; 
    }
};

export const getDashboardStories = async (user: User): Promise<Course[]> => {
    if (!user.currentOrganizationId) return [];
    
    try {
        const q = query(
            coursesRef, 
            where('organizationId', '==', user.currentOrganizationId),
            where('priority', '==', 'HIGH')
        );
        
        const snap = await getDocs(q);
        // Simple logic: return assigned high priority courses.
        // In this new model, assignments are looser, but HIGH priority is still shown.
        return snap.docs.map(d => ({id: d.id, ...d.data()} as Course));

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
    try { 
        await updateDoc(doc(db, 'courses', courseId), sanitizeData(data)); 
        return true; 
    } catch (e) { 
        console.error("Update Course Error:", e);
        return false; 
    }
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

        // Default Channels
        const defaultChannels = [
            { id: 'ch_general', name: 'Genel Duyurular', description: 'Tüm personel için', isPrivate: false, managerIds: [owner.id], createdAt: Date.now() },
            { id: 'ch_welcome', name: 'Oryantasyon', description: 'Aramıza hoş geldin!', isPrivate: false, managerIds: [owner.id], createdAt: Date.now() }
        ];

        const newOrg: Organization = {
            id: orgId, name, sector, logoUrl: '', location: 'Global', ownerId: owner.id, code, createdAt: Date.now(),
            settings: { allowStaffContentCreation: false, primaryColor: '#0B1E3B' },
            followersCount: 0, memberCount: 1,
            status: 'ACTIVE',
            channels: defaultChannels
        };
        await setDoc(doc(db, 'organizations', orgId), newOrg);

        const membershipId = `${owner.id}_${orgId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: owner.id, organizationId: orgId, role: 'ADMIN', status: 'ACTIVE', joinedAt: Date.now()
        });

        await updateDoc(doc(db, 'users', owner.id), {
            currentOrganizationId: orgId, 
            organizationHistory: arrayUnion(orgId),
            [`pageRoles.${orgId}`]: 'ADMIN'
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

export const subscribeToLeaderboard = (dept: string, orgId: string, callback: (users: User[]) => void) => {
    // Legacy: Just get all members of org for now
    const q = query(membershipsRef, where('organizationId', '==', orgId), limit(10));
    return onSnapshot(q, async (snap) => {
        const userIds = snap.docs.map(d => d.data().userId);
        if (userIds.length === 0) return callback([]);
        const usersSnap = await getDocs(query(usersRef, where('__name__', 'in', userIds)));
        const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User)).sort((a, b) => b.xp - a.xp);
        callback(users);
    });
};

// --- REQUESTS SYSTEM ---

export const sendJoinRequest = async (userId: string, orgId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        // Check if already exists
        const q = query(requestsRef, 
            where('userId', '==', userId), 
            where('organizationId', '==', orgId), 
            where('status', '==', 'PENDING')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            return { success: false, message: 'Zaten bekleyen bir başvurunuz var.' };
        }

        await addDoc(collection(db, 'requests'), {
            type: 'REQUEST_TO_JOIN', 
            userId, 
            organizationId: orgId, 
            status: 'PENDING', 
            createdAt: Date.now()
        });
        return { success: true };
    } catch (e: any) { 
        return { success: false, message: e.message || 'Başvuru yapılamadı.' }; 
    }
};

export const getUserPendingRequests = async (userId: string): Promise<(JoinRequest & { orgName?: string })[]> => {
    try {
        const q = query(requestsRef, where('userId', '==', userId), where('status', '==', 'PENDING'));
        const snap = await getDocs(q);
        
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
        
        // Enrich with Org Name
        const enriched = await Promise.all(requests.map(async req => {
            const org = await getOrganizationDetails(req.organizationId);
            return { ...req, orgName: org?.name };
        }));
        
        return enriched;
    } catch (e) {
        console.error("Fetch User Requests Error:", e);
        return [];
    }
};

export const cancelJoinRequest = async (requestId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'requests', requestId));
        return true;
    } catch (e) { return false; }
};

export const getJoinRequests = async (orgId: string, departmentFilter?: string): Promise<(JoinRequest & { user?: User })[]> => {
    try {
        let q = query(requestsRef, where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        
        if (departmentFilter) {
            q = query(q, where('targetDepartment', '==', departmentFilter));
        }

        const snap = await getDocs(q);
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
        
        return await Promise.all(reqs.map(async r => {
            const user = await getUserById(r.userId);
            return { ...r, user: user || undefined };
        }));
    } catch (e) { return []; }
};

export const approveJoinRequest = async (requestId: string, request: JoinRequest, roleTitle?: string, permissions?: PermissionType[]) => {
    try {
        return await runTransaction(db, async (transaction) => {
            // 1. Create Membership
            const membershipId = `${request.userId}_${request.organizationId}`;
            const memRef = doc(db, 'memberships', membershipId);
            
            transaction.set(memRef, {
                id: membershipId, 
                userId: request.userId, 
                organizationId: request.organizationId, 
                role: 'MEMBER', 
                status: 'ACTIVE', 
                joinedAt: Date.now()
            });

            // 2. Update User Profile
            const userRef = doc(db, 'users', request.userId);
            const updates: any = { 
                currentOrganizationId: request.organizationId,
                [`pageRoles.${request.organizationId}`]: 'MEMBER'
            };
            if (roleTitle) updates.roleTitle = roleTitle;
            // TODO: Handle permissions if needed, usually stored in position or membership
            
            transaction.update(userRef, updates);

            // 3. Close Request
            const reqRef = doc(db, 'requests', requestId);
            transaction.update(reqRef, { status: 'APPROVED' });

            return true;
        });
    } catch (e) { 
        console.error("Approve Request Transaction Error:", e);
        return false; 
    }
};

export const rejectJoinRequest = async (requestId: string) => {
    try {
        await updateDoc(doc(db, 'requests', requestId), { status: 'REJECTED' });
        return true;
    } catch (e) { return false; }
};

export const getDailyTasks = async (dept: string, orgId: string): Promise<Task[]> => {
    try {
        const q = query(collection(db, 'tasks'), where('organizationId', '==', orgId));
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

// NEW: FETCH ALL ORG USERS (Fixes "Missing User" bug in Admin Panel)
export const getOrganizationUsers = async (orgId: string): Promise<User[]> => {
    try {
        // Since we don't have a compound index for "currentOrganizationId", we can use Membership collection as index.
        const memQ = query(membershipsRef, where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        const userIds = memSnap.docs.map(d => d.data().userId);
        
        if (userIds.length === 0) return [];

        // Firestore "in" query allows max 10 IDs. We need to chunk it.
        // OR better: query users directly if we can index it.
        // Let's use the 'currentOrganizationId' query on Users (requires index, but we can assume simple query works for small scale or fallback)
        
        const usersQ = query(usersRef, where('currentOrganizationId', '==', orgId));
        const usersSnap = await getDocs(usersQ);
        
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) {
        console.error("Get All Org Users Error:", e);
        return [];
    }
};

export const inviteUserToOrg = async (user: User, orgId: string) => {
    try {
        const membershipId = `${user.id}_${orgId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: user.id, organizationId: orgId, role: 'MEMBER', status: 'ACTIVE', joinedAt: Date.now()
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

export const getCareerPathByDepartment = async (dept: string, orgId: string): Promise<CareerPath | null> => {
    try {
        const q = query(collection(db, 'careerPaths'), where('organizationId', '==', orgId), where('department', '==', dept), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return { id: snap.docs[0].id, ...snap.docs[0].data() } as CareerPath;
        }
        return null;
    } catch (e) { return null; }
};

export const getUsersByDepartment = async (dept: string, orgId: string): Promise<User[]> => {
    try {
        const q = query(usersRef, where('currentOrganizationId', '==', orgId), where('department', '==', dept));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (e) {
        return [];
    }
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

export const updateOrganization = async (orgId: string, data: Partial<Organization>): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), data);
        return true;
    } catch (e) { return false; }
};
