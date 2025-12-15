
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, DepartmentType } from '../types';
import { logoutUser } from '../services/authService';

export type AuthStep = 'PHONE' | 'OTP' | 'PROFILE_SETUP' | 'SUCCESS';

interface AuthState {
  // Session State
  isAuthenticated: boolean;
  currentUser: User | null;

  // Login Flow State
  step: AuthStep;
  phoneNumber: string;
  verificationId: string | null; // From Firebase
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: AuthStep) => void;
  setPhoneNumber: (phone: string) => void;
  setVerificationId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  loginSuccess: (user: User) => void;
  logout: () => void;
  resetFlow: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      
      step: 'PHONE',
      phoneNumber: '',
      verificationId: null,
      isLoading: false,
      error: null,

      setStep: (step) => set({ step, error: null }),
      
      setPhoneNumber: (phoneNumber) => set({ phoneNumber, error: null }),
      
      setVerificationId: (verificationId) => set({ verificationId }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error, isLoading: false }),

      loginSuccess: (user) => {
          set({ 
              isAuthenticated: true, 
              currentUser: user,
              step: 'SUCCESS',
              isLoading: false,
              error: null
          });
      },

      logout: () => {
        logoutUser(); // Firebase SignOut
        set({
            isAuthenticated: false,
            currentUser: null,
            step: 'PHONE',
            phoneNumber: '',
            verificationId: null
        });
      },

      resetFlow: () => set({
          step: 'PHONE',
          phoneNumber: '',
          verificationId: null,
          error: null,
          isLoading: false
      })
    }),
    {
      name: 'hotel-academy-auth-v2', // Versioned to clear old cache
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser 
      }),
    }
  )
);
