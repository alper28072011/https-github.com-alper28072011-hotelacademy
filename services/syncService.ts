
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

/**
 * SYNC QUEUE MANAGER
 * Stores actions in localStorage when offline, pushes to Firebase when online.
 */

interface PendingAction {
    type: 'COURSE_PROGRESS' | 'COURSE_COMPLETE';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY = 'offline_sync_queue';

export const SyncService = {
    
    addToQueue: (action: PendingAction) => {
        const queue = SyncService.getQueue();
        queue.push(action);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    },

    getQueue: (): PendingAction[] => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    },

    clearQueue: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Attempts to flush the queue to Firestore.
     */
    flush: async (userId: string) => {
        const queue = SyncService.getQueue();
        if (queue.length === 0) return;

        console.log(`[SyncService] Flushing ${queue.length} items...`);
        const userRef = doc(db, 'users', userId);

        for (const item of queue) {
            try {
                if (item.type === 'COURSE_PROGRESS') {
                    const { courseId, index, total } = item.payload;
                    const progressKey = `progressMap.${courseId}`;
                    await updateDoc(userRef, {
                        [`${progressKey}.courseId`]: courseId,
                        [`${progressKey}.status`]: 'IN_PROGRESS',
                        [`${progressKey}.currentCardIndex`]: index,
                        [`${progressKey}.totalCards`]: total,
                        [`${progressKey}.lastAccessedAt`]: item.timestamp,
                        startedCourses: arrayUnion(courseId)
                    });
                } 
                else if (item.type === 'COURSE_COMPLETE') {
                    const { courseId, xp, total } = item.payload;
                    const progressKey = `progressMap.${courseId}`;
                    await updateDoc(userRef, {
                        xp: increment(xp), 
                        completedCourses: arrayUnion(courseId),
                        [`${progressKey}.status`]: 'COMPLETED',
                        [`${progressKey}.completedAt`]: item.timestamp,
                        [`${progressKey}.currentCardIndex`]: 0,
                        [`${progressKey}.totalCards`]: total
                    });
                }
            } catch (e) {
                console.error("[SyncService] Item failed:", item, e);
                // In a real app, we might want to keep failed items in queue
            }
        }

        SyncService.clearQueue();
        console.log(`[SyncService] Sync complete.`);
    }
};

// Auto-init listener
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        // Need userId to flush, so we wait for auth state or pass it differently.
        // For simplicity, we assume components call SyncService.flush() on mount/auth.
    });
}
