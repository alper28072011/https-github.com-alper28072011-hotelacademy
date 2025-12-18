
import { useAuthStore } from '../stores/useAuthStore';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { RolePermissions } from '../types';

export const DEFAULT_PERMISSIONS: RolePermissions = {
    adminAccess: false,
    manageStructure: false,
    manageStaff: false,
    viewAnalytics: false,
    canCreateContent: false,
    contentTargeting: 'NONE',
    canPostFeed: true,
    canApproveRequests: false
};

export const OWNER_PERMISSIONS: RolePermissions = {
    adminAccess: true,
    manageStructure: true,
    manageStaff: true,
    viewAnalytics: true,
    canCreateContent: true,
    contentTargeting: 'ENTIRE_ORG',
    canPostFeed: true,
    canApproveRequests: true
};

export const usePermission = () => {
    const { currentUser } = useAuthStore();
    const { currentOrganization } = useOrganizationStore();

    const check = (key: keyof RolePermissions): boolean | string => {
        if (!currentUser || !currentOrganization) return false;

        // 1. GOD MODE: If user is the Owner, allow everything
        if (currentUser.id === currentOrganization.ownerId) {
            // For boolean keys return true, for strings return max value
            if (key === 'contentTargeting') return 'ENTIRE_ORG';
            return true;
        }

        // 2. Check Role-based overrides (Legacy/Safety)
        if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
             if (key === 'contentTargeting') return 'ENTIRE_ORG';
             return true;
        }

        // 3. Check Position Permissions
        // Since we don't have the full Position object in AuthStore, we need to rely on the loaded context or fetch it.
        // HOWEVER, for optimization, detailed permissions should ideally be part of the User or Membership object.
        // For this architecture, we will try to find the prototype definition in the organization store based on user's role/position.
        
        if (currentUser.positionId && currentOrganization.definitions?.positionPrototypes) {
            // We need to match the user's position to a prototype.
            // Note: In a real DB, the Position instance has the perms.
            // For now, we fall back to finding the prototype matching the roleTitle if Position ID isn't a direct prototype ID (which it isn't).
            
            // This logic assumes we loaded the exact permissions into the user object or have them available.
            // Since we don't have 'permissions' on User type yet in store, let's look up the roleTitle in prototypes
            const proto = currentOrganization.definitions.positionPrototypes.find(p => p.title === currentUser.roleTitle);
            
            if (proto && proto.permissions) {
                return proto.permissions[key];
            }
        }

        return DEFAULT_PERMISSIONS[key];
    };

    return {
        can: (key: keyof RolePermissions) => check(key) === true,
        scope: () => check('contentTargeting') as string,
        permissions: currentUser?.id === currentOrganization?.ownerId ? OWNER_PERMISSIONS : DEFAULT_PERMISSIONS // simplified for bulk checks
    };
};
