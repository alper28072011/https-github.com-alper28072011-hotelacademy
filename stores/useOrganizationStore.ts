
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, User } from '../types';
import { getOrganizationDetails, getMyMemberships, switchUserActiveOrganization } from '../services/db';
import { useAuthStore } from './useAuthStore'; // Import Auth Store for cross-store update

interface OrganizationState {
  currentOrganization: Organization | null;
  myMemberships: Membership[];
  isLoading: boolean;

  // Actions
  fetchMemberships: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<boolean>;
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

            // 2. Persist to DB (User Profile)
            await switchUserActiveOrganization(currentUser.id, orgId);

            // 3. Update Auth Store User (Important for Routing!)
            const membership = get().myMemberships.find(m => m.organizationId === orgId);
            const updatedUser: User = { 
                ...currentUser, 
                currentOrganizationId: orgId,
                role: membership?.role || 'staff',
                department: membership?.department || 'housekeeping'
            };
            authStore.loginSuccess(updatedUser);

            // 4. Update Org Store
            set({ currentOrganization: org, isLoading: false });
            return true;

        } catch (e) {
            console.error(e);
            set({ isLoading: false });
            return false;
        }
      },

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
