
export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

// --- CORE LOCALIZATION TYPE ---
export type LocalizedString = Record<string, string>;

// --- NEW ARCHITECTURE: ROLES ---
// System Level Roles (Platform Owners)
export type UserRole = 'user' | 'super_admin' | 'admin' | 'manager' | 'staff';

// Page Level Roles (Organization Context)
export type PageRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

// --- EDUCATION TYPES ---
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseTone = 'FORMAL' | 'CASUAL' | 'FUN';
export type StoryCardType = 'COVER' | 'INFO' | 'QUIZ' | 'POLL' | 'REWARD' | 'VIDEO' | 'XP_REWARD';

export type AuthMode = 'LOGIN' | 'REGISTER';

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management';

// --- NEW: CHANNEL DEFINITION ---
export interface Channel {
  id: string;
  name: string;        // e.g. "Front Office", "Life at Rubi", "English 101"
  description?: string;
  icon?: string;       // Lucide icon name
  isPrivate: boolean;  // If true, only invitees or approved members can see
  managerIds: string[]; // User IDs who can post content here (Moderators)
  createdAt: number;
}

export type ContentTargetingScope = 'NONE' | 'BELOW_HIERARCHY' | 'ENTIRE_ORG' | 'OWN_DEPT';

export interface RolePermissions {
    adminAccess: boolean;
    manageStructure: boolean;
    manageStaff: boolean;
    viewAnalytics: boolean;
    canCreateContent: boolean;
    contentTargeting: ContentTargetingScope;
    canPostFeed: boolean;
    canApproveRequests: boolean;
}

export interface Position {
    id: string;
    organizationId: string;
    title: string;
    departmentId: string;
    parentId: string | null;
    occupantId: string | null;
    level: number;
    permissions?: RolePermissions;
}

export interface OrgDepartmentDefinition {
    id: string;
    name: string;
    color: string;
}

export interface PositionPrototype {
    id: string;
    title: string;
    departmentId: string;
    defaultLevel: number;
    isManagerial: boolean;
    permissions?: RolePermissions;
}

export type PermissionType = 'CAN_CREATE_CONTENT' | 'CAN_MANAGE_TEAM';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phoneNumber: string; 
  avatar: string; 
  
  // --- NEW STRUCTURE FIELDS ---
  currentOrganizationId: string | null; 
  pageRoles: Record<string, PageRole>; // { "org_123": "ADMIN" }
  subscribedChannelIds: string[]; // ["channel_hk", "channel_news"]
  
  // Legacy fields kept optional for transition safety, but logic moved away
  role: UserRole; // System role
  department?: DepartmentType | null; 
  positionId?: string | null; 
  roleTitle?: string;

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
  
  // --- NEW: CHANNEL TARGETING ---
  channelId?: string; 

  title: LocalizedString; 
  description: LocalizedString;
  coverQuote?: LocalizedString;

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
  isFeatured?: boolean;
  assignmentType?: 'GLOBAL' | 'OPTIONAL' | 'DEPARTMENT';
  targetDepartments?: string[]; // Deprecated
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
  title: LocalizedString;
  content: LocalizedString;
  mediaUrl: string;
  mediaPrompt?: string; 
  duration: number; 
  interaction?: {
    question: LocalizedString;
    options: LocalizedString[]; 
    correctAnswer: string; 
    correctOptionIndex?: number;
    explanation?: LocalizedString;
  };
}

export type AuthorType = 'USER' | 'ORGANIZATION';
export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'MISLEADING' | 'OUTDATED';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW';
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';

export interface Category { id: string; title: string; icon: string; color: string; }
export interface CareerPath { id: string; organizationId: string; title: string; description: string; targetRole: string; department: string; courseIds: string[]; }
export interface FeedPost { id: string; organizationId: string; authorType: AuthorType; authorId: string; authorName: string; authorAvatar: string; type: 'image' | 'video' | 'kudos' | 'course'; mediaUrl?: string; caption: string; likes: number; createdAt: number; likedBy?: string[]; kudosData?: { badgeType: KudosType; recipientId: string; recipientName: string; }; channelId?: string; }

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
  requestedRoleTitle?: string;
  targetDepartment?: string;
  positionId?: string;
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
  settings: { allowStaffContentCreation: boolean; primaryColor: string; }; 
  followersCount: number; 
  memberCount: number; 
  website?: string; 
  description?: string; 
  size?: OrganizationSize; 
  status: OrganizationStatus; 
  deletionReason?: string; 
  
  // --- NEW: CHANNELS ---
  channels: Channel[];
  
  // --- DEFINITIONS ---
  definitions?: {
      departments: OrgDepartmentDefinition[];
      positionPrototypes: PositionPrototype[];
  };
}

export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSectorExtended = OrganizationSector;
export type OrganizationSize = '1-10' | '11-50' | '50-200' | '200+';
export interface Membership { id: string; userId: string; organizationId: string; role: PageRole; status: 'ACTIVE' | 'SUSPENDED'; joinedAt: number; }
export type FollowStatus = 'NONE' | 'FOLLOWING' | 'PENDING';
export interface Relationship { followerId: string; followingId: string; status: 'PENDING' | 'ACCEPTED'; createdAt: number; }
