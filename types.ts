
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

export type PermissionType = 
    | 'CAN_CREATE_CONTENT'
    | 'CAN_MANAGE_TEAM'
    | 'CAN_VIEW_ANALYTICS'
    | 'CAN_EDIT_SETTINGS';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';

export interface UserMetadata {
    lastLoginAt?: number;
    loginCount?: number;
    deviceInfo?: string;
}

export interface InstructorProfile {
    bio: string;
    expertise: string[];
    totalStudents: number;
    averageRating: number;
    earnings: number;
}

export type FollowStatus = 'NONE' | 'PENDING' | 'FOLLOWING';

export interface Relationship {
    id: string;
    followerId: string;
    followingId: string;
    status: 'PENDING' | 'ACCEPTED';
    createdAt: number;
}

export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSize = '1-10' | '11-50' | '50-200' | '200+';

export interface OrganizationSettings {
    allowStaffContentCreation: boolean;
    customDepartments: string[];
    primaryColor?: string;
}

export type OrganizationStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

export interface Organization {
  id: string;
  name: string;
  logoUrl: string;
  coverUrl?: string;
  description?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  sector: OrganizationSector;
  size?: OrganizationSize;
  ownerId: string;
  legacyOwnerId?: string;
  status?: OrganizationStatus;
  code: string;
  createdAt: number;
  settings?: OrganizationSettings;
  memberCount?: number;
  followersCount?: number;
  publicContentEnabled?: boolean;
  subGroups?: string[];
}

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  roleTitle?: string;
  permissions?: PermissionType[];
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
  requestedRoleTitle?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
}

export interface UserPrivacySettings {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount: boolean;
}

export interface User {
  id: string;
  email?: string; 
  phoneNumber: string;
  name: string;
  avatar: string; 
  currentOrganizationId: string | null; 
  department: DepartmentType | null;
  role: UserRole;
  isSuperAdmin?: boolean;
  status?: UserStatus;
  isSuspended?: boolean;
  metadata?: UserMetadata;
  privacySettings?: UserPrivacySettings;
  pin: string; 
  xp: number;
  creatorLevel: CreatorLevel;
  reputationPoints: number;
  bio?: string; 
  joinDate?: number; 
  instagramHandle?: string;
  organizationHistory: string[];
  instructorProfile?: InstructorProfile;
  isPrivate?: boolean;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  completedCourses: string[];
  startedCourses?: string[]; 
  savedCourses?: string[]; 
  completedTasks?: string[]; 
  badges?: Badge[]; 
  assignedPathId?: string; 
}

export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

export interface Badge {
    type: KudosType;
    count: number;
    lastReceivedAt: number;
}

// --- MICRO-LEARNING & STORY TYPES ---

export type StoryCardType = 'INFO' | 'QUIZ' | 'VIDEO' | 'XP_REWARD' | 'POLL';
export type InteractionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'POLL';

export interface Interaction {
  type: InteractionType;
  question: string;
  options: string[];
  correctOptionIndex?: number; // For Quiz
  explanation?: string; // Shown after answer
}

export interface StoryCard {
  id: string;
  type: StoryCardType;
  title: string;
  content: string; // Markdown supported
  mediaUrl?: string; // Image or Short Video
  duration: number; // Estimated read time in seconds (for progress bar)
  interaction?: Interaction;
  gradient?: string; // Visual style
}

export interface DeepDiveResource {
  title: string;
  type: 'PDF' | 'VIDEO' | 'ARTICLE';
  url: string;
  description?: string;
}

// Legacy support for CourseStep (mapped to StoryCard now)
export type CourseStep = StoryCard; 

export interface Category {
  id: string;
  title: string;
  icon?: string;
  color?: string;
}

export type AssignmentType = 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
export type ContentPriority = 'HIGH' | 'NORMAL';
export type CourseVisibility = 'PRIVATE' | 'PUBLIC' | 'FOLLOWERS_ONLY';
export type OwnerType = 'USER' | 'ORGANIZATION';
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
export type PriceType = 'FREE' | 'PAID';
export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'BORING' | 'MISLEADING' | 'OUTDATED';

export interface Course {
  id: string;
  organizationId?: string;
  authorId: string;
  ownerType: OwnerType;
  tier: ContentTier;
  verificationStatus: VerificationStatus;
  qualityScore: number;
  priceType: PriceType;
  visibility: CourseVisibility;
  price: number;
  rating?: number;
  studentCount?: number;
  discussionBoardId?: string; 
  flagCount?: number;
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string; 
  duration: number; // Total estimated minutes
  xpReward: number;
  isFeatured?: boolean;
  coverQuote?: string; 
  tags?: string[]; 
  popularityScore?: number; 
  isNew?: boolean;
  assignmentType?: AssignmentType; 
  targetDepartments?: DepartmentType[]; 
  priority?: ContentPriority; 
  createdAt?: number;
  
  // NEW: Micro-Learning Core
  steps: StoryCard[]; 
  deepDiveResource?: DeepDiveResource; // Optional long-form content
}

export interface FeedPost {
  id: string;
  organizationId: string;
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
  interactions?: any[];
  scheduledFor?: number; 
}

export interface CareerPath {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  targetRole: string; 
  courseIds: string[]; 
  department: DepartmentType;
}

export type TaskType = 'checklist' | 'photo';

export interface Task {
  id: string;
  organizationId: string;
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
  organizationId: string;
  userId: string;
  userName: string; 
  department: DepartmentType;
  type: IssueType;
  location: string;
  photoUrl?: string; 
  status: IssueStatus;
  createdAt: number; 
}