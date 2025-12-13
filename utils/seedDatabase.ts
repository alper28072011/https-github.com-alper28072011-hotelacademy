import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Course, DepartmentType, Task, Category, CareerPath } from '../types';

// Explicitly type the mock users
const MOCK_USERS: Omit<User, 'id'>[] = [
  { name: 'Ayşe Yılmaz', avatar: 'AY', department: 'housekeeping', role: 'staff', pin: '1234', xp: 120, completedCourses: ['401'], completedTasks: [], assignedPathId: 'path_hk_manager' },
  { name: 'Fatma Demir', avatar: 'FD', department: 'housekeeping', role: 'staff', pin: '1234', xp: 50, completedCourses: [], completedTasks: [] },
  { name: 'Mehmet Öztürk', avatar: 'MÖ', department: 'kitchen', role: 'staff', pin: '1234', xp: 300, completedCourses: ['102'], completedTasks: [] },
  { name: 'Canan Kaya', avatar: 'CK', department: 'front_office', role: 'staff', pin: '1234', xp: 450, completedCourses: ['301', '101'], completedTasks: [], assignedPathId: 'path_fo_manager' },
  // Admin User
  { 
      name: 'System Admin', 
      email: 'admin@hotelacademy.com',
      avatar: 'AD', 
      department: 'management', 
      role: 'admin', 
      pin: '9999', 
      xp: 9999, 
      completedCourses: [], 
      completedTasks: [] 
  },
];

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat_guest', title: 'Misafir İlişkileri' },
    { id: 'cat_kitchen', title: 'Mutfak Sanatları' },
    { id: 'cat_safety', title: 'Acil Durum & Güvenlik' },
    { id: 'cat_lang', title: 'Dil Okulu' },
    { id: 'cat_hk', title: 'Housekeeping Pro' },
];

const MOCK_COURSES: Course[] = [
  {
    id: '101',
    categoryId: 'cat_guest',
    title: 'Zor Misafir Yönetimi',
    description: 'Şikayet eden misafiri sadık bir müşteriye dönüştürme sanatı.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800', 
    duration: 15,
    xpReward: 150,
    isFeatured: true,
    steps: []
  },
  {
    id: '102',
    categoryId: 'cat_kitchen',
    title: 'Tabak Sunum Teknikleri',
    description: 'Michelin yıldızlı sunumlar için temel kurallar.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    duration: 20,
    xpReward: 200,
    steps: []
  },
  {
    id: '103',
    categoryId: 'cat_kitchen',
    title: 'Barista 101: Latte Art',
    description: 'Mükemmel süt köpüğü ve kalp çizme teknikleri.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600',
    duration: 12,
    xpReward: 120,
    steps: []
  },
  {
    id: '104',
    categoryId: 'cat_kitchen',
    title: 'Şarap Servis Kuralları',
    description: 'Şarap açma, tattırma ve servis etme adımları.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=600',
    duration: 18,
    xpReward: 180,
    steps: []
  },
  {
    id: '201',
    categoryId: 'cat_safety',
    title: 'Yangın Güvenliği',
    description: 'Acil durumlarda tahliye planı ve yangın tüpü kullanımı.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1591501662705-045388048259?auto=format&fit=crop&q=80&w=600',
    duration: 10,
    xpReward: 100,
    steps: []
  },
  {
    id: '202',
    categoryId: 'cat_safety',
    title: 'İlk Yardım Temelleri',
    description: 'Bayılma ve kesiklerde ilk müdahale.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600',
    duration: 25,
    xpReward: 250,
    steps: []
  },
  {
    id: '301',
    categoryId: 'cat_lang',
    title: 'Resepsiyon İngilizcesi',
    description: 'Check-in ve Check-out sırasında kullanılan kalıplar.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    duration: 15,
    xpReward: 150,
    steps: []
  },
  {
    id: '302',
    categoryId: 'cat_lang',
    title: 'Rusça Temel Kelimeler',
    description: 'Rus misafirlerle temel iletişim.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600',
    duration: 20,
    xpReward: 200,
    steps: []
  },
  {
    id: '401',
    categoryId: 'cat_hk',
    title: '5 Yıldızlı Yatak Yapımı',
    description: 'Jilet gibi çarşaflar için katlama teknikleri.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600',
    duration: 8,
    xpReward: 80,
    steps: []
  },
  {
    id: '402',
    categoryId: 'cat_hk',
    title: 'Mermer Yüzey Bakımı',
    description: 'Leke çıkarma ve parlatma sırları.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
    duration: 12,
    xpReward: 120,
    steps: []
  }
];

const MOCK_TASKS: Task[] = [
    { id: 'hk_1', department: 'housekeeping', title: 'Koridor Halı Kontrolü', xpReward: 50, type: 'checklist' },
    { id: 'hk_2', department: 'housekeeping', title: 'Kat Arabası Düzeni', xpReward: 75, type: 'photo' },
    { id: 'kt_1', department: 'kitchen', title: 'Dolap Sıcaklık Kontrolü', xpReward: 100, type: 'photo' },
    { id: 'fo_1', department: 'front_office', title: 'VIP Giriş Listesi', xpReward: 60, type: 'checklist' },
];

const MOCK_PATHS: CareerPath[] = [
    {
        id: 'path_hk_manager',
        title: 'Housekeeping Liderlik Yolu',
        description: 'Kat görevlisinden Kat Şefliğine uzanan mükemmellik yolu.',
        targetRole: 'Kat Şefi',
        department: 'housekeeping',
        courseIds: ['401', '402', '201', '202']
    },
    {
        id: 'path_fo_manager',
        title: 'Misafir Deneyimi Uzmanı',
        description: 'Resepsiyondan Ön Büro Müdürlüğüne kariyer adımları.',
        targetRole: 'Ön Büro Şefi',
        department: 'front_office',
        courseIds: ['301', '101', '201', '302']
    }
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

    // Seed Categories
    console.log(`📚 Preparing ${MOCK_CATEGORIES.length} categories...`);
    MOCK_CATEGORIES.forEach((cat) => {
        const catRef = doc(collection(db, 'categories'), cat.id);
        batch.set(catRef, cat);
    });

    // Seed Courses
    console.log(`🎬 Preparing ${MOCK_COURSES.length} courses...`);
    MOCK_COURSES.forEach((course) => {
        const courseRef = doc(collection(db, 'courses'), course.id);
        batch.set(courseRef, course);
    });

    // Seed Tasks
    console.log(`📋 Preparing operational tasks...`);
    MOCK_TASKS.forEach((task) => {
        const taskRef = doc(collection(db, 'tasks'), task.id);
        batch.set(taskRef, task);
    });

    // Seed Career Paths
    console.log(`🚀 Preparing career paths...`);
    MOCK_PATHS.forEach((path) => {
        const pathRef = doc(collection(db, 'careerPaths'), path.id);
        batch.set(pathRef, path);
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
    return false;
  }
};
