
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    serverTimestamp, limit
} from 'firebase/firestore';
import { db } from './firebase';
import { FollowStatus, Relationship, User } from '../types';

const relationshipsRef = collection(db, 'relationships');

/**
 * Checks relationship status.
 */
export const checkFollowStatus = async (currentUserId: string, targetId: string): Promise<FollowStatus> => {
    try {
        const q = query(
            relationshipsRef, 
            where('followerId', '==', currentUserId), 
            where('followingId', '==', targetId)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return 'NONE';
        
        const rel = snapshot.docs[0].data() as Relationship;
        return rel.status === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING';
    } catch (e) {
        console.error("Check Follow Status Error:", e);
        return 'NONE';
    }
};

/**
 * Generic Follow Function (Handles both User and Organization targets)
 * This updates:
 * 1. Relationship collection
 * 2. Follower's 'following' list and count
 * 3. Target's 'followers' count
 */
export const followEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            let isPrivate = false;
            let currentFollowers = 0;

            // 1. Get Target Data based on Type
            if (targetType === 'USER') {
                const targetRef = doc(db, 'users', targetId);
                const targetSnap = await transaction.get(targetRef);
                if (!targetSnap.exists()) throw new Error("User not found");
                const data = targetSnap.data() as User;
                isPrivate = data.isPrivate || false;
                currentFollowers = data.followersCount || 0;
            } else {
                const targetRef = doc(db, 'organizations', targetId);
                const targetSnap = await transaction.get(targetRef);
                if (!targetSnap.exists()) throw new Error("Organization not found");
                // Organizations are always public for now
                isPrivate = false; 
                currentFollowers = targetSnap.data()?.followersCount || 0;
            }

            // 2. Check existing relationship
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetId)
            );
            const existingSnap = await getDocs(q); 
            
            if (!existingSnap.empty) {
                return { status: existingSnap.docs[0].data().status as FollowStatus, success: false };
            }

            // 3. Create Relationship Doc
            const relStatus = isPrivate ? 'PENDING' : 'ACCEPTED';
            const newRelRef = doc(collection(db, 'relationships'));
            
            transaction.set(newRelRef, {
                followerId: currentUserId,
                followingId: targetId,
                status: relStatus,
                createdAt: Date.now()
            });

            // 4. Update Counters & Lists (Only if Public/Accepted immediately)
            if (relStatus === 'ACCEPTED') {
                const currentUserRef = doc(db, 'users', currentUserId);
                const currentUserDoc = await transaction.get(currentUserRef);
                const currentFollowing = currentUserDoc.data()?.following || [];

                // Add to My Following List
                if (!currentFollowing.includes(targetId)) {
                    transaction.update(currentUserRef, { 
                        followingCount: (currentUserDoc.data()?.followingCount || 0) + 1,
                        following: [...currentFollowing, targetId]
                    });
                }

                // Increment Target's Follower Count
                const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
                const targetRef = doc(db, targetCollection, targetId);
                transaction.update(targetRef, { followersCount: currentFollowers + 1 });
            }

            // 5. Send Notification (If User)
            if (targetType === 'USER') {
                const notifRef = doc(collection(db, `users/${targetId}/notifications`));
                transaction.set(notifRef, {
                    title: isPrivate ? 'Takip İsteği' : 'Yeni Takipçi',
                    message: isPrivate ? 'Bir kullanıcı sizi takip etmek istiyor.' : 'Bir kullanıcı sizi takip etmeye başladı.',
                    type: 'system',
                    isRead: false,
                    createdAt: serverTimestamp(),
                    link: `/user/${currentUserId}`
                });
            }

            return { status: relStatus === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING', success: true };
        });

        return result;

    } catch (e) {
        console.error("Follow Entity Error:", e);
        return { status: 'NONE', success: false };
    }
};

// Wrapper for Users
export const followUserSmart = async (currentUserId: string, targetUserId: string) => {
    return followEntity(currentUserId, targetUserId, 'USER');
};

// Wrapper for Orgs
export const followOrganizationSmart = async (currentUserId: string, targetOrgId: string) => {
    return followEntity(currentUserId, targetOrgId, 'ORGANIZATION');
};

/**
 * Unfollow Logic (Generic)
 */
export const unfollowUserSmart = async (currentUserId: string, targetId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetId)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            const relDoc = snapshot.docs[0];
            transaction.delete(relDoc.ref);

            // Update User Counters
            const currentUserRef = doc(db, 'users', currentUserId);
            const userSnap = await transaction.get(currentUserRef);
            if (userSnap.exists()) {
                const userData = userSnap.data() as User;
                const newFollowing = (userData.following || []).filter(id => id !== targetId);
                transaction.update(currentUserRef, { 
                    followingCount: Math.max(0, (userData.followingCount || 0) - 1),
                    following: newFollowing
                });
            }

            // Determine if Target is User or Org (to decrement their followers)
            const userTargetRef = doc(db, 'users', targetId);
            const userTargetSnap = await transaction.get(userTargetRef);
            
            if (userTargetSnap.exists()) {
                transaction.update(userTargetRef, { followersCount: Math.max(0, (userTargetSnap.data().followersCount || 0) - 1) });
            } else {
                const orgTargetRef = doc(db, 'organizations', targetId);
                const orgTargetSnap = await transaction.get(orgTargetRef);
                if (orgTargetSnap.exists()) {
                    transaction.update(orgTargetRef, { followersCount: Math.max(0, (orgTargetSnap.data().followersCount || 0) - 1) });
                }
            }
        });
        return true;
    } catch (e) {
        console.error("Unfollow Error:", e);
        return false;
    }
};

export const getFollowers = async (userId: string): Promise<User[]> => {
    try {
        const q = query(relationshipsRef, where('followingId', '==', userId), where('status', '==', 'ACCEPTED'), limit(50));
        const snap = await getDocs(q);
        const userIds = snap.docs.map(d => d.data().followerId);
        
        if (userIds.length === 0) return [];
        
        // Batch fetch users
        const usersQ = query(collection(db, 'users'), where('__name__', 'in', userIds.slice(0, 10))); // Limit 10 for Firestore 'in'
        const usersSnap = await getDocs(usersQ);
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) { return []; }
};
