
export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface LanguageDefinition {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isBase?: boolean; // English is base
}

// --- CORE LOCALIZATION TYPE ---
export type LocalizedString = Record<string, string>;

// --- NEW ARCHITECTURE: ROLES ---
export type UserRole = 'user' | 'super_admin' | 'staff' | 'manager' | 'admin'; 

// Page Level Roles (Organization Context)
export type PageRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management';

// --- EDUCATION TYPES ---
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseTone = 'FORMAL' | 'CASUAL' | 'FUN' | 'INSPIRATIONAL' | 'AUTHORITATIVE';
export type StoryCardType = 'COVER' | 'INFO' | 'QUIZ' | 'POLL' | 'REWARD' | 'VIDEO' | 'XP_REWARD';
export type PedagogyMode = 'STANDARD' | 'ACTIVE_RECALL' | 'SOCRATIC' | 'CASE_STUDY' | 'STORYTELLING';
export type SourceType = 'TEXT' | 'PDF' | 'URL' | 'YOUTUBE';

export type AuthMode = 'LOGIN' | 'REGISTER';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isPrivate: boolean;
  managerIds: string[];
  createdAt: number;
}

export type ChannelStoryStatus = 'HAS_NEW' | 'IN_PROGRESS' | 'ALL_CAUGHT_UP' | 'EMPTY';

export interface ChannelStoryData {
    channel: Channel;
    status: ChannelStoryStatus;
    nextCourseId?: string;
    progressPercent?: number;
}

export interface AnalyticsEvent {
  id?: string;
  userId: string;
  userRole?: string;
  userName?: string;
  pageId: string;
  channelId?: string;
  contentId: string;
  cardId?: string;
  type: 'VIEW' | 'COMPLETE' | 'QUIZ_ANSWER' | 'TIME_SPENT' | 'DROP_OFF';
  payload?: any;
  timestamp: number;
}

export interface UserPreferences {
    appLanguage: LanguageCode;           // UI Language (Single Source)
    contentLanguages: LanguageCode[];    // PRIORITY LIST (e.g. ['tr', 'ru', 'en'])
}

// --- NEW: PROGRESS TRACKING ---
export interface CourseProgress {
  courseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: number;
  lastAccessedAt: number;
  currentCardIndex: number; // Resume point
  maxCardIndexReached: number;
  totalCards: number;
  score?: number; // Quiz score
  isReviewMode?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phoneNumber: string; 
  avatar: string; 
  currentOrganizationId: string | null; 
  pageRoles: Record<string, PageRole>;
  subscribedChannelIds: string[];
  role: UserRole;
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
  
  // Legacy Arrays (Keep for simple queries)
  completedCourses: string[];
  startedCourses?: string[]; 
  savedCourses?: string[]; 
  completedTasks?: string[]; 
  
  // NEW: Precise Progress Map
  progressMap?: Record<string, CourseProgress>;

  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  instagramHandle?: string;
  assignedPathId?: string;
  badges?: { type: KudosType; count: number }[];
  following?: string[];
  isSuperAdmin?: boolean;
  
  preferences?: UserPreferences;

  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount: boolean;
  };
}

export interface ContentSource {
    type: 'MANUAL' | 'AI_TEXT' | 'AI_PDF' | 'AI_URL';
    metadata?: { 
        originalUrl?: string; 
        originalFileName?: string;
        extractedTextSnippet?: string;
    };
}

export type TranslationStatus = 'SYNCED' | 'STALE' | 'MISSING';

export interface Course {
  id: string;
  organizationId?: string; 
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  categoryId: string;
  channelId?: string; 

  // Localized Fields (English is Base)
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
  targetDepartments?: string[];
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
  
  // Scalable Counters
  likesCount?: number;
  completesCount?: number;
  
  // NEW: Translation Management
  translationStatus?: Record<string, TranslationStatus>;
}

export interface CourseConfig {
  level: DifficultyLevel;
  tone: CourseTone;
  pedagogyMode: PedagogyMode; 
  sourceType: SourceType;     
  targetLanguages: string[];  
  autoPlay: boolean;
  slideDuration: number;
}

export interface StoryCard {
  id: string;
  type: StoryCardType;
  // Localized Content
  title: LocalizedString;
  content: LocalizedString;
  
  mediaUrl: string;
  mediaPrompt?: string; 
  duration: number; 
  interaction?: {
    question: LocalizedString;
    options: LocalizedString[]; // Array of localized strings
    correctAnswer: string; // Identifier or key, not display text
    correctOptionIndex?: number;
    explanation?: LocalizedString;
  };
  
  source?: ContentSource;
}

// --- NEW: LEARNING JOURNEY (SERIES) ---
export interface LearningJourney {
    id: string;
    organizationId: string;
    title: LocalizedString;
    description: LocalizedString;
    channelId?: string;
    coverUrl: string;
    courseIds: string[]; // Ordered list of Course IDs
    isPublished: boolean;
    createdAt: number;
    tags: string[];
}

export type AuthorType = 'USER' | 'ORGANIZATION';
export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'MISLEADING' | 'OUTDATED';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW';
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';

export interface Category { id: string; title: string; icon: string; color: string; }
export interface CareerPath { id: string; organizationId: string; title: string; description: string; targetRole: string; department: string; courseIds: string[]; }

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
    
    // Scalable Counters
    likesCount: number; 
    commentsCount: number;
    
    createdAt: number; 
    // removed likedBy array for scalability, handled via subcollection check
    kudosData?: { badgeType: KudosType; recipientId: string; recipientName: string; }; 
    channelId?: string; 
}

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
  channels: Channel[];
  definitions?: {
      departments: OrgDepartmentDefinition[];
      positionPrototypes: PositionPrototype[];
  };
}

export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSectorExtended = OrganizationSector;
export type OrganizationSize = '1-10' | '11-50' | '50-200' | '200+';
export interface Membership { id: string; userId: string; organizationId: string; role: PageRole; status: 'ACTIVE' | 'SUSPENDED'; joinedAt: number; department?: DepartmentType; }
export type FollowStatus = 'NONE' | 'FOLLOWING' | 'PENDING';
export interface Relationship { followerId: string; followingId: string; status: 'PENDING' | 'ACCEPTED'; createdAt: number; }

export type ContentTargetingScope = 'NONE' | 'BELOW_HIERARCHY' | 'ENTIRE_ORG' | 'OWN_DEPT';

export interface RolePermissions {
    adminAccess: boolean;
    manageStructure: boolean;
    manageStaff: boolean;
    viewAnalytics: boolean;
    canCreateContent: boolean;
    contentTargeting: ContentTargetingScope | string;
    canPostFeed: boolean;
    canApproveRequests: boolean;
    [key: string]: boolean | string;
}

export interface Position {
    id: string;
    title: string;
    departmentId: string;
    parentId: string | null;
    occupantId?: string | null;
    level?: number;
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
