
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, User, DepartmentType, UserRole, Channel } from '../types';
import { getOrganizationDetails, getMyMemberships, switchUserActiveOrganization } from '../services/db';
import { useAuthStore } from './useAuthStore';
import { useContextStore } from './useContextStore';

interface OrganizationState {
  currentOrganization: Organization | null;
  myMemberships: Membership[];
  isLoading: boolean;

  // Actions
  fetchMemberships: (userId: string) => Promise<void>;
  
  // ATOMIC SWITCHERS
  switchToOrganizationAction: (orgId: string) => Promise<boolean>;
  switchToPersonalAction: () => Promise<void>;
  
  // Optimistic UI Actions
  addLocalChannel: (channel: Channel) => void;
  removeLocalChannel: (channelId: string) => void;
  
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      currentOrganization: null,
      myMemberships: [],
      isLoading: false,

      fetchMemberships: async (userId: string) => {
        set({ isLoading: true });
        const memberships = await getMyMemberships(userId);
        set({ myMemberships: memberships, isLoading: false });
      },

      /**
       * MASTER SWITCH: PERSONAL -> ORGANIZATION
       */
      switchToOrganizationAction: async (orgId: string): Promise<boolean> => {
        set({ isLoading: true });
        
        const authStore = useAuthStore.getState();
        const contextStore = useContextStore.getState();
        const currentUser = authStore.currentUser;

        if (!currentUser) {
            set({ isLoading: false });
            return false;
        }

        try {
            console.log(`[Switch] Initializing Organization Mode: ${orgId}`);

            // 1. Fetch Fresh Data
            const org = await getOrganizationDetails(orgId);
            if (!org) {
                console.error("[Switch] Organization not found.");
                set({ isLoading: false });
                return false;
            }

            // 2. Determine Role & Context
            let role: UserRole = 'staff';
            let dept: DepartmentType = 'housekeeping';
            let pageRole = 'MEMBER';

            if (org.ownerId === currentUser.id) {
                role = 'manager';
                dept = 'management';
                pageRole = 'ADMIN';
            } else {
                let membership = get().myMemberships.find(m => m.organizationId === orgId);
                if (!membership) {
                    const freshMemberships = await getMyMemberships(currentUser.id);
                    set({ myMemberships: freshMemberships });
                    membership = freshMemberships.find(m => m.organizationId === orgId);
                }

                if (membership) {
                    pageRole = membership.role;
                    if (membership.role === 'ADMIN') role = 'manager';
                    else if (membership.role === 'MODERATOR') role = 'manager';
                    else role = 'staff';
                    dept = membership.department;
                } else {
                    console.error("[Switch] No membership found.");
                    set({ isLoading: false });
                    return false;
                }
            }

            // 3. Update DB (Session Persistence)
            // We fire this but don't await strictly if we want speed, but for safety we await
            await switchUserActiveOrganization(currentUser.id, orgId);

            // 4. ATOMIC STORE UPDATES
            // A. Set Org Data
            set({ currentOrganization: org, isLoading: false });

            // B. Update Context (Visuals)
            contextStore.switchToOrganization(org.id, org.name, org.logoUrl);

            // C. Update Auth User (Permissions/Role)
            authStore.updateCurrentUser({
                currentOrganizationId: orgId,
                role: role,
                department: dept,
                pageRoles: { 
                    ...currentUser.pageRoles, 
                    [orgId]: { role: pageRole as any, title: role === 'manager' ? 'Yönetici' : 'Personel' } 
                }
            });

            return true;

        } catch (e) {
            console.error("[Switch] Error:", e);
            set({ isLoading: false });
            return false;
        }
      },

      /**
       * MASTER SWITCH: ORGANIZATION -> PERSONAL
       */
      switchToPersonalAction: async () => {
          set({ isLoading: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (!currentUser) return;

          console.log("[Switch] Reverting to Personal Mode");

          // 1. Update DB (Clear Active Org)
          await switchUserActiveOrganization(currentUser.id, '');

          // 2. Clear Org Store
          set({ currentOrganization: null, isLoading: false });

          // 3. Reset Context (Visuals)
          contextStore.switchToPersonal(currentUser);

          // 4. Reset User State (Permissions)
          authStore.updateCurrentUser({
              currentOrganizationId: null,
              role: 'staff', // Default personal role
              department: null
          });
      },

      addLocalChannel: (channel: Channel) => set((state) => {
          if (!state.currentOrganization) return {};
          return {
              currentOrganization: {
                  ...state.currentOrganization,
                  channels: [channel, ...(state.currentOrganization.channels || [])]
              }
          };
      }),

      removeLocalChannel: (channelId: string) => set((state) => {
          if (!state.currentOrganization) return {};
          return {
              currentOrganization: {
                  ...state.currentOrganization,
                  channels: (state.currentOrganization.channels || []).filter(c => c.id !== channelId)
              }
          };
      }),

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
