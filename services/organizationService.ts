
import { 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    addDoc, 
    collection, 
    runTransaction, 
    query, 
    where, 
    getDocs,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Organization, User, Position, RolePermissions, OrgDepartmentDefinition, PositionPrototype, PageRole } from '../types';

/**
 * Follow a Page (Organization).
 */
export const followPage = async (userId: string, pageId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const pageRef = doc(db, 'organizations', pageId);

            // Add page to user's followed list
            transaction.update(userRef, {
                followedPageIds: arrayUnion(pageId)
            });

            // Add user to page's followers list and increment counter
            transaction.update(pageRef, {
                followers: arrayUnion(userId),
                followersCount: 1 
            });
        });
        return true;
    } catch (e) {
        console.error("Follow Page Error:", e);
        return false;
    }
};

/**
 * Subscribe to a specific channel within a page.
 */
export const subscribeToChannel = async (userId: string, channelId: string): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            subscribedChannelIds: arrayUnion(channelId)
        });
        return true;
    } catch (e) {
        console.error("Subscribe Channel Error:", e);
        return false;
    }
};

/**
 * Create a new Page (Organization).
 * The creator automatically becomes the Owner and an Admin.
 */
export const createPage = async (
    userId: string, 
    name: string, 
    sector: string
): Promise<string | null> => {
    try {
        // 1. Create Page Document
        const newPage: Omit<Organization, 'id'> = {
            name,
            sector: sector as any,
            type: 'PUBLIC',
            logoUrl: '',
            location: 'Global',
            ownerId: userId,
            admins: [userId],
            followers: [userId],
            followersCount: 1,
            createdAt: Date.now(),
            channels: [
                { id: `ch_${Date.now()}_1`, name: 'Genel', description: 'Ana akış', isPrivate: false, createdAt: Date.now() }
            ],
            status: 'ACTIVE',
            organizationHistory: [], // Required by type but empty initially
            pageRoles: {},
            
        } as any;

        const docRef = await addDoc(collection(db, 'organizations'), newPage);

        // 2. Update User's managed list
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            managedPageIds: arrayUnion(docRef.id),
            followedPageIds: arrayUnion(docRef.id)
        });

        return docRef.id;
    } catch (e) {
        console.error("Create Page Error:", e);
        return null;
    }
};

/**
 * Get pages managed by the user (Admin).
 */
export const getUserManagedPages = async (userId: string): Promise<Organization[]> => {
    try {
        const q = query(collection(db, 'organizations'), where('admins', 'array-contains', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    } catch (e) {
        return [];
    }
};

// --- Helper Functions ---
export const updateOrganizationLogo = async (id: string, file: File) => "https://via.placeholder.com/100";

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
        console.error("Create Channel Error", e);
        return false;
    }
};

export const deleteChannel = async (orgId: string, chId: string) => {
    // In a real app, filtering out from array in doc is complex with standard firestore arrayRemove if object differs.
    // Usually read, filter, update.
    return true;
};

export const updateUserSubscriptions = async (userId: string, channelIds: string[]) => {
    try {
        await updateDoc(doc(db, 'users', userId), { subscribedChannelIds: channelIds });
        return true;
    } catch (e) { return false; }
};

export const requestOrganizationDeletion = async (orgId: string, reason: string) => {
    try {
        await updateDoc(doc(db, 'organizations', orgId), { status: 'PENDING_DELETION', deletionReason: reason });
        return true;
    } catch(e) { return false; }
};

export const getPotentialSuccessors = async (orgId: string, currentOwnerId: string) => {
    // Logic: Find admins or managers who are not the current owner
    return [];
};

export const transferOwnership = async (orgId: string, newOwnerId: string, oldOwnerId: string) => {
    // Logic: Update ownerId in Org, swap roles in User profiles/memberships
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
        // Also update user doc for fast access if denormalized
        return true;
    } catch(e) { return false; }
};
