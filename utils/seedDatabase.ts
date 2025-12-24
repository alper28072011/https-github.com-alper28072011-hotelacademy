
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Course, DepartmentType, Task, Category, CareerPath } from '../types';

const SEED_ORG_ID = 'demo_hotel_1';

const MOCK_USERS: Omit<User, 'id'>[] = [
  { 
      name: 'Ayşe Yılmaz', 
      email: 'ayse@example.com',
      username: 'ayse_y',
      phoneNumber: '+905550000001', 
      avatar: 'AY', 
      currentOrganizationId: null,
      pageRoles: {},
      subscribedChannelIds: [],
      channelSubscriptions: [],
      department: 'housekeeping', 
      role: 'staff', 
      xp: 120, 
      completedCourses: ['401'], 
      startedCourses: [], 
      savedCourses: [],
      completedTasks: [], 
      assignedPathId: 'path_hk_manager', 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now(),
      status: 'ACTIVE',
      creatorLevel: 'NOVICE',
      reputationPoints: 50,
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      joinedPageIds: [],
      followingUsers: [],
      followingPages: [],
      followedTags: [],
      followedPageIds: [],
      managedPageIds: [],
      isPrivate: false,
      primaryNetworkId: null,
      primaryNetworkRole: 'MEMBER',
      targetCareerPathId: null
  },
  { 
      name: 'Fatma Demir', 
      email: 'fatma@example.com',
      username: 'fatma_d',
      phoneNumber: '+905550000002', 
      avatar: 'FD', 
      department: 'housekeeping', 
      role: 'staff', 
      xp: 50, 
      completedCourses: [], 
      startedCourses: [], 
      savedCourses: [],
      completedTasks: [], 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 10000000,
      status: 'ACTIVE',
      creatorLevel: 'NOVICE',
      reputationPoints: 20,
      currentOrganizationId: SEED_ORG_ID,
      pageRoles: { [SEED_ORG_ID]: 'MEMBER' },
      subscribedChannelIds: [],
      channelSubscriptions: [],
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      joinedPageIds: [SEED_ORG_ID],
      followingUsers: [],
      followingPages: [],
      followedTags: [],
      followedPageIds: [],
      managedPageIds: [],
      isPrivate: false,
      primaryNetworkId: SEED_ORG_ID,
      primaryNetworkRole: 'MEMBER',
      targetCareerPathId: null
  },
  { 
      name: 'Mehmet Öztürk', 
      email: 'mehmet@example.com',
      username: 'mehmet_o',
      phoneNumber: '+905550000003', 
      avatar: 'MÖ', 
      department: 'kitchen', 
      role: 'staff', 
      xp: 300, 
      completedCourses: ['102'], 
      startedCourses: [], 
      savedCourses: [],
      completedTasks: [], 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 20000000,
      status: 'ACTIVE',
      creatorLevel: 'RISING_STAR',
      reputationPoints: 150,
      currentOrganizationId: SEED_ORG_ID,
      pageRoles: { [SEED_ORG_ID]: 'MEMBER' },
      subscribedChannelIds: [],
      channelSubscriptions: [],
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      joinedPageIds: [SEED_ORG_ID],
      followingUsers: [],
      followingPages: [],
      followedTags: [],
      followedPageIds: [],
      managedPageIds: [],
      isPrivate: false,
      primaryNetworkId: SEED_ORG_ID,
      primaryNetworkRole: 'MEMBER',
      targetCareerPathId: null
  },
  { 
      name: 'Canan Kaya', 
      email: 'canan@example.com',
      username: 'canan_k',
      phoneNumber: '+905550000004', 
      avatar: 'CK', 
      department: 'front_office', 
      role: 'staff', 
      xp: 450, 
      completedCourses: ['301', '101'], 
      startedCourses: [], 
      savedCourses: [],
      completedTasks: [], 
      assignedPathId: 'path_fo_manager', 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 5000000,
      status: 'ACTIVE',
      creatorLevel: 'EXPERT',
      reputationPoints: 400,
      currentOrganizationId: SEED_ORG_ID,
      pageRoles: { [SEED_ORG_ID]: 'MEMBER' },
      subscribedChannelIds: [],
      channelSubscriptions: [],
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      joinedPageIds: [SEED_ORG_ID],
      followingUsers: [],
      followingPages: [],
      followedTags: [],
      followedPageIds: [],
      managedPageIds: [],
      isPrivate: false,
      primaryNetworkId: SEED_ORG_ID,
      primaryNetworkRole: 'MEMBER',
      targetCareerPathId: 'path_fo_manager'
  },
  { 
      name: 'System Admin', 
      email: 'admin@hotelacademy.com',
      username: 'admin',
      phoneNumber: '+905417726743',
      avatar: 'AD', 
      department: 'management', 
      role: 'admin', 
      xp: 9999, 
      completedCourses: [], 
      startedCourses: [], 
      savedCourses: [],
      completedTasks: [], 
      organizationHistory: [SEED_ORG_ID],
      joinDate: Date.now() - 30000000,
      status: 'ACTIVE',
      creatorLevel: 'MASTER',
      reputationPoints: 9999,
      currentOrganizationId: SEED_ORG_ID,
      pageRoles: { [SEED_ORG_ID]: 'ADMIN' },
      subscribedChannelIds: [],
      channelSubscriptions: [],
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      joinedPageIds: [SEED_ORG_ID],
      followingUsers: [],
      followingPages: [],
      followedTags: [],
      followedPageIds: [],
      managedPageIds: [],
      isPrivate: false,
      primaryNetworkId: SEED_ORG_ID,
      primaryNetworkRole: 'ADMIN',
      targetCareerPathId: null
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
      authorType: 'ORGANIZATION',
      authorName: 'Hotel Academy',
      authorAvatarUrl: 'https://ui-avatars.com/api/?name=HA&background=0B1E3B&color=fff',
      visibility: 'PRIVATE',
      price: 0,
      categoryId: 'cat_onboarding',
      title: { tr: 'Aileye Hoş Geldin', en: 'Welcome to the Family' },
      description: { tr: 'Otelimizin kültürünü, değerlerini ve senin buradaki rolünü keşfet. Bu yolculukta yalnız değilsin.', en: 'Discover our hotel culture, values, and your role here. You are not alone in this journey.' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      coverQuote: { tr: '"Burada misafirler kraldır, sen de kralların ev sahibisin."', en: '"Guests are kings here, and you are the host of kings."' },
      duration: 5,
      xpReward: 100,
      assignmentType: 'GLOBAL',
      priority: 'HIGH',
      tags: ['#YeniBaşlayan', '#Kültür'],
      popularityScore: 100,
      isNew: true,
      modules: [],
      steps: [
          { 
            id: 's1', 
            type: 'VIDEO', 
            title: { tr: 'Hoşgeldin', en: 'Welcome' }, 
            content: { tr: 'Aileye hoş geldin! Bu videoda otelimizin genel kurallarını ve kültürünü öğreneceksin.', en: 'Welcome to the family! In this video, you will learn our hotel\'s general rules and culture.' },
            mediaUrl: 'https://cdn.coverr.co/videos/coverr-hotel-lobby-4432/1080p.mp4',
            duration: 15
          }
      ],
      tier: 'OFFICIAL',
      verificationStatus: 'VERIFIED',
      qualityScore: 5,
      priceType: 'FREE',
      createdAt: Date.now(),
      topicIds: []
  },
  {
      id: '101',
      organizationId: SEED_ORG_ID,
      authorId: 'system_admin',
      authorType: 'ORGANIZATION',
      authorName: 'Hotel Academy',
      authorAvatarUrl: 'https://ui-avatars.com/api/?name=HA&background=0B1E3B&color=fff',
      visibility: 'PRIVATE',
      price: 0,
      categoryId: 'cat_guest',
      title: { tr: 'Zor Misafir Yönetimi', en: 'Difficult Guest Management' },
      description: { tr: 'Şikayet eden misafiri sadık bir müşteriye dönüştürme sanatı.', en: 'The art of turning a complaining guest into a loyal customer.' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800', 
      duration: 15,
      xpReward: 150,
      isFeatured: true,
      assignmentType: 'OPTIONAL',
      priority: 'NORMAL',
      tags: ['#İletişim', '#Kriz'],
      popularityScore: 88,
      modules: [],
      steps: [],
      tier: 'OFFICIAL',
      verificationStatus: 'VERIFIED',
      qualityScore: 4.7,
      priceType: 'FREE',
      createdAt: Date.now(),
      topicIds: []
  },
  {
    id: '401',
    organizationId: SEED_ORG_ID,
    authorId: 'system_admin',
    authorType: 'ORGANIZATION',
    authorName: 'Hotel Academy',
    authorAvatarUrl: 'https://ui-avatars.com/api/?name=HA&background=0B1E3B&color=fff',
    visibility: 'PRIVATE',
    price: 0,
    categoryId: 'cat_hk',
    title: { tr: '5 Yıldızlı Yatak Yapımı', en: '5-Star Bed Making' },
    description: { tr: 'Jilet gibi çarşaflar için katlama teknikleri.', en: 'Folding techniques for razor-sharp sheets.' },
    thumbnailUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600',
    duration: 8,
    xpReward: 80,
    assignmentType: 'DEPARTMENT',
    targetDepartments: ['housekeeping'],
    priority: 'HIGH',
    tags: ['#Düzen', '#Standart'],
    popularityScore: 70,
    modules: [],
    steps: [],
    tier: 'OFFICIAL',
    verificationStatus: 'VERIFIED',
    qualityScore: 4.5,
    priceType: 'FREE',
    createdAt: Date.now(),
    topicIds: []
  }
];

const MOCK_TASKS: Task[] = [
    { id: 'hk_1', department: 'housekeeping', title: 'Koridor Halı Kontrolü', xpReward: 50, type: 'checklist', organizationId: SEED_ORG_ID },
    { id: 'hk_2', department: 'housekeeping', title: 'Kat Arabası Düzeni', xpReward: 75, type: 'photo', organizationId: SEED_ORG_ID },
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
];

export const seedDatabase = async (): Promise<boolean> => {
  const batch = writeBatch(db);
  try {
    MOCK_USERS.forEach((user) => {
      const userRef = doc(collection(db, 'users')); 
      batch.set(userRef, user);
    });
    MOCK_CATEGORIES.forEach((cat) => {
        const catRef = doc(collection(db, 'categories'), cat.id);
        batch.set(catRef, cat);
    });
    MOCK_COURSES.forEach((course) => {
        const courseRef = doc(collection(db, 'courses'), course.id);
        batch.set(courseRef, course);
    });
    MOCK_TASKS.forEach((task) => {
        const taskRef = doc(collection(db, 'tasks'), task.id);
        batch.set(taskRef, task);
    });
    MOCK_PATHS.forEach((path) => {
        const pathRef = doc(collection(db, 'careerPaths'), path.id);
        batch.set(pathRef, path);
    });
    await batch.commit();
    return true;
  } catch (error: any) {
    console.error("Error seeding database:", error);
    return false;
  }
};
