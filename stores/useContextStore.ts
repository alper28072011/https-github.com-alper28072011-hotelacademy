
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AppContextType } from '../types';

interface ContextState {
  contextType: AppContextType;
  activeEntityId: string | null;
  activeEntityName: string;
  activeEntityAvatar: string;
  
  // Actions
  setContext: (type: AppContextType, id: string | null, name: string, avatar: string) => void;
  resetContext: () => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      contextType: 'PERSONAL',
      activeEntityId: null,
      activeEntityName: '',
      activeEntityAvatar: '',

      setContext: (type, id, name, avatar) => {
        set({
          contextType: type,
          activeEntityId: id,
          activeEntityName: name,
          activeEntityAvatar: avatar
        });
      },
      
      resetContext: () => set({
        contextType: 'PERSONAL',
        activeEntityId: null,
        activeEntityName: '',
        activeEntityAvatar: ''
      }),
    }),
    {
      name: 'hotel-academy-context-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
