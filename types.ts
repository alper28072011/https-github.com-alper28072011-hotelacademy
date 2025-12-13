export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string; // Emoji flag for simplicity
  dir: 'ltr' | 'rtl';
}

export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management';

export interface User {
  id: string;
  name: string;
  avatar: string; // Initials or URL
  department: DepartmentType;
  pin: string; 
  xp: number;
  completedCourses: string[];
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

export interface Course {
  id: string;
  title: string;
  steps: CourseStep[];
}