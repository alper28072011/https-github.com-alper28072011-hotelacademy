
import { doc, runTransaction, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Position, Organization, Membership } from '../types';

// --- POSITION READ ---

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

// --- CORE ACTIONS (STRICT SYNC) ---

/**
 * Creates a position node in the chart.
 */
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

/**
 * Assigns a User to a Position.
 * Handles the "Swap" logic and ensures 1:1 integrity.
 * 1. Removes User from old position (if any).
 * 2. Removes Old Occupant from target position (if any).
 * 3. Assigns User to Target Position.
 * 4. Updates User Profile (Dept, RoleTitle).
 * 5. Updates Membership.
 */
export const assignUserToPosition = async (orgId: string, positionId: string, userId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get Target Position
            const targetPosRef = doc(db, 'positions', positionId);
            const targetPosSnap = await transaction.get(targetPosRef);
            if (!targetPosSnap.exists()) throw new Error("Position not found");
            const targetPos = targetPosSnap.data() as Position;

            // 2. Get User
            const userRef = doc(db, 'users', userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const userData = userSnap.data() as User;

            // 3. Logic: If User has an OLD position, vacate it
            if (userData.positionId && userData.positionId !== positionId) {
                const oldPosRef = doc(db, 'positions', userData.positionId);
                transaction.update(oldPosRef, { occupantId: null });
            }

            // 4. Logic: If Target Position has an OLD occupant, evict them (softly)
            if (targetPos.occupantId && targetPos.occupantId !== userId) {
                const oldOccupantRef = doc(db, 'users', targetPos.occupantId);
                transaction.update(oldOccupantRef, { 
                    positionId: null,
                    roleTitle: null
                    // Keep department or clear it? Keeping it is safer for now.
                });
                
                // Update their membership too
                const oldMemId = `${targetPos.occupantId}_${orgId}`;
                const oldMemRef = doc(db, 'memberships', oldMemId);
                transaction.update(oldMemRef, { positionId: null, roleTitle: null });
            }

            // 5. ASSIGN: Update Target Position
            transaction.update(targetPosRef, { occupantId: userId });

            // 6. ASSIGN: Update User Profile
            transaction.update(userRef, { 
                positionId: positionId,
                roleTitle: targetPos.title,
                department: targetPos.departmentId
            });

            // 7. ASSIGN: Update Membership
            const membershipId = `${userId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.update(memRef, {
                positionId: positionId,
                roleTitle: targetPos.title,
                department: targetPos.departmentId
            });
        });
        return true;
    } catch (e) {
        console.error("Assign User Error:", e);
        return false;
    }
};

/**
 * Removes a user from a position (Vacates the seat).
 */
export const removeUserFromPosition = async (positionId: string, orgId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const posRef = doc(db, 'positions', positionId);
            const posSnap = await transaction.get(posRef);
            if (!posSnap.exists()) throw new Error("Position not found");
            const pos = posSnap.data() as Position;

            if (!pos.occupantId) return; // Already empty

            const userId = pos.occupantId;
            const userRef = doc(db, 'users', userId);
            const memRef = doc(db, 'memberships', `${userId}_${orgId}`);

            // Clear Position
            transaction.update(posRef, { occupantId: null });

            // Clear User
            transaction.update(userRef, { positionId: null, roleTitle: null });
            transaction.update(memRef, { positionId: null, roleTitle: null });
        });
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Updates a position's parent (Moving nodes in the tree).
 */
export const movePositionNode = async (positionId: string, newParentId: string | null): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { parentId: newParentId });
        return true;
    } catch (e) {
        return false;
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

// --- OWNER ACTIONS ---

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

export const transferOwnership = async (orgId: string, newOwnerId: string, currentOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            transaction.update(orgRef, { ownerId: newOwnerId });

            const newMemId = `${newOwnerId}_${orgId}`;
            const newMemRef = doc(db, 'memberships', newMemId);
            transaction.update(newMemRef, { role: 'manager' });

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

export const getBackupAdmins = async (orgId: string, excludeUserId: string): Promise<Membership[]> => {
    try {
        const q = query(
            collection(db, 'memberships'),
            where('organizationId', '==', orgId),
            where('role', 'in', ['admin', 'manager'])
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(d => d.data() as Membership)
            .filter(m => m.userId !== excludeUserId);
    } catch (e) {
        console.error("Get Backup Admins Error:", e);
        return [];
    }
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
