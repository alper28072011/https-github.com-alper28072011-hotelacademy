
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, DepartmentType } from '../types';
import { getDailyTasks, completeTask } from '../services/db';

interface OperationsState {
  tasks: Task[];
  isLoading: boolean;
  // Shift State
  isShiftActive: boolean;
  shiftStartTime: number | null; 
  
  // Actions
  fetchTasks: (dept: DepartmentType, orgId: string) => Promise<void>;
  markTaskComplete: (userId: string, taskId: string, xp: number) => Promise<void>;
  toggleShift: () => void;
}

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      isShiftActive: false,
      shiftStartTime: null,

      fetchTasks: async (dept, orgId) => {
        set({ isLoading: true });
        const tasks = await getDailyTasks(dept, orgId);
        set({ tasks, isLoading: false });
      },

      markTaskComplete: async (userId, taskId, xp) => {
        await completeTask(userId, taskId, xp);
      },

      toggleShift: () => {
        const { isShiftActive } = get();
        if (isShiftActive) {
            set({ isShiftActive: false, shiftStartTime: null });
        } else {
            set({ isShiftActive: true, shiftStartTime: Date.now() });
        }
      }
    }),
    {
      name: 'hotel-academy-operations',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
