
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode } from '../types';
import { logoutUser, loginUser } from '../services/authService';
import { getUserById } from '../services/db';
import { useContextStore } from './useContextStore';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;
  
  // Legacy / Wizard Props
  stage: 'DEPARTMENT_SELECT' | 'PIN_ENTRY' | 'SUCCESS';
  enteredPin: string;
  department: string | null;

  // Actions
  setAuthMode: (mode: AuthMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  loginSuccess: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  
  // Legacy Actions
  setDepartment: (dept: string) => void;
  appendPin: (digit: string) => void;
  deletePin: () => void;
  goBack: () => void;
  loginAsAdmin: (email: string, pass: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      authMode: 'LOGIN',
      isLoading: false,
      error: null,
      
      // Default wizard state
      stage: 'DEPARTMENT_SELECT',
      enteredPin: '',
      department: null,

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
        set({
          isAuthenticated: false,
          currentUser: null,
          error: null,
          stage: 'DEPARTMENT_SELECT',
          enteredPin: '',
          department: null
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
      },

      // --- Legacy Wizard Actions ---
      setDepartment: (dept) => set({ department: dept, stage: 'PIN_ENTRY', enteredPin: '' }),
      appendPin: (digit) => set(state => ({ enteredPin: state.enteredPin + digit })),
      deletePin: () => set(state => ({ enteredPin: state.enteredPin.slice(0, -1) })),
      goBack: () => set(state => {
          if (state.stage === 'PIN_ENTRY') return { stage: 'DEPARTMENT_SELECT', enteredPin: '', department: null };
          return {};
      }),
      loginAsAdmin: async (email, pass) => {
          set({ isLoading: true, error: null });
          try {
              const user = await loginUser(email, pass);
              get().loginSuccess(user);
          } catch (e: any) {
              set({ error: e.message || 'Login failed', isLoading: false });
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