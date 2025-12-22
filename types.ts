

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

export interface SystemSettings {
    loginScreenImage: string;
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

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management' | 'f&b' | 'security' | 'sales' | 'hr';

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
  
  // --- LAYER 1: SOCIAL GRAPH (Public Interest) ---
  followingUsers: string[]; // User IDs I follow
  followingPages: string[]; // Page IDs I follow (for public content)
  followedTags: string[];   // Interest tags (e.g. #housekeeping, #wine)
  
  followers: string[]; // Users who follow me
  followersCount: number;
  followingCount: number;
  
  isPrivate: boolean; 
  
  // --- LAYER 2: CORPORATE GRAPH (Workspaces) ---
  joinedPageIds: string[]; // Page IDs where I am a MEMBER/STAFF
  managedPageIds: string[]; // Page IDs where I am an ADMIN/CREATOR
  channelSubscriptions: string[]; // Specific Channel IDs I'm subscribed to (across all joined pages)
  
  // Manage Role per Page
  pageRoles: Record<string, PageRole>; 
  
  // --- LEGACY COMPATIBILITY (Deprecated but kept for migration safety) ---
  following?: string[]; 
  followedPageIds?: string[];
  subscribedChannelIds?: string[]; 
  
  // --- GAMIFICATION ---
  xp: number;
  creatorLevel: CreatorLevel;
  reputationPoints: number;
  badges?: { type: KudosType; count: number }[];
  
  // --- SYSTEM ---
  role: UserRole; 
  status: UserStatus;
  joinDate: number;
  isSuperAdmin?: boolean;
  
  // --- LEARNING HISTORY ---
  completedCourses: string[];
  startedCourses: string[]; 
  savedCourses: string[]; 
  completedTasks: string[];
  
  preferences?: UserPreferences;
  
  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount?: boolean;
  };

  // --- ACTIVE CONTEXT ---
  currentOrganizationId?: string | null;
  organizationHistory: string[];
  department: DepartmentType | null;
  
  // --- CAREER ---
  positionId?: string | null;
  roleTitle?: string | null;
  assignedPathId?: string | null;
  
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
  
  // --- CONNECTIONS ---
  followers: string[]; // Social Fans (see public posts)
  members: string[];   // Staff/Students (see internal posts/channels)
  
  createdAt: number; 
  channels: Channel[];
  
  // Stats
  followersCount: number; 
  memberCount: number; 
  
  status: OrganizationStatus;
  deletionReason?: string;

  settings?: {
      allowStaffContentCreation?: boolean;
      primaryColor?: string;
  };

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
    correctAnswer?: string;
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

export interface Category { id: string; title: string; icon: string; color: string; }

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

export type FollowStatus = 'NONE' | 'PENDING' | 'FOLLOWING';

export interface Relationship {
    followerId: string;
    followingId: string;
    status: 'PENDING' | 'ACCEPTED';
    createdAt: number;
}

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
