
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, writeBatch, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth'; // Client SDK
import { db, auth } from './firebase';
import { User, UserPreferences } from '../types';
import { detachUserFromAllOrgs, getBackupAdmins, transferOwnership } from './organizationService';
import { checkUserOwnership } from './superAdminService';
import { deleteFileByUrl, uploadFile } from './storage';
import { deleteCourseFully } from './courseService';

/**
 * Updates user language preferences.
 */
export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            preferences: preferences // Merges with existing due to Partial, but for nested object in Firestore we might need dot notation if we want to update only one field without overwriting the whole map.
            // However, Firestore update merges top-level fields. For nested 'preferences', it would replace the whole map if we just pass { preferences: ... }.
            // To update safely:
        });
        
        // Better approach for nested update using dot notation if needed, 
        // but since we usually update one or both, passing the full object is safer if we read it first in the store.
        // For now, let's assume the store passes the full merged object or we use dot notation construction.
        
        const updates: any = {};
        if (preferences.appLanguage) updates['preferences.appLanguage'] = preferences.appLanguage;
        if (preferences.contentLanguage) updates['preferences.contentLanguage'] = preferences.contentLanguage;
        
        await updateDoc(doc(db, 'users', userId), updates);

        return true;
    } catch (e) {
        console.error("Preferences Update Failed:", e);
        return false;
    }
};

/**
 * Updates the user's profile photo.
 * 1. Deletes old photo if exists.
 * 2. Uploads new optimized photo.
 * 3. Updates DB.
 */
export const updateProfilePhoto = async (userId: string, file: File, oldUrl?: string): Promise<string | null> => {
    try {
        // 1. Delete old
        if (oldUrl) await deleteFileByUrl(oldUrl);

        // 2. Upload new (Auto compressed by uploadFile)
        const downloadUrl = await uploadFile(file, `users/${userId}/avatar`, undefined, 'AVATAR');

        // 3. Update DB
        await updateDoc(doc(db, 'users', userId), { avatar: downloadUrl });
        
        return downloadUrl;
    } catch (e) {
        console.error("Profile Photo Update Failed:", e);
        return null;
    }
};

/**
 * Removes the user's profile photo.
 */
export const removeProfilePhoto = async (userId: string, photoUrl: string): Promise<boolean> => {
    try {
        await deleteFileByUrl(photoUrl);
        
        // Generate Initials for fallback in DB (optional, but UI handles it dynamically now)
        // Better to set to empty string or null to trigger UI fallback
        await updateDoc(doc(db, 'users', userId), { avatar: '' }); 
        
        return true;
    } catch (e) {
        console.error("Profile Photo Removal Failed:", e);
        return false;
    }
};

/**
 * Suspends a user account (Temporary Freeze).
 */
export const suspendAccount = async (userId: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            status: 'SUSPENDED',
            isSuspended: true
        });
        return true;
    } catch (e) {
        console.error("Suspend failed:", e);
        return false;
    }
};

/**
 * Downloads all user data as a JSON file.
 */
export const downloadUserData = async (userId: string): Promise<Blob | null> => {
    try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        const profile = userSnap.exists() ? userSnap.data() : null;
        if (!profile) return null;

        const postsQ = query(collection(db, 'posts'), where('authorId', '==', userId));
        const postsSnap = await getDocs(postsQ);
        const posts = postsSnap.docs.map(d => ({id: d.id, ...d.data()}));

        const memQ = query(collection(db, 'memberships'), where('userId', '==', userId));
        const memSnap = await getDocs(memQ);
        const memberships = memSnap.docs.map(d => d.data());

        const fullData = {
            profile,
            posts,
            memberships,
            exportDate: new Date().toISOString(),
            platform: "Hotel Academy"
        };

        const jsonStr = JSON.stringify(fullData, null, 2);
        return new Blob([jsonStr], { type: "application/json" });
    } catch (e) {
        return null;
    }
};

/**
 * VALIDATION: Checks if a user can be deleted safely.
 */
export const validateUserDeletion = async (userId: string): Promise<{ 
    canDelete: boolean; 
    reason?: 'SOLE_OWNER' | 'HAS_SUCCESSORS' | 'SAFE'; 
    orgName?: string;
    orgId?: string;
}> => {
    // Check if they own an active organization
    const ownedOrg = await checkUserOwnership(userId);
    
    if (!ownedOrg || ownedOrg.status === 'ARCHIVED') {
        return { canDelete: true, reason: 'SAFE' };
    }

    // If owner, check for backups
    const backups = await getBackupAdmins(ownedOrg.id, userId);
    
    if (backups.length === 0) {
        return { 
            canDelete: false, 
            reason: 'SOLE_OWNER', 
            orgName: ownedOrg.name,
            orgId: ownedOrg.id 
        };
    }

    return { 
        canDelete: true, 
        reason: 'HAS_SUCCESSORS', 
        orgId: ownedOrg.id 
    };
};

/**
 * SMART DELETE PROTOCOL
 * Handles ownership transfers, file cleanups, and data detachment.
 */
export const deleteUserSmart = async (user: User): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Validate Ownership Status
        const validation = await validateUserDeletion(user.id);

        if (!validation.canDelete && validation.reason === 'SOLE_OWNER') {
            return { 
                success: false, 
                error: `"${validation.orgName}" işletmesinin tek yöneticisisiniz. Hesabınızı silmek için önce işletmeyi silmeli veya yetkiyi devretmelisiniz.` 
            };
        }

        // 2. Handle Succession (If needed)
        if (validation.reason === 'HAS_SUCCESSORS' && validation.orgId) {
            const backups = await getBackupAdmins(validation.orgId, user.id);
            const successor = backups[0]; // Oldest admin
            
            // Transfer crown
            await transferOwnership(validation.orgId, successor.userId, user.id);
            
            // Notify Successor
            await addDoc(collection(db, `users/${successor.userId}/notifications`), {
                title: 'Yönetim Devri',
                message: `${user.name} hesabı silindiği için işletme sahipliği size devredildi.`,
                type: 'alert',
                isRead: false,
                createdAt: serverTimestamp()
            });
        }

        // 3. STORAGE CLEANUP: Avatar
        if (user.avatar && user.avatar.includes('firebasestorage')) {
            await deleteFileByUrl(user.avatar);
        }

        // 4. DELETE PERSONAL CONTENT (Courses & Media)
        const coursesQ = query(
            collection(db, 'courses'), 
            where('authorId', '==', user.id),
            where('authorType', '==', 'USER') // Only personal content
        );
        const coursesSnap = await getDocs(coursesQ);
        
        // Execute course deletions in parallel chunks to avoid timeout
        const courseDeletions = coursesSnap.docs.map(doc => deleteCourseFully(doc.id));
        await Promise.all(courseDeletions);

        // 5. ANONYMIZE SOCIAL CONTENT (Posts)
        await anonymizeUserContent(user.id);

        // 6. DETACH MEMBERSHIPS
        await detachUserFromAllOrgs(user.id);

        // 7. DELETE FIRESTORE PROFILE
        await deleteDoc(doc(db, 'users', user.id));

        // 8. DELETE AUTH (Client Side)
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === user.id) {
            await deleteUser(currentUser);
        }

        return { success: true };

    } catch (error: any) {
        console.error("Smart Delete Failed:", error);
        return { success: false, error: error.message || "Silme işlemi başarısız." };
    }
};

/**
 * Helper: Anonymize Content (Posts)
 */
const anonymizeUserContent = async (userId: string) => {
    const batch = writeBatch(db);
    const MAX_BATCH_SIZE = 400; 
    
    // Posts
    const postsQ = query(collection(db, 'posts'), where('authorId', '==', userId));
    const postsSnap = await getDocs(postsQ);
    let count = 0;
    
    postsSnap.docs.forEach(d => {
        if (count < MAX_BATCH_SIZE) {
            batch.update(d.ref, {
                authorName: 'Eski Kullanıcı',
                authorAvatar: '',
                authorId: 'deleted_user'
            });
            count++;
        }
    });

    if (count > 0) await batch.commit();
};
