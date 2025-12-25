
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

      /**
       * ATOMIC SWITCHING LOGIC (Facebook Style)
       * This function orchestrates the entire context switch.
       * It ensures User Role, Auth Context, and Org Data are 100% synced before returning true.
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
            console.log(`[Switch] Starting atomic switch to Org: ${orgId}`);

            // 1. FETCH FRESH DATA (Blocking)
            const org = await getOrganizationDetails(orgId);
            if (!org) {
                console.error("[Switch] Organization not found in DB.");
                set({ isLoading: false });
                return false;
            }

            // 2. DETERMINE ROLE & PERMISSIONS (Security Check)
            let role: UserRole = 'staff';
            let dept: DepartmentType = 'housekeeping';
            let pageRole = 'MEMBER';

            // Priority A: Are you the Owner?
            if (org.ownerId === currentUser.id) {
                role = 'manager';
                dept = 'management';
                pageRole = 'ADMIN';
            } else {
                // Priority B: Check cached memberships first, then fetch if missing
                let membership = get().myMemberships.find(m => m.organizationId === orgId);
                
                if (!membership) {
                    // Critical: Fetch fresh memberships to ensure we aren't using stale cache
                    const freshMemberships = await getMyMemberships(currentUser.id);
                    set({ myMemberships: freshMemberships });
                    membership = freshMemberships.find(m => m.organizationId === orgId);
                }

                if (membership) {
                    pageRole = membership.role;
                    // Map PageRole to Global Role context
                    if (membership.role === 'ADMIN') role = 'manager';
                    else if (membership.role === 'MODERATOR') role = 'manager'; // Mods access admin too
                    else role = 'staff';
                    
                    dept = membership.department;
                } else {
                    // Security Fallback: User has no relation to this org?
                    console.error("[Switch] User is not a member of this organization.");
                    set({ isLoading: false });
                    return false;
                }
            }

            // 3. PERSIST STATE TO DB (Server-side Session)
            await switchUserActiveOrganization(currentUser.id, orgId);

            // 4. UPDATE LOCAL STORES (Client-side Session)
            
            // A. Update Org Store
            set({ currentOrganization: org, isLoading: false });

            // B. Update Context Store (The Visual Context)
            contextStore.switchToOrganization(org.id, org.name, org.logoUrl);

            // C. Update Auth Store (The User Identity)
            authStore.updateCurrentUser({
                currentOrganizationId: orgId,
                role: role,
                department: dept,
                // Also update legacy pageRoles map locally to prevent flicker
                pageRoles: { 
                    ...currentUser.pageRoles, 
                    [orgId]: { role: pageRole as any, title: role === 'manager' ? 'Yönetici' : 'Personel' } 
                }
            });

            console.log("[Switch] Atomic switch complete.");
            return true;

        } catch (e) {
            console.error("[Switch] Failed critical switch operation:", e);
            set({ isLoading: false });
            return false;
        }
      },

      addLocalChannel: (channel: Channel) => set((state) => {
          if (!state.currentOrganization) return {};
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
