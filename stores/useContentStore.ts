
import { create } from 'zustand';
import { Course, Category, User } from '../types';
import { getCourses, getCategories } from '../services/db';
import { useOrganizationStore } from './useOrganizationStore';

interface ExploreFeed {
    priority: Course[]; 
    trending: Course[]; 
    discovery: Course[]; 
}

interface ContentState {
  courses: Course[];
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;

  // Actions
  fetchContent: (orgId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  
  // Computed
  getFeaturedCourse: () => Course | undefined;
  getCoursesByCategory: (catId: string) => Course[];
  getExploreFeed: (user: User) => ExploreFeed;
}

export const useContentStore = create<ContentState>((set, get) => ({
  courses: [],
  categories: [],
  isLoading: false,
  searchQuery: '',

  fetchContent: async (orgId: string) => {
    set({ isLoading: true });
    // Pass orgId to getCourses to fetch Global + Org Specific courses
    const [courses, categories] = await Promise.all([getCourses(orgId), getCategories()]);
    set({ courses, categories, isLoading: false });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFeaturedCourse: () => {
    return get().courses.find(c => c.isFeatured);
  },

  getCoursesByCategory: (catId) => {
    return get().courses.filter(c => c.categoryId === catId);
  },

  getExploreFeed: (user: User) => {
      const allCourses = get().courses;
      
      const priority = allCourses.filter(c => {
          const isAssigned = c.assignmentType === 'GLOBAL' || (c.assignmentType === 'DEPARTMENT' && c.targetDepartments?.includes(user.department));
          const isNotCompleted = !user.completedCourses.includes(c.id);
          const isOnboarding = c.categoryId === 'cat_onboarding';
          return (isAssigned && isNotCompleted) || (isOnboarding && isNotCompleted);
      }).sort((a, b) => (b.priority === 'HIGH' ? 1 : 0) - (a.priority === 'HIGH' ? 1 : 0)); 

      const trending = allCourses.filter(c => {
          const inPriority = priority.find(p => p.id === c.id);
          const isPopular = (c.popularityScore || 0) > 70;
          return !inPriority && isPopular;
      }).sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

      const discovery = allCourses.filter(c => {
          const inPriority = priority.find(p => p.id === c.id);
          const inTrending = trending.find(t => t.id === c.id);
          return !inPriority && !inTrending;
      }).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

      return { priority, trending, discovery };
  }
}));
