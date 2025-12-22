
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    increment, writeBatch, getDoc, arrayUnion, arrayRemove, updateDoc
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
 * Toggle following a hashtag (Interest).
 */
export const toggleTagFollow = async (userId: string, tag: string, isFollowing: boolean): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        const cleanTag = tag.toLowerCase().trim().replace('#', '');
        
        await updateDoc(userRef, {
            followedTags: isFollowing ? arrayUnion(cleanTag) : arrayRemove(cleanTag)
        });
        return true;
    } catch (e) {
        console.error("Tag Follow Error:", e);
        return false;
    }
};

/**
 * Polymorphic Follow Function (Updated for New Architecture)
 * 
 * If targetType is USER -> Updates `followingUsers` on current user.
 * If targetType is ORGANIZATION -> Updates `followingPages` on current user.
 */
export const followEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            let isPrivate = false;

            // 1. Get Target Data
            const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
            const targetRef = doc(db, targetCollection, targetId);
            const targetSnap = await transaction.get(targetRef);
            
            if (!targetSnap.exists()) throw new Error("Target not found");
            
            if (targetType === 'USER') {
                const data = targetSnap.data() as User;
                isPrivate = data.isPrivate || false;
            }

            // 2. Check existing relationship
            const q = query(
                relationshipsRef, 
                where('followerId', '==', currentUserId), 
                where('followingId', '==', targetId)
            );
            const existingSnap = await getDocs(q); 
            if (!existingSnap.empty) return { status: existingSnap.docs[0].data().status as FollowStatus, success: false };

            // 3. Create Relationship Doc (Source of Truth)
            const relStatus = isPrivate ? 'PENDING' : 'ACCEPTED';
            const newRelRef = doc(collection(db, 'relationships'));
            
            transaction.set(newRelRef, {
                followerId: currentUserId,
                followingId: targetId,
                status: relStatus,
                createdAt: Date.now()
            });

            // 4. Update Denormalized Arrays (For Feed Performance)
            if (relStatus === 'ACCEPTED') {
                const currentUserRef = doc(db, 'users', currentUserId);
                
                if (targetType === 'USER') {
                    transaction.update(currentUserRef, { 
                        followingUsers: arrayUnion(targetId),
                        followingCount: increment(1)
                    });
                } else {
                    transaction.update(currentUserRef, { 
                        followingPages: arrayUnion(targetId),
                        followingCount: increment(1)
                    });
                }

                transaction.update(targetRef, { 
                    followers: arrayUnion(currentUserId),
                    followersCount: increment(1) 
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

            // 2. Remove from Denormalized Arrays
            const currentUserRef = doc(db, 'users', currentUserId);
            
            if (targetType === 'USER') {
                transaction.update(currentUserRef, { 
                    followingUsers: arrayRemove(targetId),
                    followingCount: increment(-1)
                });
            } else {
                transaction.update(currentUserRef, { 
                    followingPages: arrayRemove(targetId),
                    followingCount: increment(-1)
                });
            }

            const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
            const targetRef = doc(db, targetCollection, targetId);
            
            transaction.update(targetRef, { 
                followers: arrayRemove(currentUserId),
                followersCount: increment(-1) 
            });
        });
        return true;
    } catch (e) {
        console.error("Unfollow Error:", e);
        return false;
    }
};

// Legacy Wrappers
export const followUserSmart = async (currentUserId: string, targetUserId: string) => {
    return followEntity(currentUserId, targetUserId, 'USER');
};

export const unfollowUserSmart = async (currentUserId: string, targetId: string) => {
    return unfollowEntity(currentUserId, targetId, 'USER');
};

export const followOrganizationSmart = async (currentUserId: string, orgId: string) => {
    return followEntity(currentUserId, orgId, 'ORGANIZATION');
};

/**
 * SCALABLE POST LIKE SYSTEM (Sub-collection Pattern)
 */
export const togglePostLikeScalable = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const batch = writeBatch(db);
        const postRef = doc(db, 'posts', postId);
        const likeRef = doc(db, 'posts', postId, 'likes', userId);

        if (isLiked) {
            batch.set(likeRef, { userId, createdAt: Date.now() });
            batch.update(postRef, { likesCount: increment(1) });
        } else {
            batch.delete(likeRef);
            batch.update(postRef, { likesCount: increment(-1) });
        }

        await batch.commit();
        return true;
    } catch (e) {
        console.error("Like Toggle Error:", e);
        return false;
    }
};

export const hasUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
    try {
        const likeRef = doc(db, 'posts', postId, 'likes', userId);
        const snap = await getDoc(likeRef);
        return snap.exists();
    } catch (e) {
        return false;
    }
};
