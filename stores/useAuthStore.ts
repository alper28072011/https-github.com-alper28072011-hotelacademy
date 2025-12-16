
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, DepartmentType, AuthMode } from '../types';
import { logoutUser } from '../services/authService';

export type AuthStep = 'PHONE' | 'OTP' | 'PROFILE_SETUP' | 'SUCCESS';

interface AuthState {
  // Session State
  isAuthenticated: boolean;
  currentUser: User | null;

  // Login Flow State
  authMode: AuthMode;
  step: AuthStep;
  phoneNumber: string;
  verificationId: string | null; // From Firebase
  isLoading: boolean;
  error: string | null;
  
  // Rate Limiting (Bot Protection)
  smsAttempts: number;
  lastSmsTime: number;
  cooldownUntil: number;

  // Actions
  setAuthMode: (mode: AuthMode) => void;
  setStep: (step: AuthStep) => void;
  setPhoneNumber: (phone: string) => void;
  setVerificationId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  loginSuccess: (user: User) => void;
  logout: () => void;
  resetFlow: () => void;
  
  // Rate Limit Actions
  recordSmsAttempt: () => boolean; // Returns true if allowed, false if blocked
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      
      authMode: 'LOGIN',
      step: 'PHONE',
      phoneNumber: '',
      verificationId: null,
      isLoading: false,
      error: null,

      // Rate Limiting Defaults
      smsAttempts: 0,
      lastSmsTime: 0,
      cooldownUntil: 0,

      setAuthMode: (mode) => set({ authMode: mode, error: null }),
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
              error: null,
              smsAttempts: 0,
              cooldownUntil: 0
          });
      },

      logout: async () => {
        try {
            await logoutUser(); // Firebase SignOut
        } catch (e) {
            console.error("Firebase logout error", e);
        }

        // 1. NUCLEAR OPTION: Clear Entire LocalStorage
        // This ensures no stale state from any store (Auth, Org, Profile, etc.) remains.
        localStorage.clear();

        // 2. Reset State in Memory (Visual feedback before reload)
        set({
            isAuthenticated: false,
            currentUser: null,
            step: 'PHONE',
            phoneNumber: '',
            verificationId: null
        });

        // 3. HARD RELOAD (Critical for Security)
        // Forces browser to clear memory and reload the app from scratch.
        window.location.href = '/';
      },

      resetFlow: () => set({
          step: 'PHONE',
          phoneNumber: '',
          verificationId: null,
          error: null,
          isLoading: false
      }),

      recordSmsAttempt: () => {
          const now = Date.now();
          const { smsAttempts, lastSmsTime, cooldownUntil } = get();

          // Check if in cooldown
          if (now < cooldownUntil) {
              return false;
          }

          // Reset window if it's been more than 5 minutes since last attempt
          if (now - lastSmsTime > 5 * 60 * 1000) {
              set({ smsAttempts: 1, lastSmsTime: now });
              return true;
          }

          // Check attempts in current window
          if (smsAttempts >= 3) {
              // Trigger cooldown (5 minutes)
              set({ cooldownUntil: now + 5 * 60 * 1000, smsAttempts: 0 });
              return false;
          }

          set({ smsAttempts: smsAttempts + 1, lastSmsTime: now });
          return true;
      }
    }),
    {
      name: 'hotel-academy-auth-v3', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser,
        // Persist rate limiting to prevent refresh bypass
        smsAttempts: state.smsAttempts,
        lastSmsTime: state.lastSmsTime,
        cooldownUntil: state.cooldownUntil
      }),
    }
  )
);
