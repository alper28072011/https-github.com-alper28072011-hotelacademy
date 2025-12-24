
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
    limit,
    writeBatch,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    Course, 
    User, 
    ReviewTag, 
    ContentTier, 
    VerificationStatus, 
    AuthorType,
    StoryCard,
    CourseTopic,
    LearningModule
} from '../types';
import { getOrganizationDetails } from './db';
import { deleteFolder } from './storage';
import { StoragePaths } from '../utils/storagePaths';
import { getPersonalizedRecommendations } from './recommendationService';

const sanitizeData = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1200';

// --- HIERARCHY MANAGEMENT (NEW) ---

export const createCourse = async (courseData: Partial<Course>, user: User): Promise<Course | null> => {
    try {
        const newCourse: any = {
            ...courseData,
            thumbnailUrl: courseData.thumbnailUrl || DEFAULT_THUMBNAIL,
            createdAt: Date.now(),
            authorId: user.id,
            authorName: user.name,
            authorAvatarUrl: user.avatar,
            topicIds: [], // Start empty
            modules: [], // Deprecated
            steps: [] // Deprecated
        };
        const docRef = await addDoc(collection(db, 'courses'), newCourse);
        return { id: docRef.id, ...newCourse };
    } catch (e) {
        console.error("Create Course Error:", e);
        return null;
    }
};

export const updateCourse = async (courseId: string, data: Partial<Course>): Promise<boolean> => {
    try { 
        await updateDoc(doc(db, 'courses', courseId), sanitizeData(data)); 
        return true; 
    } catch (e) { 
        console.error("Update Course Error:", e);
        return false; 
    }
};

export const deleteCourse = async (courseId: string): Promise<boolean> => {
    return deleteCourseFully(courseId);
};

// --- TOPIC MANAGEMENT ---

export const createTopic = async (courseId: string, title: string, summary: string): Promise<CourseTopic | null> => {
    try {
        const newTopic: any = {
            courseId,
            title: { tr: title, en: title },
            summary: { tr: summary, en: summary },
            moduleIds: [],
            createdAt: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'topics'), newTopic);
        
        await updateDoc(doc(db, 'courses', courseId), {
            topicIds: arrayUnion(docRef.id)
        }); 
        
        return { id: docRef.id, ...newTopic };
    } catch (e) {
        console.error("Create Topic Error:", e);
        return null;
    }
};

export const reorderTopics = async (courseId: string, newTopicIds: string[]) => {
    try {
        await updateDoc(doc(db, 'courses', courseId), { topicIds: newTopicIds });
        return true;
    } catch (e) {
        console.error("Reorder Topics Error:", e);
        return false;
    }
};

export const deleteTopic = async (courseId: string, topicId: string): Promise<boolean> => {
    try {
        // 1. Delete Topic Doc
        await deleteDoc(doc(db, 'topics', topicId));
        
        // 2. Remove ID from Parent Course
        await updateDoc(doc(db, 'courses', courseId), {
            topicIds: arrayRemove(topicId)
        });
        
        // Note: Ideally we should also delete all modules inside this topic (Cascading delete)
        // For simplicity in this iteration, we leave orphaned modules or handle them in background.
        return true;
    } catch (e) {
        console.error("Delete Topic Error:", e);
        return false;
    }
};

export const getTopicsByCourse = async (courseId: string): Promise<CourseTopic[]> => {
    try {
        const q = query(collection(db, 'topics'), where('courseId', '==', courseId));
        const snap = await getDocs(q);
        const topics = snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseTopic));
        
        const courseRef = await getDoc(doc(db, 'courses', courseId));
        if (courseRef.exists()) {
            const course = courseRef.data() as Course;
            const order = course.topicIds || [];
            // Sort based on ID array order
            return topics.sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                // If not in array (legacy), put at end
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }
        return topics.sort((a, b) => a.createdAt - b.createdAt);
    } catch (e) {
        return [];
    }
};

// --- MODULE MANAGEMENT ---

export const createModule = async (topicId: string, courseId: string, title: string, type: 'VIDEO' | 'QUIZ' | 'READING'): Promise<LearningModule | null> => {
    try {
        const newModule: any = {
            topicId,
            courseId,
            title: { tr: title, en: title },
            type,
            content: [],
            duration: 5,
            xp: 10,
            createdAt: Date.now()
        };

        const docRef = await addDoc(collection(db, 'modules'), newModule);

        const topicRef = doc(db, 'topics', topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
            const tData = topicSnap.data();
            const newIds = [...(tData.moduleIds || []), docRef.id];
            await updateDoc(topicRef, { moduleIds: newIds });
        }

        return { id: docRef.id, ...newModule };
    } catch (e) {
        console.error("Create Module Error:", e);
        return null;
    }
};

export const reorderModules = async (topicId: string, newModuleIds: string[]) => {
    try {
        await updateDoc(doc(db, 'topics', topicId), { moduleIds: newModuleIds });
        return true;
    } catch (e) {
        console.error("Reorder Modules Error:", e);
        return false;
    }
};

export const deleteModule = async (topicId: string, moduleId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'modules', moduleId));
        
        await updateDoc(doc(db, 'topics', topicId), {
            moduleIds: arrayRemove(moduleId)
        });
        return true;
    } catch (e) {
        console.error("Delete Module Error:", e);
        return false;
    }
};

export const getModulesByTopic = async (topicId: string): Promise<LearningModule[]> => {
    try {
        const q = query(collection(db, 'modules'), where('topicId', '==', topicId));
        const snap = await getDocs(q);
        const modules = snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningModule));
        
        const topicRef = await getDoc(doc(db, 'topics', topicId));
        if (topicRef.exists()) {
            const topic = topicRef.data() as CourseTopic;
            const order = topic.moduleIds || [];
            return modules.sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }
        return modules;
    } catch (e) {
        return [];
    }
};

export const getModule = async (moduleId: string): Promise<LearningModule | null> => {
    try {
        const snap = await getDoc(doc(db, 'modules', moduleId));
        return snap.exists() ? { id: snap.id, ...snap.data() } as LearningModule : null;
    } catch (e) {
        return null;
    }
};

export const updateModuleContent = async (moduleId: string, cards: StoryCard[]) => {
    try {
        await updateDoc(doc(db, 'modules', moduleId), { content: cards });
        return true;
    } catch (e) {
        return false;
    }
};

// --- LEGACY ---

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
            authorAvatarUrl,
            thumbnailUrl: dataToSave.thumbnailUrl || DEFAULT_THUMBNAIL
        };

        await addDoc(collection(db, 'courses'), sanitizeData(finalData));
        
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

export const getSmartFeed = async (user: User, showVerifiedOnly: boolean): Promise<Course[]> => {
    try {
        const coursesRef = collection(db, 'courses');
        let courses: Course[] = [];

        if (user.currentOrganizationId) {
            const { duties, vision } = await getPersonalizedRecommendations(user.id, user.currentOrganizationId);
            const recCourses = [...duties, ...vision];
            const newRecs = recCourses.filter(c => !user.completedCourses.includes(c.id));
            courses = [...newRecs]; 
        }

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
        const generalCourses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        
        const idSet = new Set(courses.map(c => c.id));
        generalCourses.forEach(c => {
            if (!idSet.has(c.id)) {
                courses.push(c);
            }
        });

        return courses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Smart Feed Error:", error);
        return [];
    }
};

/**
 * Completely wipes a course and its storage folder.
 */
export const deleteCourseFully = async (courseId: string): Promise<boolean> => {
    try {
        const courseRef = doc(db, 'courses', courseId);
        
        // 1. Wipe the entire storage folder for this course
        // This handles thumbnail, step media, pdfs, etc.
        await deleteFolder(StoragePaths.courseRoot(courseId));

        // 2. Delete Firestore Document
        await deleteDoc(courseRef);
        
        return true;
    } catch (error) {
        console.error("Course Full Delete Failed:", error);
        return false;
    }
};
