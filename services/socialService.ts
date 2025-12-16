
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    serverTimestamp, addDoc, deleteDoc, getDoc, limit, orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { FollowStatus, Relationship, User } from '../types';

const relationshipsRef = collection(db, 'relationships');

/**
 * Checks the relationship status between current user and target user.
 */
export const checkFollowStatus = async (currentUserId: string, targetUserId: string): Promise<FollowStatus> => {
    try {
        const q = query(
            relationshipsRef, 
            where('followerId', '==', currentUserId), 
            where('followingId', '==', targetUserId)
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
            const existingSnap = await getDocs(q); // Transaction read limitation: query must be done carefully or use deterministic IDs
            // Note: In real production, use ID like `follower_following` for O(1) reads.
            // For this demo, assuming standard flow.
            
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
                transaction.update(currentUserRef, { followingCount: (targetUser.followingCount || 0) + 1 });
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
 * Unfollows a user.
 */
export const unfollowUserSmart = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Find Relationship (Simplified Query for demo)
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetUserId)
            );
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return;

            const relDoc = snapshot.docs[0];
            const relData = relDoc.data() as Relationship;

            // 2. Delete Doc
            transaction.delete(relDoc.ref);

            // 3. Decrement Counters (Only if it was accepted)
            if (relData.status === 'ACCEPTED') {
                const currentUserRef = doc(db, 'users', currentUserId);
                const targetUserRef = doc(db, 'users', targetUserId);
                
                // Use increment(-1) for safety in prod, but logic here assumes reads
                const targetSnap = await transaction.get(targetUserRef);
                const currentSnap = await transaction.get(currentUserRef);
                
                if (targetSnap.exists() && currentSnap.exists()) {
                    const tCount = targetSnap.data().followersCount || 0;
                    const cCount = currentSnap.data().followingCount || 0;
                    
                    transaction.update(targetUserRef, { followersCount: Math.max(0, tCount - 1) });
                    transaction.update(currentUserRef, { followingCount: Math.max(0, cCount - 1) });
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
    // Basic implementation: Fetch IDs from relationships then fetch Users
    try {
        const q = query(relationshipsRef, where('followingId', '==', userId), where('status', '==', 'ACCEPTED'), limit(50));
        const snap = await getDocs(q);
        const userIds = snap.docs.map(d => d.data().followerId);
        
        if (userIds.length === 0) return [];
        
        // Firestore 'in' query supports up to 10
        // For scalability, you'd batch this. Doing top 10 for demo.
        const usersQ = query(collection(db, 'users'), where('__name__', 'in', userIds.slice(0, 10)));
        const usersSnap = await getDocs(usersQ);
        return usersSnap.docs.map(d => ({id: d.id, ...d.data()} as User));
    } catch (e) { return []; }
};
