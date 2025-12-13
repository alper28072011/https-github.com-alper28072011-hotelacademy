import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AuthStage = 'DEPARTMENT_SELECT' | 'USER_SELECT' | 'PIN_ENTRY' | 'SUCCESS';
export type DepartmentType = 'housekeeping' | 'kitchen' | 'front_office' | 'management';

export interface User {
  id: string;
  name: string;
  avatar: string; // Initials or URL
  department: DepartmentType;
  pin: string; // Mock PIN for demo
}

// Mock Data
export const MOCK_USERS: User[] = [
  { id: '1', name: 'Ayşe Yılmaz', avatar: 'AY', department: 'housekeeping', pin: '1234' },
  { id: '2', name: 'Fatma Demir', avatar: 'FD', department: 'housekeeping', pin: '1234' },
  { id: '3', name: 'Mehmet Öztürk', avatar: 'MÖ', department: 'kitchen', pin: '1234' },
  { id: '4', name: 'Canan Kaya', avatar: 'CK', department: 'front_office', pin: '1234' },
  { id: '5', name: 'Ahmet Yildiz', avatar: 'AY', department: 'management', pin: '1234' },
];

interface AuthState {
  // Session State
  isAuthenticated: boolean;
  currentUser: User | null;

  // Login Process State
  stage: AuthStage;
  selectedDepartment: DepartmentType | null;
  selectedUser: User | null;
  enteredPin: string;
  error: boolean;
  
  // Actions
  setDepartment: (dept: DepartmentType) => void;
  setUser: (user: User) => void;
  appendPin: (digit: string) => void;
  deletePin: () => void;
  resetFlow: () => void;
  goBack: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      
      stage: 'DEPARTMENT_SELECT',
      selectedDepartment: null,
      selectedUser: null,
      enteredPin: '',
      error: false,

      setDepartment: (dept) => set({ 
        selectedDepartment: dept, 
        stage: 'USER_SELECT',
        error: false 
      }),

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
          set({ stage: 'DEPARTMENT_SELECT', selectedDepartment: null });
        } else if (stage === 'PIN_ENTRY') {
          set({ stage: 'USER_SELECT', selectedUser: null, enteredPin: '' });
        }
      },

      logout: () => set({
        isAuthenticated: false,
        currentUser: null,
        stage: 'DEPARTMENT_SELECT',
        selectedDepartment: null,
        selectedUser: null,
        enteredPin: ''
      })
    }),
    {
      name: 'hotel-academy-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        currentUser: state.currentUser 
      }), // Only persist authentication state
    }
  )
);