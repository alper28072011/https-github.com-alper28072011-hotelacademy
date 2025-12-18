
import { doc, runTransaction, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Membership, Position, Organization } from '../types';

// --- POSITION MANAGEMENT (ORG CHART) ---

export const getOrgPositions = async (orgId: string): Promise<Position[]> => {
    try {
        const q = query(collection(db, 'positions'), where('organizationId', '==', orgId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Position));
    } catch (e) {
        console.error("Get Positions Error:", e);
        return [];
    }
};

export const createPosition = async (position: Omit<Position, 'id'>): Promise<string | null> => {
    try {
        const ref = doc(collection(db, 'positions'));
        await setDoc(ref, { ...position, id: ref.id });
        return ref.id;
    } catch (e) {
        console.error("Create Position Error:", e);
        return null;
    }
};

export const deletePosition = async (positionId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'positions', positionId));
        return true;
    } catch (e) {
        return false;
    }
};

export const assignUserToPosition = async (orgId: string, positionId: string, userId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const posRef = doc(db, 'positions', positionId);
            const posSnap = await transaction.get(posRef);
            if (!posSnap.exists()) throw new Error("Position not found");
            const posData = posSnap.data() as Position;

            transaction.update(posRef, { occupantId: userId });

            const userRef = doc(db, 'users', userId);
            transaction.update(userRef, { 
                positionId: positionId,
                roleTitle: posData.title,
                department: posData.departmentId
            });

            const membershipId = `${userId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.update(memRef, {
                positionId: positionId,
                roleTitle: posData.title,
                department: posData.departmentId
            });
        });
        return true;
    } catch (e) {
        console.error("Assign User Error:", e);
        return false;
    }
};

export const removeUserFromPosition = async (positionId: string): Promise<boolean> => {
    try {
        const posRef = doc(db, 'positions', positionId);
        await updateDoc(posRef, { occupantId: null });
        return true;
    } catch (e) {
        return false;
    }
};

// --- OWNER ACTIONS ---

/**
 * Request Deletion: Owner asks Super Admin to nuke the org.
 */
export const requestOrganizationDeletion = async (orgId: string, reason: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), {
            status: 'PENDING_DELETION',
            deletionReason: reason
        });
        return true;
    } catch (error) {
        console.error("Deletion Request Failed:", error);
        return false;
    }
};

/**
 * Transfer Ownership: Crown passed to another user.
 * 1. Update Org ownerId
 * 2. Demote old owner to 'manager'
 * 3. Promote new owner to 'manager' (Conceptually 'Owner' role is derived from org.ownerId)
 */
export const transferOwnership = async (orgId: string, newOwnerId: string, currentOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Update Org
            const orgRef = doc(db, 'organizations', orgId);
            transaction.update(orgRef, { ownerId: newOwnerId });

            // 2. Update New Owner Membership
            const newMemId = `${newOwnerId}_${orgId}`;
            const newMemRef = doc(db, 'memberships', newMemId);
            // Ensure they are at least a manager
            transaction.update(newMemRef, { role: 'manager' });

            // 3. Update Old Owner Membership (Optional: Keep as manager or downgrade?)
            // Usually old owner stays as manager to help transition
            const oldMemId = `${currentOwnerId}_${orgId}`;
            const oldMemRef = doc(db, 'memberships', oldMemId);
            transaction.update(oldMemRef, { role: 'manager' });
        });
        return true;
    } catch (error) {
        console.error("Transfer Ownership Failed:", error);
        return false;
    }
};

/**
 * Returns potential successors (Admins/Managers) for transfer.
 */
export const getPotentialSuccessors = async (orgId: string, currentOwnerId: string): Promise<User[]> => {
    try {
        const memQ = query(
            collection(db, 'memberships'),
            where('organizationId', '==', orgId),
            where('role', 'in', ['admin', 'manager'])
        );
        const memSnap = await getDocs(memQ);
        const userIds = memSnap.docs
            .map(d => d.data().userId)
            .filter(id => id !== currentOwnerId);
        
        if (userIds.length === 0) return [];

        const usersQ = query(collection(db, 'users'), where('__name__', 'in', userIds));
        const usersSnap = await getDocs(usersQ);
        return usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (e) {
        return [];
    }
};

// Legacy support
export const getBackupAdmins = async (orgId: string, excludeUserId: string): Promise<Membership[]> => {
    return []; // Deprecated, replaced by getPotentialSuccessors
};

export const detachUserFromAllOrgs = async (userId: string): Promise<boolean> => {
    try {
        const q = query(collection(db, 'memberships'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("Detach User Error:", e);
        return false;
    }
};