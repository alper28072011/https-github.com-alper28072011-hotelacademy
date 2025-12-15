
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
export type AuthMode = 'LOGIN' | 'REGISTER';

// --- MULTI-TENANCY TYPES ---

export interface Organization {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  ownerId: string; // The GM or Creator
  code: string; // Unique Invite Code (e.g. "RUBI-2024")
  createdAt: number;
}

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  department: DepartmentType;
  status: MembershipStatus;
  joinedAt: number;
}

export type RequestType = 'INVITE_TO_JOIN' | 'REQUEST_TO_JOIN';

export interface JoinRequest {
  id: string;
  type: RequestType;
  userId: string;
  organizationId: string;
  targetDepartment: DepartmentType;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: number;
}

// --- USER TYPE UPDATE ---

export interface User {
  id: string;
  email?: string; 
  phoneNumber: string; // Global ID
  name: string;
  avatar: string; 
  
  // Contextual Data (Derived from Active Membership usually, but kept here for cache/display)
  currentOrganizationId: string | null; 
  department: DepartmentType; // Active Dept in Current Org
  role: UserRole; // Active Role in Current Org
  
  pin: string; 
  xp: number; // Global XP or Org Specific? Let's keep it Global for Career Profile
  
  // Profile & Career
  bio?: string; 
  joinDate?: number; 
  instagramHandle?: string;
  organizationHistory: string[]; // List of Org IDs they worked at
  
  // Social Graph (NEW)
  followers?: string[]; // List of User IDs
  following?: string[]; // List of User IDs
  followersCount?: number;
  followingCount?: number;

  // Progress
  completedCourses: string[];
  startedCourses?: string[]; 
  savedCourses?: string[]; 
  completedTasks?: string[]; 
  badges?: Badge[]; 
  
  // Career Module
  assignedPathId?: string; 
}

// --- KUDOS / GAMIFICATION TYPES ---
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

export interface Badge {
    type: KudosType;
    count: number;
    lastReceivedAt: number;
}

export type StepType = 'video' | 'quiz';

// --- INTERACTION TYPES ---
export type InteractionType = 'POLL' | 'QUIZ' | 'LINK' | 'XP_BOOST';

export interface Interaction {
  id: string;
  type: InteractionType;
  data: {
    question?: string;
    options?: string[];
    correctOptionIndex?: number;
    url?: string;
    label?: string;
    xpAmount?: number;
  };
  style?: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface CourseStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  videoUrl?: string;
  posterUrl?: string;
  question?: string;
  options?: { id: string; label: string; isCorrect: boolean }[];
  interactions?: Interaction[]; 
}

export interface Category {
  id: string;
  title: string;
  icon?: string;
  color?: string;
}

// --- NEW TARGETING TYPES ---
export type AssignmentType = 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
export type ContentPriority = 'HIGH' | 'NORMAL';

export interface Course {
  id: string;
  organizationId?: string; // Optional: Some courses can be system-wide (Global Marketplace), others Org specific
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string; 
  duration: number; 
  xpReward: number;
  isFeatured?: boolean;
  coverQuote?: string; 
  tags?: string[]; 
  popularityScore?: number; 
  isNew?: boolean;
  assignmentType?: AssignmentType; 
  targetDepartments?: DepartmentType[]; 
  priority?: ContentPriority; 
  steps: CourseStep[];
}

export interface FeedPost {
  id: string;
  organizationId: string; // Tenant Scoped
  authorId: string;
  authorName: string;
  authorAvatar: string;
  assignmentType?: AssignmentType; 
  targetDepartments: DepartmentType[]; 
  priority?: ContentPriority; 
  type: 'image' | 'video' | 'kudos'; 
  mediaUrl?: string; 
  caption: string;
  likes: number;
  createdAt: number;
  likedBy?: string[]; 
  kudosData?: {
      recipientId: string;
      recipientName: string;
      recipientAvatar: string;
      badgeType: KudosType;
  };
  interactions?: Interaction[];
  scheduledFor?: number; 
}

export interface CareerPath {
  id: string;
  organizationId: string; // Tenant Scoped
  title: string;
  description: string;
  targetRole: string; 
  courseIds: string[]; 
  department: DepartmentType;
}

export type TaskType = 'checklist' | 'photo';

export interface Task {
  id: string;
  organizationId: string; // Tenant Scoped
  department: DepartmentType;
  title: string;
  xpReward: number;
  type: TaskType;
  icon?: string; 
}

export type IssueType = 'maintenance' | 'housekeeping' | 'security';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Issue {
  id?: string;
  organizationId: string; // Tenant Scoped
  userId: string;
  userName: string; 
  department: DepartmentType;
  type: IssueType;
  location: string;
  photoUrl?: string; 
  status: IssueStatus;
  createdAt: number; 
}
