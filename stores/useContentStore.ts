import { create } from 'zustand';
import { Course, Category } from '../types';
import { getCourses, getCategories } from '../services/db';

interface ContentState {
  courses: Course[];
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;

  // Actions
  fetchContent: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  
  // Computed (handled via getter logic in components usually, but simple helpers here)
  getFeaturedCourse: () => Course | undefined;
  getCoursesByCategory: (catId: string) => Course[];
}

export const useContentStore = create<ContentState>((set, get) => ({
  courses: [],
  categories: [],
  isLoading: false,
  searchQuery: '',

  fetchContent: async () => {
    set({ isLoading: true });
    // Fetch in parallel
    const [courses, categories] = await Promise.all([getCourses(), getCategories()]);
    set({ courses, categories, isLoading: false });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFeaturedCourse: () => {
    return get().courses.find(c => c.isFeatured);
  },

  getCoursesByCategory: (catId) => {
    return get().courses.filter(c => c.categoryId === catId);
  }
}));