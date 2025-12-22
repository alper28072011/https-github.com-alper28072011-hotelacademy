
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs, 
    where, 
    doc, 
    updateDoc, 
    deleteDoc, 
    writeBatch,
    QueryDocumentSnapshot,
    DocumentData,
    getDoc,
    deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { User, UserStatus, Organization, OrganizationStatus, FeedPost } from '../types';
import { deleteCourseFully } from './courseService';
import { deleteFileByUrl } from './storage';

const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');

export interface PaginatedUsers {
    users: User[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * SUPER ADMIN ACTION: Toggle Status (Suspend/Active)
 */
export const setOrganizationStatus = async (orgId: string, status: OrganizationStatus): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { status });
        return true;
    } catch (error) {
        console.error("Update Org Status Error:", error);
        return false;
    }
};

/**
 * Helper: Deletes all documents in a query batch-wise.
 */
const deleteQueryBatch = async (querySnapshot: any) => {
    const chunks = chunkArray(querySnapshot.docs, 400);
    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
    }
};

/**
 * THE JUDGE'S GAVEL: Full Deletion Protocol (Hard Delete)
 * Ensures NO crumbs remain.
 */
export const executeOrganizationDeathSentence = async (orgId: string): Promise<boolean> => {
    console.log(`[DEATH SENTENCE] Executing for Org: ${orgId}`);
    try {
        // 0. Get Org Data for Logo/Cover deletion
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
            const orgData = orgSnap.data() as Organization;
            if (orgData.logoUrl) await deleteFileByUrl(orgData.logoUrl);
            if (orgData.coverUrl) await deleteFileByUrl(orgData.coverUrl);
        }

        // 1. DELETE COURSES & FILES (Heavy Operation)
        const coursesQ = query(collection(db, 'courses'), where('organizationId', '==', orgId));
        const coursesSnap = await getDocs(coursesQ);
        // Execute in parallel chunks of 5 to prevent network bottleneck
        const courseChunks = chunkArray(coursesSnap.docs, 5);
        for (const chunk of courseChunks) {
            await Promise.all(chunk.map((doc: QueryDocumentSnapshot<DocumentData>) => deleteCourseFully(doc.id)));
        }

        // 2. DELETE POSTS & FILES
        const postsQ = query(collection(db, 'posts'), where('organizationId', '==', orgId));
        const postsSnap = await getDocs(postsQ);
        for (const postDoc of postsSnap.docs) {
            const post = postDoc.data();
            if (post.mediaUrl) await deleteFileByUrl(post.mediaUrl);
            
            // Delete post likes subcollection manually (Client-side limitation)
            const likesSnap = await getDocs(collection(db, `posts/${postDoc.id}/likes`));
            await deleteQueryBatch(likesSnap);
            
            await deleteDoc(postDoc.ref);
        }

        // 3. DELETE SUB-COLLECTIONS (Analytics, etc.)
        // Firestore doesn't delete subcollections automatically. We must query them.
        const analyticsSnap = await getDocs(collection(db, `organizations/${orgId}/analytics`));
        await deleteQueryBatch(analyticsSnap);

        // 4. DELETE OPERATIONAL DATA (Tasks, Issues, etc.) + Images
        // Issues
        const issuesQ = query(collection(db, 'issues'), where('organizationId', '==', orgId));
        const issuesSnap = await getDocs(issuesQ);
        for (const d of issuesSnap.docs) {
            const data = d.data();
            if (data.photoUrl) await deleteFileByUrl(data.photoUrl); // Clean Storage
            await deleteDoc(d.ref);
        }
        
        // Tasks (Templates)
        const tasksQ = query(collection(db, 'tasks'), where('organizationId', '==', orgId));
        const tasksSnap = await getDocs(tasksQ);
        await deleteQueryBatch(tasksSnap); // Tasks usually don't have images in template definition

        // Other Collections
        const collectionsToDelete = ['positions', 'requests', 'careerPaths'];
        for (const colName of collectionsToDelete) {
            const q = query(collection(db, colName), where('organizationId', '==', orgId));
            const snap = await getDocs(q);
            await deleteQueryBatch(snap);
        }

        // 5. DETACH USERS (MEMBERSHIPS & ROLES)
        const memQ = query(collection(db, 'memberships'), where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        await deleteQueryBatch(memSnap);

        // 6. CLEAN UP USER REFERENCES (The "Crumbs")
        // We need to remove this OrgID from any user's:
        // - organizationHistory
        // - followedPageIds
        // - managedPageIds
        // - pageRoles map
        // - currentOrganizationId (if active)

        // Strategy: Query users who have this ID in arrays
        const affectedUsersQueries = [
            query(usersRef, where('organizationHistory', 'array-contains', orgId)),
            query(usersRef, where('followedPageIds', 'array-contains', orgId)),
            query(usersRef, where('managedPageIds', 'array-contains', orgId)),
            query(usersRef, where('currentOrganizationId', '==', orgId))
        ];

        // Process in parallel
        const results = await Promise.all(affectedUsersQueries.map(q => getDocs(q)));
        const usersToUpdate = new Map<string, any>(); // Map to dedup updates

        results.forEach(snap => {
            snap.docs.forEach(doc => {
                usersToUpdate.set(doc.id, doc.data());
            });
        });

        // Batch Update Users
        const userIds = Array.from(usersToUpdate.keys());
        const userChunks = chunkArray(userIds, 400);

        for (const chunk of userChunks) {
            const batch = writeBatch(db);
            for (const uid of chunk) {
                const userData = usersToUpdate.get(uid);
                const ref = doc(db, 'users', uid);
                
                const updates: any = {};

                if (userData.currentOrganizationId === orgId) {
                    updates.currentOrganizationId = null;
                    updates.department = null;
                    updates.role = 'staff'; // Reset to default
                    updates.roleTitle = null;
                    updates.positionId = null;
                    updates.assignedPathId = null;
                }

                if (userData.organizationHistory?.includes(orgId)) {
                    updates.organizationHistory = userData.organizationHistory.filter((id: string) => id !== orgId);
                }
                
                if (userData.followedPageIds?.includes(orgId)) {
                    updates.followedPageIds = userData.followedPageIds.filter((id: string) => id !== orgId);
                }

                if (userData.managedPageIds?.includes(orgId)) {
                    updates.managedPageIds = userData.managedPageIds.filter((id: string) => id !== orgId);
                }

                // Remove key from map (Firestore dot notation delete)
                if (userData.pageRoles && userData.pageRoles[orgId]) {
                    updates[`pageRoles.${orgId}`] = deleteField();
                }

                // Only update if there are changes
                if (Object.keys(updates).length > 0) {
                    batch.update(ref, updates);
                }
            }
            await batch.commit();
        }
        
        // 7. FINALLY: DELETE ORGANIZATION DOC
        await deleteDoc(orgRef);

        console.log(`[DEATH SENTENCE] Complete. Org ${orgId} erased.`);
        return true;
    } catch (error) {
        console.error("[DEATH SENTENCE] Failed:", error);
        return false;
    }
};

/**
 * DELETE USER COMPLETE
 * Removes user account AND all content they created (Posts, Courses, etc.)
 */
export const deleteUserComplete = async (userId: string): Promise<boolean> => {
    console.log(`[USER WIPE] Executing for User: ${userId}`);
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        // 0. Delete Avatar
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.avatar && userData.avatar.includes('firebasestorage')) {
                await deleteFileByUrl(userData.avatar);
            }
        }

        // 1. DELETE USER'S POSTS
        const postsQ = query(collection(db, 'posts'), where('authorId', '==', userId));
        const postsSnap = await getDocs(postsQ);
        for (const postDoc of postsSnap.docs) {
            const post = postDoc.data();
            if (post.mediaUrl) await deleteFileByUrl(post.mediaUrl);
            
            // Delete likes subcollection
            const likesSnap = await getDocs(collection(db, `posts/${postDoc.id}/likes`));
            await deleteQueryBatch(likesSnap);

            await deleteDoc(postDoc.ref);
        }

        // 2. DELETE USER'S COURSES (If any)
        const coursesQ = query(collection(db, 'courses'), where('authorId', '==', userId));
        const coursesSnap = await getDocs(coursesQ);
        for (const cDoc of coursesSnap.docs) {
            await deleteCourseFully(cDoc.id);
        }

        // 3. DELETE MEMBERSHIPS
        const memQ = query(collection(db, 'memberships'), where('userId', '==', userId));
        const memSnap = await getDocs(memQ);
        await deleteQueryBatch(memSnap);

        // 4. DELETE RELATIONSHIPS (Followers/Following)
        const relQ1 = query(collection(db, 'relationships'), where('followerId', '==', userId));
        const relQ2 = query(collection(db, 'relationships'), where('followingId', '==', userId));
        const [snap1, snap2] = await Promise.all([getDocs(relQ1), getDocs(relQ2)]);
        await deleteQueryBatch(snap1);
        await deleteQueryBatch(snap2);

        // 5. REMOVE FROM ORG STRUCTURES (OccupantId in Positions)
        const posQ = query(collection(db, 'positions'), where('occupantId', '==', userId));
        const posSnap = await getDocs(posQ);
        const batch = writeBatch(db);
        posSnap.docs.forEach(d => {
            batch.update(d.ref, { occupantId: null });
        });
        await batch.commit();

        // 6. DELETE USER DOC
        await deleteDoc(userRef);

        console.log(`[USER WIPE] Complete. User ${userId} erased.`);
        return true;
    } catch (error) {
        console.error("[USER WIPE] Error:", error);
        return false;
    }
};

// Helper: Chunk Array
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked_arr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked_arr.push(array.slice(i, i + size));
    }
    return chunked_arr;
}

// --- USER MANAGEMENT (Existing) ---

export const checkUserOwnership = async (userId: string): Promise<Organization | null> => {
    try {
        const q = query(orgsRef, where('ownerId', '==', userId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return { id: snap.docs[0].id, ...snap.docs[0].data() } as Organization;
        }
        return null;
    } catch (error) {
        return null;
    }
};

export const getAllUsers = async (
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20,
    searchTerm: string = '',
    filter: 'ALL' | 'BANNED' | 'MANAGERS' = 'ALL'
): Promise<PaginatedUsers> => {
    try {
        let q = query(usersRef);

        if (searchTerm) {
            if (searchTerm.startsWith('+') || !isNaN(Number(searchTerm[0]))) {
                 q = query(usersRef, where('phoneNumber', '>=', searchTerm), where('phoneNumber', '<=', searchTerm + '\uf8ff'));
            } else {
                 q = query(usersRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
            }
        } else {
            if (filter === 'BANNED') {
                q = query(usersRef, where('status', '==', 'BANNED'));
            } else if (filter === 'MANAGERS') {
                q = query(usersRef, where('role', 'in', ['manager', 'admin']));
            } else {
                q = query(usersRef, orderBy('joinDate', 'desc')); 
            }
        }

        q = query(q, limit(pageSize));
        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
        const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { users, lastDoc: newLastDoc };

    } catch (error) {
        console.error("SuperAdmin: GetUsers Error", error);
        return { users: [], lastDoc: null };
    }
};

export const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'users', userId), { status });
        return true;
    } catch (error) {
        console.error("SuperAdmin: UpdateStatus Error", error);
        return false;
    }
};

// Re-export for compatibility
export const deleteOrganizationFully = executeOrganizationDeathSentence;
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { ownerId: newOwnerId });
        return true;
    } catch (error) {
        return false;
    }
};
