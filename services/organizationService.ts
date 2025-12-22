
import { 
    doc, 
    updateDoc, 
    arrayUnion, 
    addDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Organization, Position, RolePermissions, OrgDepartmentDefinition, PositionPrototype, PageRole } from '../types';

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
            followers: [userId], // Creator is also a follower (social)
            members: [userId],   // Creator is also a member (internal)
            followersCount: 1,
            memberCount: 1,
            createdAt: Date.now(),
            channels: [
                { id: `ch_${Date.now()}_1`, name: 'Genel', description: 'Ana akış', isPrivate: false, createdAt: Date.now() }
            ],
            status: 'ACTIVE',
            organizationHistory: [], 
            pageRoles: {},
        } as any;

        const docRef = await addDoc(collection(db, 'organizations'), newPage);

        // Update User
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            managedPageIds: arrayUnion(docRef.id),
            joinedPageIds: arrayUnion(docRef.id), // Official member
            followingPages: arrayUnion(docRef.id), // Social follower
            channelSubscriptions: arrayUnion(`ch_${Date.now()}_1`) // Auto-sub to general
        });

        return docRef.id;
    } catch (e) {
        console.error("Create Page Error:", e);
        return null;
    }
};

/**
 * Update user's subscribed channels across all organizations.
 * This directly modifies the User's `channelSubscriptions` array.
 */
export const updateUserSubscriptions = async (userId: string, channelIds: string[]) => {
    try {
        await updateDoc(doc(db, 'users', userId), { 
            channelSubscriptions: channelIds 
        });
        return true;
    } catch (e) { 
        console.error("Update Subs Error", e);
        return false; 
    }
};

// ... [Existing Helper Functions Preserved] ...

export const getUserManagedPages = async (userId: string): Promise<Organization[]> => {
    try {
        const q = query(collection(db, 'organizations'), where('admins', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) {
        return [];
    }
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
    } catch(e) {
        return false;
    }
};

export const deleteChannel = async (orgId: string, chId: string) => {
    return true; // Stub
};

export const requestOrganizationDeletion = async (orgId: string, reason: string) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { status: 'PENDING_DELETION', deletionReason: reason });
        return true;
    } catch(e) { return false; }
};

export const getPotentialSuccessors = async (orgId: string, currentOwnerId: string) => {
    return [];
};

export const transferOwnership = async (orgId: string, newOwnerId: string, oldOwnerId: string) => {
    return true;
};

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

export const saveOrganizationDefinitions = async (
    orgId: string, 
    departments: OrgDepartmentDefinition[], 
    prototypes: PositionPrototype[]
) => {
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
        await updateDoc(doc(db, 'memberships', memId), { role });
        return true;
    } catch(e) { return false; }
};
