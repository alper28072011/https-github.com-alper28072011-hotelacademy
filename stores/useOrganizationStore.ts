
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
  
  // SESSION RESTORATION (The Fix)
  restoreActiveSession: (orgId: string) => Promise<boolean>;

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
       * RESTORE SESSION (Fix for Page Reloads)
       * Ensures that if we are in an ORG context, we have the fresh data and permissions.
       */
      restoreActiveSession: async (orgId: string): Promise<boolean> => {
          // If we already have the correct data loaded, don't re-fetch aggressively
          const current = get().currentOrganization;
          if (current && current.id === orgId) {
              return true; 
          }

          set({ isLoading: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (!currentUser) {
              set({ isLoading: false });
              return false;
          }

          try {
              console.log(`[Restore] Restoring session for Org: ${orgId}`);
              
              // 1. Fetch Fresh Data from DB (Don't trust stale local state)
              const org = await getOrganizationDetails(orgId);
              if (!org) {
                  console.error("[Restore] Organization no longer exists.");
                  set({ isLoading: false });
                  return false;
              }

              // 2. Validate Membership & Calculate Roles
              let role: UserRole = 'staff';
              let dept: DepartmentType = 'housekeeping';
              let pageRole = 'MEMBER';

              if (org.ownerId === currentUser.id) {
                  role = 'manager';
                  dept = 'management';
                  pageRole = 'ADMIN';
              } else {
                  // Fetch fresh memberships
                  const memberships = await getMyMemberships(currentUser.id);
                  set({ myMemberships: memberships });
                  
                  const membership = memberships.find(m => m.organizationId === orgId);
                  
                  if (membership && membership.status === 'ACTIVE') {
                      pageRole = membership.role;
                      if (membership.role === 'ADMIN' || membership.role === 'MODERATOR') role = 'manager';
                      else role = 'staff';
                      dept = membership.department;
                  } else {
                      console.warn("[Restore] User is not a valid member.");
                      set({ isLoading: false });
                      return false;
                  }
              }

              // 3. Update All Stores Atomically
              set({ currentOrganization: org, isLoading: false });
              
              // Ensure Visual Context is correct
              if (contextStore.activeEntityId !== org.id) {
                  contextStore.switchToOrganization(org.id, org.name, org.logoUrl);
              }

              // Ensure Auth Context is correct
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
              console.error("[Restore] Critical failure:", e);
              set({ isLoading: false });
              return false;
          }
      },

      switchToOrganizationAction: async (orgId: string): Promise<boolean> => {
        // Reuse restoration logic for consistency, but force fetch
        return get().restoreActiveSession(orgId);
      },

      switchToPersonalAction: async () => {
          set({ isLoading: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (!currentUser) return;

          console.log("[Switch] Reverting to Personal Mode");
          await switchUserActiveOrganization(currentUser.id, ''); // DB Persist

          set({ currentOrganization: null, isLoading: false });
          contextStore.switchToPersonal(currentUser);
          authStore.updateCurrentUser({
              currentOrganizationId: null,
              role: 'staff',
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
