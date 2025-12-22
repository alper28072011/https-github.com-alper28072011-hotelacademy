
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, User, DepartmentType, UserRole, Channel } from '../types';
import { getOrganizationDetails, getMyMemberships, switchUserActiveOrganization } from '../services/db';
import { useAuthStore } from './useAuthStore'; // Import Auth Store for cross-store update

interface OrganizationState {
  currentOrganization: Organization | null;
  myMemberships: Membership[];
  isLoading: boolean;

  // Actions
  fetchMemberships: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<boolean>;
  
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

      switchOrganization: async (orgId: string): Promise<boolean> => {
        set({ isLoading: true });
        const authStore = useAuthStore.getState();
        const currentUser = authStore.currentUser;

        if (!currentUser) {
            set({ isLoading: false });
            return false;
        }

        try {
            // 1. Fetch Org Details
            const org = await getOrganizationDetails(orgId);
            if (!org) {
                set({ isLoading: false });
                return false;
            }

            // 2. Determine Role (CRITICAL FIX for "Unauthorized" Bug)
            let role: UserRole = 'staff';
            let dept: DepartmentType = 'housekeeping';

            // Priority A: Are you the Owner?
            if (org.ownerId === currentUser.id) {
                role = 'manager';
                dept = 'management';
            } else {
                // Priority B: Check cached memberships
                let membership = get().myMemberships.find(m => m.organizationId === orgId);
                
                // Priority C: Fetch fresh memberships if not found (e.g. newly joined)
                if (!membership) {
                    const freshMemberships = await getMyMemberships(currentUser.id);
                    set({ myMemberships: freshMemberships }); // Sync store
                    membership = freshMemberships.find(m => m.organizationId === orgId);
                }

                if (membership) {
                    // Map PageRole to UserRole if needed or keep UserRole for global context
                    // For now, map simple admin to manager/admin
                    if (membership.role === 'ADMIN') role = 'manager';
                    else role = 'staff';
                    
                    dept = membership.department;
                }
            }

            // 3. Persist to DB (User Profile)
            await switchUserActiveOrganization(currentUser.id, orgId);

            // 4. Update Auth Store User (Important for Routing & Guards!)
            const updatedUser: User = { 
                ...currentUser, 
                currentOrganizationId: orgId,
                role: role,
                department: dept
            };
            authStore.loginSuccess(updatedUser);

            // 5. Update Org Store
            set({ currentOrganization: org, isLoading: false });
            return true;

        } catch (e) {
            console.error("Switch Org Failed:", e);
            set({ isLoading: false });
            return false;
        }
      },

      addLocalChannel: (channel: Channel) => set((state) => {
          if (!state.currentOrganization) return {};
          // Add to start of list for better visibility
          const newChannels = [channel, ...(state.currentOrganization.channels || [])];
          return {
              currentOrganization: {
                  ...state.currentOrganization,
                  channels: newChannels
              }
          };
      }),

      removeLocalChannel: (channelId: string) => set((state) => {
          if (!state.currentOrganization) return {};
          const newChannels = (state.currentOrganization.channels || []).filter(c => c.id !== channelId);
          return {
              currentOrganization: {
                  ...state.currentOrganization,
                  channels: newChannels
              }
          };
      }),

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
