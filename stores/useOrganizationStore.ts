
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, UserRole, DepartmentType, Channel, PageRole } from '../types';
import { getOrganizationDetails, getMyMemberships, switchUserActiveOrganization } from '../services/db';
import { useAuthStore } from './useAuthStore';
import { useContextStore } from './useContextStore';

interface OrganizationState {
  currentOrganization: Organization | null;
  myMemberships: Membership[];
  isLoading: boolean;

  // Actions
  fetchMemberships: (userId: string) => Promise<void>;
  
  // THE ATOMIC SWITCHER
  switchOrganization: (orgId: string) => Promise<boolean>;
  switchToPersonal: () => Promise<void>;
  
  // UI Helpers
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
        // Silent fetch
        const memberships = await getMyMemberships(userId);
        set({ myMemberships: memberships });
      },

      /**
       * ATOMIC SWITCH: Ensures data is loaded BEFORE navigation happens.
       * This prevents "White Screen" or "Ghost UI".
       */
      switchOrganization: async (orgId: string): Promise<boolean> => {
          set({ isLoading: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (!currentUser) {
              set({ isLoading: false });
              return false;
          }

          try {
              console.log(`[Switch] Starting switch to Org: ${orgId}`);
              
              // 1. Fetch Org Data from DB
              const org = await getOrganizationDetails(orgId);
              if (!org) {
                  console.error("[Switch] Organization not found.");
                  set({ isLoading: false });
                  return false;
              }

              // 2. Fetch User Membership for this Org
              const memberships = await getMyMemberships(currentUser.id);
              const membership = memberships.find(m => m.organizationId === orgId);
              
              // 3. Determine Roles
              let role: UserRole = 'staff';
              let dept: DepartmentType | null = null;
              let pageRole: PageRole = 'MEMBER';

              if (org.ownerId === currentUser.id) {
                  role = 'manager';
                  dept = 'management';
                  pageRole = 'ADMIN';
              } else if (membership && membership.status === 'ACTIVE') {
                  pageRole = membership.role;
                  role = (membership.role === 'ADMIN' || membership.role === 'MODERATOR') ? 'manager' : 'staff';
                  dept = membership.department;
              } else {
                  console.error("[Switch] No valid membership.");
                  set({ isLoading: false });
                  return false;
              }

              // 4. UPDATE ALL STORES AT ONCE (Synchronous-like)
              set({ currentOrganization: org, myMemberships: memberships, isLoading: false });
              
              contextStore.setContext('ORGANIZATION', org.id, org.name, org.logoUrl);

              authStore.updateCurrentUser({
                  currentOrganizationId: org.id,
                  role: role,
                  department: dept,
                  pageRoles: { 
                      ...currentUser.pageRoles, 
                      [orgId]: { role: pageRole, title: role === 'manager' ? 'Yönetici' : 'Personel' } 
                  }
              });

              // 5. Persist to DB (Background)
              switchUserActiveOrganization(currentUser.id, org.id);

              return true;

          } catch (e) {
              console.error("[Switch] Critical failure:", e);
              set({ isLoading: false });
              return false;
          }
      },

      switchToPersonal: async () => {
          set({ isLoading: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (!currentUser) { 
              set({ isLoading: false });
              return; 
          }

          console.log("[Switch] Reverting to Personal Mode");
          
          // 1. Update Stores
          set({ currentOrganization: null, isLoading: false });
          
          contextStore.setContext('PERSONAL', currentUser.id, currentUser.name, currentUser.avatar);
          
          authStore.updateCurrentUser({
              currentOrganizationId: null,
              role: 'staff', // Reset to default scope
              department: null
          });

          // 2. Persist DB
          switchUserActiveOrganization(currentUser.id, '');
      },

      // ... Helpers ...
      addLocalChannel: (channel: Channel) => set((state) => {
          if (!state.currentOrganization) return {};
          return { currentOrganization: { ...state.currentOrganization, channels: [channel, ...(state.currentOrganization.channels || [])] } };
      }),

      removeLocalChannel: (channelId: string) => set((state) => {
          if (!state.currentOrganization) return {};
          return { currentOrganization: { ...state.currentOrganization, channels: (state.currentOrganization.channels || []).filter(c => c.id !== channelId) } };
      }),

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
