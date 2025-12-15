
export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string; // Emoji flag for simplicity
  dir: 'ltr' | 'rtl';
}

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management';
export type UserRole = 'staff' | 'manager' | 'admin';
export type AuthMode = 'LOGIN' | 'REGISTER'; // NEW

// --- KUDOS / GAMIFICATION TYPES ---
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

export interface Badge {
    type: KudosType;
    count: number;
    lastReceivedAt: number;
}

export interface User {
  id: string;
  email?: string; 
  phoneNumber: string; // NEW: Global ID
  name: string;
  avatar: string; // Initials or URL
  department: DepartmentType;
  role: UserRole; 
  pin: string; // Restored: Used for access control
  xp: number;
  
  // Profile & Career
  bio?: string; // Short resume/motto
  joinDate?: number; // Timestamp
  instagramHandle?: string; // Optional social link
  
  // Progress
  completedCourses: string[];
  startedCourses?: string[]; 
  savedCourses?: string[]; // "Watch Later" list
  completedTasks?: string[]; 
  badges?: Badge[]; 
  
  // Career Module
  assignedPathId?: string; 
}

export type StepType = 'video' | 'quiz';

// --- INTERACTION TYPES (NEW) ---
export type InteractionType = 'POLL' | 'QUIZ' | 'LINK' | 'XP_BOOST';

export interface Interaction {
  id: string;
  type: InteractionType;
  data: {
    question?: string;
    options?: string[];
    correctOptionIndex?: number; // For Quiz
    url?: string; // For Link
    label?: string; // For Link button text
    xpAmount?: number; // For XP Boost
  };
  style?: {
    x: number; // Percentage position X
    y: number; // Percentage position Y
    scale: number;
  };
}

export interface CourseStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  // Video Props
  videoUrl?: string;
  posterUrl?: string;
  // Quiz Props
  question?: string;
  options?: { id: string; label: string; isCorrect: boolean }[];
  // NEW: Story Interactions
  interactions?: Interaction[]; 
}

export interface Category {
  id: string;
  title: string;
  icon?: string; // Lucide icon name reference
  color?: string; // Tailwind color class e.g. "bg-blue-500"
}

// --- NEW TARGETING TYPES ---
export type AssignmentType = 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
export type ContentPriority = 'HIGH' | 'NORMAL';

export interface Course {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string; // Portrait Poster URL
  videoUrl?: string; // Trailer or Intro URL
  duration: number; // Minutes
  xpReward: number;
  isFeatured?: boolean;
  
  // NEW: Hype Content
  coverQuote?: string; // Inspirational quote for the intro page
  tags?: string[]; // e.g., #Onboarding, #Culture
  
  // NEW: Explore Algorithm Props
  popularityScore?: number; // 0-100
  isNew?: boolean;

  // TARGETING & PRIORITY
  assignmentType?: AssignmentType; 
  targetDepartments?: DepartmentType[]; 
  priority?: ContentPriority; 
  
  steps: CourseStep[];
}

// --- HOTELGRAM FEED TYPES ---

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  
  // TARGETING
  assignmentType?: AssignmentType; // NEW
  targetDepartments: DepartmentType[]; // Who sees this?
  priority?: ContentPriority; // NEW
  
  type: 'image' | 'video' | 'kudos'; // NEW: 'kudos' type
  mediaUrl?: string; // Optional for kudos
  caption: string;
  likes: number;
  createdAt: number;
  likedBy?: string[]; // Array of user IDs who liked
  
  // NEW: Kudos Data
  kudosData?: {
      recipientId: string;
      recipientName: string;
      recipientAvatar: string;
      badgeType: KudosType;
  };
  
  // NEW: Interactive Content
  interactions?: Interaction[];
  scheduledFor?: number; // Timestamp for future publishing
}

export interface CareerPath {
  id: string;
  title: string;
  description: string;
  targetRole: string; // e.g. "Senior Housekeeper"
  courseIds: string[]; // Ordered list of course IDs
  department: DepartmentType;
}

export type TaskType = 'checklist' | 'photo';

export interface Task {
  id: string;
  department: DepartmentType;
  title: string;
  xpReward: number;
  type: TaskType;
  icon?: string; // Icon name reference
}

// --- REPORTING MODULE TYPES ---

export type IssueType = 'maintenance' | 'housekeeping' | 'security';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Issue {
  id?: string;
  userId: string;
  userName: string; // Denormalized for easy display
  department: DepartmentType;
  type: IssueType;
  location: string;
  photoUrl?: string; // Base64 or Storage URL
  status: IssueStatus;
  createdAt: number; // Timestamp
}
