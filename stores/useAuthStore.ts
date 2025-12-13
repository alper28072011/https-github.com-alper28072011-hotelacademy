import { create } from 'zustand';

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
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
            setTimeout(() => {
                set({ stage: 'SUCCESS' });
            }, 300);
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
  }
}));