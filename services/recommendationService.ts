
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Course, UserSkillProfile, SkillMetric } from '../types';

/**
 * ADAPTIVE RECOMMENDATION ENGINE
 * 
 * Analyzes the user's skill profile to find:
 * 1. Weak Spots (High failure count or Low level)
 * 2. Stale Skills (Not tested in a long time - "Spaced Repetition")
 * 3. Returns content matching these topics.
 */
export const getPersonalizedRecommendations = async (userId: string, orgId: string): Promise<{
    courses: Course[];
    reason: string; // "Zayıf Yönlerini Güçlendir" or "Bilgilerini Tazele"
}> => {
    try {
        // 1. Fetch User Skills
        const skillDoc = await getDoc(doc(db, `users/${userId}/metrics/skills`));
        
        if (!skillDoc.exists()) {
            return { courses: [], reason: '' };
        }

        const profile = skillDoc.data() as UserSkillProfile;
        const skills = profile.skills || {};

        // 2. Identify Target Topics
        const weakTopics: string[] = [];
        const staleTopics: string[] = [];
        const now = Date.now();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

        Object.entries(skills).forEach(([topic, metric]) => {
            if (metric.level < 40 || metric.failureCount > 2) {
                weakTopics.push(topic);
            } else if ((now - metric.lastTestedAt) > ONE_WEEK && metric.level < 80) {
                staleTopics.push(topic);
            }
        });

        // 3. Select Strategy
        let targetTopics = [];
        let reason = "";

        if (weakTopics.length > 0) {
            targetTopics = weakTopics.slice(0, 5); // Focus on top 5 weak points
            reason = "Eksiklerini Tamamla";
        } else if (staleTopics.length > 0) {
            targetTopics = staleTopics.slice(0, 5);
            reason = "Bilgilerini Tazele";
        } else {
            return { courses: [], reason: '' };
        }

        // 4. Query Content (Firestore array-contains-any limit is 10)
        // Note: In production, we might use MeiliSearch/Algolia for this.
        // Here we use Firestore basic capabilities.
        
        if (targetTopics.length === 0) return { courses: [], reason: '' };

        const q = query(
            collection(db, 'courses'),
            where('organizationId', '==', orgId),
            where('topics', 'array-contains-any', targetTopics),
            limit(10)
        );

        const snapshot = await getDocs(q);
        const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));

        return { courses, reason };

    } catch (e) {
        console.error("Recommendation Error:", e);
        return { courses: [], reason: '' };
    }
};
