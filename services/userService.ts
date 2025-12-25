
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
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { User, Organization } from '../types';
import { deleteFileByUrl, uploadFile, replaceFile, deleteFolder } from './storage';
import { StoragePaths } from '../utils/storagePaths';
import { followEntity, unfollowEntity } from './socialService';

// Legacy wrappers to redirect to socialService
export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    const res = await followEntity(currentUserId, targetUserId, 'USER');
    return res.success;
};

export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    return await unfollowEntity(currentUserId, targetUserId, 'USER');
};

/**
 * Fetches followed organizations by querying the sub-collection `users/{id}/following`.
 */
export const getFollowedPages = async (userId: string): Promise<Organization[]> => {
    try {
        // Query Sub-collection for items where type == 'ORGANIZATION'
        const followingRef = collection(db, `users/${userId}/following`);
        const q = query(followingRef, where('type', '==', 'ORGANIZATION'));
        const snap = await getDocs(q);
        
        if (snap.empty) return [];

        const pageIds = snap.docs.map(d => d.id);
        const safeIds = pageIds.slice(0, 10); // Firestore 'in' limit is 10-30 depending on query
        
        if (safeIds.length === 0) return [];

        const orgsQ = query(collection(db, 'organizations'), where('__name__', 'in', safeIds));
        const orgSnap = await getDocs(orgsQ);
        
        return orgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) { 
        console.error("Get Followed Pages Error:", e);
        return []; 
    }
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
