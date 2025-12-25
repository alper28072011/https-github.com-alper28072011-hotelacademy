
import { 
    doc, runTransaction, collection, query, where, getDocs, 
    increment, writeBatch, getDoc, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { FollowStatus, Relationship, User } from '../types';

/**
 * Checks relationship status using the scalable Sub-collection path.
 */
export const checkFollowStatus = async (currentUserId: string, targetId: string): Promise<FollowStatus> => {
    try {
        // Check if I am following them (Doc existence check in sub-collection)
        // Path: users/{currentUserId}/following/{targetId}
        const docRef = doc(db, `users/${currentUserId}/following/${targetId}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            return 'FOLLOWING'; 
        }
        
        // If not following, check if pending (using legacy relationship collection for pending states or just assume NONE for now)
        // For simplicity in this architecture refactor, we are using direct sub-collections for ACCEPTED relationships.
        // Pending requests would live in a separate requests collection if strictly needed.
        return 'NONE';
    } catch (e) {
        console.error("Check Follow Status Error:", e);
        return 'NONE';
    }
};

/**
 * Toggle following a hashtag (Interest).
 * Tags are low-cardinality, so arrayUnion is still acceptable for `followedTags` on User doc.
 */
export const toggleTagFollow = async (userId: string, tag: string, isFollowing: boolean): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        // We import arrayUnion dynamically inside if strict needed, but here we can rely on standard imports
        const { updateDoc, arrayUnion, arrayRemove } = await import('firebase/firestore');
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
 * SCALABLE FOLLOW FUNCTION (Sub-collections)
 * 
 * Writes to:
 * 1. users/{targetId}/followers/{myId}  (For "Who follows target?")
 * 2. users/{myId}/following/{targetId}  (For "Who do I follow?")
 * 3. Increments counters on both docs.
 */
export const followEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<{ status: FollowStatus, success: boolean }> => {
    try {
        const batch = writeBatch(db);
        const timestamp = Date.now();

        // 1. References
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
        const targetRef = doc(db, targetCollection, targetId);

        // Sub-collections
        const myFollowingRef = doc(db, `users/${currentUserId}/following/${targetId}`);
        const targetFollowerRef = doc(db, `${targetCollection}/${targetId}/followers/${currentUserId}`);

        // 2. Data
        const followingData = {
            id: targetId,
            type: targetType,
            createdAt: timestamp
        };

        const followerData = {
            id: currentUserId,
            type: 'USER',
            createdAt: timestamp
        };

        // 3. Queue Writes
        batch.set(myFollowingRef, followingData);
        batch.set(targetFollowerRef, followerData);

        // 4. Atomic Increments
        batch.update(currentUserRef, { followingCount: increment(1) });
        batch.update(targetRef, { followersCount: increment(1) });

        await batch.commit();

        return { status: 'FOLLOWING', success: true };
    } catch (e) {
        console.error("Follow Entity Error:", e);
        return { status: 'NONE', success: false };
    }
};

/**
 * SCALABLE UNFOLLOW FUNCTION
 * Deletes from sub-collections and decrements counters.
 */
export const unfollowEntity = async (
    currentUserId: string, 
    targetId: string, 
    targetType: 'USER' | 'ORGANIZATION'
): Promise<boolean> => {
    try {
        const batch = writeBatch(db);

        // 1. References
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetCollection = targetType === 'USER' ? 'users' : 'organizations';
        const targetRef = doc(db, targetCollection, targetId);

        const myFollowingRef = doc(db, `users/${currentUserId}/following/${targetId}`);
        const targetFollowerRef = doc(db, `${targetCollection}/${targetId}/followers/${currentUserId}`);

        // 2. Queue Deletes
        batch.delete(myFollowingRef);
        batch.delete(targetFollowerRef);

        // 3. Atomic Decrements
        batch.update(currentUserRef, { followingCount: increment(-1) });
        batch.update(targetRef, { followersCount: increment(-1) });

        await batch.commit();
        return true;
    } catch (e) {
        console.error("Unfollow Error:", e);
        return false;
    }
};

// Wrappers for compatibility
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
 * SCALABLE POST LIKE SYSTEM
 * Uses sub-collection `posts/{postId}/likes/{userId}` to handle millions of likes.
 */
export const togglePostLikeScalable = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const batch = writeBatch(db);
        const postRef = doc(db, 'posts', postId);
        const likeRef = doc(db, `posts/${postId}/likes/${userId}`);

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
        const likeRef = doc(db, `posts/${postId}/likes/${userId}`);
        const snap = await getDoc(likeRef);
        return snap.exists();
    } catch (e) {
        return false;
    }
};
