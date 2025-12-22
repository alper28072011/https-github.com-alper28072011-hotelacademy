
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';
import { compressImage, OptimizationType } from '../utils/imageOptimizer';

/**
 * Uploads a file to Firebase Storage with automatic client-side compression.
 */
export const uploadFile = async (
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void,
  optimizationType: OptimizationType = 'POST' 
): Promise<string> => {
  
  let fileToUpload = file;
  
  // Compress if image
  if (file.type.startsWith('image/')) {
      try {
          fileToUpload = await compressImage(file, optimizationType);
      } catch (e) {
          console.warn("Image compression failed, uploading original.", e);
      }
  } 
  else if (file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) { 
          throw new Error("Video boyutu 100MB'dan küçük olmalıdır.");
      }
  }

  return new Promise((resolve, reject) => {
    // Note: We use the path provided directly. 
    // The caller (Service layer) is responsible for unique naming via StoragePaths.
    const storageRef = ref(storage, path);
    
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

/**
 * Safely deletes a file from Firebase Storage.
 */
export const deleteFileByUrl = async (url: string | undefined | null): Promise<void> => {
    if (!url || !url.includes('firebasestorage')) return;

    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn(`Failed to delete file (${url}):`, error);
        }
    }
};

/**
 * RECURSIVE FOLDER DELETION
 * Firebase Storage doesn't have native folder deletion. 
 * We must list all files and subfolders and delete them.
 */
export const deleteFolder = async (path: string): Promise<void> => {
    if (!path) return;
    
    const folderRef = ref(storage, path);
    try {
        const listResult = await listAll(folderRef);
        
        // 1. Delete all files in this folder
        const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deletePromises);

        // 2. Recursively delete subfolders
        const folderPromises = listResult.prefixes.map((folderRef) => deleteFolder(folderRef.fullPath));
        await Promise.all(folderPromises);
        
        console.log(`[Storage] Folder cleaned: ${path}`);
    } catch (error) {
        console.error(`[Storage] Failed to delete folder ${path}:`, error);
    }
};

/**
 * ATOMIC REPLACEMENT
 * Uploads new file -> Returns URL -> Deletes old file (cleanup).
 * Ensures we don't lose the old file if upload fails.
 */
export const replaceFile = async (
    oldUrl: string | undefined, 
    newFile: File, 
    newPath: string,
    optimizationType: OptimizationType = 'POST'
): Promise<string> => {
    // 1. Upload New
    const newUrl = await uploadFile(newFile, newPath, undefined, optimizationType);
    
    // 2. Delete Old (Fire and forget, don't block return)
    if (oldUrl && oldUrl !== newUrl) {
        deleteFileByUrl(oldUrl).catch(e => console.warn("Failed to cleanup old file during replace", e));
    }
    
    return newUrl;
};
