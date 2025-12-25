
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode } from '../types';
import { logoutUser } from '../services/authService';
import { getUserById } from '../services/db';
import { useContextStore } from './useContextStore';

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
        // 1. Kullanıcı verisini temizle/hazırla
        const sanitizedUser: User = {
            ...user,
            followers: user.followers || [],
            following: user.following || [],
            followedPageIds: user.followedPageIds || [],
            channelSubscriptions: user.channelSubscriptions || [],
            managedPageIds: user.managedPageIds || [],
            currentOrganizationId: null // Login'de her zaman sıfırla
        };
        
        // 2. CONTEXT'i Zorla "PERSONAL" Yap
        // Bu işlem UI'ın admin modunda açılmasını engeller.
        // FIX: Pass individual arguments instead of the user object
        useContextStore.getState().switchToPersonal(
            sanitizedUser.id,
            sanitizedUser.name,
            sanitizedUser.avatar
        );

        // 3. Store'u Güncelle
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
              
              // Profil güncellenirse Context'i de güncelle (Eğer Bireysel Moddaysak)
              const contextState = useContextStore.getState();
              if (contextState.contextType === 'PERSONAL') {
                  contextState.switchToPersonal(
                      updatedUser.id,
                      updatedUser.name,
                      updatedUser.avatar
                  );
              }
          }
      },

      logout: async () => {
        try {
          await logoutUser();
        } catch (e) {
          console.error("Logout error", e);
        }
        localStorage.clear(); // Tam temizlik
        // useContextStore usually has a reset or we can force personal with dummy data to clear, 
        // but since we cleared localStorage, it should be fine on reload. 
        // However, explicit reset is safer if we implemented it.
        // Since we removed resetContext from useContextStore in the Unbreakable update, we rely on page reload or store reset.
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
