
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, writeBatch, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth'; // Client SDK
import { db, auth } from './firebase';
import { User } from '../types';
import { detachUserFromAllOrgs, getBackupAdmins, transferOwnership } from './organizationService';
import { checkUserOwnership } from './superAdminService';

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
 * Handles ownership transfers and cleanups automatically.
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

        // 3. Anonymize Content (Keep data, remove PII)
        await anonymizeUserContent(user.id);

        // 4. Detach Memberships
        await detachUserFromAllOrgs(user.id);

        // 5. Delete Firestore Profile
        await deleteDoc(doc(db, 'users', user.id));

        // 6. Delete Auth (Client Side)
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
 * Helper: Anonymize Content
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
                authorAvatar: 'https://ui-avatars.com/api/?name=Deleted&background=random',
                authorId: 'deleted_user'
            });
            count++;
        }
    });

    if (count > 0) await batch.commit();
};