
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
export type AuthMode = 'LOGIN' | 'REGISTER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phoneNumber: string; 
  avatar: string; 
  currentOrganizationId: string | null; 
  department: DepartmentType | null;
  role: UserRole;
  isSuperAdmin?: boolean;
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
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  // Added properties to fix seed and profile errors
  pin?: string;
  isPrivate?: boolean;
  instagramHandle?: string;
  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount: boolean;
  };
  assignedPathId?: string;
  badges?: { type: KudosType; count: number }[];
}

export type CourseVisibility = 'PRIVATE' | 'PUBLIC' | 'FOLLOWERS_ONLY';
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW';

export interface Course {
  id: string;
  organizationId?: string; 
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  visibility: CourseVisibility;
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
  price: number;
  priceType: 'FREE' | 'PAID';
  // Added properties to fix seed and service errors
  coverQuote?: string;
  isFeatured?: boolean;
  assignmentType?: 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
  targetDepartments?: DepartmentType[];
  popularityScore?: number;
  isNew?: boolean;
  tier?: ContentTier;
  verificationStatus?: VerificationStatus;
  qualityScore?: number;
  flagCount?: number;
  studentCount?: number;
  deepDiveResource?: {
    type: string;
    url: string;
    title: string;
  };
}

export type StoryCardType = 'INFO' | 'QUIZ' | 'VIDEO' | 'XP_REWARD';
export type InteractionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface StoryCard {
  id: string;
  type: StoryCardType;
  title: string;
  content: string;
  mediaUrl?: string;
  duration: number;
  interaction?: {
    type: InteractionType;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
  };
}

export type IssueType = 'maintenance' | 'housekeeping' | 'security';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Issue {
  id?: string;
  organizationId: string;
  userId: string;
  userName: string;
  department: DepartmentType | null;
  type: IssueType;
  location: string;
  photoUrl?: string;
  status: IssueStatus;
  createdAt: number;
}

export interface Task {
  id: string;
  organizationId: string;
  department: DepartmentType;
  title: string;
  xpReward: number;
  type: 'checklist' | 'photo';
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export interface CareerPath {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  targetRole: string;
  department: DepartmentType;
  courseIds: string[];
}

export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

export interface FeedPost {
  id: string;
  organizationId: string;
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  type: 'image' | 'video' | 'kudos' | 'course'; 
  mediaUrl?: string; 
  caption: string;
  likes: number;
  createdAt: number;
  likedBy?: string[]; 
  kudosData?: {
    badgeType: KudosType;
    recipientId: string;
    recipientName: string;
  };
}

export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSize = '1-10' | '11-50' | '50-200' | '200+';

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
  settings: {
    allowStaffContentCreation: boolean;
    customDepartments: string[];
    primaryColor: string;
  };
  followersCount: number;
  memberCount: number;
  website?: string;
  description?: string;
  size?: OrganizationSize;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  department: DepartmentType;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: number;
  roleTitle?: string;
  permissions?: PermissionType[];
}

export type PermissionType = 'CAN_CREATE_CONTENT' | 'CAN_MANAGE_TEAM' | 'CAN_VIEW_ANALYTICS' | 'CAN_EDIT_SETTINGS';

export interface JoinRequest {
  id: string;
  type: 'REQUEST_TO_JOIN';
  userId: string;
  organizationId: string;
  targetDepartment: DepartmentType;
  requestedRoleTitle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
}

export type FollowStatus = 'NONE' | 'FOLLOWING' | 'PENDING';

export interface Relationship {
  followerId: string;
  followingId: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: number;
}

export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'MISLEADING' | 'OUTDATED';

export type AuthorType = 'USER' | 'ORGANIZATION';
