
/**
 * FIREBASE STORAGE PATH REGISTRY
 * Single Source of Truth for all file paths.
 * Prevents hardcoded strings and ensures folder structure consistency.
 */

export const StoragePaths = {
    // --- USERS ---
    // Root folder for a user: users/{userId}
    userRoot: (userId: string) => `users/${userId}`,
    
    // Avatar: users/{userId}/avatar/filename.webp
    userAvatar: (userId: string, fileName: string) => `users/${userId}/avatar/${fileName}`,

    // --- ORGANIZATIONS ---
    // Root folder: organizations/{orgId}
    orgRoot: (orgId: string) => `organizations/${orgId}`,
    
    // Branding: organizations/{orgId}/branding/logo_xyz.webp
    orgLogo: (orgId: string, fileName: string) => `organizations/${orgId}/branding/logo_${fileName}`,
    
    // --- COURSES ---
    // Root folder: courses/{courseId}
    courseRoot: (courseId: string) => `courses/${courseId}`,
    
    // Course Materials (Images, PDFs, Videos)
    courseThumbnail: (courseId: string, fileName: string) => `courses/${courseId}/thumbnail_${fileName}`,
    courseStepMedia: (courseId: string, stepId: string, fileName: string) => `courses/${courseId}/steps/${stepId}/${fileName}`,

    // --- POSTS (FEED) ---
    // Root folder: posts/{postId}
    postRoot: (postId: string) => `posts/${postId}`,
    postMedia: (postId: string, fileName: string) => `posts/${postId}/media_${fileName}`,

    // --- SYSTEM ---
    SYSTEM_ASSETS: 'system_assets',
};
