
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    increment, 
    runTransaction, 
    getDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    Course, 
    User, 
    ReviewTag, 
    ContentTier, 
    VerificationStatus, 
    AuthorType,
    StoryCard
} from '../types';
import { getOrganizationDetails } from './db';
import { deleteFileByUrl } from './storage';

// Helper to remove undefined values which Firestore rejects
const sanitizeData = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

/**
 * Creates a new course with logic based on User Level.
 */
export const publishContent = async (courseData: Omit<Course, 'id' | 'tier' | 'verificationStatus' | 'qualityScore' | 'flagCount' | 'authorType' | 'authorName' | 'authorAvatarUrl'> & { ownerType?: string }, user: User): Promise<boolean> => {
    try {
        let tier: ContentTier = 'COMMUNITY';
        let status: VerificationStatus = 'VERIFIED'; 
        
        if (user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin') {
            tier = 'OFFICIAL';
            status = 'VERIFIED';
        } else if (user.creatorLevel === 'EXPERT' || user.creatorLevel === 'MASTER') {
            tier = 'PRO';
            status = 'PENDING'; 
        } else {
            tier = 'COMMUNITY';
            if (courseData.duration > 5) {
                throw new Error("Başlangıç seviyesindeki içerik üreticileri maks. 5 dakikalık içerik üretebilir.");
            }
        }

        let authorType: AuthorType = 'USER';
        let authorName = user.name;
        let authorAvatarUrl = user.avatar;
        let finalAuthorId = user.id;

        if (courseData.ownerType === 'ORGANIZATION' && courseData.organizationId) {
            authorType = 'ORGANIZATION';
            finalAuthorId = courseData.organizationId; 
            
            const org = await getOrganizationDetails(courseData.organizationId);
            if (org) {
                authorName = org.name;
                authorAvatarUrl = org.logoUrl;
            }
        }

        const { ownerType, ...dataToSave } = courseData;

        const finalData = {
            ...dataToSave,
            tier,
            verificationStatus: status,
            qualityScore: 0,
            flagCount: 0,
            createdAt: Date.now(),
            authorType,
            authorId: finalAuthorId,
            authorName,
            authorAvatarUrl
        };

        // Sanitize data to remove undefined fields before sending to Firestore
        const cleanData = sanitizeData(finalData);

        await addDoc(collection(db, 'courses'), cleanData);
        
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
            
            if (course.authorType === 'USER') {
                const authorRef = doc(db, 'users', course.authorId);
                
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
                limit(30)
            );
        } else {
            q = query(
                coursesRef, 
                where('verificationStatus', '==', 'VERIFIED'),
                limit(50)
            );
        }

        const snapshot = await getDocs(q);
        let courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        
        return courses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Smart Feed Error:", error);
        return [];
    }
};

/**
 * DELETION ENGINE
 * Deletes the course document AND all associated media from Storage.
 * Guaranteed Cleanup: Even if media deletion fails, document is removed.
 */
export const deleteCourseFully = async (courseId: string): Promise<boolean> => {
    try {
        // 1. Fetch Course Data
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) return true; // Already deleted
        
        const course = courseSnap.data() as Course;

        // 2. Try to Delete Files (Best Effort)
        try {
            const filesToDelete: Promise<void>[] = [];

            // Cover Image
            if (course.thumbnailUrl) {
                filesToDelete.push(deleteFileByUrl(course.thumbnailUrl));
            }

            // Slide Media
            if (course.steps && course.steps.length > 0) {
                course.steps.forEach((step: StoryCard) => {
                    if (step.mediaUrl) {
                        filesToDelete.push(deleteFileByUrl(step.mediaUrl));
                    }
                });
            }

            // Execute parallel deletion, wait for all, ignore individual errors inside deleteFileByUrl
            if (filesToDelete.length > 0) {
                await Promise.allSettled(filesToDelete);
            }
        } catch (fileErr) {
            console.warn("Media deletion partial failure (ignoring to proceed with doc delete):", fileErr);
        }

        // 3. Delete Document (Guaranteed)
        await deleteDoc(courseRef);

        return true;
    } catch (error) {
        console.error("Course Full Delete Failed:", error);
        return false;
    }
};
