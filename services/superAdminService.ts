
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
 * 1. Detaches ALL users (sets currentOrg = null, role = staff).
 * 2. Deletes memberships.
 * 3. Deletes Org-specific content (Cascade).
 * 4. Deletes the Organization document.
 */
export const executeOrganizationDeathSentence = async (orgId: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);

        // 1. Fetch & Detach Users
        const memQ = query(collection(db, 'memberships'), where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        
        memSnap.docs.forEach(memDoc => {
            const data = memDoc.data();
            
            // Delete Membership
            batch.delete(memDoc.ref);
            
            // Free the User (Update Profile)
            const userRef = doc(db, 'users', data.userId);
            batch.update(userRef, { 
                currentOrganizationId: null,
                role: 'staff',
                positionId: null,
                roleTitle: null,
                department: null // Optional: clear dept or keep it? Clearing ensures clean slate.
            });
        });

        // 2. Cascade Delete Content (Limit to avoid batch overflow, in prod use Cloud Functions)
        // Deleting Org's Posts
        const postQ = query(collection(db, 'posts'), where('organizationId', '==', orgId));
        const postSnap = await getDocs(postQ);
        postSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Deleting Org's Courses
        const courseQ = query(collection(db, 'courses'), where('organizationId', '==', orgId));
        const courseSnap = await getDocs(courseQ);
        courseSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Deleting Org's Tasks
        const taskQ = query(collection(db, 'tasks'), where('organizationId', '==', orgId));
        const taskSnap = await getDocs(taskQ);
        taskSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Deleting Org's Positions (Chart)
        const posQ = query(collection(db, 'positions'), where('organizationId', '==', orgId));
        const posSnap = await getDocs(posQ);
        posSnap.docs.forEach(doc => batch.delete(doc.ref));

        // 3. Delete The Organization
        const orgRef = doc(db, 'organizations', orgId);
        batch.delete(orgRef);

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Death Sentence Failed:", error);
        return false;
    }
};

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
