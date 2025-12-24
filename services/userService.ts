
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
import { deleteFileByUrl, uploadFile, replaceFile, deleteFolder } from './storage';
import { StoragePaths } from '../utils/storagePaths';

// ... (Existing functions like followUser, unfollowUser kept same, just ensuring types match)

/**
 * Follow a user.
 */
export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);

            const targetSnap = await transaction.get(targetUserRef);
            if (!targetSnap.exists()) throw new Error("User does not exist");

            transaction.update(currentUserRef, { following: arrayUnion(targetUserId) });
            transaction.update(targetUserRef, { followers: arrayUnion(currentUserId) });
        });
        return true;
    } catch (e) { return false; }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);
            transaction.update(currentUserRef, { following: arrayRemove(targetUserId) });
            transaction.update(targetUserRef, { followers: arrayRemove(currentUserId) });
        });
        return true;
    } catch (e) { return false; }
};

export const getFollowedPages = async (userId: string): Promise<Organization[]> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return [];
        const userData = userSnap.data() as User;
        const pageIds = userData.followedPageIds || [];
        if (pageIds.length === 0) return [];
        const safeIds = pageIds.slice(0, 10);
        const q = query(collection(db, 'organizations'), where('__name__', 'in', safeIds));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) { return []; }
};

export const updateUserPreferences = async (userId: string, data: any) => {
    try { await updateDoc(doc(db, 'users', userId), data); return true; } catch (e) { return false; }
};

export const updateProfilePhoto = async (userId: string, file: File, oldUrl?: string) => {
    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const storagePath = StoragePaths.userAvatar(userId, fileName);
        const downloadURL = await replaceFile(oldUrl, file, storagePath, 'AVATAR');
        await updateDoc(doc(db, 'users', userId), { avatar: downloadURL });
        return downloadURL;
    } catch (e) { throw e; }
};

export const removeProfilePhoto = async (userId: string, oldUrl: string) => {
    if (oldUrl) await deleteFileByUrl(oldUrl);
    await updateDoc(doc(db, 'users', userId), { avatar: '' });
    return true;
};

export const deleteUserSmart = async (user: User, password?: string): Promise<{ success: boolean; error?: string }> => {
    const authUser = auth.currentUser;
    if (!authUser || !password) return { success: false, error: "Güvenlik onayı için şifre gereklidir." };

    const orgsRef = collection(db, 'organizations');
    const q = query(orgsRef, where('ownerId', '==', user.id));
    const snap = await getDocs(q);
    if (!snap.empty) return { success: false, error: "İşletme sahibi olduğunuz için hesabınızı silemezsiniz." };

    try {
        const credential = EmailAuthProvider.credential(authUser.email!, password);
        await reauthenticateWithCredential(authUser, credential);
        await deleteFolder(StoragePaths.userRoot(user.id));
        await deleteDoc(doc(db, 'users', user.id));
        await deleteUser(authUser);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Silme işlemi sırasında bir hata oluştu: " + e.message };
    }
};

/**
 * Sets the Primary Network for a user (Identity Shift).
 */
export const setPrimaryNetwork = async (userId: string, networkId: string, role: 'ADMIN' | 'MEMBER' | 'ALUMNI' = 'MEMBER') => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            primaryNetworkId: networkId,
            primaryNetworkRole: role,
            currentOrganizationId: networkId // Also set context to match identity
        });
        return true;
    } catch (e) {
        console.error("Set Primary Network Failed:", e);
        return false;
    }
};

/**
 * Sets the Vision (Career Path) for a user.
 */
export const setCareerVision = async (userId: string, pathId: string) => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            targetCareerPathId: pathId,
            assignedPathId: pathId // Maintain backward compatibility
        });
        return true;
    } catch (e) {
        return false;
    }
};
