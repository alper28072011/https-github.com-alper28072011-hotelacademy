
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
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { User, Organization } from '../types';
import { deleteFileByUrl, uploadFile } from './storage';

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
    try {
        // 1. Upload new file using the storage service (includes compression)
        const downloadURL = await uploadFile(file, `user_avatars/${userId}`, undefined, 'AVATAR');

        // 2. Update Firestore User Document
        await updateDoc(doc(db, 'users', userId), { avatar: downloadURL });

        // 3. Clean up old file if it exists and is different
        if (oldUrl && oldUrl !== downloadURL && oldUrl.includes('firebasestorage')) {
            await deleteFileByUrl(oldUrl).catch(e => console.warn("Failed to delete old avatar", e));
        }

        return downloadURL;
    } catch (e) {
        console.error("Profile Photo Update Failed:", e);
        throw e;
    }
};

export const removeProfilePhoto = async (userId: string, oldUrl: string) => {
    if (oldUrl) await deleteFileByUrl(oldUrl);
    await updateDoc(doc(db, 'users', userId), { avatar: '' });
    return true;
};

/**
 * SELF DELETION PROTOCOL
 * Requires password for re-authentication to prevent "auth/requires-recent-login" error.
 * Ensures both Firestore data AND Firebase Auth record are deleted.
 */
export const deleteUserSmart = async (user: User, password?: string): Promise<{ success: boolean; error?: string }> => {
    const authUser = auth.currentUser;
    
    if (!authUser || !password) {
        return { success: false, error: "Güvenlik onayı için şifre gereklidir." };
    }

    // 1. Check if they own an organization
    const orgsRef = collection(db, 'organizations');
    const q = query(orgsRef, where('ownerId', '==', user.id));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { success: false, error: "İşletme sahibi olduğunuz için hesabınızı silemezsiniz. Önce sahipliği devredin veya işletmeyi silin." };
    }

    try {
        // 2. Re-authenticate User (CRITICAL STEP)
        // This generates a fresh token required for deletion
        const credential = EmailAuthProvider.credential(authUser.email!, password);
        await reauthenticateWithCredential(authUser, credential);

        // 3. Clean up Firestore Data (Basic cleanup)
        
        // Delete Avatar
        if (user.avatar && user.avatar.includes('firebasestorage')) {
            await deleteFileByUrl(user.avatar);
        }

        // Delete User Document
        await deleteDoc(doc(db, 'users', user.id));

        // 4. Delete Auth User (The one causing "email-already-in-use")
        await deleteUser(authUser);

        return { success: true };
    } catch (e: any) {
        console.error("Delete User Error:", e);
        if (e.code === 'auth/wrong-password') {
            return { success: false, error: "Girdiğiniz şifre hatalı." };
        }
        if (e.code === 'auth/requires-recent-login') {
            return { success: false, error: "Oturumunuz zaman aşımına uğradı. Lütfen çıkış yapıp tekrar girdikten sonra deneyin." };
        }
        return { success: false, error: "Silme işlemi sırasında bir hata oluştu: " + e.message };
    }
};
