
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, User, DepartmentType, UserRole } from '../types';
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
                    role = membership.role;
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

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
