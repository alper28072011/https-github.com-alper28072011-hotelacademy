
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AnalyticsEvent } from '../types';

/**
 * LOGS A LEARNING EVENT
 * Writes to a sub-collection for better scalability and querying scope.
 * Path: organizations/{orgId}/analytics/{autoId}
 */
export const logEvent = async (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
    try {
        if (!event.pageId) {
            console.warn("Analytics: Missing pageId, event dropped.", event);
            return;
        }

        const path = `organizations/${event.pageId}/analytics`;
        
        await addDoc(collection(db, path), {
            ...event,
            timestamp: Date.now(), // Use client time for sequence, serverTimestamp for sync
            serverCreatedAt: serverTimestamp()
        });

        // Debug logging in dev
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Analytics] ${event.type}:`, event);
        }

    } catch (error) {
        // Analytics should fail silently to not disrupt UX
        console.error("Analytics Log Error:", error);
    }
};

/**
 * HELPER: Construct standard event payload
 */
export const createEventPayload = (
    user: { id: string, name: string, roleTitle?: string }, 
    context: { pageId: string, channelId?: string, contentId: string },
    type: AnalyticsEvent['type'],
    payload?: any
): Omit<AnalyticsEvent, 'id' | 'timestamp'> => {
    return {
        userId: user.id,
        userName: user.name,
        userRole: user.roleTitle || 'Member',
        pageId: context.pageId,
        channelId: context.channelId,
        contentId: context.contentId,
        type,
        payload
    };
};
