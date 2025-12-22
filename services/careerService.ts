
import { addDoc, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { CareerPath, Course, CourseModule, User } from '../types';
import { generateCareerPath, generateCourseSyllabus, generateModuleContent } from './geminiService';

const coursesRef = collection(db, 'courses');
const pathsRef = collection(db, 'careerPaths');

/**
 * Level 1: Creates a Career Path and Empty Course Shells
 */
export const createAiCareerPath = async (targetRole: string, orgId: string, user: User) => {
    // 1. Generate Plan
    const plan = await generateCareerPath(targetRole);
    
    // 2. Create Course Shells in Batch
    const batch = writeBatch(db);
    const courseIds: string[] = [];

    plan.courses.forEach((c) => {
        const courseRef = doc(coursesRef);
        const newCourse: any = {
            id: courseRef.id,
            title: { tr: c.title, en: c.title }, // Defaulting simple localization
            description: { tr: c.description, en: c.description },
            modules: [], // Empty initially
            steps: [], // Empty (legacy)
            organizationId: orgId,
            authorId: user.id,
            authorName: user.name,
            authorAvatarUrl: user.avatar,
            visibility: 'PRIVATE',
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
        department: 'management', // Default, user can edit
        courseIds: courseIds,
        aiPrompt: targetRole
    };
    batch.set(pathRef, newPath);

    await batch.commit();
    return newPath;
};

/**
 * Level 2: Generates Syllabus (Modules) for a Course
 */
export const createAiSyllabus = async (courseId: string, courseTitle: string, careerContext: string) => {
    const plan = await generateCourseSyllabus(courseTitle, careerContext);
    
    const modules: CourseModule[] = plan.modules.map((m, idx) => ({
        id: `mod_${Date.now()}_${idx}`,
        title: { tr: m.title, en: m.title },
        description: { tr: m.description, en: m.description },
        status: 'DRAFT',
        cards: [] // No content yet
    }));

    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, { modules });
    return modules;
};

/**
 * Level 3: Generates Content for a Module
 */
export const createAiModuleContent = async (
    courseId: string, 
    moduleIndex: number,
    moduleTitle: string, 
    courseTitle: string, 
    careerContext: string,
    pedagogy: any
) => {
    // 1. Generate Cards
    const cards = await generateModuleContent(moduleTitle, courseTitle, careerContext, pedagogy);
    
    // 2. Update Course Document (Nested Update)
    // Note: In a real app, reading the whole course, updating one module, and writing back is risky for concurrency.
    // Ideally use arrayUnion/Remove or a subcollection. Here we assume single-admin usage.
    
    // We need to fetch the course first to update the specific index
    // For simplicity in this architectural demo, we'll return the cards and let the component handle the save state or implement a cleaner specific update.
    
    return cards;
};
