
import { doc, runTransaction, updateDoc, arrayUnion, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

// The ID of the System Super Admin (Safety Net)
// In a real app, this might be dynamic or env var. 
// Using the ID of user '+905417726743' or a dedicated system account.
const SYSTEM_ADMIN_ID = 'SYSTEM_ARCHIVE_VAULT'; 

/**
 * SENARYO 1: Safety Net Protocol
 * Arşivleme işlemi. Oteli silmez, "System" kullanıcısına devreder.
 */
export const archiveOrganization = async (orgId: string, currentOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            const userRef = doc(db, 'users', currentOwnerId);
            const membershipId = `${currentOwnerId}_${orgId}`;
            const membershipRef = doc(db, 'memberships', membershipId);

            // 1. Transfer Org to System
            transaction.update(orgRef, {
                ownerId: SYSTEM_ADMIN_ID,
                status: 'ARCHIVED',
                legacyOwnerId: currentOwnerId
            });

            // 2. Downgrade User to Staff (Free Agent)
            transaction.update(userRef, {
                currentOrganizationId: null, // Kick out
                role: 'staff',
                organizationHistory: arrayUnion(orgId) // Keep history
            });

            // 3. Deactivate Membership
            // We verify if membership exists first
            const memDoc = await transaction.get(membershipRef);
            if (memDoc.exists()) {
                transaction.delete(membershipRef); // or status: 'ARCHIVED'
            }
        });
        return true;
    } catch (error) {
        console.error("Archive Protocol Failed:", error);
        return false;
    }
};

/**
 * SENARYO 3A: Free Agent Protocol (Staff Leaves)
 * Personel kendi isteğiyle ayrılır.
 */
export const leaveOrganization = async (userId: string, orgId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            
            // 1. Find Membership
            const membershipId = `${userId}_${orgId}`;
            const membershipRef = doc(db, 'memberships', membershipId);
            
            // 2. Delete Membership
            transaction.delete(membershipRef);

            // 3. Update User Profile
            transaction.update(userRef, {
                currentOrganizationId: null,
                organizationHistory: arrayUnion(orgId)
            });
        });
        return true;
    } catch (error) {
        console.error("Leave Protocol Failed:", error);
        return false;
    }
};

/**
 * Yardımcı: Bir kullanıcının tüm üyeliklerini siler (Temizlik için)
 */
export const detachUserFromAllOrgs = async (userId: string) => {
    const batch = writeBatch(db);
    const q = query(collection(db, 'memberships'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};
