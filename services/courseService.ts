
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
    CreatorLevel,
    AuthorType
} from '../types';
import { getOrganizationDetails } from './db';

/**
 * Creates a new course with logic based on User Level.
 * - Novice: Can only create Community Shorts (auto-published).
 * - Expert: Can create PRO Courses (Pending Review).
 * - Manager/Admin: Can create OFFICIAL Content (Auto-verified).
 */
export const publishContent = async (courseData: Omit<Course, 'id' | 'tier' | 'verificationStatus' | 'qualityScore' | 'flagCount' | 'authorType' | 'authorName' | 'authorAvatarUrl'> & { ownerType?: string }, user: User): Promise<boolean> => {
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
            if (courseData.duration > 5) {
                throw new Error("Başlangıç seviyesindeki içerik üreticileri maks. 5 dakikalık içerik üretebilir.");
            }
        }

        // 2. Prepare Author Details (Denormalization)
        let authorType: AuthorType = 'USER';
        let authorName = user.name;
        let authorAvatarUrl = user.avatar;
        let finalAuthorId = user.id;

        // If posting AS Organization (Manager/Admin posting to Org)
        if (courseData.ownerType === 'ORGANIZATION' && courseData.organizationId) {
            authorType = 'ORGANIZATION';
            finalAuthorId = courseData.organizationId;
            // Fetch Org details to stamp on the card
            const org = await getOrganizationDetails(courseData.organizationId);
            if (org) {
                authorName = org.name;
                authorAvatarUrl = org.logoUrl;
            }
        }

        // 3. Prepare Final Data
        // Extract ownerType to avoid saving it to DB if not needed, though Firestore ignores extra fields usually if not strictly typed in addDoc (which is generic here)
        const { ownerType, ...dataToSave } = courseData;

        const finalData = {
            ...dataToSave,
            tier,
            verificationStatus: status,
            qualityScore: 0,
            flagCount: 0,
            createdAt: Date.now(),
            // Stamped Author Info
            authorType,
            authorId: finalAuthorId,
            authorName,
            authorAvatarUrl
        };

        // 4. Write to DB
        await addDoc(collection(db, 'courses'), finalData);
        
        // 5. Update User Stats (Optimistic Reputation for creating)
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
            
            // Only reward USER authors, not ORGS directly (Orgs don't have XP)
            if (course.authorType === 'USER') {
                const authorRef = doc(db, 'users', course.authorId);
                
                // Economy: Reputation & XP
                let reputationDelta = 0;
                let xpDelta = 0;

                if (rating >= 4) {
                    reputationDelta = 10; 
                    xpDelta = 50;
                } else if (rating <= 2) {
                    reputationDelta = -5;
                }

                if (tags.includes('ACCURATE') || tags.includes('ENGAGING')) {
                    reputationDelta += 5;
                }

                transaction.update(authorRef, {
                    reputationPoints: increment(reputationDelta),
                    xp: increment(xpDelta)
                });
            }

            // Auto-Moderation Logic
            let newStatus = course.verificationStatus;
            let newFlagCount = course.flagCount || 0;

            if (tags.includes('MISLEADING') || tags.includes('OUTDATED')) {
                newFlagCount += 1;
                if (newFlagCount >= 3) {
                    newStatus = 'UNDER_REVIEW'; 
                }
            }

            transaction.update(courseRef, {
                qualityScore: rating,
                flagCount: newFlagCount,
                verificationStatus: newStatus
            });
        });
        return true;
    } catch (error) {
        console.error("Review Error:", error);
        return false;
    }
};

/**
 * Intelligent Feed Algorithm
 */
export const getSmartFeed = async (user: User, showVerifiedOnly: boolean): Promise<Course[]> => {
    try {
        const coursesRef = collection(db, 'courses');
        let q;

        if (showVerifiedOnly) {
            q = query(
                coursesRef, 
                where('tier', 'in', ['PRO', 'OFFICIAL']),
                where('verificationStatus', '==', 'VERIFIED'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
        } else {
            q = query(
                coursesRef, 
                where('verificationStatus', '==', 'VERIFIED'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        }

        const snapshot = await getDocs(q);
        let courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        
        return courses;
    } catch (error) {
        console.error("Smart Feed Error:", error);
        return [];
    }
};
