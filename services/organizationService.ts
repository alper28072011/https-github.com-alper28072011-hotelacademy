
import { doc, runTransaction, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Position, Organization, Membership, PermissionSet } from '../types';

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

// --- CORE ACTIONS (STRICT SYNC WITH TRANSACTIONS) ---

/**
 * Creates a position node in the chart.
 */
export const createPosition = async (position: Omit<Position, 'id'>): Promise<string | null> => {
    try {
        const ref = doc(collection(db, 'positions'));
        // Default permissions
        const defaultPerms: PermissionSet = {
            canCreateContent: false,
            canInviteStaff: false,
            canManageStructure: false,
            canViewAnalytics: false
        };
        await setDoc(ref, { ...position, permissions: position.permissions || defaultPerms, id: ref.id });
        return ref.id;
    } catch (e) {
        console.error("Create Position Error:", e);
        return null;
    }
};

/**
 * Updates permissions for a specific position/seat.
 */
export const updatePositionPermissions = async (positionId: string, permissions: PermissionSet): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { permissions });
        return true;
    } catch (e) {
        console.error("Update Permissions Error:", e);
        return false;
    }
};

/**
 * Creates a placeholder invite for a specific position.
 * Real implementation would send an email/SMS. 
 * Here we simulate it by possibly creating a pre-membership or just returning success.
 */
export const inviteUserToPosition = async (orgId: string, email: string, positionId: string): Promise<boolean> => {
    try {
        // In a real app, write to an 'invitations' collection.
        // For this demo, we'll assume the email is sent via backend trigger.
        console.log(`Invited ${email} to position ${positionId} in org ${orgId}`);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * TRANSACTIONAL ASSIGNMENT
 * Ensures User and Position docs are always in sync.
 */
export const assignUserToPosition = async (orgId: string, positionId: string, userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. READ: Get Target Position
            const targetPosRef = doc(db, 'positions', positionId);
            const targetPosSnap = await transaction.get(targetPosRef);
            if (!targetPosSnap.exists()) throw new Error("Hedef pozisyon bulunamadı.");
            
            const targetPos = targetPosSnap.data() as Position;

            // 2. CHECK: Is Target Occupied?
            if (targetPos.occupantId && targetPos.occupantId !== userId) {
                throw new Error("Bu pozisyon zaten dolu! Önce mevcut personeli kaldırın.");
            }

            // 3. READ: Get User
            const userRef = doc(db, 'users', userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("Kullanıcı bulunamadı.");
            const userData = userSnap.data() as User;

            // 4. LOGIC: If User has an OLD position, vacate it (Move logic)
            if (userData.positionId && userData.positionId !== positionId) {
                const oldPosRef = doc(db, 'positions', userData.positionId);
                transaction.update(oldPosRef, { occupantId: null });
            }

            // 5. WRITE: Occupy Target Position
            transaction.update(targetPosRef, { occupantId: userId });

            // 6. WRITE: Update User Profile
            transaction.update(userRef, { 
                positionId: positionId,
                roleTitle: targetPos.title,
                department: targetPos.departmentId
            });

            // 7. WRITE: Update Membership (For quick permission checks)
            const membershipId = `${userId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.update(memRef, {
                positionId: positionId,
                roleTitle: targetPos.title,
                department: targetPos.departmentId
            });
        });

        return { success: true };
    } catch (e: any) {
        console.error("Transaction Failed:", e);
        return { success: false, message: e.message };
    }
};

/**
 * TRANSACTIONAL REMOVAL
 * Vacates the seat and clears user's title.
 */
export const removeUserFromPosition = async (positionId: string, orgId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get Position
            const posRef = doc(db, 'positions', positionId);
            const posSnap = await transaction.get(posRef);
            if (!posSnap.exists()) throw new Error("Position not found");
            const pos = posSnap.data() as Position;

            if (!pos.occupantId) return; // Already empty

            const userId = pos.occupantId;
            const userRef = doc(db, 'users', userId);
            const memRef = doc(db, 'memberships', `${userId}_${orgId}`);

            // 2. Clear Position
            transaction.update(posRef, { occupantId: null });

            // 3. Clear User
            transaction.update(userRef, { positionId: null, roleTitle: null });
            
            // 4. Clear Membership
            transaction.update(memRef, { positionId: null, roleTitle: null });
        });
        return true;
    } catch (e) {
        console.error("Remove Transaction Failed:", e);
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

/**
 * SAFETY NET: Deletes a user from Org and ensures their seat is vacated.
 */
export const deleteUserFromOrganization = async (userId: string, orgId: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);

        // 1. Delete Membership
        const memRef = doc(db, 'memberships', `${userId}_${orgId}`);
        batch.delete(memRef);

        // 2. Update User Profile (Detach)
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { 
            currentOrganizationId: null,
            positionId: null,
            roleTitle: null,
            department: null
        });

        // 3. Vacate Position (If any) - Must find the position first
        const q = query(collection(db, 'positions'), where('occupantId', '==', userId), where('organizationId', '==', orgId));
        const posSnap = await getDocs(q);
        posSnap.docs.forEach(d => {
            batch.update(d.ref, { occupantId: null });
        });

        await batch.commit();
        return true;
    } catch (e) {
        console.error("Delete User Org Failed:", e);
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
