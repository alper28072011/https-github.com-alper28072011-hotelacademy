
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
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { User, UserStatus } from '../types';

const usersRef = collection(db, 'users');

export interface PaginatedUsers {
    users: User[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

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

        // 1. Search Logic (Simple Prefix Search)
        // Note: For advanced fuzzy search, integration with Algolia/Typesense is recommended.
        if (searchTerm) {
            // Using Name prefix search. Case sensitive in Firestore usually.
            // We assume names are stored in a way that allows this or we search phone.
            // Let's search by phoneNumber if it starts with + or number, otherwise name
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

            // 3. Ordering (Default: CreatedAt/JoinDate Descending)
            // Note: 'status' filter might require composite index with orderBy
            q = query(q, orderBy('joinDate', 'desc')); // Assuming joinDate is populated
        }

        // 4. Pagination
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
 */
export const deleteUserComplete = async (userId: string): Promise<boolean> => {
    try {
        // In a real system, you might want to soft-delete or anonymize.
        // For now, we do a hard delete from Firestore.
        // Note: This does NOT delete from Firebase Auth. That requires Admin SDK (Backend).
        await deleteDoc(doc(db, 'users', userId));
        return true;
    } catch (error) {
        console.error("SuperAdmin: DeleteUser Error", error);
        return false;
    }
};
