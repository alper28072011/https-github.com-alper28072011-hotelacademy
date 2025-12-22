
import { 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    runTransaction, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User, Organization } from '../types';

/**
 * Follow a user.
 * Adds targetId to current's 'following' array.
 * Adds currentId to target's 'followers' array.
 */
export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);

            // Check if target exists
            const targetSnap = await transaction.get(targetUserRef);
            if (!targetSnap.exists()) throw new Error("User does not exist");

            // Update Current User
            transaction.update(currentUserRef, {
                following: arrayUnion(targetUserId)
            });

            // Update Target User
            transaction.update(targetUserRef, {
                followers: arrayUnion(currentUserId)
            });
        });
        return true;
    } catch (e) {
        console.error("Follow User Error:", e);
        return false;
    }
};

/**
 * Unfollow a user.
 */
export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);

            transaction.update(currentUserRef, {
                following: arrayRemove(targetUserId)
            });

            transaction.update(targetUserRef, {
                followers: arrayRemove(currentUserId)
            });
        });
        return true;
    } catch (e) {
        console.error("Unfollow User Error:", e);
        return false;
    }
};

/**
 * Get the full Page objects that a user follows.
 */
export const getFollowedPages = async (userId: string): Promise<Organization[]> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) return [];
        
        const userData = userSnap.data() as User;
        const pageIds = userData.followedPageIds || [];

        if (pageIds.length === 0) return [];

        // Firestore 'in' query supports max 10 items. 
        // For production, we would need to batch this or duplicate data.
        // For now, we'll fetch the first 10.
        const safeIds = pageIds.slice(0, 10);
        
        const q = query(collection(db, 'organizations'), where('__name__', 'in', safeIds));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) {
        console.error("Get Followed Pages Error:", e);
        return [];
    }
};

export const updateUserPreferences = async (userId: string, data: any) => {
    try {
        await updateDoc(doc(db, 'users', userId), data);
        return true;
    } catch (e) {
        return false;
    }
};

export const updateProfilePhoto = async (userId: string, file: File, oldUrl?: string) => {
    // Placeholder for storage upload logic
    return "https://via.placeholder.com/150"; 
};

export const removeProfilePhoto = async (userId: string, oldUrl: string) => {
    await updateDoc(doc(db, 'users', userId), { avatar: '' });
    return true;
};

export const deleteUserSmart = async (user: User): Promise<{ success: boolean; error?: string }> => {
    // 1. Check if they own an organization
    const orgsRef = collection(db, 'organizations');
    const q = query(orgsRef, where('ownerId', '==', user.id));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { success: false, error: "İşletme sahibi olduğunuz için hesabınızı silemezsiniz. Önce sahipliği devredin veya işletmeyi silin." };
    }

    try {
        // Delete user doc
        await deleteDoc(doc(db, 'users', user.id));
        // Delete auth user (requires recent login usually, might fail if stale)
        const authUser = auth.currentUser;
        if (authUser) {
            await authUser.delete();
        }
        return { success: true };
    } catch (e: any) {
        console.error("Delete User Error:", e);
        return { success: false, error: e.message || "Silme işlemi başarısız." };
    }
};