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

export const seedDatabase = async () => {
  console.group("🌱 Seeding Database");
  const batch = writeBatch(db);

  // Seed Users
  console.log(`Preparing ${MOCK_USERS.length} users...`);
  MOCK_USERS.forEach((user, index) => {
    // Check if dept is valid lowercase string just in case
    if(user.department !== user.department.toLowerCase()) {
        console.warn(`Correcting case for ${user.name}: ${user.department}`);
        user.department = user.department.toLowerCase() as DepartmentType;
    }
    
    const userRef = doc(collection(db, 'users')); // Auto-ID
    batch.set(userRef, user);
  });

  // Seed Course
  console.log(`Preparing course 101...`);
  const courseRef = doc(db, 'courses', '101');
  batch.set(courseRef, COURSE_101);

  try {
    await batch.commit();
    console.log("✅ Database seeded successfully!");
    console.groupEnd();
    alert("Database seeded! Please refresh the page.");
  } catch (error: any) {
    console.error("❌ Error seeding database:", error);
    console.groupEnd();
    
    if (error.code === 'permission-denied') {
        alert("Permission Denied! Check Console for Rules.");
    } else {
        alert("Error seeding database. Check console.");
    }
  }
};