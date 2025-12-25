
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ContextType = 'PERSONAL' | 'ORGANIZATION';

interface ContextState {
  contextType: ContextType;
  activeEntityId: string | null;
  activeEntityName: string | null;
  activeEntityAvatar: string | null;
  activeEntityRole: string | null;
  isHydrated: boolean; // Storage'dan veri okundu mu?

  switchToPersonal: (userId: string, userName: string, userAvatar: string) => void;
  switchToOrganization: (orgId: string, orgName: string, orgAvatar: string, role: string) => void;
  setHydrated: () => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      contextType: 'PERSONAL',
      activeEntityId: null,
      activeEntityName: null,
      activeEntityAvatar: null,
      activeEntityRole: null,
      isHydrated: false,

      switchToPersonal: (userId, userName, userAvatar) => set({
        contextType: 'PERSONAL',
        activeEntityId: userId,
        activeEntityName: userName,
        activeEntityAvatar: userAvatar,
        activeEntityRole: null
      }),

      switchToOrganization: (orgId, orgName, orgAvatar, role) => set({
        contextType: 'ORGANIZATION',
        activeEntityId: orgId,
        activeEntityName: orgName,
        activeEntityAvatar: orgAvatar,
        activeEntityRole: role
      }),
      
      setHydrated: () => set({ isHydrated: true })
    }),
    {
      name: 'app-context-stable',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);
