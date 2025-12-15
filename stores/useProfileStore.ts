import { create } from 'zustand';
import { User, DepartmentType } from '../types';
import { subscribeToUser, subscribeToLeaderboard } from '../services/db';

interface ProfileState {
  userProfile: User | null;
  leaderboard: User[];
  loading: boolean;
  
  // Actions
  initializeListeners: (userId: string, department: DepartmentType, orgId: string) => () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  userProfile: null,
  leaderboard: [],
  loading: true,

  initializeListeners: (userId, department, orgId) => {
    set({ loading: true });

    // 1. Subscribe to User Data (for XP updates)
    const unsubscribeUser = subscribeToUser(userId, (user) => {
      set({ userProfile: user });
    });

    // 2. Subscribe to Leaderboard
    const unsubscribeLeaderboard = subscribeToLeaderboard(department, orgId, (users) => {
      set({ leaderboard: users, loading: false });
    });

    // Return a cleanup function that calls both unsubscribe methods
    return () => {
        unsubscribeUser();
        unsubscribeLeaderboard();
    };
  }
}));