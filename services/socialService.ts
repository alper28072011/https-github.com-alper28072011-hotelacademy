
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    serverTimestamp, limit
} from 'firebase/firestore';
import { db } from './firebase';
import { FollowStatus, Relationship, User } from '../types';

const relationshipsRef = collection(db, 'relationships');

/**
 * Checks relationship status between current user and target (User or Org).
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
 * Polymorphic Follow Function
 * Updates:
 * 1. Relationships collection
 * 2. Follower's 'following' array and count
 * 3. Target's (User or Org) 'followers' count
 */
export const followEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            let isPrivate = false;
            let currentFollowersCount = 0;

            // 1. Get Target Data
            if (targetType === 'USER') {
                const targetRef = doc(db, 'users', targetId);
                const targetSnap = await transaction.get(targetRef);
                if (!targetSnap.exists()) throw new Error("Target user not found");
                const data = targetSnap.data() as User;
                isPrivate = data.isPrivate || false;
                currentFollowersCount = data.followersCount || 0;
            } else {
                const targetRef = doc(db, 'organizations', targetId);
                const targetSnap = await transaction.get(targetRef);
                if (!targetSnap.exists()) throw new Error("Target organization not found");
                // Orgs are public by default in this context
                isPrivate = false; 
                currentFollowersCount = targetSnap.data()?.followersCount || 0;
            }

            // 2. Check existing relationship
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetId)
            );
            const existingSnap = await getDocs(q); 
            if (!existingSnap.empty) return { status: existingSnap.docs[0].data().status as FollowStatus, success: false };

            // 3. Create Relationship
            const relStatus = isPrivate ? 'PENDING' : 'ACCEPTED';
            const newRelRef = doc(collection(db, 'relationships'));
            
            transaction.set(newRelRef, {
                followerId: currentUserId,
                followingId: targetId,
                status: relStatus,
                createdAt: Date.now()
            });

            // 4. If immediately accepted, update counts and arrays
            if (relStatus === 'ACCEPTED') {
                const currentUserRef = doc(db, 'users', currentUserId);
                const currentUserSnap = await transaction.get(currentUserRef);
                const currentFollowing = currentUserSnap.data()?.following || [];

                // Update my following list
                transaction.update(currentUserRef, { 
                    following: [...currentFollowing, targetId],
                    followingCount: (currentUserSnap.data()?.followingCount || 0) + 1
                });

                // Update target's followers count
                const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
                const targetRef = doc(db, targetCollection, targetId);
                transaction.update(targetRef, { followersCount: currentFollowersCount + 1 });
            }

            return { status: relStatus === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING', success: true };
        });

        return result;
    } catch (e) {
        console.error("Follow Entity Error:", e);
        return { status: 'NONE', success: false };
    }
};

/**
 * Polymorphic Unfollow Function
 */
export const unfollowEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetId)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            // 1. Delete Relationship Doc
            transaction.delete(snapshot.docs[0].ref);

            // 2. Update my counts
            const currentUserRef = doc(db, 'users', currentUserId);
            const userSnap = await transaction.get(currentUserRef);
            if (userSnap.exists()) {
                const newFollowing = (userSnap.data()?.following || []).filter((id: string) => id !== targetId);
                transaction.update(currentUserRef, { 
                    following: newFollowing,
                    followingCount: Math.max(0, (userSnap.data()?.followingCount || 0) - 1)
                });
            }

            // 3. Update target's count
            const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
            const targetRef = doc(db, targetCollection, targetId);
            const targetSnap = await transaction.get(targetRef);
            if (targetSnap.exists()) {
                transaction.update(targetRef, { 
                    followersCount: Math.max(0, (targetSnap.data()?.followersCount || 0) - 1) 
                });
            }
        });
        return true;
    } catch (e) {
        console.error("Unfollow Error:", e);
        return false;
    }
};

// Legacy Wrapper support
export const followUserSmart = async (currentUserId: string, targetUserId: string) => {
    return followEntity(currentUserId, targetUserId, 'USER');
};

export const unfollowUserSmart = async (currentUserId: string, targetId: string) => {
    return unfollowEntity(currentUserId, targetId, 'USER');
};

// Added followOrganizationSmart to fix error in OrganizationProfile.tsx
export const followOrganizationSmart = async (currentUserId: string, orgId: string) => {
    return followEntity(currentUserId, orgId, 'ORGANIZATION');
};
