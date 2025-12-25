
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Organization, Membership, UserRole, DepartmentType, Channel, PageRole } from '../types';
import { getOrganizationDetails, getMyMemberships, switchUserActiveOrganization } from '../services/db';
import { useAuthStore } from './useAuthStore';
import { useContextStore } from './useContextStore';

interface OrganizationState {
  // Data State
  currentOrganization: Organization | null;
  activeRole: PageRole | null;
  myMemberships: Membership[];
  
  // UI State
  isSwitching: boolean;
  isLoading: boolean;

  // Actions
  loadUserMemberships: (userId: string) => Promise<void>;
  
  // THE CORE SWITCHER FUNCTION
  startOrganizationSession: (orgId: string) => Promise<{ success: boolean; error?: string }>;
  endOrganizationSession: () => Promise<void>;
  
  // Helpers
  addLocalChannel: (channel: Channel) => void;
  removeLocalChannel: (channelId: string) => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      currentOrganization: null,
      activeRole: null,
      myMemberships: [],
      isSwitching: false,
      isLoading: false,

      loadUserMemberships: async (userId: string) => {
        const memberships = await getMyMemberships(userId);
        set({ myMemberships: memberships });
      },

      /**
       * FACEBOOK-STYLE SESSION SWITCHER
       * This function guarantees that when it resolves true, 
       * the app is 100% ready to render the Admin Panel.
       */
      startOrganizationSession: async (orgId: string) => {
          set({ isSwitching: true });
          console.log(`[OrgSession] Starting switch to ${orgId}...`);

          try {
              const authStore = useAuthStore.getState();
              const contextStore = useContextStore.getState();
              const currentUser = authStore.currentUser;

              if (!currentUser) throw new Error("Oturum açmış kullanıcı bulunamadı.");

              // 1. PRE-FETCH DATA (Parallel)
              const [orgData, memberships] = await Promise.all([
                  getOrganizationDetails(orgId),
                  getMyMemberships(currentUser.id)
              ]);

              if (!orgData) throw new Error("Organizasyon verisi bulunamadı.");

              // 2. CALCULATE PERMISSIONS
              // Determine exact role for this specific organization session
              const membership = memberships.find(m => m.organizationId === orgId);
              const isOwner = orgData.ownerId === currentUser.id;
              
              let effectiveRole: PageRole = 'MEMBER';
              let userRole: UserRole = 'staff';
              let dept: DepartmentType | null = null;

              if (isOwner) {
                  effectiveRole = 'ADMIN';
                  userRole = 'manager';
                  dept = 'management';
              } else if (membership && membership.status === 'ACTIVE') {
                  effectiveRole = membership.role;
                  userRole = (membership.role === 'ADMIN' || membership.role === 'MODERATOR') ? 'manager' : 'staff';
                  dept = membership.department;
              } else {
                  throw new Error("Bu organizasyona erişim yetkiniz yok.");
              }

              // 3. ATOMIC STATE UPDATE
              // We update all stores synchronously to prevent race conditions during render
              
              // A. Organization Store
              set({ 
                  currentOrganization: orgData, 
                  activeRole: effectiveRole,
                  myMemberships: memberships,
                  isSwitching: false 
              });

              // B. Auth Store (Permissions Scope)
              authStore.updateCurrentUser({
                  currentOrganizationId: orgId,
                  role: userRole,
                  department: dept,
                  // Cache role for UI access without DB
                  pageRoles: { ...currentUser.pageRoles, [orgId]: { role: effectiveRole, title: isOwner ? 'Kurucu' : effectiveRole } }
              });

              // C. Context Store (The Global Pointer)
              // Updated to use the new API from useContextStore
              contextStore.switchToOrganization(
                  orgData.id, 
                  orgData.name, 
                  orgData.logoUrl, 
                  effectiveRole
              );

              // 4. PERSISTENCE (Background)
              switchUserActiveOrganization(currentUser.id, orgId);

              console.log(`[OrgSession] Switch successful. Ready to route.`);
              return { success: true };

          } catch (error: any) {
              console.error("[OrgSession] Switch failed:", error);
              set({ isSwitching: false, currentOrganization: null });
              return { success: false, error: error.message };
          }
      },

      endOrganizationSession: async () => {
          set({ isSwitching: true });
          const authStore = useAuthStore.getState();
          const contextStore = useContextStore.getState();
          const currentUser = authStore.currentUser;

          if (currentUser) {
              // Reset Context to Personal
              // Updated to use the new API from useContextStore
              contextStore.switchToPersonal(
                  currentUser.id, 
                  currentUser.name, 
                  currentUser.avatar
              );
              
              // Reset Auth Scope
              authStore.updateCurrentUser({
                  currentOrganizationId: null,
                  role: 'staff' // Default back to basic role
              });

              // Clear Org Data
              set({ currentOrganization: null, activeRole: null, isSwitching: false });
              
              // Persist
              switchUserActiveOrganization(currentUser.id, '');
          } else {
              set({ isSwitching: false });
          }
      },

      addLocalChannel: (channel: Channel) => set((state) => {
          if (!state.currentOrganization) return {};
          return { currentOrganization: { ...state.currentOrganization, channels: [channel, ...(state.currentOrganization.channels || [])] } };
      }),

      removeLocalChannel: (channelId: string) => set((state) => {
          if (!state.currentOrganization) return {};
          return { currentOrganization: { ...state.currentOrganization, channels: (state.currentOrganization.channels || []).filter(c => c.id !== channelId) } };
      })
    }),
    {
      name: 'hotel-academy-session-v4', // Version bumped to force cache clear
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          // Only persist essential ID references, reload data on mount to ensure freshness
          currentOrganization: state.currentOrganization ? { id: state.currentOrganization.id, name: state.currentOrganization.name, logoUrl: state.currentOrganization.logoUrl } : null
      }),
    }
  )
);
