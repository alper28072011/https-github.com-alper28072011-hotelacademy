
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
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, UserStatus, Organization, OrganizationStatus } from '../types';
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
 * THE JUDGE'S GAVEL: Full Deletion Protocol
 * 1. Deletes Org Logo.
 * 2. Deletes ALL Courses + Media Files.
 * 3. Deletes ALL Posts + Media Files.
 * 4. Detaches ALL users (Batch).
 * 5. Deletes all related collections.
 * 6. Deletes the Organization document.
 */
export const executeOrganizationDeathSentence = async (orgId: string): Promise<boolean> => {
    try {
        // 0. Get Org Data for Logo
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
            const orgData = orgSnap.data() as Organization;
            if (orgData.logoUrl) await deleteFileByUrl(orgData.logoUrl);
            if (orgData.coverUrl) await deleteFileByUrl(orgData.coverUrl);
        }

        // 1. DELETE COURSES & FILES
        const coursesQ = query(collection(db, 'courses'), where('organizationId', '==', orgId));
        const coursesSnap = await getDocs(coursesQ);
        // Execute in parallel chunks of 10 to prevent overwhelming
        const courseChunks = chunkArray(coursesSnap.docs, 10);
        for (const chunk of courseChunks) {
            await Promise.all(chunk.map((doc: QueryDocumentSnapshot<DocumentData>) => deleteCourseFully(doc.id)));
        }

        // 2. DELETE POSTS & FILES
        const postsQ = query(collection(db, 'posts'), where('organizationId', '==', orgId));
        const postsSnap = await getDocs(postsQ);
        for (const postDoc of postsSnap.docs) {
            const post = postDoc.data();
            if (post.mediaUrl) await deleteFileByUrl(post.mediaUrl);
            await deleteDoc(postDoc.ref);
        }

        // 3. DETACH USERS (BATCHED)
        const memQ = query(collection(db, 'memberships'), where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        
        const membershipChunks = chunkArray(memSnap.docs, 400); // Firestore batch limit is 500
        
        for (const chunk of membershipChunks) {
            const batch = writeBatch(db);
            chunk.forEach((memDoc: QueryDocumentSnapshot<DocumentData>) => {
                const data = memDoc.data();
                batch.delete(memDoc.ref); // Delete Membership
                
                const userRef = doc(db, 'users', data.userId);
                batch.update(userRef, { 
                    currentOrganizationId: null,
                    role: 'staff',
                    positionId: null,
                    roleTitle: null,
                    department: null,
                    assignedPathId: null
                });
            });
            await batch.commit();
        }

        // 4. CASCADE DELETE OTHER COLLECTIONS
        const batch = writeBatch(db);
        const collectionsToDelete = ['tasks', 'positions', 'requests', 'issues', 'careerPaths'];
        
        for (const colName of collectionsToDelete) {
            const q = query(collection(db, colName), where('organizationId', '==', orgId));
            const snap = await getDocs(q);
            snap.docs.forEach(d => batch.delete(d.ref));
        }
        
        // 5. DELETE ORGANIZATION DOC
        batch.delete(orgRef);
        await batch.commit();

        return true;
    } catch (error) {
        console.error("Death Sentence Failed:", error);
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

export const deleteUserComplete = async (userId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'users', userId));
        const batch = writeBatch(db);
        const memQ = query(collection(db, 'memberships'), where('userId', '==', userId));
        const memSnap = await getDocs(memQ);
        memSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        return true;
    } catch (error) {
        console.error("SuperAdmin: DeleteUser Error", error);
        return false;
    }
};

// Re-export for compatibility if needed, though executeOrganizationDeathSentence is better named
export const deleteOrganizationFully = executeOrganizationDeathSentence;
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { ownerId: newOwnerId });
        return true;
    } catch (error) {
        return false;
    }
};
