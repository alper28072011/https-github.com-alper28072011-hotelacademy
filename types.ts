
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

export interface User {
  id: string;
  email?: string; // Added for Admin/Manager Login
  name: string;
  avatar: string; // Initials or URL
  department: DepartmentType;
  role: UserRole; 
  pin: string; 
  xp: number;
  completedCourses: string[];
  completedTasks?: string[]; // IDs of daily operational tasks completed
}

export type StepType = 'video' | 'quiz';

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
}

export interface Category {
  id: string;
  title: string;
}

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
  targetDepartments?: DepartmentType[]; // Added for targeting
  steps: CourseStep[];
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
