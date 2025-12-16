
import { doc, runTransaction, updateDoc, arrayUnion, collection, query, where, getDocs, writeBatch, orderBy, limit, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Membership } from '../types';

// The ID of the System Super Admin (Safety Net)
const SYSTEM_ADMIN_ID = 'SYSTEM_ARCHIVE_VAULT'; 

/**
 * Returns a list of potential successors (Admins or Managers), sorted by seniority (joinedAt).
 */
export const getBackupAdmins = async (orgId: string, excludeUserId: string): Promise<Membership[]> => {
    try {
        const q = query(
            collection(db, 'memberships'),
            where('organizationId', '==', orgId),
            where('role', 'in', ['admin', 'manager']),
            orderBy('joinedAt', 'asc') // Oldest member first
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(d => d.data() as Membership)
            .filter(m => m.userId !== excludeUserId);
    } catch (e) {
        console.error("Failed to fetch backup admins:", e);
        return [];
    }
};

/**
 * Transfers ownership of an organization to another user.
 * Updates Organization doc AND upgrades the new owner's membership/role.
 */
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Update Organization
            const orgRef = doc(db, 'organizations', orgId);
            transaction.update(orgRef, { ownerId: newOwnerId });

            // 2. Upgrade New Owner's Membership
            const membershipId = `${newOwnerId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.update(memRef, { role: 'manager' }); // Ensure they have top rights

            // 3. Update New Owner's User Profile
            const userRef = doc(db, 'users', newOwnerId);
            transaction.update(userRef, { role: 'manager' });
        });
        return true;
    } catch (error) {
        console.error("Transfer Ownership Failed:", error);
        return false;
    }
};

/**
 * CASCADING DELETE: Deletes an organization and ALL related data.
 * PROTECTS USERS: Users are NOT deleted, just detached.
 */
export const deleteOrganizationFully = async (orgId: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);

        // 1. Delete Organization Doc
        const orgRef = doc(db, 'organizations', orgId);
        batch.delete(orgRef);

        // 2. Fetch Memberships to detach users
        const memQ = query(collection(db, 'memberships'), where('organizationId', '==', orgId));
        const memSnap = await getDocs(memQ);
        
        memSnap.docs.forEach(memDoc => {
            const data = memDoc.data();
            // Delete Membership
            batch.delete(memDoc.ref);
            
            // Detach User (Set currentOrg to null)
            const userRef = doc(db, 'users', data.userId);
            // We use update here. In a massive batch, this might hit limits (500 ops).
            // For production scalability, this part should be a Cloud Function.
            // For this architecture, we assume < 500 members or safe batching.
            batch.update(userRef, { 
                currentOrganizationId: null,
                role: 'staff' // Reset role to default
            });
        });

        // 3. Delete Related Data (Posts, Courses, Tasks)
        // Helper to batch delete by query
        const deleteCollectionByOrg = async (colName: string) => {
            const q = query(collection(db, colName), where('organizationId', '==', orgId));
            const snap = await getDocs(q);
            snap.docs.forEach(d => batch.delete(d.ref));
        };

        await deleteCollectionByOrg('posts');
        await deleteCollectionByOrg('tasks');
        await deleteCollectionByOrg('courses');
        await deleteCollectionByOrg('careerPaths');
        await deleteCollectionByOrg('requests');

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Cascading Delete Error:", error);
        return false;
    }
};

/**
 * SENARYO 1: Archive Protocol (Legacy)
 * Keep for reference if "Soft Delete" is needed instead of Hard Delete.
 */
export const archiveOrganization = async (orgId: string, currentOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            const userRef = doc(db, 'users', currentOwnerId);
            
            transaction.update(orgRef, {
                ownerId: SYSTEM_ADMIN_ID,
                status: 'ARCHIVED',
                legacyOwnerId: currentOwnerId
            });

            transaction.update(userRef, {
                currentOrganizationId: null,
                role: 'staff',
                organizationHistory: arrayUnion(orgId)
            });
        });
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Detach user from specific org (Leave Logic)
 */
export const leaveOrganization = async (userId: string, orgId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const membershipId = `${userId}_${orgId}`;
            const membershipRef = doc(db, 'memberships', membershipId);
            
            transaction.delete(membershipRef);
            transaction.update(userRef, {
                currentOrganizationId: null,
                organizationHistory: arrayUnion(orgId)
            });
        });
        return true;
    } catch (error) {
        return false;
    }
};

export const detachUserFromAllOrgs = async (userId: string) => {
    const batch = writeBatch(db);
    const q = query(collection(db, 'memberships'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};
