import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, DepartmentType } from '../types';
import { getDailyTasks, completeTask } from '../services/db';

interface OperationsState {
  tasks: Task[];
  isLoading: boolean;
  // Shift State
  isShiftActive: boolean;
  shiftStartTime: number | null; // Timestamp
  
  // Actions
  fetchTasks: (dept: DepartmentType) => Promise<void>;
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

      fetchTasks: async (dept) => {
        set({ isLoading: true });
        const tasks = await getDailyTasks(dept);
        set({ tasks, isLoading: false });
      },

      markTaskComplete: async (userId, taskId, xp) => {
        // Optimistic update handled in UI mostly, but here we trigger DB
        await completeTask(userId, taskId, xp);
      },

      toggleShift: () => {
        const { isShiftActive } = get();
        if (isShiftActive) {
            // Clock Out
            set({ isShiftActive: false, shiftStartTime: null });
        } else {
            // Clock In
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