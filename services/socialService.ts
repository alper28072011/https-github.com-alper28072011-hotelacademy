
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    serverTimestamp, limit
} from 'firebase/firestore';
import { db } from './firebase';
import { FollowStatus, Relationship, User } from '../types';

const relationshipsRef = collection(db, 'relationships');

/**
 * Checks the relationship status between current user and target user/org.
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
 * Follows a user. Handles Private vs Public accounts.
 */
export const followUserSmart = async (currentUserId: string, targetUserId: string): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            // 1. Get Target User Profile (to check privacy)
            const targetUserRef = doc(db, 'users', targetUserId);
            const targetUserSnap = await transaction.get(targetUserRef);
            
            if (!targetUserSnap.exists()) throw new Error("User not found");
            
            const targetUser = targetUserSnap.data() as User;
            const isPrivate = targetUser.isPrivate || false;

            // 2. Check existing relationship
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetUserId)
            );
            const existingSnap = await getDocs(q); 
            
            if (!existingSnap.empty) {
                return { status: existingSnap.docs[0].data().status as FollowStatus, success: false };
            }

            // 3. Create Relationship
            const relStatus = isPrivate ? 'PENDING' : 'ACCEPTED';
            const newRelRef = doc(collection(db, 'relationships'));
            
            transaction.set(newRelRef, {
                followerId: currentUserId,
                followingId: targetUserId,
                status: relStatus,
                createdAt: Date.now()
            });

            // 4. Update Counters (Only if Public)
            if (!isPrivate) {
                const currentUserRef = doc(db, 'users', currentUserId);
                const currentUserDoc = await transaction.get(currentUserRef);
                const currentFollowing = currentUserDoc.data()?.following || [];

                transaction.update(currentUserRef, { 
                    followingCount: (currentUserDoc.data()?.followingCount || 0) + 1,
                    following: [...currentFollowing, targetUserId]
                });
                transaction.update(targetUserRef, { followersCount: (targetUser.followersCount || 0) + 1 });
            }

            // 5. Send Notification
            const notifRef = doc(collection(db, `users/${targetUserId}/notifications`));
            transaction.set(notifRef, {
                title: isPrivate ? 'Takip İsteği' : 'Yeni Takipçi',
                message: isPrivate ? 'Bir kullanıcı sizi takip etmek istiyor.' : 'Bir kullanıcı sizi takip etmeye başladı.',
                type: 'system',
                isRead: false,
                createdAt: serverTimestamp(),
                link: `/user/${currentUserId}`
            });

            return { status: relStatus === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING', success: true };
        });

        return result as { status: FollowStatus, success: boolean };

    } catch (e) {
        console.error("Follow Error:", e);
        return { status: 'NONE', success: false };
    }
};

/**
 * Follows an Organization. (Organizations are always PUBLIC for now)
 */
export const followOrganizationSmart = async (currentUserId: string, targetOrgId: string): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            const orgRef = doc(db, 'organizations', targetOrgId);
            const orgSnap = await transaction.get(orgRef);
            if (!orgSnap.exists()) throw new Error("Organization not found");

            // Check duplicate
            const q = query(relationshipsRef, where('followerId', '==', currentUserId), where('followingId', '==', targetOrgId));
            const existingSnap = await getDocs(q);
            if (!existingSnap.empty) return { status: 'FOLLOWING', success: false };

            // Create Relationship
            const newRelRef = doc(collection(db, 'relationships'));
            transaction.set(newRelRef, {
                followerId: currentUserId,
                followingId: targetOrgId,
                status: 'ACCEPTED',
                createdAt: Date.now()
            });

            // Update User Following List & Count
            const userRef = doc(db, 'users', currentUserId);
            const userDoc = await transaction.get(userRef);
            const currentFollowing = userDoc.data()?.following || [];
            
            transaction.update(userRef, { 
                followingCount: (userDoc.data()?.followingCount || 0) + 1,
                following: [...currentFollowing, targetOrgId]
            });

            // Update Org Followers Count
            const currentFollowers = orgSnap.data()?.followersCount || 0;
            transaction.update(orgRef, { followersCount: currentFollowers + 1 });

            return { status: 'FOLLOWING', success: true };
        });
        return result;
    } catch (e) {
        console.error("Follow Org Error:", e);
        return { status: 'NONE', success: false };
    }
};

/**
 * Unfollows a user OR organization.
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
        
        const usersQ = query(collection(db, 'users'), where('__name__', 'in', userIds.slice(0, 10)));
        const usersSnap = await getDocs(usersQ);
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) { return []; }
};
