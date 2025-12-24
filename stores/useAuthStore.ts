
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode, ActiveContext, UserRole, PageRole } from '../types';
import { logoutUser } from '../services/authService';
import { getUserById } from '../services/db';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;
  
  // CONTEXT MANAGEMENT
  activeContext: ActiveContext | null; // Who am I acting as?

  setAuthMode: (mode: AuthMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  loginSuccess: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  
  // Context Actions
  switchContext: (context: ActiveContext) => void;
  resetContext: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      authMode: 'LOGIN',
      isLoading: false,
      error: null,
      activeContext: null,

      setAuthMode: (mode) => set({ authMode: mode, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      loginSuccess: (user) => {
        // Ensure social fields exist
        const sanitizedUser: User = {
            ...user,
            followers: user.followers || [],
            following: user.following || [],
            followedPageIds: user.followedPageIds || [],
            channelSubscriptions: user.channelSubscriptions || [],
            managedPageIds: user.managedPageIds || []
        };
        
        // Default Context = Self
        const defaultContext: ActiveContext = {
            id: user.id,
            type: 'USER',
            role: user.role,
            name: user.name,
            avatar: user.avatar
        };

        set({ 
          isAuthenticated: true, 
          currentUser: sanitizedUser,
          isLoading: false,
          error: null,
          activeContext: defaultContext
        });
      },

      updateCurrentUser: (updates) => {
          const { currentUser, activeContext } = get();
          if (currentUser) {
              const updatedUser = { ...currentUser, ...updates };
              // If context was self, update it too
              let newContext = activeContext;
              if (activeContext?.id === currentUser.id && activeContext.type === 'USER') {
                  newContext = {
                      ...activeContext,
                      name: updates.name || activeContext.name,
                      avatar: updates.avatar || activeContext.avatar
                  };
              }
              set({ currentUser: updatedUser, activeContext: newContext });
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
          error: null,
          activeContext: null
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
      },

      switchContext: (context) => {
          console.log("Switching context to:", context.name);
          set({ activeContext: context });
      },

      resetContext: () => {
          const { currentUser } = get();
          if (currentUser) {
              set({
                  activeContext: {
                      id: currentUser.id,
                      type: 'USER',
                      role: currentUser.role,
                      name: currentUser.name,
                      avatar: currentUser.avatar
                  }
              });
          }
      }
    }),
    {
      name: 'hotel-academy-auth-v6', // Bump version for new structure
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser,
        activeContext: state.activeContext // Persist context state
      }),
    }
  )
);
