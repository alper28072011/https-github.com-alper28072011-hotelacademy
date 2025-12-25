
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
       * STRICT ATOMIC SWITCH
       * Order of operations is CRITICAL here to prevent White Screen.
       * 1. Fetch Data
       * 2. Set Organization Data (Ready for Render)
       * 3. Set Auth/Context (Triggers Router Guard)
       */
      switchOrganization: async (orgId: string): Promise<boolean> => {
          set({ isLoading: true });
          
          try {
              const authStore = useAuthStore.getState();
              const contextStore = useContextStore.getState();
              const currentUser = authStore.currentUser;

              if (!currentUser) {
                  set({ isLoading: false });
                  return false;
              }

              console.log(`[Switch] 1. Fetching Org: ${orgId}`);
              
              // 1. Fetch Data from DB
              const org = await getOrganizationDetails(orgId);
              if (!org) {
                  console.error("[Switch] Organization not found.");
                  set({ isLoading: false });
                  return false;
              }

              // 2. Fetch User Membership for this Org
              // We refetch to ensure we have the latest roles
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

              console.log(`[Switch] 2. Data Ready. Updating Stores...`);

              // 4. CRITICAL: Update Organization Store FIRST.
              // This ensures that when the Router mounts AdminLayout, the data is ALREADY there.
              set({ 
                  currentOrganization: org, 
                  myMemberships: memberships, 
                  isLoading: false // Release lock
              });

              // 5. Update Auth Store (Permissions)
              authStore.updateCurrentUser({
                  currentOrganizationId: org.id,
                  role: role,
                  department: dept,
                  pageRoles: { 
                      ...currentUser.pageRoles, 
                      [orgId]: { role: pageRole, title: role === 'manager' ? 'Yönetici' : 'Personel' } 
                  }
              });

              // 6. Update Context Store (Triggers App.tsx Guard)
              // We do this LAST so the guard passes only after data is ready.
              contextStore.setContext('ORGANIZATION', org.id, org.name, org.logoUrl);

              // 7. Persist to DB (Background - Fire and Forget)
              switchUserActiveOrganization(currentUser.id, org.id);

              console.log(`[Switch] 3. Switch Complete. Ready to Navigate.`);
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
          
          // 1. Reset Context FIRST to block Admin Routes immediately
          contextStore.setContext('PERSONAL', currentUser.id, currentUser.name, currentUser.avatar);
          
          // 2. Clear Org Data
          set({ currentOrganization: null, isLoading: false });
          
          // 3. Reset Auth Scope
          authStore.updateCurrentUser({
              currentOrganizationId: null,
              role: 'staff',
              department: null
          });

          // 4. Persist DB
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
