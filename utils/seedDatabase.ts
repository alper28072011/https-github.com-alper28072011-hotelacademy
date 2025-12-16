
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Course, DepartmentType, Task, Category, CareerPath } from '../types';

const SEED_ORG_ID = 'demo_hotel_1';

// Explicitly type the mock users
const MOCK_USERS: Omit<User, 'id'>[] = [
  { 
      name: 'Ayşe Yılmaz', 
      phoneNumber: '+905550000001', 
      avatar: 'AY', 
      department: 'housekeeping', 
      role: 'staff', 
      pin: '1234', 
      xp: 120, 
      completedCourses: ['401'], 
      startedCourses: [], 
      completedTasks: [], 
      assignedPathId: 'path_hk_manager', 
      badges: [], 
      currentOrganizationId: SEED_ORG_ID, 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now(), // Added
      status: 'ACTIVE' // Added
  },
  { 
      name: 'Fatma Demir', 
      phoneNumber: '+905550000002', 
      avatar: 'FD', 
      department: 'housekeeping', 
      role: 'staff', 
      pin: '1234', 
      xp: 50, 
      completedCourses: [], 
      startedCourses: [], 
      completedTasks: [], 
      badges: [], 
      currentOrganizationId: SEED_ORG_ID, 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 10000000, // Slightly older
      status: 'ACTIVE'
  },
  { 
      name: 'Mehmet Öztürk', 
      phoneNumber: '+905550000003', 
      avatar: 'MÖ', 
      department: 'kitchen', 
      role: 'staff', 
      pin: '1234', 
      xp: 300, 
      completedCourses: ['102'], 
      startedCourses: [], 
      completedTasks: [], 
      badges: [], 
      currentOrganizationId: SEED_ORG_ID, 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 20000000,
      status: 'ACTIVE'
  },
  { 
      name: 'Canan Kaya', 
      phoneNumber: '+905550000004', 
      avatar: 'CK', 
      department: 'front_office', 
      role: 'staff', 
      pin: '1234', 
      xp: 450, 
      completedCourses: ['301', '101'], 
      startedCourses: [], 
      completedTasks: [], 
      assignedPathId: 'path_fo_manager', 
      badges: [], 
      currentOrganizationId: SEED_ORG_ID, 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 5000000,
      status: 'ACTIVE'
  },
  // Admin User
  { 
      name: 'System Admin', 
      phoneNumber: '+905417726743',
      email: 'admin@hotelacademy.com',
      avatar: 'AD', 
      department: 'management', 
      role: 'admin', 
      pin: '9999', 
      xp: 9999, 
      completedCourses: [], 
      startedCourses: [],
      completedTasks: [],
      badges: [],
      currentOrganizationId: SEED_ORG_ID, 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 30000000,
      status: 'ACTIVE'
  },
];

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat_onboarding', title: 'Oryantasyon', icon: 'Compass', color: 'from-purple-500 to-indigo-600' },
    { id: 'cat_guest', title: 'Misafir İlişkileri', icon: 'Heart', color: 'from-pink-500 to-rose-600' },
    { id: 'cat_kitchen', title: 'Mutfak Sanatları', icon: 'Utensils', color: 'from-orange-500 to-amber-600' },
    { id: 'cat_safety', title: 'Acil Durum', icon: 'ShieldAlert', color: 'from-red-500 to-red-700' },
    { id: 'cat_lang', title: 'Dil Okulu', icon: 'Languages', color: 'from-blue-400 to-cyan-600' },
    { id: 'cat_hk', title: 'Housekeeping Pro', icon: 'Sparkles', color: 'from-emerald-500 to-teal-600' },
];

const MOCK_COURSES: Course[] = [
  {
      id: '001',
      organizationId: SEED_ORG_ID,
      authorId: 'system_admin',
      ownerType: 'ORGANIZATION',
      visibility: 'PRIVATE',
      price: 0,
      categoryId: 'cat_onboarding',
      title: 'Aileye Hoş Geldin',
      description: 'Otelimizin kültürünü, değerlerini ve senin buradaki rolünü keşfet. Bu yolculukta yalnız değilsin.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      coverQuote: '"Burada misafirler kraldır, sen de kralların ev sahibisin."',
      duration: 5,
      xpReward: 100,
      assignmentType: 'GLOBAL',
      priority: 'HIGH',
      tags: ['#YeniBaşlayan', '#Kültür'],
      popularityScore: 100,
      isNew: true,
      steps: [
          { id: 's1', type: 'video', title: 'Hoşgeldin', videoUrl: 'https://cdn.coverr.co/videos/coverr-hotel-lobby-4432/1080p.mp4' }
      ]
  },
  {
      id: '002',
      organizationId: SEED_ORG_ID,
      authorId: 'system_admin',
      ownerType: 'ORGANIZATION',
      visibility: 'PRIVATE',
      price: 0,
      categoryId: 'cat_onboarding',
      title: 'Yaşam Rehberi',
      description: 'Yemek saatleri, servis güzergahları ve üniforma kuralları hakkında bilmen gereken her şey.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      coverQuote: '"Disiplin, başarının anahtarıdır."',
      duration: 10,
      xpReward: 50,
      assignmentType: 'GLOBAL',
      priority: 'NORMAL',
      tags: ['#Rehber', '#Kurallar'],
      popularityScore: 90,
      steps: []
  },
  {
      id: '003',
      organizationId: SEED_ORG_ID,
      authorId: 'system_admin',
      ownerType: 'ORGANIZATION',
      visibility: 'PRIVATE',
      price: 0,
      categoryId: 'cat_onboarding',
      title: 'Görgü & Nezaket',
      description: '5 Yıldızlı hizmetin altın kuralı: Asla "Bilmiyorum" deme.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&q=80&w=800',
      coverQuote: '"Nezaket, hiç maliyeti olmayan ama çok şey kazandıran bir hazinedir."',
      duration: 8,
      xpReward: 150,
      assignmentType: 'GLOBAL',
      priority: 'HIGH',
      tags: ['#Hizmet', '#Kalite'],
      popularityScore: 95,
      steps: []
  },
  {
    id: '101',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_guest',
    title: 'Zor Misafir Yönetimi',
    description: 'Şikayet eden misafiri sadık bir müşteriye dönüştürme sanatı.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800', 
    duration: 15,
    xpReward: 150,
    isFeatured: true,
    assignmentType: 'OPTIONAL',
    priority: 'NORMAL',
    tags: ['#İletişim', '#Kriz'],
    popularityScore: 88,
    steps: []
  },
  {
    id: '102',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_kitchen',
    title: 'Tabak Sunum Teknikleri',
    description: 'Michelin yıldızlı sunumlar için temel kurallar.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    duration: 20,
    xpReward: 200,
    assignmentType: 'DEPARTMENT',
    targetDepartments: ['kitchen'],
    priority: 'NORMAL',
    tags: ['#Sanat', '#Mutfak'],
    popularityScore: 75,
    isNew: true,
    steps: []
  },
  {
    id: '103',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_kitchen',
    title: 'Barista 101: Latte Art',
    description: 'Mükemmel süt köpüğü ve kalp çizme teknikleri.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600',
    duration: 12,
    xpReward: 120,
    assignmentType: 'OPTIONAL',
    tags: ['#Kahve', '#Hobi'],
    popularityScore: 92,
    steps: []
  },
  {
    id: '201',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_safety',
    title: 'Yangın Güvenliği',
    description: 'Acil durumlarda tahliye planı ve yangın tüpü kullanımı.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1591501662705-045388048259?auto=format&fit=crop&q=80&w=600',
    duration: 10,
    xpReward: 100,
    assignmentType: 'GLOBAL', 
    priority: 'HIGH', 
    tags: ['#Güvenlik', '#Zorunlu'],
    popularityScore: 60,
    steps: []
  },
  {
    id: '202',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_safety',
    title: 'İlk Yardım Temelleri',
    description: 'Bayılma ve kesiklerde ilk müdahale.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600',
    duration: 25,
    xpReward: 250,
    assignmentType: 'GLOBAL',
    priority: 'NORMAL',
    tags: ['#Sağlık', '#Yaşam'],
    popularityScore: 80,
    steps: []
  },
  {
    id: '301',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_lang',
    title: 'Resepsiyon İngilizcesi',
    description: 'Check-in ve Check-out sırasında kullanılan kalıplar.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    duration: 15,
    xpReward: 150,
    assignmentType: 'DEPARTMENT',
    targetDepartments: ['front_office'],
    priority: 'HIGH',
    tags: ['#Dil', '#İngilizce'],
    popularityScore: 85,
    steps: []
  },
  {
    id: '401',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_hk',
    title: '5 Yıldızlı Yatak Yapımı',
    description: 'Jilet gibi çarşaflar için katlama teknikleri.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600',
    duration: 8,
    xpReward: 80,
    assignmentType: 'DEPARTMENT',
    targetDepartments: ['housekeeping'],
    priority: 'HIGH',
    tags: ['#Düzen', '#Standart'],
    popularityScore: 70,
    steps: []
  },
  {
    id: '402',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_hk',
    title: 'Mermer Yüzey Bakımı',
    description: 'Leke çıkarma ve parlatma sırları.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
    duration: 12,
    xpReward: 120,
    assignmentType: 'DEPARTMENT',
    targetDepartments: ['housekeeping'],
    priority: 'NORMAL',
    tags: ['#Temizlik', '#Kimyasal'],
    popularityScore: 65,
    steps: []
  },
  {
    id: '501',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    ownerType: 'ORGANIZATION',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_kitchen',
    title: 'Şarap Eşleşmesi 101',
    description: 'Hangi yemekle hangi şarap gider? Temel kurallar.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=600',
    duration: 18,
    xpReward: 180,
    assignmentType: 'OPTIONAL',
    tags: ['#Şarap', '#Servis'],
    popularityScore: 98,
    isNew: true,
    steps: []
  }
];

const MOCK_TASKS: Task[] = [
    { id: 'hk_1', department: 'housekeeping', title: 'Koridor Halı Kontrolü', xpReward: 50, type: 'checklist', organizationId: SEED_ORG_ID },
    { id: 'hk_2', department: 'housekeeping', title: 'Kat Arabası Düzeni', xpReward: 75, type: 'photo', organizationId: SEED_ORG_ID },
    { id: 'kt_1', department: 'kitchen', title: 'Dolap Sıcaklık Kontrolü', xpReward: 100, type: 'photo', organizationId: SEED_ORG_ID },
    { id: 'fo_1', department: 'front_office', title: 'VIP Giriş Listesi', xpReward: 60, type: 'checklist', organizationId: SEED_ORG_ID },
];

const MOCK_PATHS: CareerPath[] = [
    {
        id: 'path_hk_manager',
        title: 'Housekeeping Liderlik Yolu',
        description: 'Kat görevlisinden Kat Şefliğine uzanan mükemmellik yolu.',
        targetRole: 'Kat Şefi',
        department: 'housekeeping',
        courseIds: ['401', '402', '201', '202'],
        organizationId: SEED_ORG_ID
    },
    {
        id: 'path_fo_manager',
        title: 'Misafir Deneyimi Uzmanı',
        description: 'Resepsiyondan Ön Büro Müdürlüğüne kariyer adımları.',
        targetRole: 'Ön Büro Şefi',
        department: 'front_office',
        courseIds: ['301', '101', '201', '302'],
        organizationId: SEED_ORG_ID
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
