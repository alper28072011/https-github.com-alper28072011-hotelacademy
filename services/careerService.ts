
import { 
    addDoc, 
    collection, 
    doc, 
    updateDoc, 
    writeBatch, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { CareerPath, Course, User, CourseModule, StoryCard, PedagogyMode } from '../types';
import { generateCareerPath, generateCourseSyllabus, generateModuleContent } from './geminiService';

const coursesRef = collection(db, 'courses');
const pathsRef = collection(db, 'careerPaths');

/**
 * AI-ASSISTED CREATION (The Draft)
 */
export const createAiCareerPath = async (targetRole: string, orgId: string, user: User) => {
    // 1. Generate Plan via Gemini
    const plan = await generateCareerPath(targetRole);
    
    // 2. Create Placeholder Courses in Batch
    // (In a real app, these might be "Suggested" nodes, but for this architecture, we create shell courses)
    const batch = writeBatch(db);
    const courseIds: string[] = [];

    plan.courses.forEach((c) => {
        const courseRef = doc(coursesRef);
        const newCourse: any = {
            id: courseRef.id,
            title: { tr: c.title, en: c.title },
            description: { tr: c.description, en: c.description },
            modules: [],
            steps: [],
            organizationId: orgId,
            authorId: user.id,
            authorName: user.name,
            authorAvatarUrl: user.avatar,
            visibility: 'PRIVATE', // Draft mode
            createdAt: Date.now(),
            xpReward: 0,
            duration: 0,
            price: 0,
            tier: 'OFFICIAL',
            verificationStatus: 'VERIFIED'
        };
        batch.set(courseRef, newCourse);
        courseIds.push(courseRef.id);
    });

    // 3. Create Career Path
    const pathRef = doc(pathsRef);
    const newPath: CareerPath = {
        id: pathRef.id,
        organizationId: orgId,
        title: plan.title,
        description: plan.description,
        targetRole: targetRole,
        department: 'management', // Default
        courseIds: courseIds,
        aiPrompt: targetRole,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    batch.set(pathRef, newPath);

    await batch.commit();
    return newPath;
};

/**
 * Generates syllabus modules for a course and updates it in DB.
 */
export const createAiSyllabus = async (courseId: string, courseTitle: string, context: string): Promise<CourseModule[]> => {
    const syllabus = await generateCourseSyllabus(courseTitle, context);

    const modules: CourseModule[] = syllabus.modules.map((mod, idx) => ({
        id: `mod_${Date.now()}_${idx}`,
        title: { tr: mod.title, en: mod.title },
        description: { tr: mod.description, en: mod.description },
        status: 'DRAFT',
        cards: []
    }));

    await updateDoc(doc(db, 'courses', courseId), { modules });
    return modules;
};

/**
 * Generates content for a specific module (does NOT save to DB automatically, just returns).
 */
export const createAiModuleContent = async (
    courseId: string,
    moduleIndex: number,
    moduleTitle: string,
    courseTitle: string,
    context: string,
    pedagogy: PedagogyMode
): Promise<StoryCard[]> => {
    return await generateModuleContent(moduleTitle, courseTitle, context, pedagogy);
};

// --- CRUD OPERATIONS ---

export const getOrganizationCareerPaths = async (orgId: string): Promise<CareerPath[]> => {
    try {
        const q = query(pathsRef, where('organizationId', '==', orgId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CareerPath))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (e) {
        console.error("Get Paths Error:", e);
        return [];
    }
};

export const createManualCareerPath = async (
    data: Omit<CareerPath, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CareerPath | null> => {
    try {
        const docRef = await addDoc(pathsRef, {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        return { id: docRef.id, ...data } as CareerPath;
    } catch (e) {
        console.error("Create Path Error:", e);
        return null;
    }
};

export const updateCareerPath = async (pathId: string, updates: Partial<CareerPath>): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'careerPaths', pathId), {
            ...updates,
            updatedAt: Date.now()
        });
        return true;
    } catch (e) {
        console.error("Update Path Error:", e);
        return false;
    }
};

export const deleteCareerPath = async (pathId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'careerPaths', pathId));
        // Note: We do NOT delete the linked courses automatically. 
        // They might be used in other paths. The manager should clean them up if needed.
        return true;
    } catch (e) {
        console.error("Delete Path Error:", e);
        return false;
    }
};

export const addCourseToPath = async (pathId: string, courseId: string): Promise<boolean> => {
    try {
        const pathRef = doc(db, 'careerPaths', pathId);
        const pathSnap = await getDoc(pathRef);
        if (!pathSnap.exists()) return false;
        
        const path = pathSnap.data() as CareerPath;
        const newCourseIds = [...(path.courseIds || []), courseId]; // Append
        
        await updateDoc(pathRef, { courseIds: newCourseIds, updatedAt: Date.now() });
        return true;
    } catch (e) {
        return false;
    }
};

export const removeCourseFromPath = async (pathId: string, courseId: string): Promise<boolean> => {
    try {
        const pathRef = doc(db, 'careerPaths', pathId);
        const pathSnap = await getDoc(pathRef);
        if (!pathSnap.exists()) return false;
        
        const path = pathSnap.data() as CareerPath;
        const newCourseIds = (path.courseIds || []).filter(id => id !== courseId);
        
        await updateDoc(pathRef, { courseIds: newCourseIds, updatedAt: Date.now() });
        return true;
    } catch (e) {
        return false;
    }
};
