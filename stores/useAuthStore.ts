import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, DepartmentType } from '../types';
import { getUsersByDepartment } from '../services/db';
import { loginWithEmail, logoutUser } from '../services/authService';

export type AuthStage = 'DEPARTMENT_SELECT' | 'USER_SELECT' | 'PIN_ENTRY' | 'SUCCESS';

interface AuthState {
  // Session State
  isAuthenticated: boolean;
  currentUser: User | null;

  // Login Process State
  stage: AuthStage;
  selectedDepartment: DepartmentType | null;
  departmentUsers: User[]; // Users fetched from DB
  selectedUser: User | null;
  enteredPin: string;
  error: boolean;
  isLoading: boolean;
  
  // Actions
  setDepartment: (dept: DepartmentType) => void;
  setUser: (user: User) => void;
  appendPin: (digit: string) => void;
  deletePin: () => void;
  resetFlow: () => void;
  goBack: () => void;
  logout: () => void;
  
  // Admin Actions
  loginAsAdmin: (email: string, pass: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      
      stage: 'DEPARTMENT_SELECT',
      selectedDepartment: null,
      departmentUsers: [],
      selectedUser: null,
      enteredPin: '',
      error: false,
      isLoading: false,

      setDepartment: async (dept) => {
        set({ isLoading: true, error: false });
        
        // Fetch users from Firestore
        const users = await getUsersByDepartment(dept);
        
        set({ 
          selectedDepartment: dept, 
          departmentUsers: users,
          stage: 'USER_SELECT',
          isLoading: false
        });
      },

      setUser: (user) => set({ 
        selectedUser: user, 
        stage: 'PIN_ENTRY', 
        enteredPin: '',
        error: false 
      }),

      appendPin: (digit) => {
        const { enteredPin, selectedUser } = get();
        if (enteredPin.length >= 4) return;

        const newPin = enteredPin + digit;
        set({ enteredPin: newPin, error: false });

        // Check PIN immediately when length is 4
        if (newPin.length === 4) {
            // In this Kiosk-mode, we check against the loaded user object
            // for instant feedback without network latency.
            if (newPin === selectedUser?.pin) {
                // Success
                set({ stage: 'SUCCESS' });
                
                // Transition to Authenticated State after animation
                setTimeout(() => {
                  set({ 
                    isAuthenticated: true, 
                    currentUser: selectedUser,
                    // Reset login flow for next time
                    stage: 'DEPARTMENT_SELECT',
                    selectedDepartment: null,
                    departmentUsers: [],
                    selectedUser: null,
                    enteredPin: ''
                  });
                }, 1500); // Wait for the checkmark animation
            } else {
                // Error handling with small delay for UX
                setTimeout(() => {
                    set({ error: true, enteredPin: '' });
                }, 300);
            }
        }
      },

      deletePin: () => set((state) => ({ 
        enteredPin: state.enteredPin.slice(0, -1),
        error: false 
      })),

      resetFlow: () => set({ 
        stage: 'DEPARTMENT_SELECT', 
        selectedDepartment: null, 
        selectedUser: null, 
        enteredPin: '',
        error: false
      }),

      goBack: () => {
        const { stage } = get();
        if (stage === 'USER_SELECT') {
          set({ stage: 'DEPARTMENT_SELECT', selectedDepartment: null, departmentUsers: [] });
        } else if (stage === 'PIN_ENTRY') {
          set({ stage: 'USER_SELECT', selectedUser: null, enteredPin: '' });
        }
      },

      loginAsAdmin: async (email, password) => {
          set({ isLoading: true, error: false });
          try {
              const user = await loginWithEmail(email, password);
              
              if (user.role === 'manager' || user.role === 'admin') {
                  set({ 
                      isAuthenticated: true, 
                      currentUser: user,
                      isLoading: false 
                  });
                  return true;
              } else {
                  console.error("Role mismatch. User is:", user.role);
                  throw new Error("Unauthorized access: User is not an admin/manager.");
              }
          } catch (e: any) {
              console.error("Login Failed in Store:", e.message);
              set({ error: true, isLoading: false });
              return false;
          }
      },

      logout: () => {
        logoutUser(); // Firebase SignOut
        set({
            isAuthenticated: false,
            currentUser: null,
            stage: 'DEPARTMENT_SELECT',
            selectedDepartment: null,
            selectedUser: null,
            enteredPin: ''
        });
      }
    }),
    {
      name: 'hotel-academy-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser 
      }),
    }
  )
);