
import { doc, runTransaction, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Position, Organization, Membership, RolePermissions, OrgDepartmentDefinition, PositionPrototype } from '../types';
import { DEFAULT_PERMISSIONS } from '../hooks/usePermission';

// --- POSITION READ & ENGINE ---

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

/**
 * THE TREE WALKER
 * Returns all descendant position IDs from a given root ID.
 */
export const getDescendantPositions = (rootId: string, allPositions: Position[]): string[] => {
    let descendants: string[] = [];
    const children = allPositions.filter(p => p.parentId === rootId);
    
    children.forEach(child => {
        descendants.push(child.id);
        descendants = [...descendants, ...getDescendantPositions(child.id, allPositions)];
    });
    
    return descendants;
};

/**
 * THE PERMISSION CALCULATOR
 * Determines exactly who a user can target with content based on their position in the tree.
 * UPDATED: Includes 'God Mode' for Owners to bypass position checks.
 */
export const getTargetableAudiences = async (user: User, orgId: string): Promise<{
    scope: 'GLOBAL' | 'LIMITED' | 'NONE';
    allowedDeptIds: string[];
    allowedPositionIds: string[];
}> => {
    // 1. Fetch Organization Context First
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return { scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] };
    const org = orgSnap.data() as Organization;

    // --- GOD MODE START ---
    // If user is the Owner OR Super Admin, grant full access immediately.
    // This bypasses the need for a physical 'Position' document.
    if (user.id === org.ownerId || user.role === 'super_admin' || user.role === 'admin') {
        const allDeptIds = org.definitions?.departments.map(d => d.id) || [];
        return { 
            scope: 'GLOBAL', 
            allowedDeptIds: allDeptIds, 
            allowedPositionIds: [] 
        };
    }
    // --- GOD MODE END ---

    // 2. Standard Hierarchy Check for Staff/Managers
    if (!user.positionId) return { scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] };

    const posRef = doc(db, 'positions', user.positionId);
    const posSnap = await getDoc(posRef);
    
    // If position document is missing (and not owner), deny access
    if (!posSnap.exists()) return { scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] };
    
    const myPosition = posSnap.data() as Position;
    const permissions = myPosition.permissions;

    // Rule 1: If no create permission, return NONE
    if (!permissions?.canCreateContent) {
        return { scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] };
    }

    // Rule 2: If GLOBAL scope explicitly granted via permissions
    if (permissions.contentTargeting === 'ENTIRE_ORG' || permissions.contentTargeting === 'PUBLIC') {
        const allDeptIds = org.definitions?.departments.map(d => d.id) || [];
        return { 
            scope: 'GLOBAL', 
            allowedDeptIds: allDeptIds, 
            allowedPositionIds: [] 
        };
    }

    // Rule 3: If OWN_DEPT
    if (permissions.contentTargeting === 'OWN_DEPT') {
        return {
            scope: 'LIMITED',
            allowedDeptIds: [myPosition.departmentId],
            allowedPositionIds: []
        };
    }

    // Rule 4: If BELOW_HIERARCHY
    if (permissions.contentTargeting === 'BELOW_HIERARCHY') {
        const allPositions = await getOrgPositions(orgId);
        const descendantIds = getDescendantPositions(myPosition.id, allPositions);
        const targetableIds = [myPosition.id, ...descendantIds];
        const relevantPositions = allPositions.filter(p => targetableIds.includes(p.id));
        const relevantDeptIds = Array.from(new Set(relevantPositions.map(p => p.departmentId)));

        return {
            scope: 'LIMITED',
            allowedDeptIds: relevantDeptIds,
            allowedPositionIds: targetableIds
        };
    }

    return { scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] };
};

// --- DEFINITIONS MANAGEMENT ---

export const saveOrganizationDefinitions = async (
    orgId: string, 
    departments: OrgDepartmentDefinition[], 
    prototypes: PositionPrototype[]
): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), {
            'definitions.departments': departments,
            'definitions.positionPrototypes': prototypes,
            'settings.customDepartments': departments.map(d => d.name)
        });
        return true;
    } catch (e) {
        console.error("Save Definitions Error:", e);
        return false;
    }
};

// --- CORE ACTIONS ---

export const createPosition = async (position: Omit<Position, 'id'>): Promise<string | null> => {
    try {
        const ref = doc(collection(db, 'positions'));
        // Use DEFAULT_PERMISSIONS imported from hook logic
        await setDoc(ref, { 
            ...position, 
            permissions: position.permissions || DEFAULT_PERMISSIONS, 
            id: ref.id 
        });
        return ref.id;
    } catch (e) {
        console.error("Create Position Error:", e);
        return null;
    }
};

export const updatePositionPermissions = async (positionId: string, permissions: RolePermissions): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { permissions });
        return true;
    } catch (e) {
        console.error("Update Permissions Error:", e);
        return false;
    }
};

export const assignUserToPosition = async (orgId: string, positionId: string, userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        await runTransaction(db, async (transaction) => {
            const targetPosRef = doc(db, 'positions', positionId);
            const targetPosSnap = await transaction.get(targetPosRef);
            if (!targetPosSnap.exists()) throw new Error("Hedef pozisyon bulunamadı.");
            
            const targetPos = targetPosSnap.data() as Position;

            if (targetPos.occupantId && targetPos.occupantId !== userId) {
                throw new Error("Bu pozisyon zaten dolu! Önce mevcut personeli kaldırın.");
            }

            const userRef = doc(db, 'users', userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("Kullanıcı bulunamadı.");
            const userData = userSnap.data() as User;

            // Vacate old position if exists
            if (userData.positionId && userData.positionId !== positionId) {
                const oldPosRef = doc(db, 'positions', userData.positionId);
                transaction.update(oldPosRef, { occupantId: null });
            }

            transaction.update(targetPosRef, { occupantId: userId });

            transaction.update(userRef, { 
                positionId: positionId,
                roleTitle: targetPos.title,
                department: targetPos.departmentId
            });

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

export const removeUserFromPosition = async (positionId: string, orgId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const posRef = doc(db, 'positions', positionId);
            const posSnap = await transaction.get(posRef);
            if (!posSnap.exists()) throw new Error("Position not found");
            const pos = posSnap.data() as Position;

            if (!pos.occupantId) return;

            const userId = pos.occupantId;
            const userRef = doc(db, 'users', userId);
            const memRef = doc(db, 'memberships', `${userId}_${orgId}`);

            transaction.update(posRef, { occupantId: null });
            transaction.update(userRef, { positionId: null, roleTitle: null });
            transaction.update(memRef, { positionId: null, roleTitle: null });
        });
        return true;
    } catch (e) {
        console.error("Remove Transaction Failed:", e);
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
        return false;
    }
};
