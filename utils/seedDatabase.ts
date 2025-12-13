import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Course, DepartmentType } from '../types';

// Explicitly type the mock users to ensure 'department' matches DepartmentType
const MOCK_USERS: Omit<User, 'id'>[] = [
  { name: 'Ayşe Yılmaz', avatar: 'AY', department: 'housekeeping', pin: '1234', xp: 120, completedCourses: [] },
  { name: 'Fatma Demir', avatar: 'FD', department: 'housekeeping', pin: '1234', xp: 50, completedCourses: [] },
  { name: 'Mehmet Öztürk', avatar: 'MÖ', department: 'kitchen', pin: '1234', xp: 300, completedCourses: [] },
  { name: 'Canan Kaya', avatar: 'CK', department: 'front_office', pin: '1234', xp: 450, completedCourses: [] },
  { name: 'Ahmet Yildiz', avatar: 'AY', department: 'management', pin: '1234', xp: 1000, completedCourses: [] },
];

// Mock Course Data
const COURSE_101: Course = {
  id: '101',
  title: 'Upselling Techniques',
  steps: [
    {
        id: 'step1',
        type: 'video',
        title: 'Step 1: The First Impression',
        description: 'Eye contact and a warm smile are your most powerful tools.',
        videoUrl: 'https://cdn.coverr.co/videos/coverr-receptionist-talking-on-the-phone-4338/1080p.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'step2',
        type: 'video',
        title: 'Step 2: Suggestive Selling',
        description: 'Always offer a specific item, not just "anything else?".',
        videoUrl: 'https://cdn.coverr.co/videos/coverr-people-eating-at-a-restaurant-4433/1080p.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'step3',
        type: 'quiz',
        title: 'Quick Check',
        question: 'What is the best way to suggest a dessert?',
        options: [
          { id: 'a', label: 'Do you want dessert?', isCorrect: false },
          { id: 'b', label: 'Would you like to try our signature Tiramisu?', isCorrect: true },
        ],
      },
  ]
}

export const seedDatabase = async (): Promise<boolean> => {
  console.group("🚀 Initializing System Data (Seeding)");
  const batch = writeBatch(db);

  try {
    // Seed Users
    console.log(`📦 Preparing ${MOCK_USERS.length} user records...`);
    MOCK_USERS.forEach((user) => {
      // Ensure department is lowercase to avoid mismatches
      if(user.department !== user.department.toLowerCase()) {
          user.department = user.department.toLowerCase() as DepartmentType;
      }
      const userRef = doc(collection(db, 'users')); // Auto-ID
      batch.set(userRef, user);
    });

    // Seed Course
    console.log(`📚 Preparing default course content...`);
    const courseRef = doc(db, 'courses', '101');
    batch.set(courseRef, COURSE_101);

    // Commit
    console.log("💾 Writing to Firestore...");
    await batch.commit();
    
    console.log("✅ Database seeded successfully!");
    console.groupEnd();
    return true;

  } catch (error: any) {
    console.error("❌ Error seeding database:", error);
    console.groupEnd();
    
    let msg = "Unknown error occurred.";
    if (error.code === 'permission-denied') {
        msg = "Permission Denied. Please set Firestore Rules to 'allow read, write: if true;' in Firebase Console.";
    } else {
        msg = error.message || JSON.stringify(error);
    }
    
    alert(`System Initialization Failed:\n${msg}`);
    return false;
  }
};