
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    increment, 
    runTransaction, 
    serverTimestamp, 
    getDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    Course, 
    User, 
    ReviewTag, 
    ContentTier, 
    VerificationStatus, 
    CreatorLevel 
} from '../types';

/**
 * Creates a new course with logic based on User Level.
 * - Novice: Can only create Community Shorts (auto-published).
 * - Expert: Can create PRO Courses (Pending Review).
 * - Manager/Admin: Can create OFFICIAL Content (Auto-verified).
 */
export const publishContent = async (courseData: Omit<Course, 'id' | 'tier' | 'verificationStatus' | 'qualityScore' | 'flagCount'>, user: User): Promise<boolean> => {
    try {
        let tier: ContentTier = 'COMMUNITY';
        let status: VerificationStatus = 'VERIFIED'; // Default open for Community
        
        // 1. Determine Tier & Status based on User Role & Level
        if (user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin') {
            tier = 'OFFICIAL';
            status = 'VERIFIED';
        } else if (user.creatorLevel === 'EXPERT' || user.creatorLevel === 'MASTER') {
            tier = 'PRO';
            status = 'PENDING'; // Experts need review for PRO content
        } else {
            // NOVICE / RISING_STAR
            tier = 'COMMUNITY';
            // Constraint: Novices can't make long courses (handled in UI, enforced here if needed)
            if (courseData.duration > 5) {
                throw new Error("Başlangıç seviyesindeki içerik üreticileri maks. 5 dakikalık içerik üretebilir.");
            }
        }

        // 2. Prepare Data
        const finalData = {
            ...courseData,
            tier,
            verificationStatus: status,
            qualityScore: 0, // Start fresh
            flagCount: 0,
            createdAt: serverTimestamp()
        };

        // 3. Write to DB
        await addDoc(collection(db, 'courses'), finalData);
        
        // 4. Update User Stats (Optimistic Reputation for creating)
        // Small reward for creation to encourage activity
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
            xp: increment(50) 
        });

        return true;
    } catch (error) {
        console.error("Publish Error:", error);
        return false;
    }
};

/**
 * Handles Course Review & Economy Logic
 * - Updates Course Rating
 * - Awards XP/Reputation to Author
 * - Auto-Moderation (Flagging)
 */
export const submitReview = async (
    courseId: string, 
    reviewerId: string, 
    rating: number, 
    tags: ReviewTag[]
): Promise<boolean> => {
    try {
        await runTransaction(db, async (transaction) => {
            const courseRef = doc(db, 'courses', courseId);
            const courseSnap = await transaction.get(courseRef);
            if (!courseSnap.exists()) throw new Error("Course not found");
            
            const course = courseSnap.data() as Course;
            const authorRef = doc(db, 'users', course.authorId);

            // 1. Calculate New Rating (Weighted Average or Simple Moving Avg)
            // Simplified here: Just strictly updating based on input for demo
            // In prod: (oldRating * count + newRating) / (count + 1)
            
            // 2. Auto-Moderation Logic
            let newStatus = course.verificationStatus;
            let newFlagCount = course.flagCount || 0;

            if (tags.includes('MISLEADING') || tags.includes('OUTDATED')) {
                newFlagCount += 1;
                if (newFlagCount >= 3) {
                    newStatus = 'UNDER_REVIEW'; // Quarantine content
                }
            }

            // 3. Economy: Reputation & XP
            let reputationDelta = 0;
            let xpDelta = 0;

            if (rating >= 4) {
                reputationDelta = 10; // Good content
                xpDelta = 50;
            } else if (rating <= 2) {
                reputationDelta = -5; // Poor content
            }

            if (tags.includes('ACCURATE') || tags.includes('ENGAGING')) {
                reputationDelta += 5;
            }

            // 4. Commit Updates
            transaction.update(courseRef, {
                qualityScore: rating, // Simplify: storing last rating or avg logic
                flagCount: newFlagCount,
                verificationStatus: newStatus
            });

            // Award Author
            transaction.update(authorRef, {
                reputationPoints: increment(reputationDelta),
                xp: increment(xpDelta)
            });

            // Note: Could also upgrade CreatorLevel here if reputation crosses threshold
        });
        return true;
    } catch (error) {
        console.error("Review Error:", error);
        return false;
    }
};

/**
 * Intelligent Feed Algorithm
 * Returns mixed content based on Trust & Relevance
 */
export const getSmartFeed = async (user: User, showVerifiedOnly: boolean): Promise<Course[]> => {
    try {
        const coursesRef = collection(db, 'courses');
        let q;

        if (showVerifiedOnly) {
            // Show only PRO (Verified Experts) or OFFICIAL (Org)
            q = query(
                coursesRef, 
                where('tier', 'in', ['PRO', 'OFFICIAL']),
                where('verificationStatus', '==', 'VERIFIED'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
        } else {
            // "For You" Logic:
            // 1. Official Org Content (High Priority)
            // 2. High Rated Community Content
            // 3. New Content
            // Note: Complex OR queries are limited in Firestore, so we fetch basic list and filter client-side for advanced "For You" logic in this demo architecture.
            q = query(
                coursesRef, 
                where('verificationStatus', '==', 'VERIFIED'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        }

        const snapshot = await getDocs(q);
        let courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));

        // Client-Side Post-Processing for "Relevance"
        // Filter out content from blocked users or blocked tags if we had that feature.
        
        return courses;
    } catch (error) {
        console.error("Smart Feed Error:", error);
        return [];
    }
};
