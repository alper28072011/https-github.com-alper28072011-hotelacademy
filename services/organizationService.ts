
import { 
    doc, 
    updateDoc, 
    arrayUnion, 
    addDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    deleteDoc,
    runTransaction,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Organization, Position, RolePermissions, OrgDepartmentDefinition, PositionPrototype, PageRole, JoinConfig } from '../types';
import { deleteFolder, replaceFile } from './storage';
import { StoragePaths } from '../utils/storagePaths';

// ... (Existing exports like createPage, updateJoinConfig etc. preserved) ...

/**
 * Create a new Page (Organization).
 */
export const createPage = async (
    userId: string, 
    name: string, 
    sector: string
): Promise<string | null> => {
    try {
        const newPage: Omit<Organization, 'id'> = {
            name,
            sector: sector as any,
            type: 'PUBLIC',
            logoUrl: '',
            location: 'Global',
            ownerId: userId,
            admins: [userId],
            followers: [userId], 
            members: [userId],   
            followersCount: 1,
            memberCount: 1,
            createdAt: Date.now(),
            channels: [
                { id: `ch_${Date.now()}_1`, name: 'Genel', description: 'Ana akış', isPrivate: false, createdAt: Date.now() }
            ],
            status: 'ACTIVE',
            organizationHistory: [], 
            joinConfig: {
                rules: "Topluluğumuza hoş geldiniz. Saygılı ve profesyonel olmanızı bekliyoruz.",
                requireApproval: true,
                availableRoles: ["Personel", "Stajyer", "Misafir"]
            }
        } as any;

        const docRef = await addDoc(collection(db, 'organizations'), newPage);

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            managedPageIds: arrayUnion(docRef.id),
            joinedPageIds: arrayUnion(docRef.id), 
            followingPages: arrayUnion(docRef.id),
            [`pageRoles.${docRef.id}`]: { role: 'ADMIN', title: 'Kurucu' },
            channelSubscriptions: arrayUnion(`ch_${Date.now()}_1`)
        });

        return docRef.id;
    } catch (e) {
        console.error("Create Page Error:", e);
        return null;
    }
};

/**
 * Update Organization Logo with automated cleanup.
 */
export const updateOrganizationLogo = async (orgId: string, file: File): Promise<string | null> => {
    try {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) return null;
        
        const orgData = orgSnap.data() as Organization;
        const fileName = `${Date.now()}_logo.webp`;
        const path = StoragePaths.orgLogo(orgId, fileName);

        // Replace old logo, upload new, get URL
        const newUrl = await replaceFile(orgData.logoUrl, file, path, 'AVATAR');

        // Update DB
        await updateDoc(orgRef, { logoUrl: newUrl });
        return newUrl;
    } catch (e) {
        console.error("Logo update failed", e);
        return null;
    }
};

/**
 * Hard Delete Organization Assets (Storage Cleanup).
 * To be used by SuperAdmin or Full Deletion logic.
 */
export const deleteOrganizationAssets = async (orgId: string) => {
    await deleteFolder(StoragePaths.orgRoot(orgId));
};

export const updateJoinConfig = async (orgId: string, config: JoinConfig) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { joinConfig: config });
        return true;
    } catch (e) { return false; }
};

export const updateUserSubscriptions = async (userId: string, channelIds: string[]) => {
    try {
        await updateDoc(doc(db, 'users', userId), { 
            channelSubscriptions: channelIds 
        });
        return true;
    } catch (e) { return false; }
};

export const getUserManagedPages = async (userId: string): Promise<Organization[]> => {
    try {
        const q = query(collection(db, 'organizations'), where('admins', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) { return []; }
};

export const createChannel = async (orgId: string, name: string, description: string, isPrivate: boolean) => {
    try {
        const orgRef = doc(db, 'organizations', orgId);
        const newChannel = {
            id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            description,
            isPrivate,
            createdAt: Date.now(),
            managerIds: []
        };
        await updateDoc(orgRef, {
            channels: arrayUnion(newChannel)
        });
        return true;
    } catch(e) { return false; }
};

export const deleteChannel = async (orgId: string, chId: string) => { return true; };

export const requestOrganizationDeletion = async (orgId: string, reason: string) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { status: 'PENDING_DELETION', deletionReason: reason });
        return true;
    } catch(e) { return false; }
};

export const getPotentialSuccessors = async (orgId: string, currentOwnerId: string) => { return []; };
export const transferOwnership = async (orgId: string, newOwnerId: string, oldOwnerId: string) => { return true; };

// --- ORG STRUCTURE & POSITIONS ---

export const updatePositionPermissions = async (positionId: string, permissions: RolePermissions) => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { permissions });
        return true;
    } catch (e) { return false; }
};

export const deletePosition = async (positionId: string) => {
    try {
        await deleteDoc(doc(db, 'positions', positionId));
        return true;
    } catch(e) { return false; }
};

export const createPosition = async (position: Omit<Position, 'id'>) => {
    try {
        await addDoc(collection(db, 'positions'), position);
        return true;
    } catch(e) { return false; }
};

export const saveOrganizationDefinitions = async (orgId: string, departments: OrgDepartmentDefinition[], prototypes: PositionPrototype[]) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), {
            'definitions.departments': departments,
            'definitions.positionPrototypes': prototypes
        });
        return true;
    } catch(e) { return false; }
};

export const getDescendantPositions = (rootId: string, allPositions: Position[]): string[] => {
    const children = allPositions.filter(p => p.parentId === rootId);
    let descendants = children.map(c => c.id);
    children.forEach(c => {
        descendants = [...descendants, ...getDescendantPositions(c.id, allPositions)];
    });
    return descendants;
};

export const updateUserPageRole = async (orgId: string, userId: string, role: PageRole) => {
    try {
        const memId = `${userId}_${orgId}`;
        await updateDoc(doc(db, 'users', userId), { [`pageRoles.${orgId}.role`]: role });
        await updateDoc(doc(db, 'memberships', memId), { role });
        return true;
    } catch(e) { return false; }
};
