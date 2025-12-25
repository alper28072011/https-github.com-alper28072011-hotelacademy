
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode, ActiveContext, UserRole, PageRole } from '../types';
import { logoutUser } from '../services/authService';
import { getUserById } from '../services/db';
import { useContextStore } from './useContextStore'; // Import Context Store

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;
  
  // Actions
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
        // Ensure social fields exist
        const sanitizedUser: User = {
            ...user,
            followers: user.followers || [],
            following: user.following || [],
            followedPageIds: user.followedPageIds || [],
            channelSubscriptions: user.channelSubscriptions || [],
            managedPageIds: user.managedPageIds || [],
            // CRITICAL: On login, always reset to null org ID for the session to enforce Personal Mode start
            currentOrganizationId: null 
        };
        
        // Force Context Store to Personal
        useContextStore.getState().switchToPersonal(sanitizedUser);

        set({ 
          isAuthenticated: true, 
          currentUser: sanitizedUser,
          isLoading: false,
          error: null
        });
      },

      updateCurrentUser: (updates) => {
          const { currentUser } = get();
          if (currentUser) {
              const updatedUser = { ...currentUser, ...updates };
              set({ currentUser: updatedUser });
              
              // If we are updating name/avatar, sync with context if context is PERSONAL
              const contextState = useContextStore.getState();
              if (contextState.contextType === 'PERSONAL') {
                  contextState.switchToPersonal(updatedUser);
              }
          }
      },

      logout: async () => {
        try {
          await logoutUser();
        } catch (e) {
          console.error("Logout error", e);
        }
        localStorage.clear();
        useContextStore.getState().switchToPersonal({} as User); // Reset context
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
                  // Keep current session flags (like currentOrg) if needed, but here we update profile data
                  // We do NOT use loginSuccess here to avoid resetting context mid-session
                  set({ currentUser: { ...currentUser, ...refreshedUser } });
              }
          } catch (e) {
              console.error("Auto-refresh profile failed:", e);
          }
      }
    }),
    {
      name: 'hotel-academy-auth-v7', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser
      }),
    }
  )
);
