
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
import { User, UserStatus, Organization } from '../types';

const usersRef = collection(db, 'users');
const orgsRef = collection(db, 'organizations');

export interface PaginatedUsers {
    users: User[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * Check if user owns any organization
 */
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

/**
 * CASCADING DELETE: Deletes an organization and ALL related data.
 * This acts as the "Judge's Gavel".
 */
export const deleteOrganizationFully = async (orgId: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);

        // 1. Delete Organization Doc
        const orgRef = doc(db, 'organizations', orgId);
        batch.delete(orgRef);

        // 2. Clean Memberships
        // (Note: For large scale, we'd query and delete in chunks. For now, limit 500 is safe assumption for demo)
        const memQ = query(collection(db, 'memberships'), where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        memSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. Clean Posts
        const postQ = query(collection(db, 'posts'), where('organizationId', '==', orgId));
        const postSnap = await getDocs(postQ);
        postSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 4. Clean Tasks
        const taskQ = query(collection(db, 'tasks'), where('organizationId', '==', orgId));
        const taskSnap = await getDocs(taskQ);
        taskSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 5. Update Users (Eviction) - Set their currentOrganizationId to null if it matches
        // This is tricky in batch if there are many users. We do it for the active members found.
        memSnap.docs.forEach(memDoc => {
            const userId = memDoc.data().userId;
            const userRef = doc(db, 'users', userId);
            // We can't conditionally update in a batch easily without reading, 
            // but we can blindly set currentOrganizationId to null if we assume they are active.
            // A cleaner way is "Soft Eviction" - let the client handle the null check next time they load.
            // Here we just remove the membership, which effectively kicks them out.
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Cascading Delete Error:", error);
        return false;
    }
};

/**
 * Transfer Ownership
 */
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { ownerId: newOwnerId });
        // Grant new owner manager role if not already
        // This logic would require finding their membership and updating it.
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Fetch Users with Cursor-Based Pagination
 */
export const getAllUsers = async (
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20,
    searchTerm: string = '',
    filter: 'ALL' | 'BANNED' | 'MANAGERS' = 'ALL'
): Promise<PaginatedUsers> => {
    try {
        let q = query(usersRef);

        // 1. Search Logic
        if (searchTerm) {
            if (searchTerm.startsWith('+') || !isNaN(Number(searchTerm[0]))) {
                 q = query(usersRef, where('phoneNumber', '>=', searchTerm), where('phoneNumber', '<=', searchTerm + '\uf8ff'));
            } else {
                 q = query(usersRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
            }
        } else {
            // 2. Filter Logic
            if (filter === 'BANNED') {
                q = query(usersRef, where('status', '==', 'BANNED'));
            } else if (filter === 'MANAGERS') {
                q = query(usersRef, where('role', 'in', ['manager', 'admin']));
            }
            q = query(q, orderBy('joinDate', 'desc')); 
        }

        // 3. Pagination
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

/**
 * Update User Status (Ban/Unban)
 */
export const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'users', userId), { status });
        return true;
    } catch (error) {
        console.error("SuperAdmin: UpdateStatus Error", error);
        return false;
    }
};

/**
 * Soft Delete / Hard Delete User
 * Note: Does not delete from Firebase Auth unless called from client context of that user.
 */
export const deleteUserComplete = async (userId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'users', userId));
        // Note: Clean up memberships too?
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
