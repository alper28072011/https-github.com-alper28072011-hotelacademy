
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership } from '../types';
import { getOrganizationDetails, getMyMemberships } from '../services/db';

interface OrganizationState {
  currentOrganization: Organization | null;
  myMemberships: Membership[];
  isLoading: boolean;

  // Actions
  fetchMemberships: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
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

      switchOrganization: async (orgId: string) => {
        set({ isLoading: true });
        const org = await getOrganizationDetails(orgId);
        if (org) {
            set({ currentOrganization: org });
        }
        set({ isLoading: false });
      },

      reset: () => set({ currentOrganization: null, myMemberships: [] })
    }),
    {
      name: 'hotel-academy-org-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
