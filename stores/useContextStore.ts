
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppContextType, User } from '../types';

interface ContextState {
  contextType: AppContextType;
  activeEntityId: string | null; // Null means "Self" in PERSONAL mode context (or explicit user ID)
  activeEntityName: string;
  activeEntityAvatar: string;
  
  // Actions
  switchToPersonal: (user: User) => void;
  switchToOrganization: (orgId: string, orgName: string, avatar: string) => void;
  
  // Helper to ensure context integrity
  ensureContext: (user: User) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      contextType: 'PERSONAL',
      activeEntityId: null,
      activeEntityName: '',
      activeEntityAvatar: '',

      switchToPersonal: (user: User) => {
          console.log("[Context] Switching to PERSONAL mode");
          set({
              contextType: 'PERSONAL',
              activeEntityId: user.id,
              activeEntityName: user.name,
              activeEntityAvatar: user.avatar
          });
      },

      switchToOrganization: (orgId: string, orgName: string, avatar: string) => {
          console.log(`[Context] Switching to ORGANIZATION mode: ${orgName}`);
          set({
              contextType: 'ORGANIZATION',
              activeEntityId: orgId,
              activeEntityName: orgName,
              activeEntityAvatar: avatar
          });
      },

      ensureContext: (user: User) => {
          const { activeEntityId } = get();
          // If no active entity is set, default to Personal
          if (!activeEntityId) {
              get().switchToPersonal(user);
          }
      }
    }),
    {
      name: 'hotel-academy-context-v1', // Separate from auth store
      storage: createJSONStorage(() => localStorage),
    }
  )
);
