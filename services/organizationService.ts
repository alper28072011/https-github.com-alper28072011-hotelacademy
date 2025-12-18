
import { doc, runTransaction, updateDoc, arrayUnion, collection, query, where, getDocs, writeBatch, orderBy, limit, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Membership, Position, DepartmentType } from '../types';

// The ID of the System Super Admin (Safety Net)
const SYSTEM_ADMIN_ID = 'SYSTEM_ARCHIVE_VAULT'; 

// --- POSITION MANAGEMENT (ORG CHART) ---

export const getOrgPositions = async (orgId: string): Promise<Position[]> => {
    try {
        const q = query(collection(db, 'positions'), where('organizationId', '==', orgId));
        const snap = await getDocs(q);
        // Sort by level usually handled in UI, but getting all data here
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
        // Check for children first? For now, we allow delete, children become orphans (parentId -> null)
        // Or strictly block. Let's strictly block in UI, but here we just delete.
        await deleteDoc(doc(db, 'positions', positionId));
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Assigns a User to a specific Position ("Filling the Seat").
 * This updates:
 * 1. The Position document (occupantId)
 * 2. The User's profile (roleTitle, department, positionId)
 * 3. The Membership record (roleTitle, positionId)
 */
export const assignUserToPosition = async (orgId: string, positionId: string, userId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get Position Details
            const posRef = doc(db, 'positions', positionId);
            const posSnap = await transaction.get(posRef);
            if (!posSnap.exists()) throw new Error("Position not found");
            const posData = posSnap.data() as Position;

            // 2. Clear old occupant if exists (Optional: Move them to bench?)
            // For now, we overwrite.

            // 3. Update Position
            transaction.update(posRef, { occupantId: userId });

            // 4. Update User Profile
            const userRef = doc(db, 'users', userId);
            transaction.update(userRef, { 
                positionId: positionId,
                roleTitle: posData.title,
                department: posData.departmentId
            });

            // 5. Update Membership
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

// --- EXISTING FUNCTIONS ---

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
 */
export const transferOwnership = async (orgId: string, newOwnerId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', orgId);
            transaction.update(orgRef, { ownerId: newOwnerId });

            const membershipId = `${newOwnerId}_${orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.update(memRef, { role: 'manager' });

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
            batch.delete(memDoc.ref);
            
            const userRef = doc(db, 'users', data.userId);
            batch.update(userRef, { 
                currentOrganizationId: null,
                role: 'staff',
                positionId: null,
                roleTitle: null
            });
        });

        // 3. Delete Related Data
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
        await deleteCollectionByOrg('positions'); // Delete Org Chart Nodes

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Cascading Delete Error:", error);
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
