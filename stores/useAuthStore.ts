
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode } from '../types';
import { logoutUser } from '../services/authService';
import { getUserById } from '../services/db';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;

  setAuthMode: (mode: AuthMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  loginSuccess: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      authMode: 'LOGIN',
      isLoading: false,
      error: null,

      setAuthMode: (mode) => set({ authMode: mode, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      loginSuccess: (user) => {
        // Ensure social fields exist if they come undefined from legacy DB
        const sanitizedUser: User = {
            ...user,
            followers: user.followers || [],
            following: user.following || [],
            followedPageIds: user.followedPageIds || [],
            channelSubscriptions: user.channelSubscriptions || [],
            managedPageIds: user.managedPageIds || []
        };
        
        set({ 
          isAuthenticated: true, 
          currentUser: sanitizedUser,
          isLoading: false,
          error: null,
        });
      },

      updateCurrentUser: (updates) => {
          const { currentUser } = get();
          if (currentUser) {
              set({ currentUser: { ...currentUser, ...updates } });
          }
      },

      logout: async () => {
        try {
          await logoutUser();
        } catch (e) {
          console.error("Logout error", e);
        }
        localStorage.clear();
        set({
          isAuthenticated: false,
          currentUser: null,
          error: null
        });
        window.location.href = '/';
      },

      refreshProfile: async () => {
          const { currentUser } = get();
          if (!currentUser) return;
          try {
              const refreshedUser = await getUserById(currentUser.id);
              if (refreshedUser) {
                  get().loginSuccess(refreshedUser);
              }
          } catch (e) {
              console.error("Auto-refresh profile failed:", e);
          }
      }
    }),
    {
      name: 'hotel-academy-auth-v5', // Bump version to clear old cache
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser 
      }),
    }
  )
);
