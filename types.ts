
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

export interface ActiveContext {
    id: string;
    type: 'USER' | 'ORGANIZATION';
    role: string;
    name: string;
    avatar?: string;
}

// --- SOCIAL ROLES ---
export type UserRole = 'user' | 'super_admin' | 'staff' | 'manager' | 'admin'; 
export type PageRole = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type CreatorLevel = 'NOVICE' | 'RISING_STAR' | 'EXPERT' | 'MASTER';
export type KudosType = 'STAR_PERFORMER' | 'TEAM_PLAYER' | 'GUEST_HERO' | 'FAST_LEARNER';

// --- CONTEXT & PUBLISHING (STRICT) ---
export type AppContextType = 'PERSONAL' | 'ORGANIZATION';

export interface Publisher {
    id: string; // The Entity ID (User ID or Org ID)
    type: AppContextType;
    name: string;
    avatarUrl?: string;
    roleTitle?: string; // e.g. "Front Office Manager"
}

// --- CONTENT TYPES ---
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseTone = 'FORMAL' | 'CASUAL' | 'FUN' | 'INSPIRATIONAL' | 'AUTHORITATIVE';
export type StoryCardType = 'COVER' | 'INFO' | 'QUIZ' | 'POLL' | 'REWARD' | 'VIDEO' | 'XP_REWARD';

export type PedagogyMode = 'STANDARD' | 'ACTIVE_RECALL' | 'SOCRATIC' | 'FEYNMAN' | 'CASE_STUDY';

export type SourceType = 'TEXT' | 'PDF' | 'URL' | 'YOUTUBE' | 'MANUAL';

export interface ContentGenerationConfig {
  sourceType: 'TEXT_PROMPT' | 'PDF_UPLOAD' | 'WEB_URL' | 'HIERARCHY_CONTEXT'; 
  sourceContent: string; 
  targetAudience: string; 
  language: string; 
  targetLanguages: string[]; 
  difficulty: DifficultyLevel;
  pedagogy: PedagogyMode;
  tone: CourseTone;
  length: 'SHORT' | 'MEDIUM';
  hierarchyContext?: {
      careerGoal?: string;
      courseTitle?: string;
      moduleTitle?: string;
  }
}

export interface GeneratedModule {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
}

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
  
  // IDENTITY & NETWORK
  primaryNetworkId: string | null; 
  primaryNetworkRole: 'ADMIN' | 'MEMBER' | 'ALUMNI'; 
  
  // VISION
  targetCareerPathId: string | null; 
  
  // SCALABILITY UPDATE: Arrays removed. Use sub-collections.
  // followingUsers: string[]; // REMOVED
  // followingPages: string[]; // REMOVED
  // followers: string[];      // REMOVED
  
  followedTags: string[]; // Kept for simple interest matching (low cardinality usually)
  
  followersCount: number;
  followingCount: number;
  
  isPrivate: boolean; 
  
  joinedPageIds: string[]; // Kept for fast permission checks (usually < 10)
  managedPageIds: string[]; // Kept for fast permission checks
  channelSubscriptions: string[]; // Kept for notification routing
  
  pageRoles: Record<string, PageRole | { role: PageRole; title: string }>; 
  
  // following?: string[]; // REMOVED
  // followedPageIds?: string[]; // REMOVED
  // subscribedChannelIds?: string[]; // Deprecated, mapped to channelSubscriptions
  
  xp: number;
  creatorLevel: CreatorLevel;
  reputationPoints: number;
  badges?: { type: KudosType; count: number }[];
  
  role: UserRole; 
  status: UserStatus;
  joinDate: number;
  isSuperAdmin?: boolean;
  
  completedCourses: string[]; // Kept for progress tracking (grow slowly)
  startedCourses: string[]; 
  savedCourses: string[]; 
  completedTasks: string[];
  
  preferences?: UserPreferences;
  
  privacySettings?: {
    showInSearch: boolean;
    allowTagging: boolean;
    isPrivateAccount?: boolean;
  };

  currentOrganizationId?: string | null;
  organizationHistory: string[];
  department: DepartmentType | null;
  
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
    moduleId?: string;
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

export interface JoinConfig {
    rules: string;
    requireApproval: boolean;
    availableRoles: string[];
}

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
  
  // SCALABILITY UPDATE: Arrays removed
  // followers: string[]; // REMOVED
  // members: string[];   // REMOVED
  
  createdAt: number; 
  channels: Channel[];
  
  followersCount: number; 
  memberCount: number; 
  
  status: OrganizationStatus;
  deletionReason?: string;

  joinConfig?: JoinConfig;

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
  isMandatory?: boolean; 
  managerIds?: string[]; 
  createdAt: number;
}

export interface ChannelStoryData {
    channel: Channel;
    status: 'HAS_NEW' | 'IN_PROGRESS' | 'ALL_CAUGHT_UP' | 'EMPTY';
    nextCourseId?: string;
    progressPercent: number;
}

// --- CONTENT & HIERARCHY ---
export type ContentTier = 'COMMUNITY' | 'PRO' | 'OFFICIAL';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
export type AuthorType = 'USER' | 'ORGANIZATION';

// 1. LAYER: CAREER PATH
export interface CareerPath {
    id: string;
    organizationId: string;
    title: string;
    description: string;
    targetRole: string; 
    department: DepartmentType;
    targetAudience?: string; 
    courseIds: string[]; 
    aiPrompt?: string; 
    createdAt?: number;
    updatedAt?: number;
}

// 2. LAYER: COURSE
export interface Course {
  id: string;
  
  // NEW PUBLISHER MODEL (Context Aware)
  publisherId: string; 
  publisherType: AppContextType; 
  publisherName: string;
  publisherAvatar?: string;

  authorId: string; 
  organizationId?: string; 
  
  channelId?: string; 
  targetChannelIds?: string[]; 
  categoryId?: string;
  
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  
  title: LocalizedString; 
  description: LocalizedString;
  coverQuote?: LocalizedString;
  thumbnailUrl: string;
  
  careerPathIds?: string[]; 
  topicIds: string[]; 
  
  duration: number;
  xpReward: number;
  steps: StoryCard[]; 
  
  tags?: string[]; 
  topics?: string[];
  
  createdAt: number;
  likesCount?: number;
  completesCount?: number;
  popularityScore?: number;
  rating?: number;
  
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
  
  // Deprecated
  modules?: CourseModule[]; 
  authorName?: string; 
  authorAvatarUrl?: string; 
  authorType?: AuthorType; 
}

export interface CourseTopic {
    id: string;
    courseId: string;
    title: LocalizedString;
    summary: LocalizedString;
    moduleIds: string[]; 
    createdAt: number;
}

export interface LearningModule {
    id: string;
    topicId: string;
    courseId: string; 
    title: LocalizedString;
    type: 'VIDEO' | 'QUIZ' | 'READING' | 'FLASHCARD' | 'MIXED';
    content: StoryCard[]; 
    duration: number; 
    xp: number;
    createdAt: number;
}

export interface CourseModule {
    id: string;
    title: LocalizedString;
    description?: LocalizedString;
    status: 'DRAFT' | 'PUBLISHED';
    cards?: StoryCard[]; 
    learningMethod?: PedagogyMode;
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
    publisherId: string;
    publisherType: AppContextType;
    publisherName: string;
    publisherAvatar?: string;
    authorId: string; 
    organizationId?: string; 
    
    type: 'image' | 'video' | 'kudos' | 'course'; 
    mediaUrl?: string; 
    caption: string; 
    likesCount: number;
    commentsCount: number;
    createdAt: number; 
    kudosData?: { badgeType: KudosType; recipientId: string; recipientName: string; }; 
    targetChannelIds?: string[]; 
    
    // Legacy mapping
    authorType?: AuthorType;
    authorName?: string;
    authorAvatar?: string;
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
  agreedToRules?: boolean;
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
