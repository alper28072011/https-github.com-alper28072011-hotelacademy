
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
  limit, 
  runTransaction,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Course, Task, Issue, Category, CareerPath, FeedPost, Organization, Membership, JoinRequest, OrganizationSector, PageRole, PermissionType, ChannelStoryData } from '../types';
import { SyncService } from './syncService';

// Collection References
const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');
const membershipsRef = collection(db, 'memberships');
const requestsRef = collection(db, 'requests');
const coursesRef = collection(db, 'courses');
const categoriesRef = collection(db, 'categories');

const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    return JSON.parse(JSON.stringify(data));
};

// ... (Existing exports like getAdminCourses, getDashboardFeed etc. preserved) ...

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
    } catch (e) { return []; }
};

/**
 * COMPOSITE FEED ALGORITHM
 * Aggregates content from 3 sources:
 * 1. Social Follows (People & Public Pages)
 * 2. Workspace Memberships (Internal Channels)
 * 3. Tag Interests
 */
export const getDashboardFeed = async (user: User): Promise<(Course | FeedPost)[]> => {
    try {
        const promises = [];

        // 1. MY CONTENT
        const myQ = query(coursesRef, where('authorId', '==', user.id), limit(5));
        promises.push(getDocs(myQ));

        // 2. SOCIAL: PEOPLE I FOLLOW
        if (user.followingUsers && user.followingUsers.length > 0) {
            const peopleQ = query(
                coursesRef, 
                where('authorId', 'in', user.followingUsers.slice(0, 10)), 
                where('visibility', 'in', ['PUBLIC', 'FOLLOWERS_ONLY']), 
                limit(15)
            );
            promises.push(getDocs(peopleQ));
        }

        // 3. SOCIAL: PAGES I FOLLOW (Public Content Only)
        if (user.followingPages && user.followingPages.length > 0) {
            const publicPageQ = query(
                coursesRef,
                where('organizationId', 'in', user.followingPages.slice(0, 10)),
                where('visibility', '==', 'PUBLIC'),
                limit(15)
            );
            promises.push(getDocs(publicPageQ));
        }

        // 4. CORPORATE: WORKSPACES (Internal Content via Channel Subscriptions)
        if (user.joinedPageIds && user.joinedPageIds.length > 0) {
            const subbedChannels = user.channelSubscriptions || [];
            
            if (subbedChannels.length > 0) {
                // Fetch content from subscribed channels in joined orgs
                // Support both legacy `channelId` and new `targetChannelIds`
                // Note: Firestore 'in' query works on single fields. For array-contains-any on targetChannelIds, we might need separate query.
                // Simplified: We query courses in user's ORG and filter in memory or rely on 'channelId' primary.
                
                // Better approach: Query by Org + Filter by Channel locally or improved index.
                // For this implementation, let's assume `targetChannelIds` contains the channel ID.
                const workQ = query(
                    coursesRef,
                    where('organizationId', 'in', user.joinedPageIds.slice(0, 10)),
                    where('targetChannelIds', 'array-contains-any', subbedChannels.slice(0, 10)), // Requires index
                    limit(20)
                );
                promises.push(getDocs(workQ));
                
                // Fallback for legacy
                const legacyWorkQ = query(
                    coursesRef,
                    where('organizationId', 'in', user.joinedPageIds.slice(0, 10)),
                    where('channelId', 'in', subbedChannels.slice(0, 10)), 
                    limit(20)
                );
                promises.push(getDocs(legacyWorkQ));
            }
        }

        // 5. INTERESTS: TAGS
        if (user.followedTags && user.followedTags.length > 0) {
            const tagQ = query(
                coursesRef,
                where('tags', 'array-contains-any', user.followedTags.slice(0, 10)),
                where('visibility', '==', 'PUBLIC'),
                limit(15)
            );
            promises.push(getDocs(tagQ));
        }

        // --- EXECUTE & MERGE ---
        const results = await Promise.allSettled(promises);
        const feedMap = new Map<string, Course | FeedPost>();
        
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                result.value.docs.forEach(doc => {
                    // Use Map to deduplicate by ID
                    feedMap.set(doc.id, { id: doc.id, ...doc.data(), type: 'course' } as any);
                });
            }
        });

        // Convert to array and sort by date descending
        return Array.from(feedMap.values())
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    } catch (error) { 
        console.error("Feed Error:", error);
        return []; 
    }
};

export const getChannelStories = async (user: User): Promise<ChannelStoryData[]> => {
    // Only fetch stories for joined orgs and subscribed channels
    if (!user.currentOrganizationId || !user.channelSubscriptions || user.channelSubscriptions.length === 0) {
        return [];
    }
    try {
        const org = await getOrganizationDetails(user.currentOrganizationId);
        if (!org) return [];

        const coursesQ = query(coursesRef, where('organizationId', '==', user.currentOrganizationId), where('visibility', '==', 'PRIVATE'));
        const coursesSnap = await getDocs(coursesQ);
        const allOrgCourses = coursesSnap.docs.map(d => ({id: d.id, ...d.data()} as Course));

        const storyData: ChannelStoryData[] = [];
        // Only show subscribed channels
        const relevantChannels = org.channels.filter(c => user.channelSubscriptions.includes(c.id));

        for (const channel of relevantChannels) {
            // Updated to check targetChannelIds array
            const channelCourses = allOrgCourses.filter(c => c.targetChannelIds?.includes(channel.id) || c.channelId === channel.id);
            
            let status: 'HAS_NEW' | 'IN_PROGRESS' | 'ALL_CAUGHT_UP' | 'EMPTY' = 'EMPTY';
            let nextCourseId = undefined;
            let progressPercent = 0;

            if (channelCourses.length > 0) {
                const pendingCourses = channelCourses.filter(c => {
                    const progress = user.progressMap?.[c.id];
                    if (user.completedCourses.includes(c.id)) return false;
                    if (progress?.status === 'COMPLETED') return false;
                    return true;
                });

                if (pendingCourses.length > 0) {
                    const inProgress = pendingCourses.find(c => {
                        const p = user.progressMap?.[c.id];
                        return p?.status === 'IN_PROGRESS';
                    });

                    if (inProgress) {
                        status = 'IN_PROGRESS';
                        nextCourseId = inProgress.id;
                        const p = user.progressMap?.[inProgress.id];
                        progressPercent = p ? (p.currentCardIndex / p.totalCards) * 100 : 0;
                    } else {
                        status = 'HAS_NEW';
                        nextCourseId = pendingCourses[0].id;
                    }
                } else {
                    status = 'ALL_CAUGHT_UP';
                }
            }

            if (status !== 'ALL_CAUGHT_UP' && status !== 'EMPTY') {
                storyData.push({ channel, status, nextCourseId, progressPercent });
            }
        }
        return storyData.sort((a, b) => {
            if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
            if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
            return 0;
        });
    } catch (e) { return []; }
};

// ... [Standard getters] ...
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
    try { await updateDoc(doc(db, 'courses', courseId), sanitizeData(data)); return true; } catch (e) { return false; }
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
        const defaultChannels = [
            { id: 'ch_general', name: 'Genel Duyurular', description: 'Tüm personel için', isPrivate: false, managerIds: [owner.id], createdAt: Date.now(), isMandatory: true },
            { id: 'ch_welcome', name: 'Oryantasyon', description: 'Aramıza hoş geldin!', isPrivate: false, managerIds: [owner.id], createdAt: Date.now(), isMandatory: true }
        ];
        const newOrg: Organization = {
            id: orgId, name, sector, logoUrl: '', location: 'Global', ownerId: owner.id, code, createdAt: Date.now(),
            settings: { allowStaffContentCreation: false, primaryColor: '#0B1E3B' },
            followersCount: 0, memberCount: 1, status: 'ACTIVE', channels: defaultChannels,
            type: 'PUBLIC',
            admins: [owner.id],
            followers: [owner.id],
            members: [owner.id],
        };
        await setDoc(doc(db, 'organizations', orgId), newOrg);
        const membershipId = `${owner.id}_${orgId}`;
        await setDoc(doc(db, 'memberships', membershipId), {
            id: membershipId, userId: owner.id, organizationId: orgId, role: 'ADMIN', status: 'ACTIVE', joinedAt: Date.now()
        });
        await updateDoc(doc(db, 'users', owner.id), {
            currentOrganizationId: orgId, organizationHistory: arrayUnion(orgId), [`pageRoles.${orgId}`]: 'ADMIN',
            joinedPageIds: arrayUnion(orgId),
            channelSubscriptions: arrayUnion('ch_general', 'ch_welcome')
        });
        return newOrg;
    } catch (e) { return null; }
};

export const switchUserActiveOrganization = async (userId: string, orgId: string): Promise<boolean> => {
    try { await updateDoc(doc(db, 'users', userId), { currentOrganizationId: orgId }); return true; } catch (e) { return false; }
};

// ... [Existing Learning Functions (startCourse, saveCourseProgress, completeCourse) Preserved] ...
export const startCourse = async (userId: string, courseId: string) => {
    try { await updateDoc(doc(db, 'users', userId), { startedCourses: arrayUnion(courseId) }); } catch (e) { }
};

export const saveCourseProgress = async (
    userId: string, 
    courseId: string, 
    cardIndex: number, 
    totalCards: number
) => {
    if (!navigator.onLine) {
        SyncService.addToQueue({
            type: 'COURSE_PROGRESS',
            payload: { courseId, index: cardIndex, total: totalCards },
            timestamp: Date.now()
        });
        return;
    }
    try {
        const userRef = doc(db, 'users', userId);
        const progressKey = `progressMap.${courseId}`;
        await updateDoc(userRef, {
            [`${progressKey}.courseId`]: courseId,
            [`${progressKey}.status`]: 'IN_PROGRESS',
            [`${progressKey}.currentCardIndex`]: cardIndex,
            [`${progressKey}.totalCards`]: totalCards,
            [`${progressKey}.lastAccessedAt`]: Date.now(),
            startedCourses: arrayUnion(courseId)
        });
    } catch (e) { console.error("Save Progress Failed", e); }
};

export const completeCourse = async (userId: string, courseId: string, earnedXp: number, totalCards: number) => {
    if (!navigator.onLine) {
        SyncService.addToQueue({
            type: 'COURSE_COMPLETE',
            payload: { courseId, xp: earnedXp, total: totalCards },
            timestamp: Date.now()
        });
        return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      const progressKey = `progressMap.${courseId}`;
      await updateDoc(userRef, { 
          xp: increment(earnedXp), 
          completedCourses: arrayUnion(courseId),
          [`${progressKey}.status`]: 'COMPLETED',
          [`${progressKey}.completedAt`]: Date.now(),
          [`${progressKey}.currentCardIndex`]: 0,
          [`${progressKey}.totalCards`]: totalCards
      });
    } catch (error) { console.error("Complete Course Failed", error); }
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
      if (doc.exists()) {
          const user = { id: doc.id, ...doc.data() } as User;
          if (navigator.onLine) SyncService.flush(userId);
          callback(user);
      }
    });
};

export const subscribeToLeaderboard = (dept: string, orgId: string, callback: (users: User[]) => void) => {
    const q = query(membershipsRef, where('organizationId', '==', orgId), limit(10));
    return onSnapshot(q, async (snap) => {
        const userIds = snap.docs.map(d => d.data().userId);
        if (userIds.length === 0) return callback([]);
        const usersSnap = await getDocs(query(usersRef, where('__name__', 'in', userIds)));
        const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User)).sort((a, b) => b.xp - a.xp);
        callback(users);
    });
};

// ... [Existing Request Logic] ...
export const sendJoinRequest = async (userId: string, orgId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const q = query(requestsRef, where('userId', '==', userId), where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        const snap = await getDocs(q);
        if (!snap.empty) return { success: false, message: 'Zaten bekleyen bir başvurunuz var.' };
        await addDoc(collection(db, 'requests'), { type: 'REQUEST_TO_JOIN', userId, organizationId: orgId, status: 'PENDING', createdAt: Date.now() });
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message || 'Başvuru yapılamadı.' }; }
};

export const getUserPendingRequests = async (userId: string): Promise<(JoinRequest & { orgName?: string })[]> => {
    try {
        const q = query(requestsRef, where('userId', '==', userId), where('status', '==', 'PENDING'));
        const snap = await getDocs(q);
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
        const enriched = await Promise.all(requests.map(async req => {
            const org = await getOrganizationDetails(req.organizationId);
            return { ...req, orgName: org?.name };
        }));
        return enriched;
    } catch (e) { return []; }
};

export const cancelJoinRequest = async (requestId: string): Promise<boolean> => {
    try { await deleteDoc(doc(db, 'requests', requestId)); return true; } catch (e) { return false; }
};

export const getJoinRequests = async (orgId: string, departmentFilter?: string): Promise<(JoinRequest & { user?: User })[]> => {
    try {
        let q = query(requestsRef, where('organizationId', '==', orgId), where('status', '==', 'PENDING'));
        if (departmentFilter) q = query(q, where('targetDepartment', '==', departmentFilter));
        const snap = await getDocs(q);
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest));
        return await Promise.all(reqs.map(async r => {
            const user = await getUserById(r.userId);
            return { ...r, user: user || undefined };
        }));
    } catch (e) { return []; }
};

/**
 * UPDATED: Approve Request with Auto-Subscription for Mandatory Channels
 */
export const approveJoinRequest = async (requestId: string, request: JoinRequest, roleTitle?: string, permissions?: PermissionType[]) => {
    try {
        return await runTransaction(db, async (transaction) => {
            // 1. Get Org Channels to find Mandatory ones
            const orgRef = doc(db, 'organizations', request.organizationId);
            const orgSnap = await transaction.get(orgRef);
            if (!orgSnap.exists()) throw new Error("Org missing");
            const orgData = orgSnap.data() as Organization;
            
            const mandatoryChannels = orgData.channels.filter(c => c.isMandatory).map(c => c.id);

            // 2. Create Membership
            const membershipId = `${request.userId}_${request.organizationId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.set(memRef, { id: membershipId, userId: request.userId, organizationId: request.organizationId, role: 'MEMBER', status: 'ACTIVE', joinedAt: Date.now() });
            
            // 3. Update User (Add Org & Channels)
            const userRef = doc(db, 'users', request.userId);
            transaction.update(userRef, { 
                currentOrganizationId: request.organizationId, 
                [`pageRoles.${request.organizationId}`]: 'MEMBER',
                joinedPageIds: arrayUnion(request.organizationId),
                channelSubscriptions: arrayUnion(...mandatoryChannels) // Auto Subscribe
            });
            
            // 4. Update Request Status
            const reqRef = doc(db, 'requests', requestId);
            transaction.update(reqRef, { status: 'APPROVED' });
            
            // 5. Update Org Count
            transaction.update(orgRef, { memberCount: increment(1), members: arrayUnion(request.userId) });
            
            return true;
        });
    } catch (e) { return false; }
};

export const rejectJoinRequest = async (requestId: string) => {
    try { await updateDoc(doc(db, 'requests', requestId), { status: 'REJECTED' }); return true; } catch (e) { return false; }
};

// ... [Existing Operational Logic] ...
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
        await updateDoc(userRef, { xp: increment(xp), completedTasks: arrayUnion(taskId) });
    } catch (e) { }
};

export const createIssue = async (issue: Issue): Promise<boolean> => {
    try { await addDoc(collection(db, 'issues'), issue); return true; } catch (e) { return false; }
};

export const getOrganizationUsers = async (orgId: string): Promise<User[]> => {
    try {
        // Query users where joinedPageIds contains orgId
        const usersQ = query(usersRef, where('joinedPageIds', 'array-contains', orgId));
        const usersSnap = await getDocs(usersQ);
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) { return []; }
};

export const createCareerPath = async (path: Omit<CareerPath, 'id'>): Promise<boolean> => {
    try { await addDoc(collection(db, 'careerPaths'), path); return true; } catch (e) { return false; }
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
        // Filter within current org context
        const q = query(usersRef, where('currentOrganizationId', '==', orgId), where('department', '==', dept));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (e) { return []; }
};

export const getAllPublicOrganizations = async (): Promise<Organization[]> => {
    try {
        const snap = await getDocs(query(orgsRef, limit(100)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) { return []; }
};

export const updateOrganization = async (orgId: string, data: Partial<Organization>): Promise<boolean> => {
    try { await updateDoc(doc(db, 'organizations', orgId), data); return true; } catch (e) { return false; }
};

// --- NEW: INVITATION SYSTEM ---

export const getPendingInvites = async (userId: string): Promise<any[]> => {
    try {
        const q = query(collection(db, `users/${userId}/notifications`), where('type', '==', 'INVITE'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
};

export const acceptOrgInvite = async (userId: string, notificationId: string, link: string): Promise<boolean> => {
    // Extract OrgId from link string "/org/{id}"
    const orgId = link.split('/org/')[1];
    if (!orgId) return false;

    try {
        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            const orgSnap = await transaction.get(orgRef);
            if (!orgSnap.exists()) throw new Error("Org missing");
            const orgData = orgSnap.data() as Organization;
            const mandatoryChannels = orgData.channels.filter(c => c.isMandatory).map(c => c.id);

            const membershipId = `${userId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            const userRef = doc(db, 'users', userId);
            const notifRef = doc(db, `users/${userId}/notifications`, notificationId);

            // 1. Create Membership
            transaction.set(memRef, {
                id: membershipId,
                userId: userId,
                organizationId: orgId,
                role: 'MEMBER',
                status: 'ACTIVE',
                joinedAt: Date.now()
            });

            // 2. Update User (Auto-switch to new org + Subscribe)
            transaction.update(userRef, {
                currentOrganizationId: orgId,
                [`pageRoles.${orgId}`]: 'MEMBER',
                joinedPageIds: arrayUnion(orgId),
                channelSubscriptions: arrayUnion(...mandatoryChannels)
            });

            // 3. Update Org
            transaction.update(orgRef, {
                memberCount: increment(1),
                members: arrayUnion(userId)
            });

            // 4. Delete Notification
            transaction.delete(notifRef);
        });
        return true;
    } catch (e) {
        console.error("Accept Invite Error:", e);
        return false;
    }
};

export const declineOrgInvite = async (userId: string, notificationId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, `users/${userId}/notifications`, notificationId));
        return true;
    } catch (e) { return false; }
};
