
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AppContextType } from '../types';

interface ContextState {
  // Durum (State)
  contextType: AppContextType;
  activeEntityId: string | null; // User ID (Personal) or Organization ID
  activeEntityName: string;
  activeEntityAvatar: string;
  
  // Eylemler (Actions)
  switchToPersonal: (user: User) => void;
  switchToOrganization: (orgId: string, orgName: string, orgAvatar: string) => void;
  ensureContext: (user: User) => void; // Hydration sonrası güvenli liman kontrolü
  resetContext: () => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      contextType: 'PERSONAL',
      activeEntityId: null,
      activeEntityName: '',
      activeEntityAvatar: '',

      switchToPersonal: (user) => {
        console.log("[Context] Switching to PERSONAL mode");
        set({
          contextType: 'PERSONAL',
          activeEntityId: user.id,
          activeEntityName: user.name,
          activeEntityAvatar: user.avatar || ''
        });
      },

      switchToOrganization: (orgId, orgName, orgAvatar) => {
        console.log(`[Context] Switching to ORGANIZATION mode: ${orgName}`);
        set({
          contextType: 'ORGANIZATION',
          activeEntityId: orgId,
          activeEntityName: orgName,
          activeEntityAvatar: orgAvatar
        });
      },

      ensureContext: (user) => {
          const { activeEntityId } = get();
          // Eğer aktif bir entity yoksa veya veri bozulmuşsa Bireysele dön
          if (!activeEntityId) {
              get().switchToPersonal(user);
          }
      },
      
      resetContext: () => set({
        contextType: 'PERSONAL',
        activeEntityId: null,
        activeEntityName: '',
        activeEntityAvatar: ''
      }),
    }),
    {
      name: 'hotel-academy-context-v2', // Versiyonu güncelledik
      storage: createJSONStorage(() => localStorage),
    }
  )
);
