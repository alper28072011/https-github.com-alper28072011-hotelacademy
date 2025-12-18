
export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management' | 'hr' | 'sales' | 'it' | string;
export type UserRole = 'staff' | 'manager' | 'admin' | 'super_admin';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

// --- EDUCATION TYPES ---
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseTone = 'FORMAL' | 'CASUAL' | 'FUN';
export type CourseLength = 'SHORT' | 'MEDIUM' | 'LONG';
export type StoryCardType = 'COVER' | 'INFO' | 'QUIZ' | 'POLL' | 'REWARD' | 'VIDEO' | 'XP_REWARD';

export type AuthMode = 'LOGIN' | 'REGISTER';

// --- UNIFIED HIERARCHY STRUCTURE ---

export interface OrgPosition {
  id: string; // Unique ID (e.g., pos_123)
  title: string; // "Sous Chef"
}

export interface OrgDepartment {
  id: string; // "kitchen"
  name: string; // "Mutfak & Gıda"
  color?: string; // Visual tag color
  managerId?: string; // Head of Dept (User ID)
  positions: OrgPosition[]; // Lightweight array for quick lookups
}

export interface TargetingConfig {
  type: 'ALL' | 'DEPARTMENT' | 'POSITION';
  targetIds: string[]; 
}

// --- CORE POSITION NODE (Firestore Document: 'positions') ---
export interface Position {
  id: string;
  organizationId: string;
  title: string;
  departmentId: DepartmentType; // Links to OrgDepartment
  parentId: string | null; // For Tree Structure
  occupantId: string | null; // The User sitting here (Single Source of Truth for "Who is where")
  level: number; // Hierarchy depth (0 = GM, 1 = Manager, etc.)
  baseSalary?: number;
  isOpen?: boolean; // Is this a vacant slot looking for hiring?
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phoneNumber: string; 
  avatar: string; 
  currentOrganizationId: string | null; 
  department: string | null; // Denormalized from Position for quick filtering
  role: UserRole;
  roleTitle?: string; // Denormalized title (e.g. "Sous Chef")
  positionId?: string; // STRICT LINK to Position Document
  status: UserStatus;
  xp: number;
  creatorLevel: CreatorLevel;
  reputationPoints: number;
  bio?: string; 
  joinDate?: number; 
  organizationHistory: string[];
  completedCourses: string[];
  startedCourses?: string[]; 
  savedCourses?: string[]; 
  completedTasks?: string[]; 
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  instagramHandle?: string;
  assignedPathId?: string;
  badges?: { type: KudosType; count: number }[];
  following?: string[];
  isSuperAdmin?: boolean;
  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount: boolean;
  };
}

export interface Course {
  id: string;
  organizationId?: string; 
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  xpReward: number;
  createdAt?: number;
  steps: StoryCard[]; 
  tags?: string[];
  priority?: 'HIGH' | 'NORMAL';
  config?: CourseConfig;
  price: number;
  priceType: 'FREE' | 'PAID';
  coverQuote?: string;
  isFeatured?: boolean;
  assignmentType?: 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
  targetDepartments?: string[];
  
  // Precise Targeting
  targeting?: TargetingConfig;

  studentCount?: number;
  isNew?: boolean;
  popularityScore?: number;
  verificationStatus?: VerificationStatus;
  flagCount?: number;
  tier?: ContentTier;
  qualityScore?: number;
  deepDiveResource?: {
    title: string;
    url: string;
    type: string;
  };
}

export interface CourseConfig {
  level: DifficultyLevel;
  tone: CourseTone;
  language: string;
  autoPlay: boolean;
  slideDuration: number;
}

export interface StoryCard {
  id: string;
  type: StoryCardType;
  title: string;
  content: string;
  mediaUrl: string;
  mediaPrompt?: string; 
  duration: number; 
  interaction?: {
    question: string;
    options: string[];
    correctAnswer: string;
    correctOptionIndex?: number;
    explanation?: string;
  };
}

export type AuthorType = 'USER' | 'ORGANIZATION';
export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'MISLEADING' | 'OUTDATED';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW';
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';

export interface Category { id: string; title: string; icon: string; color: string; }
export interface CareerPath { id: string; organizationId: string; title: string; description: string; targetRole: string; department: DepartmentType; courseIds: string[]; }
export interface FeedPost { id: string; organizationId: string; authorType: AuthorType; authorId: string; authorName: string; authorAvatar: string; type: 'image' | 'video' | 'kudos' | 'course'; mediaUrl?: string; caption: string; likes: number; createdAt: number; likedBy?: string[]; kudosData?: { badgeType: KudosType; recipientId: string; recipientName: string; }; }

export interface Task {
  id: string;
  organizationId: string;
  department: string;
  title: string;
  xpReward: number;
  type: 'checklist' | 'photo';
}

export type IssueType = 'maintenance' | 'housekeeping' | 'security';

export interface Issue {
  organizationId: string;
  userId: string;
  userName: string;
  department: string | null;
  type: IssueType;
  location: string;
  photoUrl?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: number;
}

export interface JoinRequest {
  id: string;
  type: 'REQUEST_TO_JOIN';
  userId: string;
  organizationId: string;
  targetDepartment: string;
  requestedRoleTitle: string;
  positionId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
}

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION' | 'ARCHIVED';

export interface Organization { 
  id: string; 
  name: string; 
  sector: OrganizationSector; 
  logoUrl: string; 
  coverUrl?: string; 
  location: string; 
  ownerId: string; 
  code: string; 
  createdAt: number; 
  settings: { allowStaffContentCreation: boolean; customDepartments: string[]; primaryColor: string; }; 
  followersCount: number; 
  memberCount: number; 
  website?: string; 
  description?: string; 
  size?: OrganizationSize; 
  status: OrganizationStatus; 
  deletionReason?: string; 
  structureType?: 'FLAT' | 'HIERARCHICAL';
  
  // Official Hierarchy Meta
  hierarchy?: OrgDepartment[];
}

export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSectorExtended = OrganizationSector;
export type OrganizationSize = '1-10' | '11-50' | '50-200' | '200+';
export interface Membership { id: string; userId: string; organizationId: string; role: UserRole; department: DepartmentType; status: 'ACTIVE' | 'SUSPENDED'; joinedAt: number; roleTitle?: string; positionId?: string; permissions?: PermissionType[]; }
export type PermissionType = 'CAN_CREATE_CONTENT' | 'CAN_MANAGE_TEAM' | 'CAN_VIEW_ANALYTICS' | 'CAN_EDIT_SETTINGS';
export type FollowStatus = 'NONE' | 'FOLLOWING' | 'PENDING';
export interface Relationship { followerId: string; followingId: string; status: 'PENDING' | 'ACCEPTED'; createdAt: number; }
