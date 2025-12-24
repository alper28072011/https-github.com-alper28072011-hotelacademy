
import { collection, doc, getDoc, getDocs, limit, query, where, documentId } from 'firebase/firestore';
import { db } from './firebase';
import { Course, User, CareerPath, Organization } from '../types';

interface DualEngineRecommendations {
    duties: Course[]; // Network Duties (Mandatory)
    vision: Course[]; // Career Growth (Aspirational)
}

/**
 * DUAL ENGINE RECOMMENDATION SYSTEM
 * 
 * Engine 1: "Duties" (High Priority)
 * - Source: Primary Network (Organization)
 * - Logic: Mandatory channels, Assigned departmental courses.
 * 
 * Engine 2: "Vision" (Growth)
 * - Source: Target Career Path
 * - Logic: Next steps in the selected career path.
 */
export const getPersonalizedRecommendations = async (userId: string, orgId: string): Promise<DualEngineRecommendations> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return { duties: [], vision: [] };
        
        const user = userSnap.data() as User;
        
        // Use primaryNetworkId if available, otherwise fallback to orgId context
        const networkId = user.primaryNetworkId || orgId;
        const careerPathId = user.targetCareerPathId || user.assignedPathId;

        // --- ENGINE 1: DUTIES ---
        const dutiesPromise = (async () => {
            if (!networkId) return [];
            
            // 1. Get Org Data to find Mandatory Channels
            const orgRef = doc(db, 'organizations', networkId);
            const orgSnap = await getDoc(orgRef);
            if (!orgSnap.exists()) return [];
            const org = orgSnap.data() as Organization;
            
            const mandatoryChannelIds = org.channels?.filter(c => c.isMandatory).map(c => c.id) || [];
            // Combine with user subscriptions
            const allTargetChannels = [...new Set([...mandatoryChannelIds, ...(user.channelSubscriptions || [])])];
            
            if (allTargetChannels.length === 0) return [];

            // 2. Query Courses targeting these channels
            // Note: Firestore array-contains-any is limited to 10. We take top 10.
            const safeChannels = allTargetChannels.slice(0, 10);
            
            const q = query(
                collection(db, 'courses'),
                where('organizationId', '==', networkId),
                where('targetChannelIds', 'array-contains-any', safeChannels),
                limit(5) // Top 5 Duties
            );
            
            const snap = await getDocs(q);
            const courses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
            
            // Filter completed
            return courses.filter(c => !user.completedCourses.includes(c.id));
        })();

        // --- ENGINE 2: VISION ---
        const visionPromise = (async () => {
            if (!careerPathId) return [];
            
            const pathRef = doc(db, 'careerPaths', careerPathId);
            const pathSnap = await getDoc(pathRef);
            if (!pathSnap.exists()) return [];
            
            const path = pathSnap.data() as CareerPath;
            const courseIds = path.courseIds || [];
            
            // Find first 3 uncompleted courses in path order
            const nextCourseIds = courseIds.filter(id => !user.completedCourses.includes(id)).slice(0, 3);
            
            if (nextCourseIds.length === 0) return [];

            const q = query(
                collection(db, 'courses'),
                where(documentId(), 'in', nextCourseIds)
            );
            
            const snap = await getDocs(q);
            // Re-sort based on path order
            const courses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
            return courses.sort((a, b) => courseIds.indexOf(a.id) - courseIds.indexOf(b.id));
        })();

        const [duties, vision] = await Promise.all([dutiesPromise, visionPromise]);

        return { duties, vision };

    } catch (e) {
        console.error("Recommendation Error:", e);
        return { duties: [], vision: [] };
    }
};
