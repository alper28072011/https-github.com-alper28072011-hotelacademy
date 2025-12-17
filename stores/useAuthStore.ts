
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthMode } from '../types';
import { logoutUser } from '../services/authService';

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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      authMode: 'LOGIN',
      isLoading: false,
      error: null,

      setAuthMode: (mode) => set({ authMode: mode, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      loginSuccess: (user) => {
        set({ 
          isAuthenticated: true, 
          currentUser: user,
          isLoading: false,
          error: null,
        });
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
    }),
    {
      name: 'hotel-academy-auth-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser 
      }),
    }
  )
);
