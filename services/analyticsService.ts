
import { collection, addDoc, serverTimestamp, doc, runTransaction, increment, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AnalyticsEvent, SkillMetric } from '../types';

/**
 * Helper to remove undefined keys which Firestore rejects.
 * Using JSON stringify/parse is a safe way to strip undefineds for this data structure.
 */
const sanitizeEventData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

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
        
        // Ensure no 'undefined' values are passed to Firestore
        const cleanEvent = sanitizeEventData(event);

        await addDoc(collection(db, path), {
            ...cleanEvent,
            timestamp: Date.now(), 
            serverCreatedAt: serverTimestamp()
        });

        // --- ADAPTIVE LEARNING TRIGGER ---
        // If this is a Quiz Answer, update the User's Skill Profile in background
        if (event.type === 'QUIZ_ANSWER' && event.relatedTopics && event.relatedTopics.length > 0) {
            updateUserSkillProfile(event.userId, event.relatedTopics, event.outcome === 'SUCCESS');
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Analytics] ${event.type}:`, event);
        }

    } catch (error) {
        console.error("Analytics Log Error:", error);
    }
};

/**
 * Updates the user's skill matrix based on performance.
 * This enables the 'Adaptive Learning' engine to find weak spots.
 */
const updateUserSkillProfile = async (userId: string, topics: string[], isSuccess: boolean) => {
    if (!topics || topics.length === 0) return;

    try {
        const userSkillRef = doc(db, `users/${userId}/metrics/skills`);
        
        await runTransaction(db, async (transaction) => {
            const skillDoc = await transaction.get(userSkillRef);
            const currentSkills = skillDoc.exists() ? skillDoc.data().skills || {} : {};
            
            topics.forEach(topic => {
                const currentMetric: SkillMetric = currentSkills[topic] || {
                    level: 0,
                    lastTestedAt: 0,
                    failureCount: 0,
                    successCount: 0
                };

                // Adaptive Logic
                if (isSuccess) {
                    // Success: Increase level (capped at 100), reset failure count
                    // Diminishing returns: Harder to get from 90 to 100 than 0 to 10
                    const gain = Math.max(1, Math.round(5 * ((100 - currentMetric.level) / 100))); 
                    currentMetric.level = Math.min(100, currentMetric.level + gain);
                    currentMetric.successCount += 1;
                } else {
                    // Failure: Decrease level, increase failure count
                    currentMetric.level = Math.max(0, currentMetric.level - 10);
                    currentMetric.failureCount += 1;
                }
                
                currentMetric.lastTestedAt = Date.now();
                currentSkills[topic] = currentMetric;
            });

            transaction.set(userSkillRef, { 
                skills: currentSkills, 
                updatedAt: Date.now(),
                userId 
            }, { merge: true });
        });
        
    } catch (e) {
        console.error("Skill Update Error:", e);
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
