import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Course, DepartmentType, Task } from '../types';

// Explicitly type the mock users
const MOCK_USERS: Omit<User, 'id'>[] = [
  { name: 'Ayşe Yılmaz', avatar: 'AY', department: 'housekeeping', pin: '1234', xp: 120, completedCourses: [], completedTasks: [] },
  { name: 'Fatma Demir', avatar: 'FD', department: 'housekeeping', pin: '1234', xp: 50, completedCourses: [], completedTasks: [] },
  { name: 'Mehmet Öztürk', avatar: 'MÖ', department: 'kitchen', pin: '1234', xp: 300, completedCourses: [], completedTasks: [] },
  { name: 'Canan Kaya', avatar: 'CK', department: 'front_office', pin: '1234', xp: 450, completedCourses: [], completedTasks: [] },
  { name: 'Ahmet Yildiz', avatar: 'AY', department: 'management', pin: '1234', xp: 1000, completedCourses: [], completedTasks: [] },
];

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

// Operational Tasks for "Ayşe Teyze"
const MOCK_TASKS: Task[] = [
    // Housekeeping
    { id: 'hk_1', department: 'housekeeping', title: 'Koridor Halı Kontrolü', xpReward: 50, type: 'checklist' },
    { id: 'hk_2', department: 'housekeeping', title: 'Kat Arabası Düzeni', xpReward: 75, type: 'photo' },
    { id: 'hk_3', department: 'housekeeping', title: 'Lobi Çiçek Sulama', xpReward: 50, type: 'checklist' },
    { id: 'hk_4', department: 'housekeeping', title: 'Asansör Ayna Temizliği', xpReward: 40, type: 'checklist' },
    // Kitchen
    { id: 'kt_1', department: 'kitchen', title: 'Dolap Sıcaklık Kontrolü', xpReward: 100, type: 'photo' },
    { id: 'kt_2', department: 'kitchen', title: 'Bıçak Sterilizasyonu', xpReward: 50, type: 'checklist' },
    { id: 'kt_3', department: 'kitchen', title: 'Tezgahlarda "Mise en Place"', xpReward: 80, type: 'photo' },
    // Front Office
    { id: 'fo_1', department: 'front_office', title: 'VIP Giriş Listesi Kontrolü', xpReward: 60, type: 'checklist' },
    { id: 'fo_2', department: 'front_office', title: 'Kasa Devir Kontrolü', xpReward: 100, type: 'checklist' },
];

export const seedDatabase = async (): Promise<boolean> => {
  console.group("🚀 Initializing System Data (Seeding)");
  const batch = writeBatch(db);

  try {
    // Seed Users
    console.log(`📦 Preparing ${MOCK_USERS.length} user records...`);
    MOCK_USERS.forEach((user) => {
      if(user.department !== user.department.toLowerCase()) {
          user.department = user.department.toLowerCase() as DepartmentType;
      }
      const userRef = doc(collection(db, 'users')); 
      batch.set(userRef, user);
    });

    // Seed Course
    console.log(`📚 Preparing default course content...`);
    const courseRef = doc(db, 'courses', '101');
    batch.set(courseRef, COURSE_101);

    // Seed Tasks
    console.log(`📋 Preparing operational tasks...`);
    MOCK_TASKS.forEach((task) => {
        const taskRef = doc(collection(db, 'tasks'), task.id);
        batch.set(taskRef, task);
    });

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