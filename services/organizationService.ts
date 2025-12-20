
import { doc, runTransaction, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc, setDoc, getDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Organization, Membership, Channel, PageRole, Position, RolePermissions, OrgDepartmentDefinition, PositionPrototype } from '../types';
import { deleteFileByUrl, uploadFile } from './storage';

// --- MEDIA MANAGEMENT ---

export const updateOrganizationLogo = async (orgId: string, file: File, oldUrl?: string): Promise<string | null> => {
    try {
        if (oldUrl) await deleteFileByUrl(oldUrl);
        const downloadUrl = await uploadFile(file, `organizations/${orgId}/logo`, undefined, 'AVATAR'); 
        await updateDoc(doc(db, 'organizations', orgId), { logoUrl: downloadUrl });
        return downloadUrl;
    } catch (e) {
        console.error("Logo Update Error:", e);
        return null;
    }
};

// --- CHANNEL MANAGEMENT (NEW) ---

export const createChannel = async (orgId: string, name: string, description: string, isPrivate: boolean): Promise<boolean> => {
    try {
        const newChannel: Channel = {
            id: `ch_${Date.now()}`,
            name,
            description,
            isPrivate,
            managerIds: [],
            createdAt: Date.now()
        };
        await updateDoc(doc(db, 'organizations', orgId), {
            channels: arrayUnion(newChannel)
        });
        return true;
    } catch (e) {
        console.error("Create Channel Error:", e);
        return false;
    }
};

export const deleteChannel = async (orgId: string, channelId: string): Promise<boolean> => {
    try {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if(!orgSnap.exists()) return false;
        
        const channels = (orgSnap.data() as Organization).channels || [];
        const updatedChannels = channels.filter(c => c.id !== channelId);
        
        await updateDoc(orgRef, { channels: updatedChannels });
        return true;
    } catch (e) {
        return false;
    }
};

export const updateChannelManagers = async (orgId: string, channelId: string, managerIds: string[]): Promise<boolean> => {
    try {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if(!orgSnap.exists()) return false;
        
        const channels = (orgSnap.data() as Organization).channels || [];
        const updatedChannels = channels.map(c => c.id === channelId ? { ...c, managerIds } : c);
        
        await updateDoc(orgRef, { channels: updatedChannels });
        return true;
    } catch (e) {
        return false;
    }
};

// --- MEMBER MANAGEMENT (UPDATED) ---

export const updateUserPageRole = async (orgId: string, userId: string, newRole: PageRole): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const memRef = doc(db, 'memberships', `${userId}_${orgId}`);
            
            // Update Membership
            transaction.update(memRef, { role: newRole });
            
            // Update User Page Roles Map
            const userSnap = await transaction.get(userRef);
            if(userSnap.exists()) {
                const currentRoles = userSnap.data().pageRoles || {};
                transaction.update(userRef, {
                    [`pageRoles.${orgId}`]: newRole
                });
            }
        });
        return true;
    } catch (e) {
        console.error("Update Role Error:", e);
        return false;
    }
};

export const updateUserSubscriptions = async (userId: string, channelIds: string[]): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            subscribedChannelIds: channelIds
        });
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
            transaction.update(newMemRef, { role: 'ADMIN' });

            const oldMemId = `${currentOwnerId}_${orgId}`;
            const oldMemRef = doc(db, 'memberships', oldMemId);
            transaction.update(oldMemRef, { role: 'ADMIN' }); // Downgrade to Admin, not Owner
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
            where('role', '==', 'ADMIN')
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
            where('role', '==', 'ADMIN')
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

// --- ORG STRUCTURE MANAGEMENT ---

export const getDescendantPositions = (rootId: string, allPositions: Position[]): string[] => {
    const children = allPositions.filter(p => p.parentId === rootId);
    let descendants = children.map(c => c.id);
    children.forEach(child => {
        descendants = [...descendants, ...getDescendantPositions(child.id, allPositions)];
    });
    return descendants;
};

export const updatePositionPermissions = async (positionId: string, permissions: RolePermissions): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { permissions });
        return true;
    } catch (e) {
        return false;
    }
};

export const deletePosition = async (positionId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'positions', positionId));
        return true;
    } catch (e) { return false; }
};

export const createPosition = async (position: Omit<Position, 'id'>): Promise<string | null> => {
    try {
        const ref = await addDoc(collection(db, 'positions'), position);
        return ref.id;
    } catch (e) { return null; }
};

export const saveOrganizationDefinitions = async (orgId: string, departments: OrgDepartmentDefinition[], positionPrototypes: PositionPrototype[]): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), {
            definitions: {
                departments,
                positionPrototypes
            }
        });
        return true;
    } catch (e) { return false; }
};
