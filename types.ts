
export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar' | 'uk' | 'es' | 'fr';

export interface LanguageDefinition {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isBase?: boolean; 
}

export type LocalizedString = Record<string, string>;

// --- SYSTEM SETTINGS (NEW) ---
export interface SystemSettings {
    loginScreenImage: string;
    // Future settings can go here (e.g., welcomeMessage, maintenanceMode)
}

// --- SOCIAL ROLES ---
export type UserRole = 'user' | 'super_admin' | 'staff' | 'manager' | 'admin'; 
export type PageRole = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

// --- CONTENT TYPES ---
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseTone = 'FORMAL' | 'CASUAL' | 'FUN' | 'INSPIRATIONAL' | 'AUTHORITATIVE';
export type StoryCardType = 'COVER' | 'INFO' | 'QUIZ' | 'POLL' | 'REWARD' | 'VIDEO' | 'XP_REWARD';
export type PedagogyMode = 'STANDARD' | 'ACTIVE_RECALL' | 'SOCRATIC' | 'CASE_STUDY' | 'STORYTELLING';
export type SourceType = 'TEXT' | 'PDF' | 'URL' | 'YOUTUBE' | 'MANUAL';

export type AuthMode = 'LOGIN' | 'REGISTER';

// --- DEPARTMENTS ---
export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management' | 'f&b' | 'security' | 'sales' | 'hr';

// --- SEARCH ---
export type SearchResultType = 'COURSE' | 'PAGE' | 'USER' | 'JOURNEY' | 'ORGANIZATION';

export interface SearchResult {
    type: SearchResultType;
    id: string;
    title: string;       
    subtitle?: string;   
    imageUrl?: string;   
    relevanceScore: number; 
    url: string;         
}

export interface SearchTrend {
    term: string;
    count: number;
    lastSearchedAt: number;
}

// --- USER (SOCIAL AGENT) ---
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  phoneNumber?: string; 
  avatar: string; 
  bio?: string;
  instagramHandle?: string;
  
  // --- SOCIAL GRAPH FIELDS (NEW) ---
  followers: string[]; // List of User IDs who follow me
  following: string[]; // List of User IDs I follow
  followersCount?: number;
  followingCount?: number;
  
  followedPageIds: string[]; // List of Organization/Page IDs I follow
  managedPageIds: string[]; // List of Page IDs I admin/moderate
  
  channelSubscriptions: string[]; // Deprecated in favor of subscribedChannelIds
  subscribedChannelIds: string[]; // specific channel IDs
  
  isPrivate: boolean; // Do I require approval to be followed?
  
  // --- GAMIFICATION ---
  xp: number;
  creatorLevel: CreatorLevel;
  reputationPoints: number;
  badges?: { type: KudosType; count: number }[];
  
  // --- LEGACY / SYSTEM ---
  role: UserRole; // Global platform role
  status: UserStatus;
  joinDate: number;
  isSuperAdmin?: boolean;
  
  // --- LEARNING HISTORY ---
  completedCourses: string[];
  startedCourses: string[]; 
  savedCourses: string[]; 
  completedTasks: string[];
  
  preferences?: UserPreferences;
  
  // Privacy
  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount?: boolean;
  };

  // --- ORGANIZATION CONTEXT ---
  currentOrganizationId?: string | null;
  organizationHistory: string[];
  department: DepartmentType | null;
  pageRoles: Record<string, PageRole>; // Map orgId -> Role
  
  // --- CAREER ---
  positionId?: string | null;
  roleTitle?: string | null;
  assignedPathId?: string | null;
  
  // --- PROGRESS MAP ---
  progressMap?: Record<string, CourseProgress>;
}

export interface UserPreferences {
    appLanguage: LanguageCode;           
    contentLanguages: LanguageCode[];    
}

export interface CourseProgress {
    courseId: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    currentCardIndex: number;
    totalCards: number;
    lastAccessedAt: number;
    completedAt?: number;
}

// --- ORGANIZATION ---
export type OrganizationSector = 'tourism' | 'technology' | 'health' | 'education' | 'retail' | 'finance' | 'other';
export type OrganizationSize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PENDING_DELETION';

export interface Organization { 
  id: string; 
  name: string; 
  code?: string;
  type: 'PUBLIC' | 'PRIVATE'; 
  sector: OrganizationSector; 
  size?: OrganizationSize;
  logoUrl: string; 
  coverUrl?: string; 
  location: string; 
  description?: string; 
  website?: string;
  
  ownerId: string; 
  admins: string[]; 
  
  followers: string[]; 
  
  createdAt: number; 
  channels: Channel[];
  
  // Stats
  followersCount: number; 
  memberCount?: number; 
  
  status: OrganizationStatus;
  deletionReason?: string;

  // Settings
  settings?: {
      allowStaffContentCreation?: boolean;
      primaryColor?: string;
  };

  // Definitions
  definitions?: {
      departments: OrgDepartmentDefinition[];
      positionPrototypes: PositionPrototype[];
  };
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isPrivate: boolean; 
  createdAt: number;
  managerIds?: string[];
}

export interface ChannelStoryData {
    channel: Channel;
    status: 'HAS_NEW' | 'IN_PROGRESS' | 'ALL_CAUGHT_UP' | 'EMPTY';
    nextCourseId?: string;
    progressPercent: number;
}

// --- CONTENT & COURSE ---
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
export type AuthorType = 'USER' | 'ORGANIZATION';

export interface Course {
  id: string;
  authorType: AuthorType;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  
  // Context
  organizationId?: string; 
  channelId?: string;      
  categoryId?: string;
  
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  
  title: LocalizedString; 
  description: LocalizedString;
  coverQuote?: LocalizedString;
  thumbnailUrl: string;
  
  duration: number;
  xpReward: number;
  createdAt: number;
  
  steps: StoryCard[]; 
  tags?: string[]; 
  topics?: string[];
  
  // Metrics
  likesCount?: number;
  completesCount?: number;
  popularityScore?: number;
  rating?: number;
  
  // Config
  priority?: 'HIGH' | 'NORMAL';
  isNew?: boolean;
  isFeatured?: boolean;
  
  price: number;
  priceType?: 'FREE' | 'PAID';

  // Smart Fields
  assignmentType?: 'GLOBAL' | 'DEPARTMENT' | 'OPTIONAL';
  targetDepartments?: DepartmentType[];
  
  tier?: ContentTier;
  verificationStatus?: VerificationStatus;
  qualityScore?: number;
  flagCount?: number;
  
  config?: any;
  translationStatus?: Record<string, TranslationStatus>;
}

export type TranslationStatus = 'SYNCED' | 'STALE' | 'MISSING';

export interface StoryCard {
  id: string;
  type: StoryCardType;
  title: LocalizedString;
  content: LocalizedString;
  mediaUrl: string;
  mediaPrompt?: string;
  duration: number; 
  topics?: string[];
  interaction?: {
    question: LocalizedString;
    options: LocalizedString[];
    correctAnswer?: string; // Legacy support
    correctOptionIndex?: number;
    explanation?: LocalizedString;
  };
  source?: { type: SourceType; url?: string };
}

export interface FeedPost { 
    id: string; 
    authorType: AuthorType; 
    authorId: string; 
    authorName: string; 
    authorAvatar: string; 
    
    // Context
    organizationId?: string; 
    
    type: 'image' | 'video' | 'kudos' | 'course'; 
    mediaUrl?: string; 
    caption: string; 
    
    likesCount: number;
    commentsCount: number;
    createdAt: number; 
    
    kudosData?: { badgeType: KudosType; recipientId: string; recipientName: string; }; 
    
    likes?: Record<string, any>;
}

// --- TASKS & ISSUES ---
export interface Task {
    id: string;
    organizationId: string;
    department: DepartmentType;
    title: string;
    xpReward: number;
    type: 'checklist' | 'photo';
}

export type IssueType = 'maintenance' | 'housekeeping' | 'security';

export interface Issue {
    organizationId: string;
    userId: string;
    userName: string;
    department: DepartmentType | null;
    type: IssueType;
    location: string;
    photoUrl?: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    createdAt: number;
}

// --- CAREER & LEARNING ---
export interface CareerPath {
    id: string;
    organizationId: string;
    title: string;
    description: string;
    department: DepartmentType;
    targetRole: string;
    courseIds: string[];
}

export interface LearningJourney {
    id: string;
    title: string;
    courses: string[];
}

export interface Membership {
    id: string;
    userId: string;
    organizationId: string;
    role: PageRole;
    department: DepartmentType;
    status: 'ACTIVE' | 'INACTIVE';
    joinedAt: number;
}

// --- REQUESTS ---
export interface JoinRequest {
  id: string;
  type: 'REQUEST_TO_JOIN' | 'REQUEST_TO_JOIN_PAGE';
  userId: string;
  organizationId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
  
  targetDepartment?: DepartmentType;
  requestedRoleTitle?: string;
  positionId?: string;
}

// --- UTILS ---
export interface Category { id: string; title: string; icon: string; color: string; }

// --- ORGANIZATION STRUCTURE (NEW) ---
export interface Position {
    id: string;
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

export type ContentTargetingScope = 'NONE' | 'BELOW_HIERARCHY' | 'OWN_DEPT' | 'ENTIRE_ORG';

export interface RolePermissions {
    adminAccess: boolean;
    manageStructure: boolean;
    manageStaff: boolean;
    viewAnalytics: boolean;
    canCreateContent: boolean;
    contentTargeting: ContentTargetingScope | string;
    canPostFeed: boolean;
    canApproveRequests: boolean;
}

export type PermissionType = keyof RolePermissions;

// --- SOCIAL ---
export type FollowStatus = 'NONE' | 'PENDING' | 'FOLLOWING';

export interface Relationship {
    followerId: string;
    followingId: string;
    status: 'PENDING' | 'ACCEPTED';
    createdAt: number;
}

// --- ANALYTICS & METRICS ---
export interface AnalyticsEvent {
    id?: string;
    userId: string;
    userName: string;
    userRole: string;
    pageId: string;
    channelId?: string;
    contentId: string;
    type: 'VIEW' | 'COMPLETE' | 'QUIZ_ANSWER';
    payload?: any;
    timestamp: number;
    relatedTopics?: string[];
    outcome?: 'SUCCESS' | 'FAILURE';
}

export interface SkillMetric {
    level: number;
    lastTestedAt: number;
    failureCount: number;
    successCount: number;
}

export interface UserSkillProfile {
    userId: string;
    skills: Record<string, SkillMetric>;
    updatedAt: number;
}

export type ReviewTag = 'ACCURATE' | 'ENGAGING' | 'MISLEADING' | 'OUTDATED';
