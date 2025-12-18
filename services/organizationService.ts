
import { 
    doc, runTransaction, updateDoc, arrayUnion, collection, 
    query, where, getDocs, writeBatch, orderBy, limit, 
    deleteDoc, getDoc, setDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Membership, Position, Organization } from '../types';

/**
 * Fetch all positions for an organization
 */
export const getOrgPositions = async (orgId: string): Promise<Position[]> => {
    try {
        const q = query(collection(db, 'positions'), where('orgId', '==', orgId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Position));
    } catch (e) {
        return [];
    }
};

/**
 * Create a new position slot
 */
export const createPosition = async (data: Omit<Position, 'id'>): Promise<string | null> => {
    try {
        const docRef = await addDoc(collection(db, 'positions'), data);
        return docRef.id;
    } catch (e) {
        return null;
    }
};

/**
 * Update requirements for a position
 */
export const updatePositionRequirements = async (positionId: string, courseIds: string[]): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'positions', positionId), { requirements: courseIds });
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * SMART OCCUPANCY: Bir kullanıcıyı bir pozisyona oturtur.
 * Hem Pozisyonu, hem Kullanıcıyı, hem de Eğitim Atamalarını günceller.
 */
export const occupyPosition = async (positionId: string, userId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const posRef = doc(db, 'positions', positionId);
            const userRef = doc(db, 'users', userId);
            
            const posSnap = await transaction.get(posRef);
            const userSnap = await transaction.get(userRef);

            if (!posSnap.exists() || !userSnap.exists()) throw new Error("Doc missing");

            const posData = posSnap.data() as Position;

            // 1. Pozisyonu Güncelle
            transaction.update(posRef, { occupantId: userId });

            // 2. Kullanıcı Profilini Güncelle
            transaction.update(userRef, {
                positionId: positionId,
                department: posData.departmentId,
                currentOrganizationId: posData.orgId,
                role: posData.level === 0 ? 'admin' : 'staff'
            });

            // 3. Eğitim Atamaları (Zorunlu Gereksinimler)
            if (posData.requirements && posData.requirements.length > 0) {
                transaction.update(userRef, {
                    startedCourses: arrayUnion(...posData.requirements)
                });
            }

            // 4. Membership oluştur/güncelle
            const membershipId = `${userId}_${posData.orgId}`;
            const memRef = doc(db, 'memberships', membershipId);
            transaction.set(memRef, {
                id: membershipId,
                userId,
                organizationId: posData.orgId,
                role: posData.level === 0 ? 'admin' : 'staff',
                department: posData.departmentId,
                positionId: positionId,
                status: 'ACTIVE',
                joinedAt: Date.now(),
                roleTitle: posData.title
            });
        });
        return true;
    } catch (error) {
        console.error("Occupy Error:", error);
        return false;
    }
};

/**
 * Pozisyonu boşalt (İstifa/Kovulma senaryosu)
 */
export const vacatePosition = async (positionId: string): Promise<boolean> => {
    try {
        const posRef = doc(db, 'positions', positionId);
        const posSnap = await getDoc(posRef);
        if (!posSnap.exists()) return false;
        
        const occupantId = posSnap.data().occupantId;
        if (occupantId) {
            const userRef = doc(db, 'users', occupantId);
            await updateDoc(posRef, { occupantId: null });
            await updateDoc(userRef, { positionId: null, currentOrganizationId: null });
        }
        return true;
    } catch (e) {
        return false;
    }
};

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

export const getBackupAdmins = async (orgId: string, excludeUserId: string): Promise<Membership[]> => {
    const q = query(
        collection(db, 'memberships'),
        where('organizationId', '==', orgId),
        where('role', 'in', ['manager', 'admin']),
        limit(5)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => d.data() as Membership)
        .filter(m => m.userId !== excludeUserId);
};

export const deleteOrganizationFully = async (orgId: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);
        const orgRef = doc(db, 'organizations', orgId);
        batch.delete(orgRef);

        const collectionsToClean = ['memberships', 'posts', 'tasks', 'courses', 'positions', 'careerPaths'];
        for (const col of collectionsToClean) {
            const q = query(collection(db, col), where(col === 'positions' ? 'orgId' : 'organizationId', '==', orgId));
            const snap = await getDocs(q);
            snap.docs.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Cascading Delete Error:", error);
        return false;
    }
};
